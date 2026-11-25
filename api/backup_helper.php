<?php
declare(strict_types=1);

/** ส่งออกข้อมูลตาราง MySQL และข้อมูลผู้ใช้เป็นไฟล์ JSON สำรองในโฟลเดอร์ data */
function writeDatabaseBackup(PDO $pdo): array
{
    $backupDirectory = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'backups';
    if (!is_dir($backupDirectory) && !@mkdir($backupDirectory, 0700, true) && !is_dir($backupDirectory)) {
        throw new RuntimeException('Unable to create the database backup directory.');
    }

    $usersDirectory = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
    $usersPath = $usersDirectory . DIRECTORY_SEPARATOR . 'users.json';
    $userRows = $pdo->query('SELECT * FROM `users`')->fetchAll(PDO::FETCH_ASSOC);
    $users = array_map(static function (array $user): array {
        $createdAt = (string) ($user['created_at'] ?? '');
        return [
            'userId' => (string) ($user['user_id'] ?? ''),
            'firstName' => (string) ($user['first_name'] ?? ''),
            'lastName' => (string) ($user['last_name'] ?? ''),
            'email' => (string) ($user['email'] ?? ''),
            'phone' => (string) ($user['phone'] ?? ''),
            'passwordHash' => (string) ($user['password_hash'] ?? ''),
            'role' => (string) ($user['role_code'] ?? ''),
            'avatar' => (string) ($user['avatar'] ?? ''),
            'avatarStyle' => (string) ($user['avatar_style'] ?? ''),
            'createdAt' => $createdAt
        ];
    }, $userRows);
    $usersJson = json_encode(
        $users,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
    ) . PHP_EOL;
    $usersTemporaryPath = $usersPath . '.tmp';
    if (@file_put_contents($usersTemporaryPath, $usersJson, LOCK_EX) === false) {
        throw new RuntimeException('Unable to write the user data file.');
    }
    if (!@rename($usersTemporaryPath, $usersPath)) {
        @unlink($usersTemporaryPath);
        throw new RuntimeException('Unable to finalize the user data file.');
    }

    $temporaryPath = null;
    try {
        $pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        $pdo->beginTransaction();

        $tables = [];
        foreach ($pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'") as $tableRow) {
            $tableName = (string) array_values($tableRow)[0];
            if ($tableName === 'users') {
                continue;
            }
            $quotedName = '`' . str_replace('`', '``', $tableName) . '`';
            $schema = $pdo->query('SHOW CREATE TABLE ' . $quotedName)->fetch(PDO::FETCH_ASSOC);
            if (!$schema) {
                throw new RuntimeException('Unable to read a table definition.');
            }

            $definition = array_values($schema)[1] ?? null;
            if (!is_string($definition)) {
                throw new RuntimeException('A table definition has an unexpected format.');
            }

            $tables[$tableName] = [
                'create' => $definition,
                'rows' => $pdo->query('SELECT * FROM ' . $quotedName)->fetchAll(PDO::FETCH_ASSOC)
            ];
        }
        $pdo->commit();

        $payload = [
            'format' => 'install-mysql-backup',
            'version' => 1,
            'createdAt' => gmdate(DATE_ATOM),
            'database' => (string) (getenv('INSTALL_DB_NAME') ?: 'install'),
            'tables' => $tables
        ];
        $json = json_encode(
            $payload,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        ) . PHP_EOL;

        $timestamp = gmdate('Ymd-His');
        $backupName = 'install-backup-' . $timestamp . '-' . bin2hex(random_bytes(4)) . '.json';
        $backupPath = $backupDirectory . DIRECTORY_SEPARATOR . $backupName;
        $temporaryPath = $backupPath . '.tmp';
        if (@file_put_contents($temporaryPath, $json, LOCK_EX) === false) {
            throw new RuntimeException('Unable to write the backup file.');
        }
        if (!@rename($temporaryPath, $backupPath)) {
            throw new RuntimeException('Unable to finalize the backup file.');
        }
        $temporaryPath = null;

        $backupFiles = glob($backupDirectory . DIRECTORY_SEPARATOR . 'install-backup-*.json');
        if (is_array($backupFiles)) {
            rsort($backupFiles, SORT_STRING);
            foreach (array_slice($backupFiles, 1) as $oldBackup) {
                if (is_file($oldBackup)) {
                    @unlink($oldBackup);
                }
            }
        }
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($temporaryPath !== null && is_file($temporaryPath)) {
            @unlink($temporaryPath);
        }
        throw $error;
    }

    $tableCounts = [];
    foreach ($tables as $tableName => $tableData) {
        $tableCounts[$tableName] = count($tableData['rows']);
    }

    return [
        'status' => 'saved',
        'file' => $backupName,
        'tableCounts' => $tableCounts
    ];
}

/** เพิ่มผลการสำรองข้อมูลหรือข้อความเตือนลงใน response หลังคำขอเขียนข้อมูล */
function addDatabaseBackupToResponse(array &$data): void
{
    if (empty($GLOBALS['databaseBackupRequired'])) {
        return;
    }
    $pdo = $GLOBALS['databaseBackupPdo'] ?? null;
    if (!$pdo instanceof PDO) {
        return;
    }

    try {
        $data['backup'] = writeDatabaseBackup($pdo);
    } catch (Throwable $error) {
        error_log('Automatic database backup failed: ' . $error->getMessage());
        $warning = 'ข้อมูล MySQL ถูกบันทึกแล้ว แต่ไม่สามารถสร้างไฟล์ JSON สำรองได้';
        $data['backupWarning'] = $warning;
        if (isset($data['message']) && is_string($data['message'])) {
            $data['message'] .= ' (' . $warning . ')';
        }
    }
}

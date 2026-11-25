<?php
declare(strict_types=1);

/** ตรวจและปรับ schema งาน/รายงานให้รองรับฟีเจอร์ของ API เวอร์ชันนี้ */
function ensureTaskSchema(PDO $pdo): bool
{
    $columnExists = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'tasks'
           AND column_name = 'asset_identifier'"
    )->fetchColumn() > 0;
    $changed = false;
    if (!$columnExists) {
        $pdo->exec(
            "ALTER TABLE tasks
             ADD COLUMN asset_identifier VARCHAR(255) NOT NULL DEFAULT '' AFTER job_name"
        );
        $changed = true;
    }

    $oldIndexExists = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = 'tasks'
           AND index_name = 'uq_tasks_job_number'"
    )->fetchColumn() > 0;
    if ($oldIndexExists) {
        $pdo->exec('ALTER TABLE tasks DROP INDEX uq_tasks_job_number');
        $changed = true;
    }

    $compositeIndexExists = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = 'tasks'
           AND index_name = 'uq_tasks_job_asset_identifier'"
    )->fetchColumn() > 0;
    if (!$compositeIndexExists) {
        $pdo->exec(
            'ALTER TABLE tasks
             ADD UNIQUE KEY uq_tasks_job_asset_identifier (job_number, asset_identifier)'
        );
        $changed = true;
    }

    $deletedAtExists = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'tasks'
           AND column_name = 'deleted_at'"
    )->fetchColumn() > 0;
    if (!$deletedAtExists) {
        $pdo->exec('ALTER TABLE tasks ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER created_at');
        $changed = true;
    }

    $deletedAtIndexExists = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = 'tasks'
           AND index_name = 'idx_tasks_deleted_at'"
    )->fetchColumn() > 0;
    if (!$deletedAtIndexExists) {
        $pdo->exec('ALTER TABLE tasks ADD KEY idx_tasks_deleted_at (deleted_at)');
        $changed = true;
    }

    $reportTableExists = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'install_reports'"
    )->fetchColumn() > 0;
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS install_reports (
            report_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            task_id BIGINT UNSIGNED NOT NULL,
            job_number VARCHAR(100) NOT NULL,
            checker_name VARCHAR(200) NOT NULL,
            checker_user_id VARCHAR(40) DEFAULT NULL,
            specifications_checked TINYINT(1) NOT NULL,
            neatness_checked TINYINT(1) NOT NULL,
            warranty_seal_applied TINYINT(1) NOT NULL,
            computer_type VARCHAR(120) NOT NULL,
            brand VARCHAR(120) NOT NULL,
            photos_json LONGTEXT NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (report_id),
            UNIQUE KEY uq_install_reports_task (task_id),
            KEY idx_install_reports_created_at (created_at),
            CONSTRAINT fk_install_reports_task FOREIGN KEY (task_id)
                REFERENCES tasks (task_id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $changed = $changed || !$reportTableExists;

    return $changed;
}

/** ลบงานและการแจ้งเตือนที่อยู่ในถังขยะเกินระยะเวลาเก็บรักษา */
function purgeExpiredTasks(PDO $pdo): bool
{
    $pdo->beginTransaction();
    try {
        $expired = $pdo->query(
            'SELECT task_id FROM tasks
             WHERE deleted_at IS NOT NULL
               AND deleted_at <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)
             FOR UPDATE'
        )->fetchAll(PDO::FETCH_COLUMN);
        if ($expired === []) {
            $pdo->commit();
            return false;
        }

        $placeholders = implode(', ', array_fill(0, count($expired), '?'));
        $notifications = $pdo->prepare(
            "DELETE FROM notifications WHERE task_id IN ($placeholders)"
        );
        $notifications->execute($expired);

        $tasks = $pdo->prepare("DELETE FROM tasks WHERE task_id IN ($placeholders)");
        $tasks->execute($expired);
        if ($tasks->rowCount() !== count($expired)) {
            throw new RuntimeException('Expired task purge affected an unexpected number of tasks.');
        }
        $pdo->commit();
        return true;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}

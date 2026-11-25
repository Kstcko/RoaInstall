<?php
declare(strict_types=1);

ini_set('session.use_strict_mode', '1');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

require_once __DIR__ . '/backup_helper.php';

/** ส่ง JSON response และสำรองฐานข้อมูลหลังการแก้ประกาศ */
function respond(int $status, array $data): never
{
    if ($status >= 200 && $status < 300) {
        addDatabaseBackupToResponse($data);
    }
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** นับจำนวนอักขระ UTF-8 สำหรับตรวจหัวข้อและสรุปประกาศ */
function siteUpdateTextLength(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }
    $count = preg_match_all('/./us', $value);
    return $count === false ? strlen($value) : $count;
}

/** ตรวจ session และบัญชีที่อนุญาตให้เข้าถึงระบบประกาศอัปเดต */
function authenticatedSiteUpdateUser(PDO $pdo, string $developerUserId): array
{
    $userId = (string) ($_SESSION['userId'] ?? '');
    if ($userId === '') {
        respond(401, ['message' => 'กรุณาเข้าสู่ระบบใหม่']);
    }

    $statement = $pdo->prepare(
        'SELECT user_id, first_name, last_name, email, role_code
         FROM users WHERE user_id = :id LIMIT 1'
    );
    $statement->execute(['id' => $userId]);
    $user = $statement->fetch();
    $isDeveloper = $user
        && (string) $user['user_id'] === $developerUserId
        && (string) $user['role_code'] === 'developer';
    $isCompanyUser = $user
        && filter_var((string) $user['email'], FILTER_VALIDATE_EMAIL) !== false
        && str_ends_with(strtolower((string) $user['email']), '@rayong-oa.com');
    if (!$user || (!$isDeveloper && !$isCompanyUser)) {
        $_SESSION = [];
        session_destroy();
        respond(401, ['message' => 'กรุณาเข้าสู่ระบบใหม่']);
    }

    return $user;
}

/** จำกัดคำสั่งเผยแพร่ประกาศไว้ให้บัญชี Developer ที่กำหนด */
function requireSiteUpdateDeveloper(array $user, string $developerUserId): void
{
    if ((string) $user['user_id'] !== $developerUserId
        || (string) $user['role_code'] !== 'developer') {
        respond(403, ['message' => 'เฉพาะบัญชี Developer เท่านั้นที่เผยแพร่ประกาศอัปเดตเว็บไซต์ได้']);
    }
}

/** เตรียมตารางเก็บประกาศและสถานะการอ่าน/ไฟล์ที่ติดตาม */
function ensureSiteUpdateSchema(PDO $pdo): bool
{
    $changed = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'site_updates'"
    )->fetchColumn() === 0;

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS site_updates (
            update_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            title VARCHAR(120) NOT NULL,
            summary VARCHAR(500) NOT NULL,
            changes_json LONGTEXT NOT NULL,
            published_by VARCHAR(40) NOT NULL,
            published_at DATETIME NOT NULL,
            PRIMARY KEY (update_id),
            KEY idx_site_updates_published_at (published_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $changed = $changed || (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'site_update_reads'"
    )->fetchColumn() === 0;
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS site_update_reads (
            update_id BIGINT UNSIGNED NOT NULL,
            user_id VARCHAR(40) NOT NULL,
            read_at DATETIME NOT NULL,
            PRIMARY KEY (update_id, user_id),
            KEY idx_site_update_reads_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $changed = $changed || (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'site_update_files'"
    )->fetchColumn() === 0;
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS site_update_files (
            file_path VARCHAR(255) NOT NULL,
            file_hash CHAR(64) NOT NULL,
            PRIMARY KEY (file_path)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    return $changed;
}

/** สร้างรายการ hash ของไฟล์เว็บที่ระบบติดตามการเปลี่ยนแปลง */
function scanSiteUpdateFiles(): array
{
    $root = dirname(__DIR__);
    $files = [];
    $trackedDirectories = ['api', 'assets', 'css', 'js'];
    $trackedExtensions = ['html', 'css', 'js', 'php', 'svg', 'png', 'jpg', 'jpeg', 'webp'];

    $addFile = static function (string $path) use ($root, $trackedExtensions, &$files): void {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if ((basename($path) !== '.htaccess' && !in_array($extension, $trackedExtensions, true))
            || !is_file($path)) {
            return;
        }

        $relativePath = substr($path, strlen($root) + 1);
        $relativePath = str_replace(DIRECTORY_SEPARATOR, '/', $relativePath);
        $hash = hash_file('sha256', $path);
        if (!is_string($hash)) {
            throw new RuntimeException('Unable to check a website file.');
        }
        $files[$relativePath] = $hash;
    };

    foreach (glob($root . DIRECTORY_SEPARATOR . '*.html') ?: [] as $path) {
        $addFile($path);
    }
    $addFile($root . DIRECTORY_SEPARATOR . '.htaccess');
    foreach ($trackedDirectories as $directory) {
        $directoryPath = $root . DIRECTORY_SEPARATOR . $directory;
        if (!is_dir($directoryPath)) {
            continue;
        }
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directoryPath, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $addFile($file->getPathname());
            }
        }
    }

    ksort($files, SORT_STRING);
    return $files;
}

/** อ่าน hash ล่าสุดของไฟล์จากฐานข้อมูล */
function readSiteUpdateFileState(PDO $pdo): array
{
    $state = [];
    foreach ($pdo->query('SELECT file_path, file_hash FROM site_update_files') as $row) {
        $state[(string) $row['file_path']] = (string) $row['file_hash'];
    }
    return $state;
}

/** แทนที่ snapshot hash ของไฟล์ที่ติดตามในฐานข้อมูล */
function saveSiteUpdateFileState(PDO $pdo, array $files): void
{
    $pdo->exec('DELETE FROM site_update_files');
    $insert = $pdo->prepare(
        'INSERT INTO site_update_files (file_path, file_hash) VALUES (:path, :hash)'
    );
    foreach ($files as $path => $hash) {
        $insert->execute(['path' => $path, 'hash' => $hash]);
    }
}

/** เปรียบเทียบ snapshot เพื่อระบุไฟล์ที่เพิ่ม แก้ไข หรือนำออก */
function diffSiteUpdateFiles(array $previous, array $current): array
{
    $changes = [];
    foreach ($current as $path => $hash) {
        if (!array_key_exists($path, $previous)) {
            $changes[] = ['path' => $path, 'action' => 'added'];
        } elseif ($previous[$path] !== $hash) {
            $changes[] = ['path' => $path, 'action' => 'updated'];
        }
    }
    foreach ($previous as $path => $_hash) {
        if (!array_key_exists($path, $current)) {
            $changes[] = ['path' => $path, 'action' => 'removed'];
        }
    }
    return $changes;
}

/** จัดกลุ่ม path เป็นชื่อส่วนของเว็บสำหรับสรุปประกาศ */
function siteUpdateArea(string $path): string
{
    $normalized = strtolower($path);
    $pageLabels = [
        'index.html' => 'หน้าแรก',
        'services.html' => 'หน้าจัดการงาน',
        'work.html' => 'หน้าแจ้งงาน',
        'staff.html' => 'หน้าจัดการพนักงาน',
        'profile.html' => 'หน้าโปรไฟล์',
        'login.html' => 'หน้าเข้าสู่ระบบ',
        'register.html' => 'หน้าสมัครบัญชี',
        'report.html' => 'หน้ารายงาน',
        'resetpassword.html' => 'หน้าตั้งรหัสผ่าน'
    ];
    if (isset($pageLabels[$normalized])) {
        return $pageLabels[$normalized];
    }
    if (str_starts_with($normalized, 'api/')) {
        return 'ระบบหลังบ้าน';
    }
    if (str_starts_with($normalized, 'assets/')) {
        return 'ภาพและสื่อประกอบ';
    }
    if (str_starts_with($normalized, 'css/')) {
        return 'รูปแบบการแสดงผล';
    }
    if (str_starts_with($normalized, 'js/tasks/')) {
        return 'ระบบจัดการงาน';
    }
    if (str_starts_with($normalized, 'js/core/')) {
        return 'ระบบส่วนกลาง';
    }
    if (str_starts_with($normalized, 'js/')) {
        return 'ฟังก์ชันเว็บไซต์';
    }
    return 'เว็บไซต์โดยรวม';
}

/** รวมจำนวนการเปลี่ยนแปลงตามประเภทและส่วนของเว็บ */
function summarizeSiteUpdateChanges(array $changes): array
{
    $summary = [];
    foreach ($changes as $change) {
        $key = $change['action'] . '|' . siteUpdateArea($change['path']);
        if (!isset($summary[$key])) {
            $summary[$key] = [
                'action' => $change['action'],
                'area' => siteUpdateArea($change['path']),
                'count' => 0
            ];
        }
        $summary[$key]['count']++;
    }
    return array_values($summary);
}

/** บันทึก snapshot เริ่มต้นเมื่อยังไม่มีข้อมูลไฟล์ในระบบ */
function initializeSiteUpdateBaseline(PDO $pdo, array $files): void
{
    $pdo->beginTransaction();
    try {
        if ((int) $pdo->query('SELECT COUNT(*) FROM site_update_files')->fetchColumn() === 0) {
            saveSiteUpdateFileState($pdo, $files);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}

set_exception_handler(static function (Throwable $error): void {
    error_log('Website update request failed: ' . $error->getMessage());
    respond(500, ['message' => 'ดำเนินการเกี่ยวกับประกาศอัปเดตไม่สำเร็จ กรุณาลองใหม่']);
});

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['message' => 'รองรับเฉพาะคำขอ POST']);
}

$requestBody = file_get_contents('php://input');
if (strlen($requestBody) > 10000) {
    respond(413, ['message' => 'ข้อมูลประกาศมีขนาดใหญ่เกินไป']);
}
$request = json_decode($requestBody, true);
if (!is_array($request)) {
    respond(400, ['message' => 'รูปแบบข้อมูลไม่ถูกต้อง']);
}

$config = require __DIR__ . '/config.php';
$developerUserId = (string) ($config['developerUserId'] ?? '');
if ($developerUserId === '') {
    respond(500, ['message' => 'ยังไม่ได้กำหนดบัญชี Developer']);
}

try {
    $pdo = require __DIR__ . '/db.php';
} catch (PDOException $error) {
    error_log('Website update database connection failed: ' . $error->getMessage());
    respond(503, ['message' => 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบการตั้งค่า MySQL']);
}

$actionValue = $request['action'] ?? '';
if (!is_string($actionValue)) {
    respond(400, ['message' => 'รูปแบบคำสั่งไม่ถูกต้อง']);
}
$action = $actionValue;
$user = authenticatedSiteUpdateUser($pdo, $developerUserId);
$GLOBALS['databaseBackupPdo'] = $pdo;
$GLOBALS['databaseBackupRequired'] = in_array($action, ['publish', 'markRead', 'markAllRead'], true);
$GLOBALS['databaseBackupRequired'] = ensureSiteUpdateSchema($pdo) || $GLOBALS['databaseBackupRequired'];

// คืนประกาศที่เผยแพร่แล้วให้ผู้ใช้
if ($action === 'list') {
    $statement = $pdo->prepare(
        'SELECT u.update_id, u.title, u.summary, u.changes_json, u.published_at,
                r.update_id AS read_update_id
         FROM site_updates u
         LEFT JOIN site_update_reads r
           ON r.update_id = u.update_id AND r.user_id = :user_id
         ORDER BY u.published_at DESC, u.update_id DESC
         LIMIT 30'
    );
    $statement->execute(['user_id' => $user['user_id']]);
    $updates = [];
    foreach ($statement->fetchAll() as $row) {
        $changes = json_decode((string) $row['changes_json'], true);
        $updates[] = [
            'id' => (string) $row['update_id'],
            'title' => (string) $row['title'],
            'summary' => (string) $row['summary'],
            'changes' => is_array($changes) ? $changes : [],
            'isRead' => $row['read_update_id'] !== null,
            'createdAt' => date(DATE_ATOM, strtotime((string) $row['published_at']))
        ];
    }

    $unread = $pdo->prepare(
        'SELECT COUNT(*) FROM site_updates u
         LEFT JOIN site_update_reads r
           ON r.update_id = u.update_id AND r.user_id = :user_id
         WHERE r.update_id IS NULL'
    );
    $unread->execute(['user_id' => $user['user_id']]);
    respond(200, ['updates' => $updates, 'unreadCount' => (int) $unread->fetchColumn()]);
}

// บันทึกว่าผู้ใช้ปัจจุบันอ่านประกาศรายการหนึ่งแล้ว
if ($action === 'markRead') {
    $updateIdValue = $request['updateId'] ?? '';
    if (!is_string($updateIdValue)) {
        respond(422, ['message' => 'รหัสประกาศไม่ถูกต้อง']);
    }
    $updateId = $updateIdValue;
    if (!ctype_digit($updateId)) {
        respond(422, ['message' => 'รหัสประกาศไม่ถูกต้อง']);
    }
    $exists = $pdo->prepare('SELECT 1 FROM site_updates WHERE update_id = :id');
    $exists->execute(['id' => $updateId]);
    if (!$exists->fetchColumn()) {
        respond(404, ['message' => 'ไม่พบประกาศนี้']);
    }

    $insert = $pdo->prepare(
        'INSERT IGNORE INTO site_update_reads (update_id, user_id, read_at)
         VALUES (:update_id, :user_id, UTC_TIMESTAMP())'
    );
    $insert->execute(['update_id' => $updateId, 'user_id' => $user['user_id']]);
    respond(200, ['message' => 'ทำเครื่องหมายว่าอ่านแล้ว']);
}

// ทำเครื่องหมายประกาศทั้งหมดว่าอ่านแล้ว
if ($action === 'markAllRead') {
    $insert = $pdo->prepare(
        'INSERT IGNORE INTO site_update_reads (update_id, user_id, read_at)
         SELECT update_id, :user_id, UTC_TIMESTAMP() FROM site_updates'
    );
    $insert->execute(['user_id' => $user['user_id']]);
    respond(200, ['message' => 'ทำเครื่องหมายว่าอ่านประกาศทั้งหมดแล้ว']);
}

// ตรวจและคืนรายการไฟล์เว็บที่เปลี่ยนจาก snapshot ล่าสุด
if ($action === 'pending') {
    requireSiteUpdateDeveloper($user, $developerUserId);
    $currentFiles = scanSiteUpdateFiles();
    $previousFiles = readSiteUpdateFileState($pdo);
    if ($previousFiles === []) {
        initializeSiteUpdateBaseline($pdo, $currentFiles);
        $GLOBALS['databaseBackupRequired'] = true;
        respond(200, [
            'initialized' => true,
            'changes' => [],
            'message' => 'บันทึกจุดอ้างอิงเริ่มต้นแล้ว การเปลี่ยนแปลงหลังจากนี้จะแสดงที่นี่'
        ]);
    }
    respond(200, [
        'initialized' => false,
        'changes' => summarizeSiteUpdateChanges(diffSiteUpdateFiles($previousFiles, $currentFiles))
    ]);
}

// เผยแพร่ประกาศสรุปการเปลี่ยนแปลงที่ Developer ยืนยันแล้ว
if ($action === 'publish') {
    requireSiteUpdateDeveloper($user, $developerUserId);
    $titleValue = $request['title'] ?? '';
    $summaryValue = $request['summary'] ?? '';
    if (!is_string($titleValue) || !is_string($summaryValue)) {
        respond(422, ['message' => 'กรุณากรอกหัวข้อและสรุปประกาศเป็นข้อความ']);
    }
    $title = trim($titleValue);
    $summary = trim($summaryValue);
    if ($title === '' || siteUpdateTextLength($title) > 120
        || $summary === '' || siteUpdateTextLength($summary) > 500) {
        respond(422, ['message' => 'กรุณากรอกหัวข้อไม่เกิน 120 ตัวอักษรและสรุปไม่เกิน 500 ตัวอักษร']);
    }

    $currentFiles = scanSiteUpdateFiles();
    $previousFiles = readSiteUpdateFileState($pdo);
    $changes = summarizeSiteUpdateChanges(diffSiteUpdateFiles($previousFiles, $currentFiles));
    $pdo->beginTransaction();
    try {
        $insert = $pdo->prepare(
            'INSERT INTO site_updates (title, summary, changes_json, published_by, published_at)
             VALUES (:title, :summary, :changes, :published_by, UTC_TIMESTAMP())'
        );
        $insert->execute([
            'title' => $title,
            'summary' => $summary,
            'changes' => json_encode($changes, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'published_by' => $user['user_id']
        ]);
        saveSiteUpdateFileState($pdo, $currentFiles);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    respond(201, ['message' => 'เผยแพร่ประกาศอัปเดตเว็บไซต์แล้ว', 'changes' => $changes]);
}

respond(400, ['message' => 'ไม่รู้จักคำสั่งประกาศอัปเดต']);

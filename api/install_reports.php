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

require_once __DIR__ . '/backup_helper.php';
require_once __DIR__ . '/permissions.php';
require_once __DIR__ . '/task_schema.php';

/** ส่งผลลัพธ์ API เป็น JSON และสำรองข้อมูลเมื่อมีการบันทึกรายงาน */
function respond(int $status, array $data): never
{
    if ($status >= 200 && $status < 300) {
        addDatabaseBackupToResponse($data);
    }
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** ตรวจว่าอีเมลเป็นบัญชีบริษัทหรือบัญชี Developer ที่อนุญาต */
function isCompanyEmail(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false
        && str_ends_with(strtolower($email), '@rayong-oa.com');
}

/** นับความยาวข้อความ UTF-8 สำหรับตรวจข้อมูลรายงาน */
function reportTextLength(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }
    $count = preg_match_all('/./us', $value);
    return $count === false ? strlen($value) : $count;
}

/** ตรวจ session และโหลดผู้ใช้ที่มีสิทธิ์ดู/ส่งรายงานติดตั้ง */
function authenticatedReportUser(PDO $pdo, string $developerUserId): array
{
    $userId = (string) ($_SESSION['userId'] ?? '');
    if ($userId === '') {
        respond(401, ['message' => 'กรุณาเข้าสู่ระบบด้วยบัญชีบริษัท']);
    }

    $statement = $pdo->prepare('SELECT user_id, first_name, last_name, email, role_code FROM users WHERE user_id = :id LIMIT 1');
    $statement->execute(['id' => $userId]);
    $user = $statement->fetch();
    if (!$user || ($userId !== $developerUserId && !isCompanyEmail((string) $user['email']))) {
        $_SESSION = [];
        session_destroy();
        respond(401, ['message' => 'กรุณาเข้าสู่ระบบด้วยบัญชีบริษัท']);
    }
    return $user;
}

/** ตรวจชนิด ขนาด และข้อมูลภาพก่อนเก็บภาพในรายงาน */
function validateReportPhotos($photos): array
{
    if (!is_array($photos) || count($photos) < 1 || count($photos) > 5) {
        respond(422, ['message' => 'กรุณาแนบรูปภาพ 1 ถึง 5 รูป']);
    }

    $validated = [];
    $totalBytes = 0;
    foreach ($photos as $photo) {
        if (!is_string($photo)
            || !preg_match('/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+\/=]+)$/D', $photo, $matches)) {
            respond(422, ['message' => 'รูปภาพไม่ถูกต้อง กรุณาเลือกไฟล์ JPG, PNG หรือ WEBP']);
        }

        if (strlen($matches[2]) > 1066668) {
            respond(422, ['message' => 'รูปภาพแต่ละรูปต้องมีขนาดไม่เกิน 800 KB']);
        }
        $imageBytes = base64_decode($matches[2], true);
        if ($imageBytes === false || strlen($imageBytes) > 800000) {
            respond(422, ['message' => 'รูปภาพแต่ละรูปต้องมีขนาดไม่เกิน 800 KB']);
        }
        $imageInfo = @getimagesizefromstring($imageBytes);
        $expectedMime = 'image/' . $matches[1];
        if ($matches[1] === 'jpg' || $matches[1] === 'jpeg') {
            $expectedMime = 'image/jpeg';
        }
        if ($imageInfo === false || $imageInfo['mime'] !== $expectedMime) {
            respond(422, ['message' => 'ตรวจสอบรูปภาพไม่สำเร็จ กรุณาเลือกไฟล์รูปภาพใหม่']);
        }

        $totalBytes += strlen($imageBytes);
        if ($totalBytes > 4000000) {
            respond(422, ['message' => 'ขนาดรูปภาพรวมต้องไม่เกิน 4 MB']);
        }
        $validated[] = [
            'mime' => $expectedMime,
            'data' => $matches[2]
        ];
    }
    return $validated;
}

set_exception_handler(static function (Throwable $error): void {
    error_log('Install report request failed: ' . $error->getMessage());
    respond(500, ['message' => 'บันทึก Report ไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ']);
});

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['message' => 'รองรับเฉพาะคำขอ POST']);
}

$requestBody = file_get_contents('php://input');
if (strlen($requestBody) > 6000000) {
    respond(413, ['message' => 'ข้อมูล Report มีขนาดใหญ่เกินไป กรุณาลดขนาดรูปภาพ']);
}
$request = json_decode($requestBody, true);
if (!is_array($request)) {
    respond(400, ['message' => 'รูปแบบข้อมูลไม่ถูกต้อง']);
}

$config = require __DIR__ . '/config.php';
$developerUserId = (string) ($config['developerUserId'] ?? '');
try {
    $pdo = require __DIR__ . '/db.php';
} catch (PDOException $error) {
    error_log('Install report database connection failed: ' . $error->getMessage());
    respond(503, ['message' => 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบการตั้งค่า MySQL']);
}

$action = (string) ($request['action'] ?? '');
$GLOBALS['databaseBackupPdo'] = $pdo;
$GLOBALS['databaseBackupRequired'] = $action === 'submit';
$GLOBALS['databaseBackupRequired'] = ensureTaskSchema($pdo) || $GLOBALS['databaseBackupRequired'];
$GLOBALS['databaseBackupRequired'] = ensureRolePermissionSchema($pdo) || $GLOBALS['databaseBackupRequired'];
$user = authenticatedReportUser($pdo, $developerUserId);

// คืนงานที่เสร็จแล้วและยังไม่มีรายงานติดตั้ง
if ($action === 'tasks') {
    requireTaskPermission($pdo, $user, 'tasks.view');
    if (purgeExpiredTasks($pdo)) {
        $GLOBALS['databaseBackupRequired'] = true;
    }

    $statement = $pdo->prepare(
        'SELECT t.task_id, t.job_number, t.asset_identifier, t.detail, t.technician_name,
                d.department_name
         FROM tasks t
         LEFT JOIN departments d ON d.department_id = t.department_id
         WHERE t.status = :status
           AND t.deleted_at IS NULL
           AND TRIM(t.technician_name) <> \'\'
           AND NOT EXISTS (
               SELECT 1 FROM install_reports ir WHERE ir.task_id = t.task_id
           )
         ORDER BY t.opened_at DESC, t.task_id DESC'
    );
    $statement->execute(['status' => 'done']);
    $tasks = array_map(static fn (array $task): array => [
        'id' => (string) $task['task_id'],
        'taskId' => (string) $task['job_number'],
        'assetIdentifier' => (string) $task['asset_identifier'],
        'detail' => (string) $task['detail'],
        'department' => (string) ($task['department_name'] ?? ''),
        'technician' => (string) $task['technician_name']
    ], $statement->fetchAll());
    respond(200, ['tasks' => $tasks]);
}

// ตรวจ checklist/ภาพและบันทึกรายงานติดตั้งของงานที่เสร็จแล้ว
if ($action === 'submit') {
    requireTaskPermission($pdo, $user, 'tasks.view');
    if (purgeExpiredTasks($pdo)) {
        $GLOBALS['databaseBackupRequired'] = true;
    }

    $taskId = trim((string) ($request['taskId'] ?? ''));
    $computerType = trim((string) ($request['computerType'] ?? ''));
    $brand = trim((string) ($request['brand'] ?? ''));
    $specificationsChecked = ($request['specificationsChecked'] ?? null) === true;
    $neatnessChecked = ($request['neatnessChecked'] ?? null) === true;
    $warrantySealApplied = ($request['warrantySealApplied'] ?? null) === true;
    if (!ctype_digit($taskId)
        || $computerType === '' || reportTextLength($computerType) > 120
        || $brand === '' || reportTextLength($brand) > 120) {
        respond(422, ['message' => 'กรุณาเลือกงานและกรอกรูปแบบคอมพิวเตอร์กับยี่ห้อให้ถูกต้อง']);
    }
    if (!$specificationsChecked || !$neatnessChecked || !$warrantySealApplied) {
        respond(422, ['message' => 'กรุณายืนยันรายการตรวจสอบทุกข้อก่อนบันทึก']);
    }
    $photos = validateReportPhotos($request['photos'] ?? null);
    $photosJson = json_encode($photos, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

    $pdo->beginTransaction();
    try {
        $findTask = $pdo->prepare(
            'SELECT task_id, job_number, technician_name
             FROM tasks
             WHERE task_id = :id AND status = :status AND deleted_at IS NULL
               AND TRIM(technician_name) <> \'\'
             LIMIT 1 FOR UPDATE'
        );
        $findTask->execute(['id' => $taskId, 'status' => 'done']);
        $task = $findTask->fetch();
        if (!$task) {
            $pdo->rollBack();
            respond(404, ['message' => 'ไม่พบงานที่เสร็จแล้วและมีช่างรับผิดชอบ']);
        }

        $existing = $pdo->prepare('SELECT report_id FROM install_reports WHERE task_id = :id LIMIT 1 FOR UPDATE');
        $existing->execute(['id' => $taskId]);
        if ($existing->fetchColumn()) {
            $pdo->rollBack();
            respond(409, ['message' => 'งานนี้มี Report แล้ว ไม่สามารถส่งซ้ำได้']);
        }

        $insert = $pdo->prepare(
            'INSERT INTO install_reports
                (task_id, job_number, checker_name, checker_user_id, specifications_checked,
                 neatness_checked, warranty_seal_applied, computer_type, brand, photos_json, created_at)
             VALUES
                (:task_id, :job_number, :checker_name, :checker_user_id, 1, 1, 1,
                 :computer_type, :brand, :photos_json, UTC_TIMESTAMP())'
        );
        $insert->execute([
            'task_id' => $taskId,
            'job_number' => $task['job_number'],
            'checker_name' => $task['technician_name'],
            'checker_user_id' => $user['user_id'],
            'computer_type' => $computerType,
            'brand' => $brand,
            'photos_json' => $photosJson
        ]);
        $pdo->commit();
    } catch (PDOException $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($error->getCode() === '23000') {
            respond(409, ['message' => 'งานนี้มี Report แล้ว กรุณาโหลดรายการงานใหม่']);
        }
        throw $error;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }

    respond(201, ['message' => 'บันทึก Report เรียบร้อยแล้ว', 'jobNumber' => (string) $task['job_number']]);
}

respond(400, ['message' => 'ไม่รู้จักคำสั่ง Report']);

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

/** กำหนด HTTP status และส่งข้อมูล JSON กลับ พร้อมสำรองฐานข้อมูลเมื่อจำเป็น */
function respond(int $status, array $data): never
{
    if ($status >= 200 && $status < 300) {
        addDatabaseBackupToResponse($data);
    }
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

require_once __DIR__ . '/backup_helper.php';

set_exception_handler(static function (Throwable $error): void {
    error_log('Task API request failed: ' . $error->getMessage());
    respond(500, ['message' => 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ']);
});

/** ตรวจว่าที่อยู่อีเมลอยู่ในโดเมนบริษัท */
function isCompanyEmail(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false
        && str_ends_with(strtolower($email), '@rayong-oa.com');
}

/** ตรวจ session และโหลดบัญชีผู้ใช้ที่อนุญาตให้ใช้ Task API */
function authenticatedTaskUser(PDO $pdo, string $developerUserId): array
{
    $userId = (string) ($_SESSION['userId'] ?? '');
    if ($userId === '') {
        respond(401, ['message' => 'กรุณาเข้าสู่ระบบใหม่']);
    }

    $statement = $pdo->prepare('SELECT * FROM users WHERE user_id = :id LIMIT 1');
    $statement->execute(['id' => $userId]);
    $user = $statement->fetch();
    if (!$user || ($userId !== $developerUserId && !isCompanyEmail((string) $user['email']))) {
        $_SESSION = [];
        session_destroy();
        respond(401, ['message' => 'กรุณาเข้าสู่ระบบใหม่']);
    }
    return $user;
}

/** นับจำนวนอักขระ UTF-8 ให้เหมาะกับการตรวจขนาดข้อมูลภาษาไทย */
function textLength(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }
    $count = preg_match_all('/./us', $value);
    return $count === false ? strlen($value) : $count;
}

/** ตรวจวันที่รูปแบบ YYYY-MM-DD ว่าเป็นวันที่จริง */
function validDate(string $value): bool
{
    $date = DateTime::createFromFormat('!Y-m-d', $value);
    return $date !== false && $date->format('Y-m-d') === $value;
}

/** ตรวจและแปลงข้อมูลจากฟอร์มเป็นโครงสร้างพร้อมบันทึกลงตาราง tasks */
function normalizeTask(PDO $pdo, array $input): array
{
    $jobNumber = trim((string) ($input['taskId'] ?? $input['jobNumber'] ?? ''));
    $detail = trim((string) ($input['detail'] ?? ''));
    $departmentName = trim((string) ($input['department'] ?? ''));
    $requesterUserId = trim((string) ($input['requesterUserId'] ?? ''));
    $openedAt = trim((string) ($input['date'] ?? $input['openedAt'] ?? ''));
    $status = (string) ($input['status'] ?? 'waiting');
    $priority = (string) ($input['priority'] ?? 'medium');
    $jobName = trim((string) ($input['jobName'] ?? ''));
    $assetIdentifier = trim((string) ($input['assetIdentifier'] ?? ''));
    $ownerName = trim((string) ($input['owner'] ?? $input['assignee'] ?? ''));
    $technicianName = trim((string) ($input['technician'] ?? ''));
    $assistantId = trim((string) ($input['installationAssistantId'] ?? ''));
    $assistantName = trim((string) ($input['installationAssistant'] ?? ''));
    if ($assistantId !== '') {
        $assistant = $pdo->prepare(
            "SELECT first_name, last_name FROM users
             WHERE user_id = :id AND role_code IN ('technician', 'head_technician', 'intern')
             LIMIT 1"
        );
        $assistant->execute(['id' => $assistantId]);
        $assistantUser = $assistant->fetch();
        if (!$assistantUser) {
            respond(422, ['message' => 'ไม่พบช่างช่วยเหลือที่เลือก กรุณาเลือกช่างจากรายการ']);
        }
        $assistantName = trim((string) $assistantUser['first_name'] . ' ' . (string) $assistantUser['last_name']);
    }
    $dueAt = trim((string) ($input['dueAt'] ?? ''));
    $durationDays = $input['durationDays'] ?? null;

    if ($jobNumber === '' || textLength($jobNumber) > 100
        || $detail === '' || textLength($detail) > 65535
        || $departmentName === '' || textLength($departmentName) > 120
        || !validDate($openedAt)
        || !in_array($status, ['waiting', 'progress', 'done'], true)
        || !in_array($priority, ['low', 'medium', 'high'], true)
        || textLength($jobName) > 255 || textLength($assetIdentifier) > 255 || textLength($ownerName) > 200
        || textLength($technicianName) > 200 || textLength($assistantName) > 200) {
        respond(422, ['message' => 'กรุณาตรวจสอบข้อมูลของงานให้ถูกต้อง']);
    }
    if ($durationDays !== null && $durationDays !== '') {
        $durationDays = filter_var($durationDays, FILTER_VALIDATE_INT);
        if ($durationDays === false || $durationDays < 1 || $durationDays > 3650) {
            respond(422, ['message' => 'ระยะเวลาต้องอยู่ระหว่าง 1 ถึง 3,650 วัน']);
        }
        $dueDate = DateTime::createFromFormat('!Y-m-d', $openedAt);
        $dueDate->modify('+' . ($durationDays - 1) . ' days');
        $dueAt = $dueDate->format('Y-m-d');
    }
    if ($dueAt !== '' && (!validDate($dueAt) || $dueAt < $openedAt)) {
        respond(422, ['message' => 'วันกำหนดเสร็จต้องไม่อยู่ก่อนวันที่แจ้ง']);
    }

    $linkedRequester = $pdo->prepare(
        'SELECT user_id, first_name, last_name FROM users'
    );
    $linkedRequester->execute();
    $requesterFound = false;
    foreach ($linkedRequester->fetchAll() as $requester) {
        $requesterName = trim((string) $requester['first_name'] . ' ' . (string) $requester['last_name']);
        if ($requesterName === $departmentName) {
            $requesterFound = true;
            break;
        }
    }
    if (!$requesterFound) {
        $legacyDepartment = $pdo->prepare('SELECT department_id FROM departments WHERE department_name = :name LIMIT 1');
        $legacyDepartment->execute(['name' => $departmentName]);
        if (!$legacyDepartment->fetchColumn()) {
            respond(422, ['message' => 'ไม่พบชื่อผู้แจ้งที่เลือก กรุณาเลือกจากข้อมูลโปรไฟล์']);
        }
    } else {
        $insertDepartment = $pdo->prepare(
            'INSERT IGNORE INTO departments (department_name) VALUES (:name)'
        );
        $insertDepartment->execute(['name' => $departmentName]);
    }

    if ($requesterUserId !== '') {
        $requester = $pdo->prepare(
            'SELECT first_name, last_name FROM users WHERE user_id = :id LIMIT 1'
        );
        $requester->execute(['id' => $requesterUserId]);
        $requesterUser = $requester->fetch();
        if (!$requesterUser) {
            respond(422, ['message' => 'ไม่พบผู้ที่แจ้งที่เลือก กรุณาเลือกจากข้อมูลโปรไฟล์']);
        }
        $departmentName = trim(
            (string) $requesterUser['first_name'] . ' ' . (string) $requesterUser['last_name']
        );
    } elseif ($departmentName !== '') {
        $requester = $pdo->prepare(
            'SELECT user_id, first_name, last_name FROM users
             WHERE TRIM(CONCAT(first_name, " ", last_name)) = :name LIMIT 1'
        );
        $requester->execute(['name' => $departmentName]);
        $requesterUser = $requester->fetch();
        $requesterUserId = $requesterUser ? (string) $requesterUser['user_id'] : '';
    }

    $department = $pdo->prepare('SELECT department_id FROM departments WHERE department_name = :name LIMIT 1');
    $department->execute(['name' => $departmentName]);
    $departmentId = $department->fetchColumn();
    if ($departmentId === false) {
        respond(422, ['message' => 'ไม่พบแผนกที่เลือก กรุณาติดต่อผู้ดูแลระบบ']);
    }

    return [
        'job_number' => $jobNumber,
        'job_name' => $jobName === '' ? null : $jobName,
        'asset_identifier' => $assetIdentifier,
        'detail' => $detail,
        'department_id' => (int) $departmentId,
        'requester_user_id' => $requesterUserId === '' ? null : $requesterUserId,
        'owner_name' => $ownerName,
        'technician_name' => $technicianName,
        'installation_assistant_name' => $assistantName === '' ? null : $assistantName,
        'status' => $status,
        'priority' => $priority,
        'opened_at' => $openedAt,
        'due_at' => $dueAt === '' ? null : $dueAt
    ];
}

/** คำนวณจำนวนวันระหว่างวันที่เปิดงานกับกำหนดส่ง */
function taskDurationDays(string $openedAt, ?string $dueAt): ?int
{
    if ($dueAt === null || $dueAt < $openedAt) {
        return null;
    }
    $openedDate = DateTime::createFromFormat('!Y-m-d', $openedAt);
    $dueDate = DateTime::createFromFormat('!Y-m-d', $dueAt);
    if ($openedDate === false || $dueDate === false) {
        return null;
    }
    return (int) $openedDate->diff($dueDate)->days + 1;
}

/** แปลงแถวฐานข้อมูลเป็นรูปแบบข้อมูลที่ส่งให้หน้าเว็บ */
function publicTask(array $task): array
{
    $requesterName = trim(
        (string) ($task['requester_first_name'] ?? '') . ' ' .
        (string) ($task['requester_last_name'] ?? '')
    );
    return [
        'id' => (string) $task['task_id'],
        'taskId' => (string) $task['job_number'],
        'jobName' => (string) ($task['job_name'] ?? ''),
        'assetIdentifier' => (string) ($task['asset_identifier'] ?? ''),
        'department' => $requesterName !== '' ? $requesterName : (string) ($task['department_name'] ?? ''),
        'requesterId' => (string) ($task['requester_user_id'] ?? ''),
        'detail' => (string) $task['detail'],
        'date' => (string) $task['opened_at'],
        'dueAt' => $task['due_at'] === null ? '' : (string) $task['due_at'],
        'durationDays' => taskDurationDays((string) $task['opened_at'], $task['due_at'] === null ? null : (string) $task['due_at']),
        'owner' => (string) $task['owner_name'],
        'technician' => (string) $task['technician_name'],
        'installationAssistant' => (string) ($task['installation_assistant_name'] ?? ''),
        'priority' => (string) $task['priority'],
        'status' => (string) $task['status'],
        'reportSubmitted' => (bool) ($task['report_submitted'] ?? false),
        'createdAt' => date(DATE_ATOM, strtotime((string) $task['created_at']))
    ];
}

/** ค้นหางานตาม ID และล็อกแถวเมื่อกำลังทำรายการแบบ transaction */
function findTask(PDO $pdo, string $id, bool $forUpdate = false): ?array
{
    if (!ctype_digit($id)) {
        return null;
    }
    $statement = $pdo->prepare(
        'SELECT task_id, job_number, status, technician_name, installation_assistant_name
         FROM tasks WHERE task_id = :id AND deleted_at IS NULL LIMIT 1' . ($forUpdate ? ' FOR UPDATE' : '')
    );
    $statement->execute(['id' => $id]);
    $task = $statement->fetch();
    return $task ?: null;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['message' => 'รองรับเฉพาะคำขอ POST']);
}

$request = json_decode(file_get_contents('php://input'), true);
if (!is_array($request)) {
    respond(400, ['message' => 'รูปแบบข้อมูลไม่ถูกต้อง']);
}

$config = require __DIR__ . '/config.php';
$developerUserId = (string) ($config['developerUserId'] ?? '');
try {
    $pdo = require __DIR__ . '/db.php';
} catch (PDOException $error) {
    error_log('Task API database connection failed: ' . $error->getMessage());
    respond(503, ['message' => 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบการตั้งค่า MySQL']);
}

require_once __DIR__ . '/permissions.php';
require_once __DIR__ . '/notifications.php';
require_once __DIR__ . '/task_schema.php';
$action = (string) ($request['action'] ?? '');
$databaseWriteActions = [
    'markNotificationsRead',
    'assignTechnician',
    'assignAssistant',
    'seedSamples',
    'importLegacy',
    'create',
    'update',
    'bulkUpdate',
    'bulkDelete',
    'delete',
    'restore',
    'updateStatus'
];
$GLOBALS['databaseBackupPdo'] = $pdo;
$GLOBALS['databaseBackupRequired'] = in_array($action, $databaseWriteActions, true);
$GLOBALS['databaseBackupRequired'] = ensureTaskSchema($pdo) || $GLOBALS['databaseBackupRequired'];
$GLOBALS['databaseBackupRequired'] = ensureRolePermissionSchema($pdo) || $GLOBALS['databaseBackupRequired'];
$GLOBALS['databaseBackupRequired'] = ensureNotificationsTable($pdo) || $GLOBALS['databaseBackupRequired'];
$currentUser = authenticatedTaskUser($pdo, $developerUserId);

// คืนการแจ้งเตือนล่าสุดและจำนวนรายการที่ยังไม่ได้อ่าน
if ($action === 'notifications') {
    $statement = $pdo->prepare(
        'SELECT notification_id, task_id, event_type, title, message, is_read, created_at
         FROM notifications
         WHERE user_id = :user_id
         ORDER BY created_at DESC, notification_id DESC
         LIMIT 30'
    );
    $statement->execute(['user_id' => $currentUser['user_id']]);
    $rows = $statement->fetchAll();
    $unread = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND is_read = 0');
    $unread->execute(['user_id' => $currentUser['user_id']]);
    respond(200, [
        'notifications' => array_map(static fn (array $notification): array => [
            'id' => (string) $notification['notification_id'],
            'taskId' => (string) $notification['task_id'],
            'type' => (string) $notification['event_type'],
            'title' => (string) $notification['title'],
            'message' => (string) $notification['message'],
            'isRead' => (bool) $notification['is_read'],
            'createdAt' => date(DATE_ATOM, strtotime((string) $notification['created_at']))
        ], $rows),
        'unreadCount' => (int) $unread->fetchColumn()
    ]);
}

// ทำเครื่องหมายการแจ้งเตือนของผู้ใช้ปัจจุบันว่าอ่านแล้ว
if ($action === 'markNotificationsRead') {
    $notificationId = (string) ($request['notificationId'] ?? '');
    if ($notificationId === '') {
        $statement = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = :user_id AND is_read = 0');
        $statement->execute(['user_id' => $currentUser['user_id']]);
    } elseif (ctype_digit($notificationId)) {
        $statement = $pdo->prepare(
            'UPDATE notifications SET is_read = 1
             WHERE notification_id = :notification_id AND user_id = :user_id'
        );
        $statement->execute([
            'notification_id' => $notificationId,
            'user_id' => $currentUser['user_id']
        ]);
        $check = $pdo->prepare('SELECT 1 FROM notifications WHERE notification_id = :id AND user_id = :user_id');
        $check->execute(['id' => $notificationId, 'user_id' => $currentUser['user_id']]);
        if (!$check->fetchColumn()) {
            respond(404, ['message' => 'ไม่พบการแจ้งเตือนนี้']);
        }
    } else {
        respond(422, ['message' => 'รหัสการแจ้งเตือนไม่ถูกต้อง']);
    }
    respond(200, ['message' => 'ทำเครื่องหมายว่าอ่านแล้ว']);
}

// แสดงรายการงานที่ยังไม่ถูกลบ พร้อมสิทธิ์ของผู้ใช้
if ($action === 'list') {
    requireTaskPermission($pdo, $currentUser, 'tasks.view');
    if (purgeExpiredTasks($pdo)) {
        $GLOBALS['databaseBackupRequired'] = true;
    }
    $rows = $pdo->query(
        'SELECT t.*, d.department_name,
                ru.first_name AS requester_first_name,
                ru.last_name AS requester_last_name,
                EXISTS (SELECT 1 FROM install_reports ir WHERE ir.task_id = t.task_id) AS report_submitted
         FROM tasks t
         LEFT JOIN departments d ON d.department_id = t.department_id
         LEFT JOIN users ru ON ru.user_id = t.requester_user_id
         WHERE t.deleted_at IS NULL
         ORDER BY t.opened_at DESC, t.task_id DESC'
    )->fetchAll();
    respond(200, [
        'tasks' => array_map('publicTask', $rows),
        'permissions' => getRolePermissions($pdo, (string) $currentUser['role_code'])
    ]);
}

// แสดงงานในถังขยะสำหรับผู้ใช้ที่มีสิทธิ์ลบงาน
if ($action === 'trash') {
    requireTaskPermission($pdo, $currentUser, 'tasks.delete');
    if (purgeExpiredTasks($pdo)) {
        $GLOBALS['databaseBackupRequired'] = true;
    }
    $rows = $pdo->query(
        'SELECT t.*, d.department_name,
                ru.first_name AS requester_first_name,
                ru.last_name AS requester_last_name,
                DATE_ADD(t.deleted_at, INTERVAL 30 DAY) AS expires_at
         FROM tasks t
         LEFT JOIN departments d ON d.department_id = t.department_id
         LEFT JOIN users ru ON ru.user_id = t.requester_user_id
         WHERE t.deleted_at IS NOT NULL
         ORDER BY t.deleted_at DESC, t.task_id DESC'
    )->fetchAll();
    $trashedTasks = array_map(static function (array $row): array {
        $task = publicTask($row);
        $task['deletedAt'] = gmdate(DATE_ATOM, strtotime((string) $row['deleted_at'] . ' UTC'));
        $task['expiresAt'] = gmdate(DATE_ATOM, strtotime((string) $row['expires_at'] . ' UTC'));
        return $task;
    }, $rows);
    respond(200, ['tasks' => $trashedTasks]);
}

// กู้คืนงานจากถังขยะก่อนหมดระยะเวลาเก็บรักษา
if ($action === 'restore') {
    requireTaskPermission($pdo, $currentUser, 'tasks.delete');
    if (purgeExpiredTasks($pdo)) {
        $GLOBALS['databaseBackupRequired'] = true;
    }
    $taskId = (string) ($request['id'] ?? '');
    if (!ctype_digit($taskId)) {
        respond(422, ['message' => 'รหัสงานไม่ถูกต้อง']);
    }

    $pdo->beginTransaction();
    try {
        $find = $pdo->prepare(
            'SELECT deleted_at FROM tasks WHERE task_id = :id LIMIT 1 FOR UPDATE'
        );
        $find->execute(['id' => $taskId]);
        $deletedAt = $find->fetchColumn();
        if ($deletedAt === false || $deletedAt === null) {
            $pdo->rollBack();
            respond(404, ['message' => 'ไม่พบงานนี้ในถังขยะ']);
        }

        $restoreTask = $pdo->prepare(
            'UPDATE tasks SET deleted_at = NULL WHERE task_id = :id AND deleted_at = :deleted_at'
        );
        $restoreTask->execute(['id' => $taskId, 'deleted_at' => $deletedAt]);
        if ($restoreTask->rowCount() !== 1) {
            throw new RuntimeException('Task restore affected an unexpected number of tasks.');
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    respond(200, ['message' => 'กู้คืนงานแล้ว']);
}

// คืนรายชื่อช่างที่เลือกเป็นผู้รับผิดชอบงานได้
if ($action === 'technicians') {
    requireTaskPermission($pdo, $currentUser, 'tasks.view');
    $rows = $pdo->query(
        "SELECT user_id, first_name, last_name, role_code
         FROM users
         WHERE role_code IN ('technician', 'head_technician')
         ORDER BY first_name, last_name"
    )->fetchAll();
    respond(200, [
        'technicians' => array_map(static fn (array $technician): array => [
            'id' => (string) $technician['user_id'],
            'name' => trim((string) $technician['first_name'] . ' ' . (string) $technician['last_name']),
            'role' => (string) $technician['role_code']
        ], $rows)
    ]);
}

// คืนรายชื่อผู้ใช้สำหรับเลือกเป็นผู้แจ้งงาน
if ($action === 'requesters') {
    requireTaskPermission($pdo, $currentUser, 'tasks.view');
    $rows = $pdo->query(
        'SELECT user_id, first_name, last_name, role_code
         FROM users
         ORDER BY first_name, last_name'
    )->fetchAll();
    respond(200, [
        'requesters' => array_map(static fn (array $requester): array => [
            'id' => (string) $requester['user_id'],
            'name' => trim((string) $requester['first_name'] . ' ' . (string) $requester['last_name']),
            'role' => (string) $requester['role_code']
        ], $rows)
    ]);
}

// คืนรายชื่อช่างและผู้ช่วยที่เลือกมอบหมายได้
if ($action === 'assistants') {
    requireTaskPermission($pdo, $currentUser, 'tasks.view');
    $rows = $pdo->query(
        "SELECT user_id, first_name, last_name, role_code
         FROM users
         WHERE role_code IN ('technician', 'head_technician', 'intern')
         ORDER BY first_name, last_name"
    )->fetchAll();
    respond(200, [
        'assistants' => array_map(static fn (array $assistant): array => [
            'id' => (string) $assistant['user_id'],
            'name' => trim((string) $assistant['first_name'] . ' ' . (string) $assistant['last_name']),
            'role' => (string) $assistant['role_code']
        ], $rows)
    ]);
}

// มอบหมายหรือยกเลิกช่างผู้รับผิดชอบของงาน
if ($action === 'assignTechnician') {
    requireTaskPermission($pdo, $currentUser, 'tasks.edit');
    $taskId = (string) ($request['id'] ?? '');
    $technicianId = trim((string) ($request['technicianId'] ?? ''));
    $task = findTask($pdo, $taskId);
    if (!$task) {
        respond(404, ['message' => 'ไม่พบรายการงาน']);
    }

    $technician = null;
    if ($technicianId !== '') {
        $statement = $pdo->prepare(
            "SELECT user_id, first_name, last_name
             FROM users
             WHERE user_id = :id AND role_code IN ('technician', 'head_technician')
             LIMIT 1"
        );
        $statement->execute(['id' => $technicianId]);
        $technician = $statement->fetch();
        if (!$technician) {
            respond(422, ['message' => 'ไม่พบช่างที่เลือก กรุณาเลือกช่างจากรายการ']);
        }
    }

    $technicianName = $technician
        ? trim((string) $technician['first_name'] . ' ' . (string) $technician['last_name'])
        : '';
    $pdo->beginTransaction();
    try {
        if ((string) $task['technician_name'] !== $technicianName) {
            $update = $pdo->prepare(
                'UPDATE tasks SET technician_name = :technician WHERE task_id = :id AND deleted_at IS NULL'
            );
            $update->execute(['technician' => $technicianName, 'id' => $taskId]);
        }
        if ($technician && (string) $task['technician_name'] !== $technicianName) {
            addTaskNotifications(
                $pdo,
                (int) $taskId,
                'task_assigned',
                'มีงานมอบหมายให้คุณ',
                'งาน ' . $task['job_number'] . ' ถูกมอบหมายให้คุณ',
                [(string) $technician['user_id']]
            );
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    respond(200, ['message' => 'บันทึกช่างผู้รับผิดชอบแล้ว']);
}

// มอบหมายหรือยกเลิกช่างผู้ช่วยของงาน
if ($action === 'assignAssistant') {
    requireTaskPermission($pdo, $currentUser, 'tasks.edit');
    $taskId = (string) ($request['id'] ?? '');
    $assistantId = trim((string) ($request['technicianId'] ?? ''));
    $task = findTask($pdo, $taskId);
    if (!$task) {
        respond(404, ['message' => 'ไม่พบรายการงาน']);
    }

    $assistant = null;
    if ($assistantId !== '') {
        $statement = $pdo->prepare(
            "SELECT user_id, first_name, last_name
             FROM users
             WHERE user_id = :id AND role_code IN ('technician', 'head_technician', 'intern')
             LIMIT 1"
        );
        $statement->execute(['id' => $assistantId]);
        $assistant = $statement->fetch();
        if (!$assistant) {
            respond(422, ['message' => 'ไม่พบช่างช่วยเหลือที่เลือก กรุณาเลือกช่างจากรายการ']);
        }
    }

    $assistantName = $assistant
        ? trim((string) $assistant['first_name'] . ' ' . (string) $assistant['last_name'])
        : '';
    $pdo->beginTransaction();
    try {
        $update = $pdo->prepare(
            'UPDATE tasks SET installation_assistant_name = :assistant
             WHERE task_id = :id AND deleted_at IS NULL'
        );
        $update->execute(['assistant' => $assistantName === '' ? null : $assistantName, 'id' => $taskId]);
        if ($assistant && (string) ($task['installation_assistant_name'] ?? '') !== $assistantName) {
            addTaskNotifications(
                $pdo,
                (int) $taskId,
                'task_assigned',
                'มีงานมอบหมายให้ช่วยเหลือ',
                'งาน ' . $task['job_number'] . ' ถูกมอบหมายให้คุณช่วยเหลือ',
                [(string) $assistant['user_id']]
            );
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    respond(200, ['message' => 'บันทึกช่างที่ช่วยเหลือแล้ว']);
}

// คืนสิทธิ์ของ Role ที่เข้าสู่ระบบอยู่
if ($action === 'permissions') {
    respond(200, ['permissions' => getRolePermissions($pdo, (string) $currentUser['role_code'])]);
}

// เพิ่มชุดข้อมูลงานตัวอย่างสำหรับผู้ดูแลที่ได้รับอนุญาต
if ($action === 'seedSamples') {
    if (!in_array($currentUser['role_code'], ['admin', 'developer'], true)) {
        respond(403, ['message' => 'เฉพาะ Admin และ Developer เท่านั้นที่เพิ่มชุดงานทดสอบได้']);
    }

    $samples = [
        ['2026-09-01', 2, 'ฝ่ายอาคาร', 'ตรวจสอบระบบไฟส่องสว่างชั้น 1', 'ทีมอาคาร', 'ช่างสมชาย', 'done', 'medium'],
        ['2026-09-04', 3, 'ฝ่ายไอที', 'ติดตั้งจุดเชื่อมต่อเครือข่ายห้องประชุม', 'คุณกานต์', 'ช่างวิชัย', 'done', 'high'],
        ['2026-09-07', 1, 'ฝ่ายบัญชี', 'ย้ายตำแหน่งเครื่องพิมพ์และทดสอบการเชื่อมต่อ', 'คุณณัฐ', 'ช่างปรีชา', 'done', 'low'],
        ['2026-09-10', 4, 'ฝ่ายบุคคล', 'ติดตั้งปลั๊กไฟเพิ่มเติมบริเวณห้องอบรม', 'คุณกานต์', 'ช่างสมชาย', 'done', 'medium'],
        ['2026-09-13', 2, 'ฝ่ายอาคาร', 'ซ่อมบำรุงประตูทางเข้าอาคารสำนักงาน', 'ทีมอาคาร', 'ช่างวิชัย', 'done', 'high'],
        ['2026-09-16', 5, 'ฝ่ายไอที', 'จัดระเบียบสายสัญญาณในห้องเซิร์ฟเวอร์', 'คุณณัฐ', 'ช่างปรีชา', 'done', 'medium'],
        ['2026-09-19', 3, 'ฝ่ายบัญชี', 'ตรวจเช็กเครื่องสำรองไฟประจำแผนก', 'คุณกานต์', 'ช่างสมชาย', 'done', 'low'],
        ['2026-09-22', 6, 'ฝ่ายบุคคล', 'ติดตั้งโคมไฟ LED ในพื้นที่ทำงาน', 'ทีมอาคาร', 'ช่างวิชัย', 'done', 'medium'],
        ['2026-09-25', 2, 'ฝ่ายไอที', 'แก้ไขสัญญาณ Wi-Fi บริเวณชั้น 2', 'คุณณัฐ', 'ช่างปรีชา', 'done', 'high'],
        ['2026-09-28', 4, 'ฝ่ายอาคาร', 'ตรวจสอบระบบระบายอากาศห้องประชุม', 'ทีมอาคาร', 'ช่างสมชาย', 'done', 'medium'],
        ['2026-10-01', 3, 'ฝ่ายบัญชี', 'ติดตั้งและตั้งค่าเครื่องอ่านบัตรพนักงาน', 'คุณกานต์', 'ช่างวิชัย', 'done', 'low'],
        ['2026-10-04', 5, 'ฝ่ายไอที', 'เปลี่ยนอุปกรณ์กระจายสัญญาณเครือข่าย', 'คุณณัฐ', 'ช่างปรีชา', 'progress', 'high'],
        ['2026-10-07', 2, 'ฝ่ายบุคคล', 'ตรวจสอบระบบเสียงและไมโครโฟนห้องอบรม', 'คุณกานต์', 'ช่างสมชาย', 'progress', 'medium'],
        ['2026-10-09', 3, 'ฝ่ายอาคาร', 'ซ่อมก๊อกน้ำและตรวจสอบจุดรั่วซึม', 'ทีมอาคาร', 'ช่างวิชัย', 'waiting', 'low'],
        ['2026-10-11', 2, 'ฝ่ายไอที', 'ติดตั้งโปรแกรมและอัปเดตเครื่องคอมพิวเตอร์', 'คุณณัฐ', 'ช่างปรีชา', 'waiting', 'medium'],
        ['2026-10-13', 1, 'ฝ่ายบัญชี', 'ตรวจสอบเครื่องพิมพ์และเติมวัสดุสิ้นเปลือง', 'คุณกานต์', 'ช่างสมชาย', 'waiting', 'low']
    ];
    $existingLegacy = $pdo->prepare('SELECT 1 FROM tasks WHERE legacy_id = :id LIMIT 1');
    $existingNumber = $pdo->prepare('SELECT 1 FROM tasks WHERE job_number = :number LIMIT 1');
    $insert = $pdo->prepare(
        'INSERT INTO tasks
         (legacy_id, job_number, job_name, asset_identifier, detail, department_id, requester_user_id, owner_name, technician_name,
          installation_assistant_name, status, priority, opened_at, due_at, created_at)
         VALUES
         (:legacy_id, :job_number, :job_name, :asset_identifier, :detail, :department_id, :requester_user_id, :owner_name, :technician_name,
          :installation_assistant_name, :status, :priority, :opened_at, :due_at, UTC_TIMESTAMP())'
    );
    $history = $pdo->prepare(
        'INSERT INTO task_status_history (task_id, old_status, new_status, changed_by_user_id)
         VALUES (:task_id, NULL, :status, :user_id)'
    );
    $added = 0;
    $pdo->beginTransaction();
    try {
        foreach ($samples as [$date, $duration, $department, $detail, $owner, $technician, $status, $priority]) {
            $sampleId = 'demo-' . str_replace('-', '', $date) . '-01';
            $jobNumber = 'DEMO-' . str_replace('-', '', $date) . '-01';
            $existingLegacy->execute(['id' => $sampleId]);
            $existingNumber->execute(['number' => $jobNumber]);
            if ($existingLegacy->fetchColumn() || $existingNumber->fetchColumn()) {
                continue;
            }

            $task = normalizeTask($pdo, [
                'taskId' => $jobNumber,
                'department' => $department,
                'detail' => $detail,
                'date' => $date,
                'durationDays' => $duration,
                'owner' => $owner,
                'technician' => $technician,
                'priority' => $priority,
                'status' => $status
            ]);
            $insert->execute($task + ['legacy_id' => $sampleId]);
            $history->execute([
                'task_id' => (int) $pdo->lastInsertId(),
                'status' => $task['status'],
                'user_id' => (string) $currentUser['user_id']
            ]);
            $added++;
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Sample task seeding failed: ' . $error->getMessage());
        respond(500, ['message' => 'เพิ่มชุดงานทดสอบไม่สำเร็จ กรุณาลองใหม่']);
    }
    respond(200, ['message' => 'เพิ่มชุดงานทดสอบแล้ว', 'added' => $added]);
}

// นำเข้างานจากรูปแบบข้อมูลเดิมภายใต้สิทธิ์สร้างงาน
if ($action === 'importLegacy') {
    requireTaskPermission($pdo, $currentUser, 'tasks.create');
    $legacyTasks = $request['tasks'] ?? [];
    if (!is_array($legacyTasks) || count($legacyTasks) > 2000) {
        respond(422, ['message' => 'ข้อมูลรายการงานเดิมไม่ถูกต้องหรือมีจำนวนมากเกินไป']);
    }

    $existingLegacy = $pdo->prepare('SELECT 1 FROM tasks WHERE legacy_id = :id');
    $existingNumber = $pdo->prepare('SELECT 1 FROM tasks WHERE job_number = :number');
    $insert = $pdo->prepare(
        'INSERT INTO tasks
          (legacy_id, job_number, job_name, asset_identifier, detail, department_id, owner_name, technician_name,
           installation_assistant_name, status, priority, opened_at, due_at, created_at)
         VALUES
          (:legacy_id, :job_number, :job_name, :asset_identifier, :detail, :department_id, :owner_name, :technician_name,
           :installation_assistant_name, :status, :priority, :opened_at, NULL, :created_at)'
    );
    $imported = 0;
    $alreadyImported = 0;
    $skipped = 0;
    $pdo->beginTransaction();
    try {
        foreach ($legacyTasks as $legacyTask) {
            if (!is_array($legacyTask)) {
                $skipped++;
                continue;
            }
            $legacyId = trim((string) ($legacyTask['id'] ?? ''));
            if ($legacyId === '' || strlen($legacyId) > 64) {
                $skipped++;
                continue;
            }
            $existingLegacy->execute(['id' => $legacyId]);
            if ($existingLegacy->fetchColumn()) {
                $alreadyImported++;
                continue;
            }

            $jobNumber = trim((string) ($legacyTask['taskId'] ?? ''));
            $existingNumber->execute(['number' => $jobNumber]);
            if ($jobNumber === '' || $existingNumber->fetchColumn()) {
                $skipped++;
                continue;
            }

            $task = normalizeTask($pdo, $legacyTask);
            $createdAt = strtotime((string) ($legacyTask['createdAt'] ?? '')) ?: time();
            $insert->execute($task + [
                'legacy_id' => $legacyId,
                'created_at' => gmdate('Y-m-d H:i:s', $createdAt)
            ]);
            $taskId = (int) $pdo->lastInsertId();
            $history = $pdo->prepare(
                'INSERT INTO task_status_history (task_id, old_status, new_status, changed_by_user_id)
                 VALUES (:task_id, NULL, :status, :user_id)'
            );
            $history->execute([
                'task_id' => $taskId,
                'status' => $task['status'],
                'user_id' => (string) $_SESSION['userId']
            ]);
            $imported++;
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Legacy task import failed: ' . $error->getMessage());
        respond(500, ['message' => 'นำเข้างานเดิมไม่สำเร็จ กรุณาลองใหม่']);
    }
    respond(200, [
        'message' => 'ตรวจสอบและนำเข้างานเดิมแล้ว',
        'imported' => $imported,
        'alreadyImported' => $alreadyImported,
        'skipped' => $skipped
    ]);
}

// ตรวจข้อมูลและสร้างงานใหม่ รวมถึงรองรับ Serial Number หลายรายการ
if ($action === 'create') {
    requireTaskPermission($pdo, $currentUser, 'tasks.create');
    $assetIdentifiers = $request['assetIdentifiers'] ?? [$request['assetIdentifier'] ?? ''];
    if (is_string($assetIdentifiers)) {
        $assetIdentifiers = preg_split('/\R/u', $assetIdentifiers);
    }
    if (!is_array($assetIdentifiers) || count($assetIdentifiers) > 100) {
        respond(422, ['message' => 'รายการอุปกรณ์ไม่ถูกต้องหรือมีมากกว่า 100 เครื่อง']);
    }
    $assetIdentifiers = array_values(array_map(
        static fn ($identifier): string => is_scalar($identifier) ? trim((string) $identifier) : '',
        $assetIdentifiers
    ));
    if (!$assetIdentifiers) {
        $assetIdentifiers = [''];
    }
    if (count($assetIdentifiers) > 1 && in_array('', $assetIdentifiers, true)) {
        respond(422, ['message' => 'กรุณาระบุหมายเลขหรือชื่อเครื่องให้ครบทุกบรรทัด']);
    }
    if (count($assetIdentifiers) !== count(array_unique($assetIdentifiers))) {
        respond(422, ['message' => 'หมายเลขหรือชื่อเครื่องในรายการซ้ำกัน กรุณาตรวจสอบ']);
    }
    $tasks = array_map(
        static fn (string $identifier): array => normalizeTask(
            $pdo,
            array_replace($request, ['status' => 'waiting', 'assetIdentifier' => $identifier])
        ),
        $assetIdentifiers
    );
    try {
        $pdo->beginTransaction();
        $statement = $pdo->prepare(
            'INSERT INTO tasks
             (job_number, job_name, asset_identifier, detail, department_id, requester_user_id, owner_name, technician_name,
              installation_assistant_name, status, priority, opened_at, due_at, created_at)
             VALUES
             (:job_number, :job_name, :asset_identifier, :detail, :department_id, :requester_user_id, :owner_name, :technician_name,
              :installation_assistant_name, :status, :priority, :opened_at, :due_at, UTC_TIMESTAMP())'
        );
        $history = $pdo->prepare(
            'INSERT INTO task_status_history (task_id, old_status, new_status, changed_by_user_id)
             VALUES (:task_id, NULL, :status, :user_id)'
        );
        $recipients = $pdo->query('SELECT user_id FROM users');
        $recipientIds = array_column($recipients->fetchAll(), 'user_id');
        $taskIds = [];
        foreach ($tasks as $task) {
            $statement->execute($task);
            $taskId = (int) $pdo->lastInsertId();
            $taskIds[] = (string) $taskId;
            $history->execute([
                'task_id' => $taskId,
                'status' => $task['status'],
                'user_id' => (string) $_SESSION['userId']
            ]);
            $unitLabel = $task['asset_identifier'] === '' ? '' : ' (' . $task['asset_identifier'] . ')';
            addTaskNotifications(
                $pdo,
                $taskId,
                'task_created',
                'มีงานใหม่รอรับผิดชอบ',
                'งาน ' . $task['job_number'] . $unitLabel . ' ถูกสร้างแล้วและอยู่ในสถานะรอดำเนินการ',
                $recipientIds
            );
        }
        $pdo->commit();
        respond(201, [
            'message' => count($taskIds) > 1 ? 'บันทึกงานอุปกรณ์ ' . count($taskIds) . ' เครื่องแล้ว' : 'บันทึกงานแล้ว',
            'id' => $taskIds[0],
            'ids' => $taskIds,
            'count' => count($taskIds)
        ]);
    } catch (PDOException $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($error->getCode() === '23000') {
            respond(409, ['message' => 'เลขที่งานและหมายเลขเครื่องนี้มีอยู่แล้ว กรุณาตรวจสอบเลขที่งานหรือหมายเลขเครื่อง']);
        }
        throw $error;
    }
}

// ย้ายงานหลายรายการไปถังขยะใน transaction เดียว
if ($action === 'bulkDelete') {
    requireTaskPermission($pdo, $currentUser, 'tasks.delete');
    $ids = $request['ids'] ?? null;
    if (!is_array($ids) || $ids === [] || count($ids) > 100) {
        respond(422, ['message' => 'กรุณาเลือกงาน 1 ถึง 100 รายการเพื่อลบ']);
    }

    $ids = array_map(
        static fn ($id): string => is_scalar($id) ? (string) $id : '',
        $ids
    );
    if (count($ids) !== count(array_unique($ids))
        || array_filter($ids, static fn (string $id): bool => !ctype_digit($id)) !== []) {
        respond(422, ['message' => 'พบรหัสงานไม่ถูกต้องหรือซ้ำกัน']);
    }

    $placeholders = implode(', ', array_fill(0, count($ids), '?'));
    $pdo->beginTransaction();
    try {
        $find = $pdo->prepare(
            "SELECT task_id FROM tasks WHERE task_id IN ($placeholders) AND deleted_at IS NULL FOR UPDATE"
        );
        $find->execute($ids);
        if (count($find->fetchAll(PDO::FETCH_COLUMN)) !== count($ids)) {
            $pdo->rollBack();
            respond(404, ['message' => 'งานบางรายการไม่พบหรืออยู่ในถังขยะ กรุณาโหลดรายการใหม่']);
        }

        $trashTasks = $pdo->prepare(
            "UPDATE tasks SET deleted_at = UTC_TIMESTAMP()
             WHERE task_id IN ($placeholders) AND deleted_at IS NULL"
        );
        $trashTasks->execute($ids);
        if ($trashTasks->rowCount() !== count($ids)) {
            throw new RuntimeException('Bulk task delete affected an unexpected number of tasks.');
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }

    respond(200, ['message' => 'ย้ายงานที่เลือก ' . count($ids) . ' รายการไปถังขยะแล้ว', 'count' => count($ids)]);
}

// ปรับข้อมูลหลายงานพร้อมตรวจสิทธิ์และข้อมูลประกอบแต่ละรายการ
if ($action === 'bulkUpdate') {
    requireTaskPermission($pdo, $currentUser, 'tasks.edit');
    $updates = $request['tasks'] ?? null;
    if (!is_array($updates) || $updates === [] || count($updates) > 100) {
        respond(422, ['message' => 'กรุณาเลือกงาน 1 ถึง 100 รายการเพื่อแก้ไข']);
    }

    $taskIds = [];
    foreach ($updates as $update) {
        if (!is_array($update)) {
            respond(422, ['message' => 'รูปแบบข้อมูลงานที่เลือกไม่ถูกต้อง']);
        }
        $taskId = (string) ($update['id'] ?? '');
        if (!ctype_digit($taskId) || isset($taskIds[$taskId])) {
            respond(422, ['message' => 'พบรหัสงานไม่ถูกต้องหรือซ้ำกัน']);
        }
        $taskIds[$taskId] = true;
    }

    $statusOrder = ['waiting' => 0, 'progress' => 1, 'done' => 2];
    $plannedUpdates = [];
    $pdo->beginTransaction();
    try {
        $find = $pdo->prepare(
            'SELECT t.*, d.department_name,
                    ru.first_name AS requester_first_name,
                    ru.last_name AS requester_last_name
             FROM tasks t
             LEFT JOIN departments d ON d.department_id = t.department_id
             LEFT JOIN users ru ON ru.user_id = t.requester_user_id
             WHERE t.task_id = :id AND t.deleted_at IS NULL
             LIMIT 1 FOR UPDATE'
        );
        $findTechnician = $pdo->prepare(
            "SELECT first_name, last_name FROM users
             WHERE user_id = :id AND role_code IN ('technician', 'head_technician')
             LIMIT 1"
        );
        $findAssistant = $pdo->prepare(
            "SELECT first_name, last_name FROM users
             WHERE user_id = :id AND role_code IN ('technician', 'head_technician', 'intern')
             LIMIT 1"
        );

        foreach ($updates as $input) {
            $taskId = (string) $input['id'];
            $find->execute(['id' => $taskId]);
            $current = $find->fetch();
            if (!$current) {
                respond(404, ['message' => 'ไม่พบงาน ' . $taskId . ' ที่เลือกไว้']);
            }

            $technicianId = trim((string) ($input['technicianId'] ?? ''));
            $technicianName = trim((string) ($input['technician'] ?? ''));
            if ($technicianId !== '') {
                $findTechnician->execute(['id' => $technicianId]);
                $technician = $findTechnician->fetch();
                if (!$technician) {
                    respond(422, ['message' => 'ไม่พบช่างที่เลือก กรุณาเลือกช่างจากรายการ']);
                }
                $technicianName = trim((string) $technician['first_name'] . ' ' . (string) $technician['last_name']);
            } elseif ($technicianName !== '' && $technicianName !== (string) $current['technician_name']) {
                respond(422, ['message' => 'กรุณาเลือกช่างผู้รับผิดชอบจากรายการ']);
            }

            $assistantId = trim((string) ($input['installationAssistantId'] ?? ''));
            $assistantName = trim((string) ($input['installationAssistant'] ?? ''));
            if ($assistantId !== '') {
                $findAssistant->execute(['id' => $assistantId]);
                $assistant = $findAssistant->fetch();
                if (!$assistant) {
                    respond(422, ['message' => 'ไม่พบช่างช่วยเหลือที่เลือก กรุณาเลือกช่างจากรายการ']);
                }
                $assistantName = trim((string) $assistant['first_name'] . ' ' . (string) $assistant['last_name']);
            } elseif ($assistantName !== '' && $assistantName !== (string) ($current['installation_assistant_name'] ?? '')) {
                respond(422, ['message' => 'กรุณาเลือกช่างช่วยเหลือจากรายการ']);
            }

            $newStatus = (string) ($input['status'] ?? $current['status']);
            if (!isset($statusOrder[$newStatus])) {
                respond(422, ['message' => 'สถานะงานไม่ถูกต้อง']);
            }
            if ($newStatus !== (string) $current['status']) {
                requireTaskPermission($pdo, $currentUser, 'tasks.change_status');
                if (trim($technicianName) === '') {
                    respond(422, ['message' => 'กรุณามอบหมายช่างผู้รับผิดชอบก่อนเปลี่ยนสถานะงาน']);
                }
                if ($statusOrder[$newStatus] < $statusOrder[(string) $current['status']]) {
                    respond(409, ['message' => 'ไม่สามารถย้อนสถานะงานกลับไปสถานะก่อนหน้าได้']);
                }
            }

            $task = normalizeTask($pdo, array_replace($input, [
                'status' => $newStatus,
                'technician' => $technicianName,
                'installationAssistantId' => '',
                'installationAssistant' => $assistantName,
                'owner' => (string) $current['owner_name'],
                'jobName' => (string) ($current['job_name'] ?? '')
            ]));
            $plannedUpdates[] = [
                'id' => $taskId,
                'task' => $task,
                'current' => $current,
                'technicianId' => $technicianId,
                'assistantId' => $assistantId
            ];
        }

        $statement = $pdo->prepare(
            'UPDATE tasks SET job_number = :job_number, job_name = :job_name, asset_identifier = :asset_identifier,
             detail = :detail, department_id = :department_id, requester_user_id = :requester_user_id, owner_name = :owner_name,
             technician_name = :technician_name, installation_assistant_name = :installation_assistant_name,
             status = :status, priority = :priority, opened_at = :opened_at, due_at = :due_at
             WHERE task_id = :id AND deleted_at IS NULL'
        );
        $history = $pdo->prepare(
            'INSERT INTO task_status_history (task_id, old_status, new_status, changed_by_user_id)
             VALUES (:task_id, :old_status, :new_status, :user_id)'
        );
        $statusRecipients = null;
        foreach ($plannedUpdates as $plan) {
            $task = $plan['task'];
            $current = $plan['current'];
            $statement->execute($task + ['id' => $plan['id']]);

            $oldStatus = (string) $current['status'];
            if ($oldStatus !== $task['status']) {
                $history->execute([
                    'task_id' => $plan['id'],
                    'old_status' => $oldStatus,
                    'new_status' => $task['status'],
                    'user_id' => (string) $currentUser['user_id']
                ]);
                $statusRecipients ??= $pdo->query(
                    'SELECT user_id FROM users WHERE user_id <> ' . $pdo->quote((string) $currentUser['user_id'])
                )->fetchAll(PDO::FETCH_COLUMN);
                $statusLabels = [
                    'waiting' => 'รอดำเนินการ',
                    'progress' => 'กำลังดำเนินการ',
                    'done' => 'เสร็จแล้ว'
                ];
                addTaskNotifications(
                    $pdo,
                    (int) $plan['id'],
                    'task_status',
                    'มีการอัปเดตสถานะงาน',
                    'งาน ' . $task['job_number'] . ' เปลี่ยนสถานะเป็น' . $statusLabels[$task['status']],
                    $statusRecipients
                );
            }

            $recipients = [];
            if ($plan['technicianId'] !== ''
                && (string) $current['technician_name'] !== $task['technician_name']) {
                $recipients[] = $plan['technicianId'];
            }
            if ($plan['assistantId'] !== ''
                && (string) ($current['installation_assistant_name'] ?? '') !== (string) $task['installation_assistant_name']) {
                $recipients[] = $plan['assistantId'];
            }
            if ($recipients !== []) {
                addTaskNotifications(
                    $pdo,
                    (int) $plan['id'],
                    'task_assigned',
                    'มีการอัปเดตผู้รับผิดชอบงาน',
                    'งาน ' . $task['job_number'] . ' มีการเปลี่ยนผู้รับผิดชอบ',
                    $recipients
                );
            }
        }
        $pdo->commit();
    } catch (PDOException $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($error->getCode() === '23000') {
            respond(409, ['message' => 'เลขที่งานและหมายเลขเครื่องซ้ำกัน กรุณาตรวจสอบงานที่เลือก']);
        }
        throw $error;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }

    respond(200, ['message' => 'บันทึกการแก้ไข ' . count($plannedUpdates) . ' งานแล้ว', 'count' => count($plannedUpdates)]);
}

// บันทึกการแก้ไขรายละเอียดของงานเดี่ยว
if ($action === 'update') {
    requireTaskPermission($pdo, $currentUser, 'tasks.edit');
    $taskId = (string) ($request['id'] ?? '');
    $current = findTask($pdo, $taskId);
    if (!$current) {
        respond(404, ['message' => 'ไม่พบรายการงาน']);
    }
    $task = normalizeTask($pdo, array_replace($request, [
        'status' => $current['status'],
        'technician' => $current['technician_name']
    ]));
    try {
        $pdo->beginTransaction();
        $current = findTask($pdo, $taskId);
        if (!$current) {
            $pdo->rollBack();
            respond(404, ['message' => 'ไม่พบรายการงาน']);
        }
        $task['status'] = $current['status'];
        $statement = $pdo->prepare(
            'UPDATE tasks SET job_number = :job_number, job_name = :job_name, asset_identifier = :asset_identifier, detail = :detail,
             department_id = :department_id, requester_user_id = :requester_user_id, owner_name = :owner_name, technician_name = :technician_name,
             installation_assistant_name = :installation_assistant_name, status = :status,
             priority = :priority, opened_at = :opened_at, due_at = :due_at
             WHERE task_id = :id AND deleted_at IS NULL'
        );
        $statement->execute($task + ['id' => $taskId]);
        $pdo->commit();
        respond(200, ['message' => 'บันทึกการแก้ไขแล้ว']);
    } catch (PDOException $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($error->getCode() === '23000') {
            respond(409, ['message' => 'เลขที่งานและหมายเลขเครื่องนี้มีอยู่แล้ว กรุณาตรวจสอบเลขที่งานหรือหมายเลขเครื่อง']);
        }
        throw $error;
    }
}

// ย้ายงานเดี่ยวไปถังขยะแทนการลบถาวรทันที
if ($action === 'delete') {
    requireTaskPermission($pdo, $currentUser, 'tasks.delete');
    $taskId = (string) ($request['id'] ?? '');
    $pdo->beginTransaction();
    try {
        if (!findTask($pdo, $taskId, true)) {
            $pdo->rollBack();
            respond(404, ['message' => 'ไม่พบรายการงาน']);
        }
        $statement = $pdo->prepare(
            'UPDATE tasks SET deleted_at = UTC_TIMESTAMP()
             WHERE task_id = :id AND deleted_at IS NULL'
        );
        $statement->execute(['id' => $taskId]);
        if ($statement->rowCount() !== 1) {
            throw new RuntimeException('Task delete affected an unexpected number of tasks.');
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    respond(200, ['message' => 'ย้ายงานไปถังขยะแล้ว']);
}

// เปลี่ยนสถานะงาน บันทึกประวัติ และแจ้งผู้ใช้ที่เกี่ยวข้อง
if ($action === 'updateStatus') {
    $user = authenticatedTaskUser($pdo, $developerUserId);
    requireTaskPermission($pdo, $user, 'tasks.change_status');
    $newStatus = (string) ($request['status'] ?? '');
    if (!in_array($newStatus, ['waiting', 'progress', 'done'], true)) {
        respond(422, ['message' => 'สถานะงานไม่ถูกต้อง']);
    }
    $taskId = (string) ($request['id'] ?? '');
    $pdo->beginTransaction();
    try {
        $current = findTask($pdo, $taskId, true);
        if (!$current) {
            $pdo->rollBack();
            respond(404, ['message' => 'ไม่พบรายการงาน']);
        }
        if (trim((string) $current['technician_name']) === '') {
            $pdo->rollBack();
            respond(422, ['message' => 'กรุณามอบหมายช่างผู้รับผิดชอบก่อนเปลี่ยนสถานะงาน']);
        }
        $statusOrder = ['waiting' => 0, 'progress' => 1, 'done' => 2];
        if ($statusOrder[$newStatus] < $statusOrder[$current['status']]) {
            $pdo->rollBack();
            respond(409, ['message' => 'ไม่สามารถย้อนสถานะงานกลับไปสถานะก่อนหน้าได้']);
        }
        if ($current['status'] !== $newStatus) {
            $update = $pdo->prepare(
                'UPDATE tasks SET status = :status WHERE task_id = :id AND deleted_at IS NULL'
            );
            $update->execute(['status' => $newStatus, 'id' => $taskId]);
            $history = $pdo->prepare(
                'INSERT INTO task_status_history (task_id, old_status, new_status, changed_by_user_id)
                 VALUES (:task_id, :old_status, :new_status, :user_id)'
            );
            $history->execute([
                'task_id' => $taskId,
                'old_status' => $current['status'],
                'new_status' => $newStatus,
                'user_id' => $user['user_id']
            ]);
            $statusLabels = [
                'waiting' => 'รอดำเนินการ',
                'progress' => 'กำลังดำเนินการ',
                'done' => 'เสร็จแล้ว'
            ];
            $recipients = $pdo->prepare('SELECT user_id FROM users WHERE user_id <> :actor');
            $recipients->execute(['actor' => (string) $user['user_id']]);
            addTaskNotifications(
                $pdo,
                (int) $taskId,
                'task_status',
                'มีการอัปเดตสถานะงาน',
                'งาน ' . $current['job_number'] . ' เปลี่ยนสถานะเป็น' . $statusLabels[$newStatus],
                array_column($recipients->fetchAll(), 'user_id')
            );
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    respond(200, ['message' => 'เปลี่ยนสถานะงานแล้ว']);
}

respond(400, ['message' => 'ไม่รู้จักคำสั่งที่ร้องขอ']);

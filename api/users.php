<?php
declare(strict_types=1);

ini_set('session.gc_maxlifetime', '2592000');
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

/** ส่ง JSON response และเรียกสำรองข้อมูลหลังคำขอที่สำเร็จ */
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
require_once __DIR__ . '/password_reset.php';

/** ตรวจรูปแบบและโดเมนอีเมลพนักงานบริษัท */
function isCompanyEmail(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false
        && str_ends_with(strtolower($email), '@rayong-oa.com');
}

/** สร้างรหัสบัญชีผู้ใช้แบบสุ่มที่ไม่ซ้ำกัน */
function newUserId(): string
{
    return 'USER-' . bin2hex(random_bytes(8));
}

/** เลือกเฉพาะข้อมูลบัญชีที่อนุญาตให้ส่งกลับหน้าเว็บ */
function publicUser(array $user): array
{
    return [
        'userId' => (string) $user['user_id'],
        'firstName' => (string) $user['first_name'],
        'lastName' => (string) $user['last_name'],
        'email' => (string) $user['email'],
        'phone' => (string) $user['phone'],
        'role' => (string) $user['role_code'],
        'avatar' => (string) ($user['avatar'] ?? ''),
        'avatarStyle' => (string) $user['avatar_style'],
        'createdAt' => date(DATE_ATOM, strtotime((string) $user['created_at']))
    ];
}

/** ค้นหาบัญชีจากอีเมลโดยใช้ prepared statement */
function getUserByEmail(PDO $pdo, string $email): ?array
{
    $statement = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
    $statement->execute(['email' => $email]);
    $user = $statement->fetch();
    return $user ?: null;
}

/** ตรวจ session และยืนยันว่าบัญชีปัจจุบันยังใช้งานได้ */
function authenticatedUser(PDO $pdo, string $developerUserId): array
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['message' => 'รองรับเฉพาะคำขอ POST']);
}

$request = json_decode(file_get_contents('php://input'), true);
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
    error_log('Database connection failed: ' . $error->getMessage());
    respond(503, ['message' => 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบการตั้งค่า MySQL']);
}
require_once __DIR__ . '/permissions.php';
$action = (string) ($request['action'] ?? '');

/** เตรียม setting ที่ควบคุมการมองเห็นบัญชี Developer */
function ensureDeveloperVisibilitySchema(PDO $pdo): bool
{
    $exists = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'app_settings'"
    )->fetchColumn() > 0;
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS app_settings (
            setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
            setting_value VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    $insert = $pdo->prepare(
        "INSERT IGNORE INTO app_settings (setting_key, setting_value)
         VALUES ('developer_visible_to_admins', '0')"
    );
    $insert->execute();
    return !$exists || $insert->rowCount() > 0;
}

/** อ่านค่าการอนุญาตให้ Admin มองเห็นบัญชี Developer */
function developerVisibleToAdmins(PDO $pdo): bool
{
    return $pdo->query(
        "SELECT setting_value FROM app_settings
         WHERE setting_key = 'developer_visible_to_admins'"
    )->fetchColumn() === '1';
}

$databaseWriteActions = [
    'migrateLegacy',
    'updateRolePermissions',
    'changeOwnRole',
    'updateProfile',
    'updateAvatar',
    'createEmployee',
    'updateRole',
    'deleteEmployee',
    'resetPassword',
    'adminResetPassword',
    'setDeveloperVisibility'
];
$GLOBALS['databaseBackupPdo'] = $pdo;
$GLOBALS['databaseBackupRequired'] = in_array($action, $databaseWriteActions, true);
$passwordResetActions = ['requestPasswordReset', 'resetPassword', 'adminResetPassword'];
if (in_array($action, $passwordResetActions, true)) {
    $GLOBALS['databaseBackupRequired'] = ensurePasswordResetSchema($pdo) || $GLOBALS['databaseBackupRequired'];
}
$GLOBALS['databaseBackupRequired'] = ensureRolePermissionSchema($pdo) || $GLOBALS['databaseBackupRequired'];

// ให้ Developer เปิดหรือปิดการแสดงบัญชี Developer ต่อ Admin
if ($action === 'setDeveloperVisibility') {
    $currentUser = authenticatedUser($pdo, $developerUserId);
    if ($currentUser['role_code'] !== 'developer' || $currentUser['user_id'] !== $developerUserId) {
        respond(403, ['message' => 'เฉพาะ Developer เท่านั้นที่อนุญาตให้ Admin เห็นบัญชี Developer ได้']);
    }
    $visible = filter_var($request['visible'] ?? null, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($visible === null) {
        respond(422, ['message' => 'ค่าการอนุญาตไม่ถูกต้อง']);
    }
    $GLOBALS['databaseBackupRequired'] =
        ensureDeveloperVisibilitySchema($pdo) || $GLOBALS['databaseBackupRequired'];
    $statement = $pdo->prepare(
        "UPDATE app_settings SET setting_value = :value
         WHERE setting_key = 'developer_visible_to_admins'"
    );
    $statement->execute(['value' => $visible ? '1' : '0']);
    respond(200, [
        'message' => $visible ? 'อนุญาตให้ Admin เห็นบัญชี Developer แล้ว' : 'ซ่อนบัญชี Developer จาก Admin แล้ว',
        'developerVisibleToAdmins' => $visible
    ]);
}

// สร้าง token แบบใช้ครั้งเดียวและส่งลิงก์ตั้งรหัสผ่านทางอีเมล
if ($action === 'requestPasswordReset') {
    $email = strtolower(trim((string) ($request['email'] ?? '')));
    if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        respond(422, ['message' => 'กรุณากรอกอีเมลให้ถูกต้อง']);
    }

    try {
        $baseUrl = passwordResetBaseUrl();
        $from = passwordResetSenderAddress();
        if (!function_exists('mail') || filter_var($from, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException('Configure PHP mail delivery and a valid INSTALL_MAIL_FROM address.');
        }
    } catch (RuntimeException $error) {
        error_log('Password reset email configuration error: ' . $error->getMessage());
        respond(503, ['message' => 'ระบบยังไม่ได้ตั้งค่าอีเมลสำหรับกู้คืนรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ']);
    }

    $genericMessage = 'หากอีเมลนี้มีบัญชีอยู่ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้ ลิงก์มีอายุ 1 ชั่วโมง';
    $user = getUserByEmail($pdo, $email);
    if (!$user) {
        respond(200, ['message' => $genericMessage]);
    }

    $recent = $pdo->prepare(
        'SELECT COUNT(*) FROM password_reset_tokens
         WHERE user_id = :user_id AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE)'
    );
    $recent->execute(['user_id' => $user['user_id']]);
    if ((int) $recent->fetchColumn() > 0) {
        respond(200, ['message' => $genericMessage]);
    }

    $token = bin2hex(random_bytes(32));
    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP()
             WHERE user_id = :user_id AND used_at IS NULL'
        )->execute(['user_id' => $user['user_id']]);
        $insert = $pdo->prepare(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
             VALUES (:user_id, :token_hash, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR), UTC_TIMESTAMP())'
        );
        $insert->execute([
            'user_id' => $user['user_id'],
            'token_hash' => hash('sha256', $token)
        ]);
        if (!sendPasswordResetEmail($email, $token, $baseUrl)) {
            throw new RuntimeException('PHP mail() could not send the password reset email.');
        }
        $pdo->commit();
        $GLOBALS['databaseBackupRequired'] = true;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Password reset email delivery failed: ' . $error->getMessage());
        respond(503, ['message' => 'ส่งอีเมลกู้คืนรหัสผ่านไม่สำเร็จ กรุณาติดต่อผู้ดูแลระบบ']);
    }
    respond(200, ['message' => $genericMessage]);
}

// ตรวจ token ที่ยังไม่หมดอายุ เปลี่ยน hash รหัสผ่าน และใช้ token ให้หมดสิทธิ์
if ($action === 'resetPassword') {
    $token = (string) ($request['token'] ?? '');
    $password = (string) ($request['password'] ?? '');
    if (strlen($password) < 8 || strlen($password) > 72) {
        respond(422, ['message' => 'รหัสผ่านต้องมีความยาว 8 ถึง 72 ตัวอักษร']);
    }
    if (preg_match('/^[a-f0-9]{64}$/', $token) !== 1) {
        respond(422, ['message' => 'ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว']);
    }

    $pdo->beginTransaction();
    try {
        $lookup = $pdo->prepare(
            'SELECT token_id, user_id FROM password_reset_tokens
             WHERE token_hash = :token_hash AND used_at IS NULL
               AND expires_at > UTC_TIMESTAMP()
             LIMIT 1 FOR UPDATE'
        );
        $lookup->execute(['token_hash' => hash('sha256', $token)]);
        $reset = $lookup->fetch();
        if (!$reset) {
            $pdo->rollBack();
            respond(422, ['message' => 'ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว']);
        }
        $updateUser = $pdo->prepare('UPDATE users SET password_hash = :password_hash WHERE user_id = :user_id');
        $updateUser->execute([
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'user_id' => $reset['user_id']
        ]);
        if ($updateUser->rowCount() !== 1) {
            throw new RuntimeException('Password reset target account is missing.');
        }
        $consume = $pdo->prepare(
            'UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP()
             WHERE user_id = :user_id AND used_at IS NULL'
        );
        $consume->execute(['user_id' => $reset['user_id']]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    respond(200, ['message' => 'ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบ']);
}

// ย้ายบัญชีจากข้อมูลเดิมเข้า users หลังตรวจสิทธิ์ Developer
if ($action === 'migrateLegacy') {
    $currentUser = authenticatedUser($pdo, $developerUserId);
    if ($currentUser['user_id'] !== $developerUserId || $currentUser['role_code'] !== 'developer') {
        respond(403, ['message' => 'เฉพาะ Developer เท่านั้นที่ย้ายข้อมูลบัญชีเดิมได้']);
    }

    $legacyUsers = $request['users'] ?? [];
    if (!is_array($legacyUsers)) {
        respond(422, ['message' => 'ข้อมูลบัญชีเดิมไม่ถูกต้อง']);
    }

    $insert = $pdo->prepare(
        'INSERT INTO users (user_id, first_name, last_name, email, phone, password_hash, role_code, avatar, avatar_style, created_at)
         VALUES (:id, :first_name, :last_name, :email, :phone, :password_hash, :role, :avatar, :avatar_style, :created_at)'
    );
    $roleCheck = $pdo->prepare('SELECT 1 FROM roles WHERE role_code = :role');
    $migrated = 0;
    $pdo->beginTransaction();
    try {
        foreach ($legacyUsers as $legacyUser) {
            if (!is_array($legacyUser)) {
                continue;
            }

            $email = strtolower(trim((string) ($legacyUser['email'] ?? '')));
            $password = (string) ($legacyUser['password'] ?? '');
            $firstName = trim((string) ($legacyUser['firstName'] ?? ''));
            $lastName = trim((string) ($legacyUser['lastName'] ?? ''));
            if (!isCompanyEmail($email) || $password === '' || $firstName === '' || $lastName === '') {
                continue;
            }
            if (getUserByEmail($pdo, $email)) {
                continue;
            }

            $role = in_array($legacyUser['role'] ?? '', ['admin', 'accounting', 'sales', 'technician', 'head_technician', 'intern', 'executive'], true)
                ? (string) $legacyUser['role']
                : 'sales';
            $roleCheck->execute(['role' => $role]);
            if (!$roleCheck->fetchColumn()) {
                throw new RuntimeException('Role data is missing from database.');
            }

            $createdAt = strtotime((string) ($legacyUser['createdAt'] ?? '')) ?: time();
            $insert->execute([
                'id' => newUserId(),
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'phone' => trim((string) ($legacyUser['phone'] ?? '')),
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'role' => $role,
                'avatar' => (string) ($legacyUser['avatar'] ?? ''),
                'avatar_style' => 'circle',
                'created_at' => gmdate('Y-m-d H:i:s', $createdAt)
            ]);
            $migrated++;
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Legacy user migration failed: ' . $error->getMessage());
        respond(500, ['message' => 'ย้ายบัญชีเดิมไม่สำเร็จ กรุณาตรวจสอบข้อมูลและลองใหม่']);
    }

    respond(200, ['message' => 'ย้ายบัญชีเดิมแล้ว', 'migrated' => $migrated]);
}

// ปิดการสมัครเอง ให้ผู้ดูแลเป็นผู้สร้างบัญชีพนักงาน
if ($action === 'register') {
    respond(403, ['message' => 'ไม่เปิดให้สมัครสมาชิกด้วยตนเอง กรุณาติดต่อผู้ดูแลระบบเพื่อสร้างบัญชี']);
}

// ตรวจอีเมล/รหัสผ่านและสร้าง session หลังเข้าสู่ระบบสำเร็จ
if ($action === 'login') {
    $email = strtolower(trim((string) ($request['email'] ?? '')));
    $password = (string) ($request['password'] ?? '');
    $remember = filter_var($request['remember'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $user = getUserByEmail($pdo, $email);

    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        respond(401, ['message' => 'อีเมลหรือรหัสผ่านไม่ถูกต้อง']);
    }
    if ($user['user_id'] !== $developerUserId && !isCompanyEmail($email)) {
        respond(403, ['message' => 'เข้าสู่ระบบได้เฉพาะอีเมล @rayong-oa.com']);
    }
    if ($user['user_id'] === $developerUserId && $user['role_code'] !== 'developer') {
        respond(500, ['message' => 'Role ของบัญชี Developer ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ']);
    }

    session_regenerate_id(true);
    $_SESSION['userId'] = $user['user_id'];
    if ($remember) {
        $cookie = session_get_cookie_params();
        if (!setcookie(session_name(), session_id(), [
            'expires' => time() + 2592000,
            'path' => $cookie['path'],
            'domain' => $cookie['domain'],
            'secure' => $cookie['secure'],
            'httponly' => $cookie['httponly'],
            'samesite' => $cookie['samesite'] ?? 'Lax'
        ])) {
            respond(500, ['message' => 'ไม่สามารถจดจำการเข้าสู่ระบบได้ กรุณาลองใหม่']);
        }
    }
    respond(200, ['message' => 'เข้าสู่ระบบสำเร็จ', 'user' => publicUser($user)]);
}

// ยืนยันข้อมูลบัญชีซ้ำโดยไม่เปลี่ยน session ปัจจุบัน
if ($action === 'verifyCredentials') {
    $email = strtolower(trim((string) ($request['email'] ?? '')));
    $password = (string) ($request['password'] ?? '');
    $user = getUserByEmail($pdo, $email);
    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        respond(401, ['message' => 'อีเมลหรือรหัสผ่านไม่ถูกต้อง']);
    }
    if ($user['user_id'] !== $developerUserId && !isCompanyEmail($email)) {
        respond(403, ['message' => 'เข้าสู่ระบบได้เฉพาะอีเมล @rayong-oa.com']);
    }
    respond(200, ['message' => 'ยืนยันข้อมูลบัญชีแล้ว']);
}

// คืนข้อมูลโปรไฟล์ของบัญชีที่ผูกกับ session ปัจจุบัน
if ($action === 'currentUser') {
    respond(200, ['user' => publicUser(authenticatedUser($pdo, $developerUserId))]);
}

// คืนรายการ Role และสิทธิ์ให้ผู้ดูแลจัดการ
if ($action === 'listRolePermissions') {
    $currentUser = authenticatedUser($pdo, $developerUserId);
    if (!in_array($currentUser['role_code'], ['admin', 'developer'], true)) {
        respond(403, ['message' => 'เฉพาะ Admin และ Developer เท่านั้นที่กำหนดสิทธิ์ได้']);
    }
    $GLOBALS['databaseBackupRequired'] =
        ensureDeveloperVisibilitySchema($pdo) || $GLOBALS['databaseBackupRequired'];

    $roles = TASK_ROLE_CODES;
    if ($currentUser['user_id'] !== $developerUserId && !developerVisibleToAdmins($pdo)) {
        $roles = array_values(array_filter($roles, static fn (string $role): bool => $role !== 'developer'));
    }
    $permissionsByRole = [];
    foreach ($roles as $role) {
        $permissionsByRole[$role] = getRolePermissions($pdo, $role);
    }
    respond(200, [
        'roles' => $roles,
        'permissionLabels' => TASK_ROLE_PERMISSIONS,
        'permissions' => $permissionsByRole
    ]);
}

// บันทึกสิทธิ์ของ Role หลังตรวจผู้มีอำนาจและค่าที่ส่งมา
if ($action === 'updateRolePermissions') {
    $currentUser = authenticatedUser($pdo, $developerUserId);
    if (!in_array($currentUser['role_code'], ['admin', 'developer'], true)) {
        respond(403, ['message' => 'เฉพาะ Admin และ Developer เท่านั้นที่กำหนดสิทธิ์ได้']);
    }

    $role = (string) ($request['role'] ?? '');
    $permissions = $request['permissions'] ?? null;
    if (!in_array($role, TASK_ROLE_CODES, true) || !is_array($permissions)) {
        respond(422, ['message' => 'Role หรือข้อมูลสิทธิ์ไม่ถูกต้อง']);
    }
    if ($role === 'developer') {
        respond(403, ['message' => 'ไม่สามารถแก้ไขสิทธิ์ของ Developer ได้']);
    }
    if ($role === 'admin' && ($permissions['tasks.view'] ?? null) !== true) {
        respond(422, ['message' => 'Role Admin ต้องมีสิทธิ์ดูรายการงานเพื่อจัดการระบบได้']);
    }
    foreach (array_keys(TASK_ROLE_PERMISSIONS) as $permission) {
        if (!array_key_exists($permission, $permissions) || !is_bool($permissions[$permission])) {
            respond(422, ['message' => 'กรุณาระบุสิทธิ์ของ Role ให้ครบถ้วน']);
        }
    }

    $statement = $pdo->prepare(
        'INSERT INTO role_permissions (role_code, permission_code, is_allowed)
         VALUES (:role, :permission, :allowed)
         ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed)'
    );
    $pdo->beginTransaction();
    try {
        foreach (array_keys(TASK_ROLE_PERMISSIONS) as $permission) {
            $allowed = $permissions[$permission];
            $statement->execute([
                'role' => $role,
                'permission' => $permission,
                'allowed' => $allowed ? 1 : 0
            ]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    respond(200, ['message' => 'บันทึกสิทธิ์ของ Role แล้ว']);
}

// เปลี่ยน Role ของบัญชีตนเองเฉพาะกรณีที่ระบบอนุญาต
if ($action === 'changeOwnRole') {
    authenticatedUser($pdo, $developerUserId);
    respond(403, ['message' => 'ไม่สามารถเปลี่ยน Role ของบัญชีตัวเองได้ กรุณาติดต่อผู้มีสิทธิ์จัดการ Role']);
}

// บันทึกชื่อและข้อมูลโปรไฟล์ของผู้ใช้ปัจจุบัน
if ($action === 'updateProfile') {
    $user = authenticatedUser($pdo, $developerUserId);
    $firstName = trim((string) ($request['firstName'] ?? ''));
    $lastName = trim((string) ($request['lastName'] ?? ''));
    if ($firstName === '' || $lastName === '' || strlen($firstName) > 240 || strlen($lastName) > 240) {
        respond(422, ['message' => 'กรุณากรอกชื่อและนามสกุลให้ถูกต้อง']);
    }

    $statement = $pdo->prepare('UPDATE users SET first_name = :first_name, last_name = :last_name WHERE user_id = :id');
    $statement->execute(['first_name' => $firstName, 'last_name' => $lastName, 'id' => $user['user_id']]);
    $user = getUserByEmail($pdo, (string) $user['email']);
    respond(200, ['message' => 'บันทึกชื่อแล้ว', 'user' => publicUser($user)]);
}

// บันทึกภาพและรูปแบบ avatar ของผู้ใช้ปัจจุบัน
if ($action === 'updateAvatar') {
    $user = authenticatedUser($pdo, $developerUserId);
    $avatar = (string) ($request['avatar'] ?? '');
    $avatarStyle = (string) ($request['avatarStyle'] ?? 'circle');
    if ($avatar !== '' && (strlen($avatar) > 2800000 || !preg_match('/^data:image\/(png|jpeg|webp|gif);base64,/', $avatar))) {
        respond(422, ['message' => 'รูปภาพไม่ถูกต้องหรือมีขนาดใหญ่เกินไป']);
    }
    if (!in_array($avatarStyle, ['circle', 'rounded', 'frame'], true)) {
        respond(422, ['message' => 'รูปแบบตกแต่งไม่ถูกต้อง']);
    }

    $statement = $pdo->prepare(
        'UPDATE users SET avatar = CASE WHEN :has_avatar = 1 THEN :avatar ELSE avatar END, avatar_style = :style WHERE user_id = :id'
    );
    $statement->execute([
        'has_avatar' => $avatar === '' ? 0 : 1,
        'avatar' => $avatar,
        'style' => $avatarStyle,
        'id' => $user['user_id']
    ]);
    $user = getUserByEmail($pdo, (string) $user['email']);
    respond(200, ['message' => 'บันทึกรูปโปรไฟล์แล้ว', 'user' => publicUser($user)]);
}

// คืนรายชื่อพนักงานตามสิทธิ์และการตั้งค่าการมองเห็น Developer
if ($action === 'listUsers') {
    $currentUser = authenticatedUser($pdo, $developerUserId);
    if (!in_array($currentUser['role_code'], ['admin', 'developer', 'executive'], true)) {
        respond(403, ['message' => 'เฉพาะ Admin, Developer และผู้บริหารเท่านั้นที่ดูข้อมูลพนักงานได้']);
    }

    $GLOBALS['databaseBackupRequired'] =
        ensureDeveloperVisibilitySchema($pdo) || $GLOBALS['databaseBackupRequired'];
    $developerVisible = developerVisibleToAdmins($pdo);
    $rows = $pdo->query(
        'SELECT user_id, first_name, last_name, email, phone, role_code, created_at
         FROM users ORDER BY first_name, last_name, email'
    )->fetchAll();
    $maySeeDeveloper = $currentUser['user_id'] === $developerUserId
        || ($currentUser['role_code'] === 'admin' && $developerVisible);
    if (!$maySeeDeveloper) {
        $rows = array_values(array_filter(
            $rows,
            static fn (array $user): bool => $user['role_code'] !== 'developer'
        ));
    }
    $publicUsers = array_map(static function (array $user): array {
        return [
            'userId' => (string) $user['user_id'],
            'firstName' => (string) $user['first_name'],
            'lastName' => (string) $user['last_name'],
            'email' => (string) $user['email'],
            'phone' => (string) $user['phone'],
            'role' => (string) $user['role_code'],
            'createdAt' => date(DATE_ATOM, strtotime((string) $user['created_at'])),
            'isDeveloper' => $user['role_code'] === 'developer'
        ];
    }, $rows);
    respond(200, [
        'users' => $publicUsers,
        'developerVisibleToAdmins' => in_array($currentUser['role_code'], ['admin', 'developer'], true)
            && $developerVisible
    ]);
}

// สร้างบัญชีพนักงานโดยผู้ดูแล พร้อมตรวจ Role และรหัสผ่าน
if ($action === 'createEmployee') {
    $currentUser = authenticatedUser($pdo, $developerUserId);
    if (!in_array($currentUser['role_code'], ['admin', 'developer', 'executive'], true)) {
        respond(403, ['message' => 'เฉพาะ Admin, Developer และผู้บริหารเท่านั้นที่เพิ่มพนักงานได้']);
    }

    $email = strtolower(trim((string) ($request['email'] ?? '')));
    $password = (string) ($request['password'] ?? '');
    $firstName = trim((string) ($request['firstName'] ?? ''));
    $lastName = trim((string) ($request['lastName'] ?? ''));
    $phone = trim((string) ($request['phone'] ?? ''));
    $role = (string) ($request['role'] ?? '');
    $allowedRoles = match ($currentUser['role_code']) {
        'developer' => ['admin', 'accounting', 'sales', 'technician', 'head_technician', 'intern', 'executive'],
        'admin' => ['accounting', 'sales', 'technician', 'head_technician', 'intern'],
        'executive' => ['admin'],
        default => []
    };

    if (!in_array($role, $allowedRoles, true)) {
        respond(403, ['message' => 'ไม่มีสิทธิ์สร้างบัญชีด้วย Role ที่เลือก']);
    }
    if (!isCompanyEmail($email) || $firstName === '' || $lastName === ''
        || strlen($firstName) > 100 || strlen($lastName) > 100 || strlen($phone) > 40
        || strlen($password) < 8) {
        respond(422, ['message' => 'กรุณาตรวจสอบข้อมูลพนักงาน อีเมลบริษัท และรหัสผ่านอย่างน้อย 8 ตัวอักษร']);
    }
    if (getUserByEmail($pdo, $email)) {
        respond(409, ['message' => 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น']);
    }

    try {
        $statement = $pdo->prepare(
            'INSERT INTO users (user_id, first_name, last_name, email, phone, password_hash, role_code, avatar, avatar_style, created_at)
             VALUES (:id, :first_name, :last_name, :email, :phone, :password_hash, :role, :avatar, :avatar_style, UTC_TIMESTAMP())'
        );
        $statement->execute([
            'id' => newUserId(),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'phone' => $phone,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'role' => $role,
            'avatar' => '',
            'avatar_style' => 'circle'
        ]);
    } catch (PDOException $error) {
        if ($error->getCode() === '23000') {
            respond(409, ['message' => 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น']);
        }
        throw $error;
    }

    respond(201, ['message' => 'เพิ่มพนักงานเรียบร้อยแล้ว']);
}

// เปลี่ยน Role ของพนักงานโดยผู้ใช้ที่มีสิทธิ์
if ($action === 'updateRole') {
    $currentUser = authenticatedUser($pdo, $developerUserId);
    $targetId = (string) ($request['userId'] ?? '');
    $role = (string) ($request['role'] ?? '');
    if ($targetId === $developerUserId) {
        respond(403, ['message' => 'ไม่สามารถเปลี่ยน Role ของ Developer ที่สงวนไว้ได้']);
    }
    if ($targetId === $currentUser['user_id']) {
        respond(403, ['message' => 'ไม่สามารถเปลี่ยน Role ของบัญชีตัวเองได้']);
    }
    $editableRoles = match ($currentUser['role_code']) {
        'developer' => ['admin', 'accounting', 'sales', 'technician', 'head_technician', 'intern', 'executive'],
        'admin' => ['accounting', 'sales', 'technician', 'head_technician', 'intern'],
        'executive' => ['admin'],
        default => []
    };
    if (!in_array($role, $editableRoles, true)) {
        respond(403, ['message' => 'Role ของคุณไม่มีสิทธิ์กำหนด Role ที่เลือก']);
    }
    $target = $pdo->prepare('SELECT user_id, role_code FROM users WHERE user_id = :id LIMIT 1');
    $target->execute(['id' => $targetId]);
    $targetUser = $target->fetch();
    if (!$targetUser) {
        respond(404, ['message' => 'ไม่พบบัญชีผู้ใช้']);
    }
    if ($targetUser['role_code'] === 'developer') {
        respond(403, ['message' => 'ไม่สามารถเปลี่ยน Role ของบัญชี Developer ได้']);
    }
    if (!in_array($currentUser['role_code'], ['admin', 'developer', 'executive'], true)) {
        respond(422, ['message' => 'Role ที่เลือกไม่ถูกต้อง']);
    }

    $statement = $pdo->prepare('UPDATE users SET role_code = :role WHERE user_id = :id');
    $statement->execute(['role' => $role, 'id' => $targetId]);
    if ($statement->rowCount() === 0) {
        $exists = $pdo->prepare('SELECT 1 FROM users WHERE user_id = :id');
        $exists->execute(['id' => $targetId]);
        if (!$exists->fetchColumn()) {
            respond(404, ['message' => 'ไม่พบบัญชีผู้ใช้']);
        }
    }
    respond(200, ['message' => 'บันทึก Role แล้ว']);
}

// ให้ผู้ดูแลตั้งรหัสผ่านใหม่ให้บัญชีพนักงาน
if ($action === 'adminResetPassword') {
    $currentUser = authenticatedUser($pdo, $developerUserId);
    if (!in_array($currentUser['role_code'], ['admin', 'developer'], true)) {
        respond(403, ['message' => 'เฉพาะ Admin และ Developer เท่านั้นที่ตั้งรหัสผ่านพนักงานได้']);
    }

    $targetId = trim((string) ($request['userId'] ?? ''));
    $password = (string) ($request['password'] ?? '');
    if ($targetId === '' || $targetId === (string) $currentUser['user_id'] || $targetId === $developerUserId) {
        respond(422, ['message' => 'ไม่สามารถตั้งรหัสผ่านของบัญชีนี้จากรายการพนักงานได้']);
    }
    if (strlen($password) < 8 || strlen($password) > 72) {
        respond(422, ['message' => 'รหัสผ่านต้องมีความยาว 8 ถึง 72 ตัวอักษร']);
    }

    $target = $pdo->prepare('SELECT role_code FROM users WHERE user_id = :id LIMIT 1');
    $target->execute(['id' => $targetId]);
    $targetRole = $target->fetchColumn();
    if ($targetRole === false) {
        respond(404, ['message' => 'ไม่พบบัญชีผู้ใช้']);
    }
    if ($targetRole === 'developer') {
        respond(403, ['message' => 'ไม่สามารถตั้งรหัสผ่านของบัญชี Developer ได้']);
    }

    $pdo->beginTransaction();
    try {
        $update = $pdo->prepare('UPDATE users SET password_hash = :password_hash WHERE user_id = :user_id');
        $update->execute([
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'user_id' => $targetId
        ]);
        if ($update->rowCount() !== 1) {
            $pdo->rollBack();
            respond(404, ['message' => 'ไม่พบบัญชีพนักงาน']);
        }
        $invalidate = $pdo->prepare(
            'UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP()
             WHERE user_id = :user_id AND used_at IS NULL'
        );
        $invalidate->execute(['user_id' => $targetId]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    respond(200, ['message' => 'ตั้งรหัสผ่านใหม่ให้พนักงานแล้ว']);
}

// ลบบัญชีพนักงานและการแจ้งเตือนที่ผูกกับบัญชีใน transaction เดียว
if ($action === 'deleteEmployee') {
    $currentUser = authenticatedUser($pdo, $developerUserId);
    if (!in_array($currentUser['role_code'], ['admin', 'developer', 'executive'], true)) {
        respond(403, ['message' => 'เฉพาะ Admin, Developer และผู้บริหารเท่านั้นที่ลบพนักงานได้']);
    }

    $targetId = trim((string) ($request['userId'] ?? ''));
    if ($targetId === '') {
        respond(422, ['message' => 'ไม่พบรหัสพนักงานที่ต้องการลบ']);
    }
    if ($targetId === $developerUserId) {
        respond(403, ['message' => 'ไม่สามารถลบบัญชี Developer ที่สงวนไว้ได้']);
    }
    if ($targetId === (string) $currentUser['user_id']) {
        respond(403, ['message' => 'ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้']);
    }

    $target = $pdo->prepare('SELECT user_id, first_name, last_name, role_code FROM users WHERE user_id = :id LIMIT 1');
    $target->execute(['id' => $targetId]);
    $employee = $target->fetch();
    if (!$employee) {
        respond(404, ['message' => 'ไม่พบบัญชีพนักงานที่ต้องการลบ']);
    }
    if ($employee['role_code'] === 'developer') {
        respond(403, ['message' => 'ไม่สามารถลบบัญชี Developer ได้']);
    }

    $pdo->beginTransaction();
    try {
        $deleteNotifications = $pdo->prepare('DELETE FROM notifications WHERE user_id = :id');
        $deleteNotifications->execute(['id' => $targetId]);

        $deleteUser = $pdo->prepare('DELETE FROM users WHERE user_id = :id');
        $deleteUser->execute(['id' => $targetId]);
        if ($deleteUser->rowCount() !== 1) {
            throw new RuntimeException('Employee account was not deleted.');
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }

    $fullName = trim((string) $employee['first_name'] . ' ' . (string) $employee['last_name']);
    respond(200, ['message' => 'ลบบัญชีพนักงาน' . ($fullName !== '' ? ' ' . $fullName : '') . ' แล้ว']);
}

// ล้าง session และ cookie เมื่อผู้ใช้ออกจากระบบ
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $cookie = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $cookie['path'],
            'domain' => $cookie['domain'],
            'secure' => $cookie['secure'],
            'httponly' => $cookie['httponly'],
            'samesite' => $cookie['samesite'] ?? 'Lax'
        ]);
    }
    session_destroy();
    respond(200, ['message' => 'ออกจากระบบแล้ว']);
}

respond(400, ['message' => 'ไม่รู้จักคำสั่งที่ร้องขอ']);

<?php
declare(strict_types=1);

// รายการสิทธิ์และ Role ที่ API ใช้ตรวจสอบการทำงาน
const TASK_ROLE_PERMISSIONS = [
    'tasks.view' => 'ดูรายการงานและรายงาน',
    'tasks.create' => 'เพิ่มงาน',
    'tasks.edit' => 'แก้ไขงาน',
    'tasks.delete' => 'ลบงาน',
    'tasks.change_status' => 'เปลี่ยนสถานะงาน'
];

const TASK_ROLE_CODES = ['admin', 'accounting', 'sales', 'technician', 'head_technician', 'intern', 'executive', 'developer'];

const TASK_ROLE_NAMES = [
    'admin' => 'Admin',
    'accounting' => 'แผนกบัญชี',
    'sales' => 'แผนกขาย',
    'technician' => 'ช่าง',
    'head_technician' => 'หัวหน้าช่าง',
    'intern' => 'นักศึกษาฝึกงาน',
    'executive' => 'ผู้บริหาร',
    'developer' => 'Developer'
];

/** เตรียมตาราง Role/Permission และเติมค่าเริ่มต้นที่ยังไม่มี */
function ensureRolePermissionSchema(PDO $pdo): bool
{
    $changed = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'role_permissions'"
    )->fetchColumn() === 0;

    $insertRole = $pdo->prepare(
        'INSERT IGNORE INTO roles (role_code, role_name) VALUES (:role, :name)'
    );
    foreach (TASK_ROLE_NAMES as $role => $name) {
        $insertRole->execute(['role' => $role, 'name' => $name]);
        $changed = $changed || $insertRole->rowCount() > 0;
    }

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS role_permissions (
            role_code VARCHAR(40) NOT NULL,
            permission_code VARCHAR(80) NOT NULL,
            is_allowed TINYINT(1) NOT NULL DEFAULT 0,
            PRIMARY KEY (role_code, permission_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );

    $insert = $pdo->prepare(
        'INSERT IGNORE INTO role_permissions (role_code, permission_code, is_allowed)
         VALUES (:role, :permission, :allowed)'
    );
    foreach (TASK_ROLE_CODES as $role) {
        foreach (array_keys(TASK_ROLE_PERMISSIONS) as $permission) {
            $allowed = $role !== 'intern' || $permission === 'tasks.view';
            $insert->execute([
                'role' => $role,
                'permission' => $permission,
                'allowed' => $allowed ? 1 : 0
            ]);
            $changed = $changed || $insert->rowCount() > 0;
        }
    }
    return $changed;
}

/** อ่านสิทธิ์ทั้งหมดของ Role และกำหนด false ให้สิทธิ์ที่ไม่มี record */
function getRolePermissions(PDO $pdo, string $role): array
{
    $statement = $pdo->prepare(
        'SELECT permission_code, is_allowed FROM role_permissions WHERE role_code = :role'
    );
    $statement->execute(['role' => $role]);
    $permissions = array_fill_keys(array_keys(TASK_ROLE_PERMISSIONS), false);
    foreach ($statement->fetchAll() as $row) {
        if (array_key_exists($row['permission_code'], $permissions)) {
            $permissions[$row['permission_code']] = (bool) $row['is_allowed'];
        }
    }
    return $permissions;
}

/** ปฏิเสธคำขอเมื่อผู้ใช้ไม่มีสิทธิ์ที่ต้องใช้กับการกระทำนั้น */
function requireTaskPermission(PDO $pdo, array $user, string $permission): void
{
    $permissions = getRolePermissions($pdo, (string) $user['role_code']);
    if (!($permissions[$permission] ?? false)) {
        respond(403, ['message' => 'Role ของคุณไม่มีสิทธิ์ดำเนินการนี้']);
    }
}

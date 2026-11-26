-- New RoaInstall database only. Apply manually after reviewing the target TiDB database.
CREATE TABLE roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE permissions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE role_permissions (
  role_id CHAR(36) NOT NULL,
  permission_id CHAR(36) NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id),
  KEY idx_role_permissions_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(254) NOT NULL UNIQUE,
  display_name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id CHAR(36) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  KEY idx_users_role_active (role_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE install_jobs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  job_number VARCHAR(100) NOT NULL UNIQUE,
  job_name VARCHAR(255) NULL,
  supervisor_user_id CHAR(36) NOT NULL,
  assistant_user_id CHAR(36) NULL,
  job_created_date DATE NOT NULL,
  delivery_date DATE NOT NULL,
  status ENUM('waiting','progress','done') NOT NULL DEFAULT 'waiting',
  created_by_user_id CHAR(36) NOT NULL,
  updated_by_user_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  deleted_by_user_id CHAR(36) NULL,
  CONSTRAINT fk_jobs_supervisor FOREIGN KEY (supervisor_user_id) REFERENCES users(id),
  CONSTRAINT fk_jobs_assistant FOREIGN KEY (assistant_user_id) REFERENCES users(id),
  CONSTRAINT fk_jobs_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_jobs_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_jobs_deleted_by FOREIGN KEY (deleted_by_user_id) REFERENCES users(id),
  KEY idx_jobs_status_delivery (status, delivery_date),
  KEY idx_jobs_deleted_delivery (deleted_at, delivery_date),
  KEY idx_jobs_supervisor (supervisor_user_id),
  KEY idx_jobs_assistant (assistant_user_id),
  KEY idx_jobs_created_date (job_created_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE job_status_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  old_status ENUM('waiting','progress','done') NULL,
  new_status ENUM('waiting','progress','done') NOT NULL,
  changed_by_user_id CHAR(36) NOT NULL,
  changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  reauthenticated BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_status_logs_job FOREIGN KEY (job_id) REFERENCES install_jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_status_logs_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id),
  KEY idx_status_logs_job_date (job_id, changed_at),
  KEY idx_status_logs_user_date (changed_by_user_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE auth_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3) NULL,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id),
  KEY idx_sessions_user_expiry (user_id, expires_at),
  KEY idx_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed reference data and the explicitly approved grants. Head Technician has no grants.
INSERT INTO roles (id, code, name) VALUES
  ('00000000-0000-4000-8000-000000000001','admin','ผู้ดูแลระบบ'),
  ('00000000-0000-4000-8000-000000000002','store','คลังสินค้า'),
  ('00000000-0000-4000-8000-000000000003','user','พนักงานทั่วไป'),
  ('00000000-0000-4000-8000-000000000004','head_technician','หัวหน้าช่าง');

INSERT INTO permissions (id, code, name) VALUES
  ('10000000-0000-4000-8000-000000000001','dashboard.view','ดู Dashboard'),
  ('10000000-0000-4000-8000-000000000002','jobs.view','ดูงานติดตั้ง'),
  ('10000000-0000-4000-8000-000000000003','jobs.create','สร้างงานติดตั้ง'),
  ('10000000-0000-4000-8000-000000000004','jobs.update','แก้ไขงานติดตั้ง'),
  ('10000000-0000-4000-8000-000000000005','jobs.delete','ส่งงานเข้าถังขยะ'),
  ('10000000-0000-4000-8000-000000000006','jobs.change_status','เปลี่ยนสถานะงาน'),
  ('10000000-0000-4000-8000-000000000007','jobs.assign_supervisor','กำหนดหัวหน้าช่าง'),
  ('10000000-0000-4000-8000-000000000008','trash.view','ดูถังขยะ'),
  ('10000000-0000-4000-8000-000000000009','trash.restore','กู้คืนงาน'),
  ('10000000-0000-4000-8000-000000000010','trash.permanent_delete','ลบงานถาวร'),
  ('10000000-0000-4000-8000-000000000011','users.manage','จัดการบัญชีผู้ใช้');

INSERT INTO role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, TRUE FROM roles r CROSS JOIN permissions p
WHERE r.code = 'admin';

INSERT INTO role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, TRUE FROM roles r JOIN permissions p
  ON p.code IN ('dashboard.view','jobs.view','jobs.create','jobs.update','jobs.delete','trash.view','trash.restore','trash.permanent_delete')
WHERE r.code = 'store';

INSERT INTO role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, TRUE FROM roles r JOIN permissions p
  ON p.code IN ('dashboard.view','jobs.view','jobs.change_status','jobs.assign_supervisor')
WHERE r.code = 'user';

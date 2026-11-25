<?php
declare(strict_types=1);

/** เตรียมตารางเก็บ token สำหรับตั้งรหัสผ่านใหม่ */
function ensurePasswordResetSchema(PDO $pdo): bool
{
    $exists = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'password_reset_tokens'"
    )->fetchColumn() > 0;
    if ($exists) {
        return false;
    }

    $pdo->exec(
        'CREATE TABLE password_reset_tokens (
            token_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id VARCHAR(64) NOT NULL,
            token_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME DEFAULT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (token_id),
            UNIQUE KEY uq_password_reset_token_hash (token_hash),
            KEY idx_password_reset_user_created (user_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    return true;
}

/** หา URL หลักของเว็บสำหรับประกอบลิงก์รีเซ็ตรหัสผ่าน */
function passwordResetBaseUrl(): string
{
    $configuredUrl = trim((string) (getenv('INSTALL_APP_URL') ?: ''));
    if ($configuredUrl !== '') {
        $parts = parse_url($configuredUrl);
        if (!is_array($parts) || !in_array($parts['scheme'] ?? '', ['http', 'https'], true)
            || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])) {
            throw new RuntimeException('INSTALL_APP_URL must be a valid HTTP or HTTPS application URL.');
        }
        return rtrim($configuredUrl, '/');
    }

    $host = (string) ($_SERVER['SERVER_NAME'] ?? '');
    if ($host === '' || preg_match('/^[a-zA-Z0-9.-]+$/', $host) !== 1) {
        throw new RuntimeException('Unable to determine the application URL; configure INSTALL_APP_URL.');
    }
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $scheme = $https ? 'https' : 'http';
    $port = (int) ($_SERVER['SERVER_PORT'] ?? ($https ? 443 : 80));
    $portSuffix = ($https && $port !== 443) || (!$https && $port !== 80) ? ':' . $port : '';
    $applicationPath = dirname(dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/api/users.php')));
    $applicationPath = $applicationPath === DIRECTORY_SEPARATOR ? '' : '/' . trim($applicationPath, '/');
    return $scheme . '://' . $host . $portSuffix . $applicationPath;
}

/** อ่านอีเมลผู้ส่งจาก environment หรือค่า PHP mail configuration */
function passwordResetSenderAddress(): string
{
    $configuredSender = trim((string) (getenv('INSTALL_MAIL_FROM') ?: ''));
    return $configuredSender !== '' ? $configuredSender : trim((string) ini_get('sendmail_from'));
}

/** ส่งอีเมลที่มีลิงก์ใช้ครั้งเดียวสำหรับตั้งรหัสผ่านใหม่ */
function sendPasswordResetEmail(string $email, string $token, string $baseUrl): bool
{
    $from = passwordResetSenderAddress();
    if (!function_exists('mail') || filter_var($from, FILTER_VALIDATE_EMAIL) === false) {
        throw new RuntimeException('Configure PHP mail delivery and a valid INSTALL_MAIL_FROM address.');
    }

    $link = $baseUrl . '/ResetPassword.html?token=' . rawurlencode($token);
    $subject = 'ตั้งรหัสผ่านใหม่สำหรับระบบจัดการงาน';
    $encodedSubject = function_exists('mb_encode_mimeheader')
        ? mb_encode_mimeheader($subject, 'UTF-8', 'B')
        : '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $body = "มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีนี้\n\n"
        . "เปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ลิงก์ใช้ได้ 1 ชั่วโมงและใช้ได้ครั้งเดียว):\n"
        . $link . "\n\n"
        . "หากคุณไม่ได้เป็นผู้ขอ สามารถละเว้นอีเมลฉบับนี้ได้";
    $headers = [
        'From: ' . $from,
        'Content-Type: text/plain; charset=UTF-8',
        'X-Mailer: PHP/' . PHP_VERSION
    ];
    return mail($email, $encodedSubject, $body, implode("\r\n", $headers));
}

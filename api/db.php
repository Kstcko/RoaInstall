<?php
declare(strict_types=1);

// อ่านค่าการเชื่อมต่อจาก environment แล้วสร้าง PDO สำหรับ MySQL
$host = getenv('INSTALL_DB_HOST') ?: '127.0.0.1';
$port = getenv('INSTALL_DB_PORT') ?: '3306';
$database = getenv('INSTALL_DB_NAME') ?: 'install';
$username = getenv('INSTALL_DB_USER') ?: 'root';
$password = getenv('INSTALL_DB_PASSWORD');
$password = $password === false ? '' : $password;

$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    $host,
    $port,
    $database
);

return new PDO($dsn, $username, $password, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false
]);

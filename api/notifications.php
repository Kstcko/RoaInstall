<?php
declare(strict_types=1);

/** สร้างตารางการแจ้งเตือนเมื่อยังไม่มี และคืนค่าว่ามีการเปลี่ยน schema หรือไม่ */
function ensureNotificationsTable(PDO $pdo): bool
{
    $missing = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'notifications'"
    )->fetchColumn() === 0;
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS notifications (
            notification_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id VARCHAR(40) NOT NULL,
            task_id BIGINT UNSIGNED NOT NULL,
            event_type VARCHAR(40) NOT NULL,
            title VARCHAR(160) NOT NULL,
            message VARCHAR(500) NOT NULL,
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (notification_id),
            KEY idx_notifications_user_read_created (user_id, is_read, created_at),
            KEY idx_notifications_task (task_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    return $missing;
}

/** เพิ่มการแจ้งเตือนของงานให้ผู้ใช้หลายคนภายในคำขอเดียว */
function addTaskNotifications(
    PDO $pdo,
    int $taskId,
    string $eventType,
    string $title,
    string $message,
    array $recipientIds
): void {
    $recipientIds = array_values(array_unique(array_filter(
        $recipientIds,
        static fn (string $userId): bool => $userId !== ''
    )));
    if ($recipientIds === []) {
        return;
    }

    $statement = $pdo->prepare(
        'INSERT INTO notifications (user_id, task_id, event_type, title, message, created_at)
         VALUES (:user_id, :task_id, :event_type, :title, :message, UTC_TIMESTAMP())'
    );
    foreach ($recipientIds as $userId) {
        $statement->execute([
            'user_id' => $userId,
            'task_id' => $taskId,
            'event_type' => $eventType,
            'title' => $title,
            'message' => $message
        ]);
    }
}

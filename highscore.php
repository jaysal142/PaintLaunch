<?php
require 'db.php';
$data = json_decode(file_get_contents('php://input'), true);
$token = $data['token'] ?? '';
$score = $data['score'] ?? 0;

try {
    $stmt = $pdo->prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()");
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if ($user) {
        $stmt = $pdo->prepare("INSERT INTO scores (user_id, score) VALUES (?, ?)");
        $stmt->execute([$user['user_id'], $score]);
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false]);
}
?>
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
        // update high_score in player_data if this score beats it
        $stmt = $pdo->prepare("UPDATE player_data SET high_score = GREATEST(high_score, ?) WHERE user_id = ?");
        $stmt->execute([$score, $user['user_id']]);

        // insert into scores for leaderboard history
        $stmt = $pdo->prepare("INSERT INTO scores (user_id, score) VALUES (?, ?)");
        $stmt->execute([$user['user_id'], $score]);

        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Session invalid']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
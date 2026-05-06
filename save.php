<?php
require 'db.php';
$data = json_decode(file_get_contents('php://input'), true);
$token = $data['token'] ?? '';

try {
    $stmt = $pdo->prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()");
    $stmt->execute([$token]);
    $session = $stmt->fetch();

    if ($session) {
        $stmt = $pdo->prepare("UPDATE player_data SET 
            currency = ?, high_score = GREATEST(high_score, ?), 
            base_lives = ?, base_boosts = ?, 
            upgrades = ?, inventory = ?, shop_items = ?, boost_power = ? 
            WHERE user_id = ?");
        $stmt->execute([
            $data['currency'], $data['highScore'], $data['baseLives'], $data['baseBoosts'],
            json_encode($data['upgrades']), json_encode($data['inventory']),
            json_encode($data['shop_items']), $data['boostPower'], $session['user_id']
        ]);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Session invalid']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
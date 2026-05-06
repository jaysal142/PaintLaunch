<?php
require 'db.php';
$token = $_GET['token'] ?? '';

try {
    $stmt = $pdo->prepare("SELECT p.* FROM player_data p 
                           JOIN sessions s ON p.user_id = s.user_id 
                           WHERE s.token = ? AND s.expires_at > NOW()");
    $stmt->execute([$token]);
    $res = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($res) {
        $res['upgrades'] = json_decode($res['upgrades']);
        $res['inventory'] = json_decode($res['inventory']);
        $res['shop_items'] = json_decode($res['shop_items']);
        echo json_encode(['success' => true, 'data' => $res]);
    } else {
        echo json_encode(['success' => false]);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false]);
}
?>
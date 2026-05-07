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
        $res['upgrades']  = json_decode($res['upgrades'], true);
        $res['inventory'] = json_decode($res['inventory'], true);
        $res['shopItems'] = json_decode($res['shop_items'], true); // rename to camelCase
        unset($res['shop_items']); // remove the snake_case version
        echo json_encode(['success' => true, 'data' => $res]);
    } else {
        echo json_encode(['success' => false]);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false]);
}
?>
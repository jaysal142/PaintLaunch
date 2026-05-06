<?php
require 'db.php';

try {
    // Get the top 3 highest scores and the names of the players who set them
    $stmt = $pdo->query("SELECT u.username, MAX(s.score) as score 
                         FROM users u 
                         JOIN scores s ON u.id = s.user_id 
                         GROUP BY u.id 
                         ORDER BY score DESC 
                         LIMIT 3");
    $scores = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'scores' => $scores]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
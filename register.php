<?php
require 'db.php';

// Get the JSON data sent from the game
$data = json_decode(file_get_contents('php://input'), true);
$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all fields']);
    exit;
}

try {
    // Check if the username is already taken
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Username already exists']);
        exit;
    }

    // Hash the password and create the user
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
    $stmt->execute([$username, $hash]);
    $userId = $pdo->lastInsertId();

    // Create the default game state for this new user
    // We store inventory and upgrades as JSON strings
    $stmt = $pdo->prepare("INSERT INTO player_data (user_id, upgrades, inventory, shop_items) VALUES (?, ?, ?, ?)");
    $stmt->execute([
        $userId, 
        json_encode(['power' => 0, 'speed' => 0]),
        json_encode(['cannons' => ['base'], 'activeCannon' => 'base']),
        json_encode(['cannon' => [], 'player' => [], 'boost' => []])
    ]);

    // Generate a unique session token
    $token = bin2hex(random_bytes(16));
    $stmt = $pdo->prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))");
    $stmt->execute([$token, $userId]);

    echo json_encode(['success' => true, 'token' => $token, 'username' => $username]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Registration error: ' . $e->getMessage()]);
}
?>
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$host = 'localhost';
$db   = 'paintlaunch';
$user = 'root'; // CHANGE THIS TO YOUR USERNAME
$pass = 'Lucasis2'; // CHANGE THIS TO YOUR PASSWORD

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $data = json_decode(file_get_contents('php://input'), true);
    $inputPassword = $data['password'] ?? '';

    $stmt = $pdo->prepare('SELECT password_hash FROM dev_users WHERE username = ?');
    $stmt->execute(['dev']);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row && password_verify($inputPassword, $row['password_hash'])) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'incorrect password']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>

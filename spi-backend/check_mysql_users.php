<?php
$mysqli = new mysqli("localhost", "root", "", "spi_db");
if ($mysqli->connect_errno) {
    echo "Failed to connect to MySQL: " . $mysqli->connect_error;
    exit();
}

$res = $mysqli->query("SELECT u.id, u.username, u.active, i.secret, i.secret2 FROM users u LEFT JOIN auth_identities i ON u.id = i.user_id");
if (!$res) {
    echo "Query failed: " . $mysqli->error;
    exit;
}

$users = $res->fetch_all(MYSQLI_ASSOC);
print_r($users);

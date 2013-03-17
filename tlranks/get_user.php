<?php
header("content-type: application/json"); 
require 'database.php';

if (isset($_GET['name'])) {
  try {
    $db = dbConnect();    
    $data = array($_GET['name']);
    
    $stmt = $db->prepare("SELECT * FROM users WHERE name=?");
    $stmt->setFetchMode(PDO::FETCH_ASSOC);
    $stmt->execute($data);
    $jsonData = $stmt->fetch();
    
    $stmt = $db->prepare("SELECT * FROM mode WHERE name=? AND mode=1");
    $stmt->setFetchMode(PDO::FETCH_ASSOC);
    $stmt->execute($data);
    $row = $stmt->fetch();
    $jsonData['modes'] = array();
    if ($row != false) {
      array_push($jsonData['modes'], $row);
    }

    $json = json_encode($jsonData);
    echo $json;
  } catch(PDOException $e) {
    echo $e->getMessage();
  }
  $db = null;
}
else {
  echo "null";
}
?>

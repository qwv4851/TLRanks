<?php
header("content-type: application/json"); 
require 'database.php';

if (isset($_GET['name'])) {
  $name = $_GET['name'];
  try {
    $db = dbConnect();
    $data = array($name);
    $stmt = $db->prepare("SELECT * FROM mode WHERE name=? AND mode=1");
    $stmt->setFetchMode(PDO::FETCH_ASSOC); 
    $stmt->execute($data);

    $jsonData['name'] = $name;
    $row = $stmt->fetch();
    $jsonData['modes'] = array();
    if ($row != false) {
      array_push($jsonData['modes'], $row);
    }
    
    $stmt = $db->prepare("SELECT region, profile FROM users WHERE name=?");
    $stmt->execute($data);
    $row = $stmt->fetch();
    $jsonData['region'] = $row['region'];
    $jsonData['profile'] = $row['profile'];
    
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

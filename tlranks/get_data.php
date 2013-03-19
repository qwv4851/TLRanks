<?php
header("content-type: application/json"); 
require 'database.php';
  try {
    $db = dbConnect();        
    
    $stmt = $db->prepare("SELECT COUNT(*) FROM mode GROUP BY mode");
    $stmt->setFetchMode(PDO::FETCH_NUM);
    $stmt->execute();
    $jsonData['modes'] = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
    
    $stmt = $db->prepare("SELECT COUNT(*) FROM mode WHERE mode=1 GROUP BY leagueIndex");
    $stmt->setFetchMode(PDO::FETCH_NUM);
    $stmt->execute();
    $jsonData['leagues'] = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
    
    $jsonData['teams'] = array();
    
    $stmt = $db->prepare("SELECT COUNT(*) FROM mode WHERE mode=1 IN (SELECT mode FROM mode GROUP BY name)");
    $stmt->setFetchMode(PDO::FETCH_NUM);
    $stmt->execute();
    $res = $stmt->fetch();
    array_push($jsonData['teams'], $res[0]);
    
    $stmt = $db->prepare("SELECT COUNT(*) FROM mode WHERE mode!=1 IN (SELECT mode FROM mode GROUP BY name)");
    $stmt->setFetchMode(PDO::FETCH_NUM);
    $stmt->execute();
    $res = $stmt->fetch();
    array_push($jsonData['teams'], $res[0]);
    
    $jsonData['game'] = array();
    
    $stmt = $db->prepare("SELECT COUNT(*) FROM tlranks.mode WHERE game='W'");
    $stmt->setFetchMode(PDO::FETCH_NUM);
    $stmt->execute();
    $res = $stmt->fetch();
    array_push($jsonData['game'], $res[0]);
    
    $stmt = $db->prepare("SELECT COUNT(*) FROM tlranks.mode WHERE game='H'");
    $stmt->setFetchMode(PDO::FETCH_NUM);
    $stmt->execute();
    $res = $stmt->fetch();
    array_push($jsonData['game'], $res[0]);
    
    $stmt = $db->prepare("SELECT COUNT(*) FROM tlranks.users WHERE profile != ''");
    $stmt->setFetchMode(PDO::FETCH_NUM);
    $stmt->execute();
    $res = $stmt->fetch();
    $jsonData['users'] = $res[0];
    $stmt = $db->prepare("SELECT COUNT(DISTINCT name) FROM tlranks.mode");
    $stmt->setFetchMode(PDO::FETCH_NUM);
    $stmt->execute();
    $res = $stmt->fetch();
    $jsonData['usersWithGames'] = $res[0];
    
    echo json_encode($jsonData);
  } catch(PDOException $e) {
    echo $e->getMessage();
  }
  $db = null;
?>

<?php
require 'database.php';

try {
  $db = dbConnect();

  $data = array($_POST['name'], $_POST['region'], $_POST['profile']);
  $stmt = $db->prepare("REPLACE INTO users (name, region, profile, date) VALUES (?, ?, ?, CURDATE())");
  $stmt->execute($data);
  
  foreach($_POST['modes'] as &$mode) {
    $data = array($_POST['name'], $mode['name'], $mode['leagueIndex'], $mode['tier'], $mode['points'], $mode['race'], $mode['wins'], $mode['losses'], $mode['divisionRank'], $mode['regionRank'], $mode['worldRank']);
    $stmt = $db->prepare("REPLACE INTO mode (name, mode, leagueIndex, tier, points, race, wins, losses, divisionRank, regionRank, worldRank, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())");
    $stmt->execute($data);
  }
  
} catch(PDOException $e) {
  echo $e->getMessage();
}
$db = null;
?>
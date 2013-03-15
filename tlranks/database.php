<?php
function dbConnect() {
  $username="root";
  $database="tlranks";
  $password="";
  
  $db = new PDO("mysql:host=localhost;dbname=$database", $username, $password); 
  $db->setAttribute( PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION ); 
  $db->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
  return $db;
}

function getIp() {
  //Test if it is a shared client
  if (!empty($_SERVER['HTTP_CLIENT_IP'])){
    $ip=$_SERVER['HTTP_CLIENT_IP'];
  //Is it a proxy address
  }elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])){
    $ip=$_SERVER['HTTP_X_FORWARDED_FOR'];
  } else {
    $ip=$_SERVER['REMOTE_ADDR'];
  }
  return ip2long($ip);
}
?>
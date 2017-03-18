<?php
function getConnect(){
	$servername = "localhost";
	$username = "root";
	$password = "lalalalalala";
	$conn = new mysqli($servername, $username, $password);
	if ($conn->connect_error) {
		die("Connection failed: " . $conn->connect_error);
	}
	$conn->select_db("3715game");
	return $conn;
}
?>
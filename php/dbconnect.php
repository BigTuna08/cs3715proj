<?php
function getConnect(){
	//server chosen between local test server and assigned group server
	$servername = '';
		$username = '';
		$password = '';
		$dbname='';
	if($_SERVER['SERVER_NAME']=='localhost'){
		
		$servername = "localhost";
		$username = "root";
		$password = "lalalalalala";
		$dbname="3715game";
		
	}else{
		$servername="mysql.cs.mun.ca";
		$username="cs3715w17_kln870";
		$password="XB1@RQs3";
		$dbname="cs3715w17_kln870";
	}

	$conn = new mysqli($servername, $username, $password);
	if ($conn->connect_error) {
		die("Connection failed: " . $conn->connect_error);
	}
	$conn->select_db($dbname);
	return $conn;
}
?>
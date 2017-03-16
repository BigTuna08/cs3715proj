<?php
include('dbconnect.php');
$conn=getConnect();
?>
<!doctype html>
<html>
<head>
<style>
h1{
	font-size:1.5em;
}
</style>
<title>Lobby Browser</title>
</head>
<body>
<div style="width:60%;margin:auto;text-align:center">
<h1>Join an active game</h1>
<ul>
<?PHP
$query="SELECT * FROM `lobby`";
$result=$conn->query($query);
while($row=$result->fetch_array()){
	$name=$row['name'];
	$id=$row['id'];
	echo 
		"<li>
		<a href=\"lobby.php?id=$id\">$name</a>
		</li>";
}
?>
</ul>
<a href="lobby.php">New Lobby</a>
</div>
</body>
</html>

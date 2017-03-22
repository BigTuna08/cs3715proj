<?PHP
$stmt=$conn->prepare("SELECT * FROM lobby");
$stmt->execute();
$result=$stmt->get_result()->fetch_all(MYSQLI_ASSOC);
?>

<table border>
<tr><td colspan=2>LOBBIES</td></tr>
<tr><td>name</td><td></td></tr>
<?PHP
foreach($result as $lobby){
	if($lobby['ingame'])continue;
	?>
	<tr>
	
	<form method="post" action="index.php?playername=<?PHP echo $playername?>">
		<input type="hidden" name="action" value="join">
		<input type="hidden" name="lobby" value="<?PHP echo $lobby['id']?>">
		<td><div><?PHP echo $lobby['name'] ?></div></td>
		<td><input type="submit" value="JOIN"></td>
	</form>
	</tr>
	<?PHP
}
?>
</table>
<?PHP
if(isset($page_data['notification']))echo $page_data['notification'];
?>

<form method="POST" action="index.php?playername=<?PHP echo $playername?>">
	<input type="hidden" name="action" value="newlobby">
	<input type="text" name="name" value="unique name">
	<input type="submit" value="New Lobby">
</form>
<?PHP

?>
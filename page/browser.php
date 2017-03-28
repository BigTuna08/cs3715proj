<?PHP
$stmt=$conn->prepare("SELECT * FROM lobby");
$stmt->execute();
$result=$stmt->get_result()->fetch_all(MYSQLI_ASSOC);
?>
<style>
td{
	border:1px solid yellow;
	width:50px;
}
</style>
<div class="centerbox" style="width:400px">
<h1>Lobby Browser</h1>

<?PHP
if(count($result)==0){
	echo '<span class="warning">No-one in the world is playing this game</span><br><br>';
	
}else{
	?>
	<table style=";;margin:auto;border:1px solid yellow;">
	<tr><td colspan=2>LOBBIES</td></tr>
	<?PHP
}
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
</table><br>
<?PHP
if(isset($page_data['notification']))echo $page_data['notification'];
?>
<script>
function init(){;}//does nothing
function validate(e){
	return !document.getElementById("name").value=="";
}
</script>
<form method="POST" onSubmit="return validate(event)" action="index.php?playername=<?PHP echo $playername?>">
	<input type="hidden" name="action" value="newlobby">
	<input type="text" id="name" name="name" placeholder="unique lobby name">
	<input type="submit" value="Create Lobby">
</form>
<form style="float:right" method="post" action="index.php">
	<input type="submit" value="logout">
	<input type="hidden" name="action" value="logout">
</form>
</div>
<?PHP

?>
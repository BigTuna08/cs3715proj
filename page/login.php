
<div class="centerbox">
	<span style="color:red"><?PHP
	if(isset($page_data['notification']))echo $page_data['notification'];
	?></span>
	<br>
	<form method="POST" action="index.php">
		<input type="hidden" name="action" value="login">
		<label>Login:<br><input name="name" type="text"></label>
	</form>
	<form method="POST" action="index.php">
		<input type="hidden" name="action" value="signup">
		<label>New Player:<br><input name="name" type="text"></label>
	</form>
</div>
<?PHP
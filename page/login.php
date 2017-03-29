<div class="centerbox">
	<h1>Login</h1>
	<span style="color:red"><?PHP
	if(isset($page_data['notification']))echo $page_data['notification'];
	?></span>
	<br>
	<form method="POST" action="index.php?action=login">
		<input type="hidden" name="action" value="login">
		<label>Name:<br><input name="name" type="text"></label>
		<label>Password:<br><input name="pass" type="password"></label>
		<input style="margin-top:1em" type="submit" value="Login">
	</form>
	<br>
	<a class="plainlink"  href="index.php?action=newuser">New User</a>
</div>
<?PHP
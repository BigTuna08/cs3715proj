<div class="centerbox">
	<h1>Create an Account</h1>
	<span style="color:red"><?PHP
	if(isset($page_data['notification']))echo $page_data['notification'];
	?></span>
	<br>
	<form method="POST" action="index.php?action=signup">
		<input type="hidden" name="action" value="signup">
		<label>Name:<br><input name="name" type="text"></label>
		<label>Password:<br><input name="pass" type="password"></label>
		<input style="margin-top:1em" type="submit" value="Create Account">
	</form>
	<br>
	<a class="plainlink" href="index.php?action=existinguser">I already have an account</a>
</div>
<?PHP
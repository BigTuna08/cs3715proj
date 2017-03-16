<?PHP
include('dbconnect.php');
$conn=getConnect();

$id=$_GET['id'];
$player=$_GET['player']'

//get game data
$query="SELECT * FROM lobby WHERE id=$id";
$lobbyData=$conn->query($query)->fetch_all(MYSQLI_ASSOC);

//maybe don't use this
$query="SELECT * FROM lobby_$id WHERE id=$id";
?>
<!doctype html>
<html>
<head>
	
	<meta content="text/html;charset=utf-8" http-equiv="Content-Type">
	<link rel="stylesheet" type="text/css" href="style.css">
<script type="text/javascript"><?PHP
echo "var lobbyData=".json_encode($lobbyData).';';
echo "var playerNum=".player.";";
?></script>
<script type="text/javascript" src="util.js"></script>
<script type="text/javascript" src="gameObj.js"></script>
<script type="text/javascript" src="main.js"></script>
</head>
<body style="margin:0" onload="init()">
	<div id="main" style="margin-left:20%;width:60%;height:100%;top:10%;position:absolute;">
		<img style="position:absolute" src="" width="1000" height="1000" usemap="#backmap">
		<div style="pointer-events:None;position:absolute;width:1000px;height:1000px;background:grey">
	</div>
	
	<div style="padding:5px;position:fixed;bottom:0px;right:0px;width:500px;height:30px;background:red;border-radius:4px;border:2px solid orange">
		<button class="razeBtn"><em>RAZE</em></button>
		<div style="margin-left:5px;float:left;background:yellow;border-radius:4px;border:2px solid blue">
			<button onclick="orderBuild('city')" class="blBtn"><b>CITY(5)</b></button>
			<button onclick="orderBuild('farm')" class="blBtn"><b>FARM(2)</b></button>
			<button onclick="orderBuild('wall')" class="blBtn"><b>WALL(2)</b></button>
			<button onclick="orderBuild('camp')" class="blBtn"><b>CAMP(3)</b></button>
		</div>
		<button class="endBtn"><em>END TURN</em></button>
	</div>
</body>
</html>
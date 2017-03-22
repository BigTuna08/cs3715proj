<?PHP

$lobby_id=$page_data['lobby_id'];

?>
<!doctype html>
<html>
<head>
	<meta content="text/html;charset=utf-8" http-equiv="Content-Type">
	<link rel="stylesheet" type="text/css" href="css/style.css">
	<script type="text/javascript">
		<?PHP
		echo "var lobby_id='$lobby_id';";
		echo "var playername='$playername';";
		?>
	</script>
	<script type="text/javascript" src="js/util.js"></script>
	<script type="text/javascript" src="js/gameObj.js"></script>
	<script type="text/javascript" src="js/main.js"></script>
</head>
<body style="margin:0" onload="init()">
	<div style="margin-left:20%;width:60%;height:100%;top:10%;position:absolute;">
		<img style="position:absolute" src="" width="1000" height="1000" usemap="#backmap">
		<div style="pointer-events:None;position:absolute;width:1000px;height:1000px;background:grey">
		<div id="main"></div>
	</div>
	
	<div id="buttonrow" style=";padding:5px;position:fixed;bottom:0px;right:0px;width:600px;height:30px;background-image:url('img/checker.png');border-radius:4px;border:2px solid orange">
		<button onclick="razeOrder()" class="razeBtn"><em>RAZE</em></button>
		<div style="margin-left:5px;float:left;background:yellow;border-radius:4px;border:2px solid blue">
			<button onclick="orderBuild('city')" class="blBtn"><b>CITY(5)</b></button>
			<!--<button onclick="orderBuild('farm')" class="blBtn"><b>FARM(2)</b></button>!-->
			<button onclick="orderBuild('wall')" class="blBtn"><b>WALL(2)</b></button>
			<button onclick="orderBuild('camp')" class="blBtn"><b>CAMP(3)</b></button>
		</div>
		<div style="float:left">
		
			<button id="endturnbutton" style="float:left" onclick="endTurn()" class="endBtn"><em>END TURN</em></button>
			<button id=" " style="float:left" onclick="resign()" class="endBtn"><em>QUIT</em></button>
		</div>
	</div>
</body>
</html>
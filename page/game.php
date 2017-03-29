<?PHP

$lobby_id=$page_data['lobby_id'];

?>

<html>
<head>
	
	<script type="text/javascript">
		<?PHP
		echo "var lobby_id='$lobby_id';";
		echo "var playername='$playername';";
		?>
	</script>
	<script type="text/javascript" src="js/util.js"></script>
	<script type="text/javascript" src="js/gameObj.js"></script>
	<script type="text/javascript" src="js/main.js"></script>

	<div id="parentdiv" onload="init()" style="margin:auto;">
		<img id="behindimg" style="position:absolute" src="" width="1000" height="1000" usemap="#backmap">
		<div id="fakeimg" style="pointer-events:None;position:absolute;width:1000px;height:1000px;background-image:url('img/seamless.png')">
		<div id="main"></div>
	</div>
	
	<div id="buttonrow" style=";padding:5px;position:fixed;bottom:0px;right:0px;width:600px;height:30px;background-image:url('img/checker.png');border-radius:4px;border:2px solid orange">
		<button onclick="razeOrder()" class="razeBtn"><em>RAZE</em></button>
		<div style="margin-left:5px;float:left;background:yellow;border-radius:4px;border:2px solid blue">
			<button id="buildbtncity" onclick="orderBuild('city')" class="blBtn"><b>CITY(5)</b></button>
			<button id="buildbtnwall" onclick="orderBuild('wall')" class="blBtn"><b>WALL(2)</b></button>
			<button id="buildbtncamp" onclick="orderBuild('camp')" class="blBtn"><b>CAMP(3)</b></button>
		</div>
	
		
		<div style="float:left">
		
			<button id="endturnbutton" style="float:left" onclick="endTurn()" class="endBtn"><em>END TURN</em></button>
			<button id=" " style="float:left" onclick="resign()" class="endBtn"><em>QUIT</em></button>
		</div>
	</div>
	
	
	<div id="inforow" style=";padding:5px;position:fixed;top:0px;right:0px;width:100px;height:30px;background-image:url('img/checker.png');border-radius:4px;border:2px solid orange">
		<div class="blBtn">hi</div>
	</div>

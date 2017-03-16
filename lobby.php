<?php
include('dbconnect.php');
$conn=getConnect();

$host=false;//you don't get to set map parameters
if(!isset($_GET['id'])){
	$host=true;//you get to set map parameters
	$query="SELECT game_counter FROM `global`";
	$game_counter=$conn->query($query)->fetch_array()['game_counter']+1;
	
	$query="UPDATE `global` SET game_counter=game_counter+1";
	$conn->query($query) or die($conn->error);;
	
	//register lobby
	$query="INSERT INTO `lobby` 
		(id,name,players,param) VALUES 
		($game_counter,'game_$game_counter',0,'')";
	$conn->query($query) or die($conn->error);
	//create lobby table
	$id=$game_counter;
	
	$query="CREATE TABLE lobby_$id 
		(player INT,ready BOOLEAN,changed BOOLEAN,move TEXT)";
	$conn->query($query) or die($conn->error);
}else{
	$id=$_GET['id'];
}
//add player who requested this page
$query="SELECT players FROM `lobby` WHERE id=$id";

//set player number
$player=$conn->query($query)->fetch_array()['players'];

//increment player count
$query="UPDATE `lobby` SET players=players+1 WHERE id=$id";
$conn->query($query)or die($conn->error);;;;

//insert me into lobby
$query="INSERT INTO `lobby_$id` (player,ready,changed)
	VALUES ($player,FALSE,FALSE)";
$conn->query($query)or die($conn->error);;

//set changed bit
$query="UPDATE `lobby_$id` SET changed=TRUE";
$conn->query($query)or die($conn->error);;


?>
<!doctype html>
<html>
<head>
<script type="text/javascript" src="util.js"></script>

<script>
//globals
var lobby_id=<?PHP echo $id?>;
var player=<?PHP echo $player?>;


function redisplay(info){
	//clear display
	var ulist=id("players");
	for(var i=0;i<ulist.children.length;i++){
		ulist.removeChild(ulist.children[i]);
	}
	var waiting=false;//do we need to wait for the game to start
	info.players.forEach((e)=>{
		print("adding player"+e.player);
		var li=document.createElement('li');
		li.style.background=(e.ready==1)?"green":"";
		if(e.ready==0)waiting=true;
		li.textContent="player "+e.player;
		ulist.appendChild(li);
	});
	if(!waiting){
		window.location.replace("game.php?id="+lobby_id+"&player="+player);
	}
}



function getInfo(){
	var xhr=new XMLHttpRequest();
	xhr.onreadystatechange=function(){
		//console.log(xhr.response);
		if(xhr.readyState==4){	
			if(xhr.response==="nochange")return;
			else if(xhr.responseText!=""){
				var info=JSON.parse(xhr.responseText);
				redisplay(info);
			}
		}
	}
	xhr.open("POST","lobby_helper.php");
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhr.send("lobby="+lobby_id+"&player="+player);
	
	//if allready
	//	//	redirect page to game.php with js window.location.replace ?lob=$lobbyname
		//	game.php: php will put lobby info in js variable to be processed
}
function init(){
	getInfo();
	setInterval(getInfo,3000);
}
function sendRequest(action){
	var xhr=new XMLHttpRequest();
	xhr.open("POST","lobby_helper.php");
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhr.send("lobby="+lobby_id+"&player="+player+"&"+action);
}

</script>
<title>LOBBY <?PHP echo '#'.$id?></title>
</head>
<body onload="init()">
<h1>lobby</h1>
<?PHP if($host){?>	
	<button>IMA HOST</button>
<?PHP }?>
<ul id="players">

</ul>
<button onclick="sendRequest('ready=true')">READY</button>
</body>
</html>
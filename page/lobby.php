<?php
$stmt=$conn->prepare("SELECT activity FROM player WHERE name=?");
$stmt->bind_param("s",$playername);
$stmt->execute();
$activity=explode(' ',$stmt->get_result()->fetch_array()['activity']);
$lobby_id='';
$lobby_id=$activity[1];

?>
<script type="text/javascript" src="util.js"></script>
<script>
"use strict"
//globals
var lobby_id='<?PHP echo $lobby_id?>';
var player='<?PHP echo $_GET['playername']?>';


function redisplay(info){
	console.log(info);
	var ulist=id("players");
	ulist.innerHTML="";//for some reason removeChild wasn't working
	var params=JSON.parse(info.lobby.param);
	var waiting=false;//do we need to wait for the game to start
	info.players.forEach((e)=>{
		var li=document.createElement('li');
		li.style.background=(e.ready==1)?"green":"";
		if(e.ready==0)waiting=true;
		li.textContent="player "+e.playername;
		ulist.appendChild(li);
	});
	
	id("title").textContent=info.lobby.name;
	id("seed").value=params.seed;
	id("dimx").value=params.dim[0];
	id("dimy").value=params.dim[1];

	if(!waiting){
		sendRequest("action=notifyentergame");
		setTimeout(()=>{window.location.replace("game1.php?playername="+player)},1000);
	}
}



function getInfo(force){
	var xhr=new XMLHttpRequest();
	xhr.onreadystatechange=function(){
		console.log(xhr.response);
		if(xhr.readyState==4){
			if(xhr.response==="nochange")return;
			else if(xhr.responseText!=""){
				var info=JSON.parse(xhr.responseText);
				redisplay(info);
			}
		}
	}
	xhr.open("POST","game1.php");
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhr.send("action=querylobby&lobby_id="+lobby_id+"&playername="+player+(force?"&force=true":""));
	
	//if allready
	//	//	redirect page to game.php with js window.location.replace ?lob=$lobbyname
		//	game.php: php will put lobby info in js variable to be processed
}
function init(){
	getInfo(true);
	setInterval(getInfo,3000);
}
function sendRequest(action){
	var xhr=new XMLHttpRequest();
	xhr.onreadystatechange=function(){
		console.log("for "+action+" I got "+xhr.response);
	}
	xhr.open("POST","game1.php");
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhr.send("lobby_id="+lobby_id+"&playername="+player+"&"+action);
	console.log("lobby_id="+lobby_id+"&playername="+player+"&"+action);
}
function updateParams(){
	var seed=id("seed").value;
	var dim=[id('dimx').value,id('dimy').value]
	var params={seed:seed,dim:dim};
	console.log("params="+encodeURI(JSON.stringify(params)));
	sendRequest("action=updateparams&params="+encodeURI(JSON.stringify(params)));
	
}
function leave(){
	sendRequest('action=leavelobby');
	setTimeout(()=>{window.location.replace("game1.php?playername="+player)},1000);
}
</script>
<title>LOBBY</title>
</head>
<body onload="init()">
<h1 id="title"></h1>
<div id="param_fields">
	<button>IMA HOST</button>
	<input id="seed" type="number" value="123456" onchange="updateParams()">
	<label>horizontal tiles: <input id="dimx" type="number" value="5" onchange="updateParams()"></label>
	<label>vertical tiles: <input id="dimy" type="number" value="5" onchange="updateParams()"></label>
</div>

<ul id="players">
<li>Please wait</li>
</ul>

<button onclick="sendRequest('action=ready')">READY</button>
<button onclick="leave()">LEAVE</button>
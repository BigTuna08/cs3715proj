<?php
$stmt=$conn->prepare("SELECT activity FROM player WHERE name=?");
$stmt->bind_param("s",$playername);
$stmt->execute();
$activity=explode(' ',$stmt->get_result()->fetch_array()['activity']);
$lobby_id='';
$lobby_id=$activity[1];
?>
<script type="text/javascript" src="js/util.js"></script>
<script>
"use strict"
//globals
var lobby_id='<?PHP echo $lobby_id;?>';
var player='<?PHP echo $playername;?>';

//update displayed information
function redisplay(info){
	console.log(info);
	var ulist=id("players");
	ulist.innerHTML="";//for some reason removeChild wasn't working
	var params=JSON.parse(info.lobby.param);
	var waiting=false;//do we need to wait for the game to start?
	info.players.forEach((e)=>{
		print(e);
		var li=document.createElement('li');
		if(e.ready==1){
			li.style.padding="1px";
			li.style.background="green";
			li.style.borderRadius="2px";
			li.style.border="2px solid yellow";
		}
		
		
		if(e.ready==0)waiting=true;
		li.textContent="player "+e.playername;
		ulist.appendChild(li);
	});
	if(info.players.length==1){
		console.log("only one player, will not enter game");
		waiting=true;
	}
	id("title").textContent=info.lobby.name;
	id("seed").value=params.seed;
	id("dimx").value=params.dim[0];
	id("dimy").value=params.dim[1];
	
	//game starts automatically when all players are ready
	if(!waiting){
		sendRequest("action=notifyentergame");
		setTimeout(()=>{window.location.replace("index.php?playername="+player)},1000);
	}
}

//query server for lobby info, force means do it now
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
	xhr.open("POST","index.php");
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhr.send("action=querylobby&lobby_id="+lobby_id+(force?"&force=true":""));
	
}

//initialize page
function init(){
	getInfo(true);
	setInterval(getInfo,2000);
}

//from util.js
var sendRequest=new SendRequest(lobby_id,player);

//upload map settings
function updateParams(){
	var seed=id("seed").value;
	var dim=[id('dimx').value,id('dimy').value]

	var params={seed:seed,dim:dim};
	console.log("params="+encodeURI(JSON.stringify(params)));
	sendRequest("action=updateparams&params="+encodeURI(JSON.stringify(params)));
}

//return to browser
function leave(){
	sendRequest('action=leavelobby');
	setTimeout(()=>{window.location.replace("index.php?playername="+player)},1000);
}

</script>
<div class="centerbox" style="width:800px">
<span style="text-align:center">
	<h1 style="border: 1px solid yellow;border-radius:2px" id="title"></h1>
</span>
<div id="param_fields">
	<div class="outline">
		<span style="float:left">Game Parameters: &nbsp </span>
		<div class="outline">Seed:&nbsp <input id="seed" type="number" style="width:7em;color:black;background:white" value="123456" onchange="updateParams()"></label></div>
		<div class="outline">
			Dimensions:&nbsp
			<input id="dimx" type="number" value="5" onchange="updateParams()">X<input id="dimy" type="number" value="5" onchange="updateParams()">
		</div>
	</div>
	<div style="clear:both"></div>
</div>

<ul id="players">
<li>Please wait</li>
</ul>

<button class="sesamestreet" onclick="sendRequest('action=ready')">READY</button>
<button class="sesamestreet" onclick="leave()">LEAVE</button>
</div>
"use strict";//do not delete, enables warnings
var game;//persistent game state


//function for one way communication with server
var sendRequest=new SendRequest(lobby_id,playername);

//set up the game data
function handleGameData(info){
	info.lobby.param=JSON.parse(info.lobby.param);
	
	//populate player list
	game.numPlayers=info.players.length;
	info.players.forEach((e,i)=>{
		game.players[e.playername]={
			colour:i*360/game.numPlayers,
			orders:{
				movement:[],
				build:[],
				raze:[]
			},
			
			};
	});
	tileDim=info.lobby.param.dim;
	//set timer to remaining time
	if(info.lobby.turn==0){
		print("turn 0");
		if(info.lobby.param.maptype==="random"){
			print("need random map");
			//generate map from seed
			generateMap(info.lobby.param);
			drawMap();
		}else if(info.lobby.param.maptype==="load"){
			//get map from info.lobby.map
			//TODO
		}
	}else{
		print("loading existing map");
		game.map=JSON.parse(info.lobby.map);
		drawMap();
	}
}


//end request to indiscriminately get all the database info about this game
//note that this only gets called once (or whenever someone reconnects), and not every turn
function loadGameData(){
	var xhr=new XMLHttpRequest();
	xhr.onreadystatechange=function(){
		if(xhr.readyState==4){
			if(xhr.response!=""){
				var info=JSON.parse(xhr.response);
				handleGameData(info);
				xhr.abort();
			}
		}
	}
	xhr.open("POST","index.php");
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhr.send("action=loadgamedata&lobby_id="+game.lobby+"&playername="+game.player);
}



function endTurn(){
	id("endturnbutton").disabled=true;
	//disable button temporarily
	var moveset=encodeURI(JSON.stringify(game.players[game.player].orders));
	sendRequest("action=notifyendturn&moveset="+moveset);
	function pollEndTurn(){
		var xhr=new XMLHttpRequest();
		xhr.onreadystatechange=function(){
			if(xhr.readyState==4){
				if(xhr.response=="wait"){
				}else if(xhr.response!=""){
					print("recieving moves");
					var info=JSON.parse(xhr.response);;
					clearInterval(handle);
					processNewMoves(info);
				}
			}
		}
		xhr.open("POST","index.php");
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send("action=pollendturn&lobby_id="+
		game.lobby+"&playername="+game.player);
	}
	pollEndTurn();
	var handle=setInterval(pollEndTurn,3000);
	
}

//function PollEndTurn()
function processNewMoves(info){
	print("processing moves");
	
	
	//game.map.tiles[0][0].force+=1;
	
	info.players.forEach((e,i)=>{

		info.players[i].moveset=JSON.parse(e.moveset);
		
	});
	
	print(info);
	
	//do raze orders
	info.players.forEach((e)=>{
		e.moveset.raze.forEach((m)=>{
			print(getTile(m.tile));
			game.map.tiles[m.tile[1]][m.tile[0]].building=null;
	})});

	//calculate new forces, first check for collisions
	info.players.forEach((e)=>{
		e.moveset.movement.forEach((m)=>{
			var src=getTile(m.source);
			var dest=getTile(m.dest);
			var force=m.force;
			var target=dest.owner;
			info.players.some((e2)=>{
				if(e2.playername==target){
					e2.moveset.movement.some((m2)=>{
						if(m2.source.isEqual(dest) && m2.dest.isEqual(src)){
							//cancel forces and construct new order
							console.log("forces met at edge");
							
						}
					});
					return true
				}
			});
		});
			
			//game.map.tiles[m.tile[1]][m.tile[0]].building=null;
	});
	
	//clear temporary data
	
	//add forces from existing buildings
	
	
	
	//build buildings
	info.players.forEach((e)=>{
		e.moveset.build.forEach((m)=>{
			if(getTile(m.tile).owner!=e.playername){
				//the tile was attacked while being constructed,
				//the units involved were lost
			}else{
				print("constructing");
				print(getTile(m.tile));
				game.map.tiles[m.tile[1]][m.tile[0]].building=m.type;
				
			}})});
	
	
	game.players[game.player].orders={
		movement:[],
		build:[],
		raze:[]};
	
	//refresh entire map, I don't know how this doesn't flicker, must be magic
	drawMap();
	id("endturnbutton").disabled=false;
	game.input.selected=null;
	//send map back
	var mapdata=encodeURI(JSON.stringify(game.map));
	sendRequest("action=uploadmap&mapdata="+mapdata);
}


function init(){
	
	game={
		lobby:null,
		input:{selected:null},
		map:{x:0,y:0,tiles:null},
		terrain:{path:(name)=>{return "img/terrain/"+name+".png"},grass:"grass",dirt:"dirt"},
		building:{path:(name)=>{return "img/building/"+name+".png"},wall:"wall",city:"city"},
		gfx:{tileDim:[64,74],grid:id("main")},
		players:{},
		numPlayers:0,
		player:""};

	//first copy the variables needed to bootstrap the rest of the game data
	game.player=playername;
	game.lobby=lobby_id;
	loadGameData();
}




//create hex grid
function generateMap(params){
	var seed=params.seed;
	var pick=Pick(Prng(seed));
	game.map.x=parseInt(params.dim[0]);
	game.map.y=parseInt(params.dim[1]);
	var tiles=Array(game.map.y);
	for(var y=0;y<tiles.length;y++){
		tiles[y]=Array(game.map.x);
		for(var x=0;x<tiles[y].length;x++){
			var force=pick(0,20);
			tiles[y][x]={terrain:game.terrain[["grass","dirt"][pick(0,1)]],
					building:game.building[["city","wall"][pick(0,1)]],
					owner:Object.keys(game.players)[pick(0,game.numPlayers-1)],
					force:force,
					uncommitedForce:force
				};
			if(tiles[y][x].building=="city"){
				tiles[y][x].buildingData={pop:pick(5,10),available:pick(5,10)};
			}
			
		}
	}
	game.map.tiles=tiles;
}

//create html from hex grid
function drawMap(){
	game.gfx.grid.innerHTML="";//clear whatever is left over
	var tileHeight=game.gfx.tileDim[1];
	var tileWidth=game.gfx.tileDim[0];
	var imageMap=document.createElement('map');
	imageMap.name='backmap';
	game.gfx.grid.appendChild(imageMap);
	
	var topInterv=tileHeight - (tileWidth/2) / Math.sqrt(3);
	var leftInterv=tileWidth;
	
	game.map.tiles.forEach((row,y)=>{
		row.forEach((tile,x)=>{
			var container=document.createElement('div');
			tile.container=container;
			var img=document.createElement("img");
			img.className = "point-through";
			img.style.position="absolute";
			
			
			
			//container.className="point-through";
			img.src=game.terrain.path(tile.terrain);
			
			var offset=(y%2==0)?0:tileWidth/2;//offset for odd rows
						
			var top=y*topInterv;
			var left=x*leftInterv+offset;
			
			container.style.position="absolute";
			container.style.top=top+"px";
			container.style.left=left+"px";
			container.appendChild(img);
			container.className="point-through";
			game.gfx.grid.appendChild(container);
			
		
			if(tile.building!=null){
				var building=document.createElement('img');
				building.style.position="absolute";
				building.className="point-through";
				building.style.zIndex="10";
				building.src=game.building.path(tile.building);
				building.style.filter="hue-rotate("+game.players[tile.owner].colour+"deg)";
				container.appendChild(building);
				
				
				if(tile.building=="city"){
					var popCount=document.createElement('div');
					var textNode=document.createTextNode(tile.buildingData.available+"/"+tile.buildingData.pop);
					popCount.style.position="absolute";
					popCount.style.width=game.gfx.tileDim[0]+"px";
					popCount.style.top="35px";
					popCount.style.textAlign="center";
			
					popCount.className="citycount";
					popCount.appendChild(textNode);
					container.appendChild(popCount);
						
				}
			}
			
			if(tile.force!=0){
				var forceCount=document.createElement('div');
				
				var textNode=document.createTextNode(tile.force);
				forceCount.style.position="absolute";
				forceCount.style.width=game.gfx.tileDim[0]+"px";
				forceCount.style.top="10px";
				forceCount.style.textAlign="center";
				/*forceCount.style.color="white";
				forceCount.style.zIndex="20";
				forceCount.style.textShadow="1px 1px black";*/
				forceCount.className="fcount";
				forceCount.appendChild(textNode);
				container.appendChild(forceCount);
			}
			
			if(tile.owner!=null){
				var hl=document.createElement('img');
				hl.style.position="absolute";
				hl.style.filter="hue-rotate("+game.players[tile.owner].colour+"deg)"
				//hl.style.zIndex="";
				hl.src="img/highlight.png";
				container.appendChild(hl);
			}
			
			
			
			var areaTag=document.createElement('area');
			areaTag.shape="poly";
			var mid=add([left,top],[tileWidth/2,tileHeight/2]);
			var shiftToMid=function(coord){
				return add(mid,coord);
			}
			var coords=range(7).scale(Math.PI/3)
				.addScalar(Math.PI/2)
				.map(cmplxExp)
				.map(function(coord){return coord.scale(tileHeight/2);})
				.map(shiftToMid)
				.squish();
			
			areaTag.coords=String(coords);
			function Handler(tileRef){
				return function(event){
					handleClick(tileRef);
					
				}
			}
			
			
			areaTag.onclick=Handler([x,y]);
	
			
			imageMap.appendChild(areaTag);
		})
	})
	
}



function handleClick(tileRef){
	var dest=getTile(tileRef);
	var destRef=tileRef;
	if(game.input.selected==null){//select a source tile
		if(dest.owner!=game.player){
			print("can't select enemy tile");
			return;
		}
		print("selecting a source tile");
		game.input.selected=tileRef;
		highlight(tileRef);
	}else if(game.input.selected.isEqual(tileRef)){//deselect source
		print("deselecting");
		unhighlight(tileRef);
		game.input.selected=null;
	}else {//selected a dest tile
		var source=getTile(game.input.selected);
		var sourceRef=game.input.selected;
		var orderArr=game.players[game.player].orders.movement;
		//determine adjacency
		var adjacent=false;
		var dir=0;
		get_adjacency(game.input.selected).some(
			(e,i)=>{
				if(e.isEqual(tileRef)){
					adjacent=true;
					dir=i;
					return true;
				}});

		if(!adjacent){//tile is not adjacent so move selection
			if(dest.owner!=game.player){
				console.log("tried to select enemy tile");
				return;
			}
			
			print("moveing selection");	
			source.container.style.filter="";
			game.input.selected=tileRef;
			highlight(tileRef);
			return;
		}
		
		print("calculating move");
		while(true){
			var force=Number(prompt("Force",0));
			if(force>=0) break;

		}
		print("asked to move "+force+" units");
		
		//lookup conflicting moves
		var simulIndex=-1;//a move in the same direction
		var counterIndex=-1;//a move in the opposite direction
		var existingOrder=orderArr.find(
			(e,i)=>{
				print("agadgs");
				print("checking "+e);
				if(e.source.isEqual(game.input.selected) && e.dest.isEqual(tileRef)){
					simulIndex=i;
					return true;
				}else if(e.dest.isEqual(game.input.selected) && e.source.isEqual(tileRef)){
					counterIndex=i;
					return true;
				}
			});
			
			
		print("RAGAGAGH");
		if(simulIndex!=-1){
			print("move exists in this direction");
			print(orderArr[simulIndex]);
			
			//Delete existing move
			var cont=orderArr[simulIndex].container;
			source.container.removeChild(cont);
			returnForce(source,orderArr[simulIndex].force);
			orderArr.splice(simulIndex,1);
			
		}else if(counterIndex!=-1){
			print("move exists in opposite direction");
			//Delete existing move
			var cont=orderArr[counterIndex].container;
			dest.container.removeChild(cont);
			returnForce(dest,orderArr[counterIndex].force);
			orderArr.splice(counterIndex,1);
		}
		if(force==0){
			//there should be no move in this direction now
			return;
		}
		if(force>source.uncommitedForce){
			force=source.uncommitedForce;
		}
		
		returnForce(source,-force);
				
		//CREATE GRAPHIC
		var container=document.createElement('div');
		var indicator=document.createElement("img");
		indicator.style.position="absolute";
		indicator.src=arrows[dir];
		indicator.style.left="0px";
		indicator.style.top="0px";
		var pos=arrowPos[dir];
		container.style.position="absolute";
		container.className="fcount";
		container.style.color="white";
		container.style.left=pos[0]+"px";
		container.style.top=pos[1]+"px";
		container.style.width="10px";
		container.style.height="10px";
		container.style.fontSize="0.8em";
		indicator.style.zIndex="-2";
		container.zIndex="50";
		container.appendChild(indicator);
		container.className="moveInd";
		var tn=document.createTextNode(force);
		container.appendChild(indicator);
		container.appendChild(tn);
		source.container.appendChild(container);
		//END CREATE GRAPHIC
		
		orderArr.push(new mvOrder(sourceRef,tileRef,force,container));
		unhighlight(game.input.selected);
		game.input.selected=null;
	}
	
	function highlight(tileRef){
		getTile(tileRef).container.style.filter="brightness(1.4)";
	}
	function unhighlight(tileRef){
		getTile(tileRef).container.style.filter="";
	}
	
}


//return or deduct from commited force, does not destroy anything
function returnForce(tile,x){
	print(tile);
	if(tile.uncommitedForce+x>tile.force){
		print("something went wrong");
	}
	if(tile.uncommitedForce-x<0){
		print("something went wrong");
	}
	var fcount=tile.container.querySelector(".fcount");
	tile.uncommitedForce+=x;
	fcount.textContent=tile.uncommitedForce;
}



function orderBuild(type){
	print("wants to build "+type);
	if(game.input.selected==null){
		alert("you must select an owned tile first");
		return;
	}
	var tile=getTile(game.input.selected);
	if(tile.building!=null){
		alert("there is already a building here, it must be demolished first");
		return;
	}
	var forcecost=0;
	switch(type){
		case 'city':
			forcecost=10;
			if (tile.uncommitedForce<10){
				alert("you need at least 10 units to build a city");
				return;
			}
			var tocheck=get_adjacency(game.input.selected);
			var valid=true;
			for(var i=0;i<tocheck.length;i++){
				var tile=getTile(tocheck[i]);
				
				if(tile.owner!=game.player && tile.owner!=null || tile.building=="city"){
					
					var valid=false;
				}
			}
			if(!valid){
				alert("surrounding tiles must be free of enemies and cities");
				return;
			}			
		break;
		case 'wall':
			forcecost=5;
			if(tile.uncommitedForce<5){
				alert("you need at least 5 units to build a wall");
				return;
			}
		break;
		case 'camp':
			forcecost=7;
			if(tile.uncommitedForce<7){
				alert("you need at least 7 units to build a camp");
			}
		break;
	}
	print("building allowed ");
	game.players[game.player].orders.build.push({type:type,tile:game.input.selected});
	tile.uncommitedForce-=forcecost;
	//print(tile.uncommitedForce)
	tile.container.querySelector(".fcount").textContent=tile.uncommitedForce;
	var gear =document.createElement('img');
	gear.src="img/gear.png";
	gear.style.position="absolute";
	gear.style.zIndex="50";
	tile.container.appendChild(gear);

}

function razeOrder(){
	
	if(game.input.selected==null){
		alert("you must select a tile with a controlled building and present units");
		return;
	}
	var tile=getTile(game.input.selected);
	if(tile.building==null){
		alert("you can only raze buildings");
		return;
	}	
	game.players[game.player].orders.raze.push({tile:game.input.selected});
	var fire =document.createElement('img');
	fire.src="img/fire.png";
	fire.style.position="absolute";
	fire.style.zIndex="50";
	tile.container.appendChild(fire);
		
}
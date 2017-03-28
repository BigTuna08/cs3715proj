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
				raze:[]},
		};
	});
	var deg=game.players[game.player].colour;
	id("buttonrow").style.filter="hue-rotate("+deg+"deg)";
	id("inforow").style.filter="hue-rotate("+deg+"deg)";
	
	//for util.js
	tileDim=info.lobby.param.dim;
	
	//set timer to remaining time
	if(info.lobby.turn==0){
		console.log("turn zero, generating map from seed");
	
			generateMap(info.lobby.param);
			
	}else{
		console.log("loading another players map")
		game.map=JSON.parse(info.lobby.map);
	}
	
	
	game.turn=parseInt(info.lobby.turn);
	var me=null;
	info.players.some((e)=>{
		if(e.playername==game.player){
			me=e;
			print(e);
			return true;}});

	if(me.turn==game.turn+1){
		console.log("moves already submitted, please wait");
		setPollState();
	}else if(me.turn==game.turn){
		console.log("waiting for player input, end turn when done");
		endPollState();
	}else{
		console.log("player turn is wrong");
	}	
	drawMap();
}

function endPollState(){
	id("endturnbutton").disabled=false;
	game.input.disabled=false;
	id("inforow").children[0].textContent="turn: "+game.turn+" proceed";
	
}

function setPollState(){
	id("endturnbutton").disabled=true;
	//TODO disable all buttons
	game.input.disabled=true;
	id("inforow").children[0].textContent="turn: "+game.turn+" wait";
	var waiting=true;
	function pollEndTurn(){
		function handler(xhr){
			if(xhr.readyState==4){
				if(!waiting){
					console.log("recieving network garbage");
					return;
				}
				if(xhr.response=="wait"){
					console.log("waiting for moves");
				}else if(xhr.response=="error"){
					if(!game.over){
						alert("the game is over, everyone has left");
						game.over=true;
					}
					setTimeout(()=>{location.replace("index.php?playername="+game.player)},1000);
				}else if(xhr.response!=""){
					console.log("recieved moves");
					console.log(xhr.response);
					clearInterval(handle);
					var info=JSON.parse(xhr.response);;
					waiting=false;
					processNewMoves(info);
					
				}
			}
		}
		console.log("creating poll request");
		sendRequest("action=pollendturn&turn="+(game.turn+1),handler);
	}
	pollEndTurn();
	var handle=setInterval(pollEndTurn,1000);
}

//send request to indiscriminately get all the database info about this game
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
	console.log("trying to send your moves");
	id("endturnbutton").disabled=true;//need to do this as soon as possible
	var moveset=encodeURI(JSON.stringify(game.players[game.player].orders));
	var alreadyGotIt=false;
	function trySendMoves(){
		function handler(xhr){
			if(xhr.readyState==4){
				if(alreadyGotIt)return;
				if(xhr.response=="wait"){
					console.log("server not ready for moves");
				}else if(xhr.response=="good"){
					console.log("server responded ok");
					alreadyGotIt=true;
					clearInterval(handle);
					setPollState();
				}else if(xhr.response=="error"){
					if(!game.over){
						game.over=true;
						alert("the game is over, returning to lobby");
						setTimeout(()=>{location.replace("index.php?playername="+game.player)},500);
					}
				}else{
					
					console.log(xhr.response);
				}
			}
		}
		console.log("creating request to submit moves");
		sendRequest("action=notifyendturn&moveset="+moveset+"&turn="+(game.turn+1),handler);
	}
	//offer to end turn, server may say no
	trySendMoves();
	var handle=setInterval(trySendMoves,1000);
	
}

//function PollEndTurn()
function processNewMoves(info){
	print("processing moves");
	
	info.players.forEach((e,i)=>{
		info.players[i].moveset=JSON.parse(e.moveset);
	});
	
	//do raze orders
	info.players.forEach((e)=>{
		e.moveset.raze.forEach((m)=>{
			game.map.tiles[m.tile[1]][m.tile[0]].building=null;
	})});
	
	info.players.forEach((e)=>{
		if(e.playername==game.player)return;
		e.moveset.movement.forEach((m)=>{
			getTile(m.source).uncommitedForce-=m.force;
		})
	})
	
	info.players.forEach((e)=>{
		if(e.playername==game.player)return;
		e.moveset.build.forEach((m)=>{
			var cost=game.buildingCosts[m.type];
			getTile(m.tile).uncommitedForce-=cost;
			print(getTile(m.tile));
		})
	})
	
	
	game.map.tiles.forEach((row)=>{
		row.forEach((tile)=>{
			tile.force=tile.uncommitedForce;
		});
	});
	
	//calculate new forces, first check for collisions
	info.players.forEach((e)=>{
		e.moveset.movement.forEach((m,i)=>{
			if(m==null)return;

			var src=m.source;
			var dest=m.dest;
			var force=m.force;
			var target=getTile(dest).owner;
			if(target==null){
				return;
			}
			info.players.some((e2)=>{
				if(e2.playername==target){
				
					e2.moveset.movement.some((m2,j)=>{
						if(m2==null)return true;
						if(m2.source.isEqual(dest) && m2.dest.isEqual(src)){
							if(m.force==m2.force){
								e.moveset.movement[i]=null;
								e2.moveset.movement[j]=null;
							}
							var atk=m.force;
							var atk2=m2.force;
							var rem=Math.round(Math.pow(Math.abs(Math.pow(atk,1.5)-Math.pow(atk2,1.5)),2/3));
							
							if(m.force>m2.force){
								m.force=rem;
								e2.moveset.movement[j]=null;
							}else{
								m2.force=rem;
								e.moveset.movement[i]=null;
							}
							return true;
						}
					});
					return true;
					
				}
			});
			
		});
			
	});
	
	//resolve temp tile structures
	info.players.forEach((e)=>{
		e.moveset.movement.forEach((m,i)=>{
			if(m==null)return true;
			
			var tile=getTile(m.dest)
			
			if(tile.temp==undefined){
				tile.temp={};
			}
			if(tile.owner!=null && tile.temp[tile.owner]==undefined){
				addToSet(tile.owner,tile.force);
			}
			addToSet(e.playername,m.force);
			
			function addToSet(name,force){
				var actual=force;
				if(name==tile.owner && tile.building=="wall"){
					force*=1.5;
				}

				if(tile.temp[name]!=undefined){
					tile.temp[name].force+=force;
					tile.temp[name].actual+=actual;
					
				}else{
					tile.temp[name]={};
					tile.temp[name].force=force;
					tile.temp[name].actual=actual;
					
				}
			}
			
		})
	})
	
	game.map.tiles.forEach((row)=>{
		row.forEach((tile)=>{
			if(tile.temp!=undefined){
				
				var maxKey=null;
				var max=0;
				var actual=0;
				var maxKey2=null;
				var max2=0;
				var actual2=0;
				Object.keys(tile.temp).forEach((key)=>{
					if(tile.temp[key].force>max){
						maxKey2=maxKey;
						max2=max;
						actual2=actual;
						maxKey=key;
						max=tile.temp[key].force;
						actual=tile.temp[key].actual;
					}else if(tile.temp[key].force>max2){
						maxKey2=key;
						max2=tile.temp[key].force;
						actual2=tile.temp[key].actual;
					}
				});
				
				
				
				
				if(max==max2){
					//neutral, everybody gone
					tile.owner=null;
					tile.force=0;
					if(tile.building=="city")tile.buildingData.size=0;
					tile.uncommitedForce=0;
				}
			
				var diff=max;
				if(max2!=0){
					var diff=Math.round(Math.pow(Math.pow(max,1.5)-Math.pow(max2,1.5),2/3));
				}
				var rem=diff;
				if(tile.owner==maxKey && tile.building=="wall"){
					rem=Math.round(diff/max * actual);
				}
				//var actual=
				
				if(tile.owner!=maxKey){
					if(tile.building=="city")tile.buildingData.size/=2;
				}
				tile.owner=maxKey;
				tile.force=rem;
				tile.uncommitedForce=rem;
				
				tile.temp=undefined;
				
			}
		})
	})
	

	//check for nulls
	var usedPop={};
	var toPopulate=[];
	var pops={};
	var campNums={};
	
	
	//clear temporary data and count pop and mark camps, and reset force
	game.map.tiles.forEach((row)=>{
		row.forEach((e)=>{
			if(e.owner!=null){
				if(e.force==0){
					e.owner=null;
				}else{
					if(usedPop[e.owner]==undefined){
						usedPop[e.owner]=0;
					}
					usedPop[e.owner]+=e.force;
					
					if(e.building=="city"){
						
						if(pops[e.owner]==undefined)
							pops[e.owner]=0;
						pops[e.owner]+=e.buildingData.size;
						if(e.buildingData.size<30)e.buildingData.size+=3;
					}else if(e.building=="camp"){
						toPopulate.push(e);
						if(campNums[e.owner]==undefined)
							campNums[e.owner]=0;
						campNums[e.owner]++;
					}
				}
				
			}
		
		});

	});

	
	var quit=false;
	if(usedPop[game.player]==undefined){
		quit=true;
	}
	
	var win=false;
	if(!quit){
		win=true;
		Object.keys(usedPop).forEach((e)=>{
			if(e!=game.player)
				win=false;
		})
	}
	
	//add forces from unused pop
	toPopulate.forEach((e)=>{
		var newForce=Math.round(((pops[e.owner]-usedPop[e.owner])/campNums[e.owner])/2);
		if(isNaN(newForce)||newForce<0)return;
		e.force+=newForce;
	});
	
	game.map.tiles.forEach((row)=>{
		row.forEach((e)=>{
				e.uncommitedForce=e.force;
		});
	});
	
	
	//build buildings
	info.players.forEach((e)=>{
		print(e);
		e.moveset.build.forEach((m)=>{
			if(getTile(m.tile).owner!=e.playername){
				//the tile was attacked while being constructed,
				//the units involved were lost
				console.log("building destroyed while under construction");
			}else{
								console.log("placing building");

				getTile(m.tile).building=m.type;
				if(m.type=="city"){
					getTile(m.tile).buildingData={size:5};
					
				}
			}})});
	
	
	game.players[game.player].orders={
		movement:[],
		build:[],
		raze:[]};
	
	//refresh entire map, I don't know how this doesn't flicker, must be magic
	drawMap();
	game.input.selected=null;
	
	
	if(quit){
		if(!game.spectate){
			sendRequest('action=notifyquit');
			alert('you have no more forces, you can continue to spectate');
			game.spectate=true;
		}
		id("endturnbutton").disabled=true;
	}
	
	if(win){
		alert("Congratulations, there is nothing left to conquer. Have you considered taking up golf?");
		id("endturnbutton").disabled=true;
	}
	
	game.turn++;
	if(!quit && !game.spectate)
		endPollState();
	else
		setPollState();//just to update counter, actually doesn't affect game
	//send map back, server now knows client is ok
	var mapdata=encodeURI(JSON.stringify(game.map));
	sendRequest("action=uploadmap&mapdata="+mapdata+"&turn="+game.turn);
	
}




function init(){
	game={
		lobby:null,
		turn:null,
		input:{selected:null},
		map:{x:0,y:0,tiles:null},
		terrain:{path:(name)=>{return "img/terrain/"+name+".png"},grass:"grass",dirt:"dirt"},
		building:{path:(name)=>{return "img/building/"+name+".png"},wall:"wall",city:"city",camp:"camp"},
		gfx:{tileDim:[64,74],grid:id("main")},
		players:{},
		numPlayers:0,
		player:"",
		buildingCosts:{"city":4,"wall":2,"camp":3}};
	//most essential variables
	
	["city","wall","camp"].forEach((e)=>{
		console.log("buildbtn"+e);
		id("buildbtn"+e).children[0].textContent=e.toUpperCase()+"("+game.buildingCosts[e]+")";
	});
	game.player=playername;
	game.lobby=lobby_id;
	loadGameData();
}




//create hex grid
function generateMap(params){
	var seed=params.seed;
	var pick=Pick(Prng(seed));
	
	//weights on W should add to 100
	function pickWeighted(W){
		var x=pick(0,100);
		var val=null;
		W.some((e)=>{
			x-=e.P;
			if(x<0){
				val=e.val;
				return true
			}
		});
		return val;
	}
	
	
	
	var forcePerPlayer=params.dim[0]*params.dim[1]*2;
	
	var counts=Object.keys(game.players).map((e)=>{
		return {name:e,toplace:forcePerPlayer}
	});
	
	
	//placement probabilites
	var structP=[{P:13,val:"city"},{P:20,val:"wall"},{P:7,val:"camp"},{p:100-13-20-7,val:"none"}];
	
	game.map.x=parseInt(params.dim[0]);
	game.map.y=parseInt(params.dim[1]);
	var tiles=Array(game.map.y);
	for(var y=0;y<tiles.length;y++){
		tiles[y]=Array(game.map.x);
		for(var x=0;x<tiles[y].length;x++){
			//var force=pick(0,20);
			tiles[y][x]={terrain:game.terrain[["grass","dirt"][pick(0,1)]],
					//building:game.building[["city","wall"][pick(0,1)]],
					owner:null,
					force:0,
					uncommitedForce:0
				};
			var tile=tiles[y][x];//getTile([x,y]);
			var build=null;
			if((build=pickWeighted(structP))!="none"){
				tile.building=build;
				if(build=="city"){
					tile.buildingData={size:pick(5,10)};
				}
				
			}
		}
	}
	game.map.tiles=tiles;
	
	
	var done=false;
	var p=0;
	var unitSize=5;
	var unitVariation=2;
	while(!done){
		
		var toplace=Math.min(unitSize+pick(0,unitVariation),counts[p].toplace);
		counts[p].toplace-=toplace;
		
		while(true){
			
			var x=pick(0,game.map.x-1);
			var y=pick(0,game.map.y-1);
			var t=getTile([x,y]);
			if(t.owner!=null && t.owner!=counts[p].name){
				continue;
			}else{
				t.force+=toplace;
				t.owner=counts[p].name;
				t.uncommitedForce=t.force;
				break;
			}
		}
		//pick another player or quit if all placed
		while(true){
			if(counts.length==0){
				done=true;
				break;
			}else{
				p=pick(0,counts.length-1);
				if(counts[p].toplace>0){
					break;
				}else{
					counts.splice(p,1);
				}
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
	
	[id("fakeimg"),id("behindimg"),id("parentdiv")].forEach((e)=>{
		e.style.width=(1+game.map.tiles[0].length)*tileWidth+"px";//+1 to account for offset row
		e.style.height=game.map.tiles.length*tileHeight+"px";
	});
	
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
				if(tile.owner==null){
					building.style.filter="grayscale(1)";
				}else{
					building.style.filter="hue-rotate("+game.players[tile.owner].colour+"deg)";
					
				}
				container.appendChild(building);
				if(tile.building=="city"){
					var popCount=document.createElement('div');
					var textNode=document.createTextNode(tile.buildingData.size);
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

function resign(){
	var y=confirm("are you sure you want to quit?");
	if(y)setTimeout(()=>{sendRequest('action=notifyquit');},200);
	var leave=confirm("would you like to return to the lobby now");
	game.spectate=!leave;
	if(leave){
		setTimeout(()=>{location.replace("index.php?playername="+game.player)},400);
	}
}

function handleClick(tileRef){
	if(game.input.disabled){
		alert("please wait for other players");
		return;
	}
	var dest=getTile(tileRef);
	var destRef=tileRef;
	if(game.input.selected==null){//select a source tile
		if(dest.owner!=game.player){
			return;
		}
		game.input.selected=tileRef;
		
		highlight(tileRef);
	}else if(game.input.selected.isEqual(tileRef)){//deselect source
		unhighlight(tileRef);
		game.input.selected=null;
	}else {//selected a dest tile
		var source=getTile(game.input.selected);
		var sourceRef=game.input.selected;
		var orderArr=game.players[game.player].orders.movement;
		//determine adjacency
		var adjacent=false;
		var dir=0;
		get_adjacency(game.input.selected,false).some(
			(e,i)=>{
				if(e.isEqual(tileRef)){
					
					adjacent=true;
					dir=i;
					return true;
				}});

		if(!adjacent){//tile is not adjacent so move selection
			if(dest.owner!=game.player){
				return;
			}
			
			source.container.style.filter="";
			game.input.selected=tileRef;
			highlight(tileRef);
			return;
		}
		
		while(true){
			var force=Number(prompt("Force",0));
			if(force>=0) break;

		}
		
		//lookup conflicting moves
		var simulIndex=-1;//a move in the same direction
		var counterIndex=-1;//a move in the opposite direction
		var existingOrder=orderArr.find(
			(e,i)=>{
				if(e.source.isEqual(game.input.selected) && e.dest.isEqual(tileRef)){
					simulIndex=i;
					return true;
				}else if(e.dest.isEqual(game.input.selected) && e.source.isEqual(tileRef)){
					counterIndex=i;
					return true;
				}
			});
			
			
		if(simulIndex!=-1){
			
			//Delete existing move
			var cont=orderArr[simulIndex].container;
			source.container.removeChild(cont);
			returnForce(source,orderArr[simulIndex].force);
			orderArr.splice(simulIndex,1);
			
		}else if(counterIndex!=-1){
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

	var fcount=tile.container.querySelector(".fcount");
	tile.uncommitedForce+=x;
	fcount.textContent=tile.uncommitedForce;
}



function orderBuild(type){
	if(game.input.disabled)return;
	if(game.input.selected==null){
		alert("you must select an owned tile first");
		return;
	}
	
	var tile=getTile(game.input.selected);
	print(tile);
	if (game.players[game.player].orders.build.some((e)=>{
		
		if(e.tile.isEqual(game.input.selected)){
			alert("you can't build two things at once in the same place");
			return true;
		}
	})) return true;
	
	if(tile.building!=null){
		alert("there is already a building here, it must be demolished first");
		return;
	}
	var forcecost=game.buildingCosts[type];
	if(tile.uncommitedForce<forcecost){
		alert("you need at least "+forcecost+" units to build a "+type);
		return;
	}
	console.log("continueing with build order");
	//special build conditions
	switch(type){
		case 'city':
			var tocheck=get_adjacency(game.input.selected,true);
			var valid=true;
			for(var i=0;i<tocheck.length;i++){
				var tile1=getTile(tocheck[i]);
				if(tile1.owner!=game.player && tile1.owner!=null || tile1.building=="city"){
					var valid=false;
				}
			}
			if(!valid){
				alert("surrounding tiles must be free of enemies and cities");
				return;
			}
		break;
		case 'wall':
		break;
		case 'camp':
		break;
	}
	game.players[game.player].orders.build.push({type:type,tile:game.input.selected});
	tile.uncommitedForce-=forcecost;
	
	tile.container.querySelector(".fcount").textContent=tile.uncommitedForce;
	var gear =document.createElement('img');
	gear.src="img/gear.png";
	gear.style.position="absolute";
	gear.style.zIndex="50";
	tile.container.appendChild(gear);

}

function razeOrder(){
	if(game.input.disabled)return;
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
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
	var deg=game.players[game.player].colour;
	id("buttonrow").style.filter="hue-rotate("+deg+"deg)";
	
	
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
				}else if(xhr.response=="error"){
					win();
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
	
	info.players.forEach((e,i)=>{
		info.players[i].moveset=JSON.parse(e.moveset);
		
	});
	console.log("info:");
	print(info);
	
	//do raze orders
	info.players.forEach((e)=>{
		e.moveset.raze.forEach((m)=>{
			console.log("razing");
			print(getTile(m.tile));
			game.map.tiles[m.tile[1]][m.tile[0]].building=null;
	})});
	
	info.players.forEach((e)=>{
		if(e.playername==game.player)return;
		e.moveset.movement.forEach((m)=>{
			getTile(m.source).uncommitedForce-=m.force;
			console.log("deducting force");
			print(getTile(m.source));
		})
	})
	
	info.players.forEach((e)=>{
		if(e.playername==game.player)return;
		e.moveset.build.forEach((m)=>{
			var cost=game.buildingCosts[m.type];
			console.log("deducting force for build");
			getTile(m.tile).uncommitedForce-=cost;
		})
	})
	
	
	game.map.tiles.forEach((row)=>{
		row.forEach((tile)=>{
			tile.force=tile.uncommitedForce;
		});
	});
	
	console.log(info);
	print(info);
	//calculate new forces, first check for collisions
	info.players.forEach((e)=>{
		console.log("checking for collisions for "+e.playername);
		print(e);
		e.moveset.movement.forEach((m,i)=>{
			if(m==null)return;
			print(e);
			print(m);
			var src=m.source;
			var dest=m.dest;
			var force=m.force;
			var target=getTile(dest).owner;
			if(target==null){
				console.log("moving to unowned tile");
				return;
			}
			console.log("target "+target);
			info.players.some((e2)=>{
				
				if(e2.playername==target){
					print("names good");
					e2.moveset.movement.some((m2,j)=>{
						if(m2==null)return true;
						
						if(m2.source.isEqual(dest) && m2.dest.isEqual(src)){
							//cancel forces and construct new order
							console.log("forces met at edge");
							if(m.force==m2.force){
								e.moveset.movement[j]=null;
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
								e.moveset.movement[j]=null;
							}
							return true;
						}
					});
					
				}
			});
			//add force to temp tile structure
			
		console.log(" done checking for collisions for "+e.playername);
		});
			
	});
	
	//resolve temp tile structures
	info.players.forEach((e)=>{
		e.moveset.movement.forEach((m,i)=>{
			if(m==null)return true;
			print("moving move ");
			var tile=getTile(m.dest)
			if(tile.temp==undefined){
				console.log("creating temp structure");
				tile.temp={};
			}
			if(tile.owner!=null && tile.temp[tile.owner]==undefined){
				console.log("adding owner as candidate for new ownership");
				addToSet(tile.owner,tile.force);
			}
			addToSet(e.playername,m.force);
			
			function addToSet(name,force){
				var actual=force;
				if(name==tile.owner && tile.building=="wall"){
					force*=1.5;
				}
				console.log(name,force);

				if(tile.temp[name]!=undefined){
					console.log("adding reinforcements");
					tile.temp[name].force+=force;
					tile.temp[name].actual+=actual;
					print(tile.temp);
				}else{
					console.log("setting up combat");
					tile.temp[name]={};
					tile.temp[name].force=force;
					tile.temp[name].actual=actual;
					print(tile.temp);
				}
			}
			
		})
	})
	
	game.map.tiles.forEach((row)=>{
		row.forEach((tile)=>{
			if(tile.temp!=undefined){
				console.log("resolving tile");
				print(tile);
				var maxKey=null;
				var max=0;
				var actual=0;
				var maxKey2=null;
				var max2=0;
				var actual2=0;
				Object.keys(tile.temp).forEach((key)=>{
					console.log("checking",tile.temp[key].force);
					if(tile.temp[key].force>max){
						maxKey2=maxKey;
						max2=max;
						actual2=actual;
						console.log(tile.temp[key].force);
						maxKey=key;
						max=tile.temp[key].force;
						actual=tile.temp[key].actual;
					}else if(tile.temp[key].force>max2){
						maxKey2=key;
						max2=tile.temp[key].force;
						actual2=tile.temp[key].actual;
					}
				});
				
				console.log(maxKey,max,actual,maxKey2,max2,actual2)
				
				
				
				if(max==max2){
					//neutral, everybody gone
					tile.owner=null;
					tile.force=0;
					if(tile.building=="city")tile.buildingData.size=0;
					tile.uncommitedForce=0;
				}
				print(max);
				print(maxKey);
				print(actual);
				print(actual2);
				var diff=max;
				if(max2!=0){
					console.log("resolving combat");
					print(diff);
					var diff=Math.round(Math.pow(Math.pow(max,1.5)-Math.pow(max2,1.5),2/3));
				}
				var rem=diff;
				if(tile.owner==maxKey && tile.building=="wall"){
					rem=Math.round(diff/max * actual);
				}
				//var actual=
				print(maxKey);
				print(diff);
				if(tile.owner!=maxKey){
					if(tile.building=="city")tile.buildingData.size=0;
				}
				tile.owner=maxKey;
				tile.force=rem;
				tile.uncommitedForce=rem;
				console.log("done");
				print(tile);
				tile.temp=undefined;
				
			}
		})
	})
	

	//check for nulls
	var usedPop={};
	var toPopulate=[];
	var pops={};
	var campNums={};
	
	print(game);
	
	
	//clear temporary data and count pop and mark camps, and reset force
	game.map.tiles.forEach((row)=>{
		row.forEach((e)=>{
			if(e.owner!=null){
				if(e.force==0){
					e.owner=null;
				}else{
					if(usedPop[e.owner]==undefined){
						console.log("starting counting pop for ",e.owner);
						usedPop[e.owner]=0;
					}
					console.log("adding ",e.force);
					usedPop[e.owner]+=e.force;
					
					if(e.building=="city"){
						print(e);
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
				
			}/*
		print(usedPop);
		print(toPopulate);
		print(pops);
		print(campNums);*/
		});

	});
	console.log("pop data");
	print(usedPop);
	print(toPopulate);
	print(pops);
	print(campNums);
	
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
		console.log("force new",newForce);
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
		e.moveset.build.forEach((m)=>{
			if(getTile(m.tile).owner!=e.playername){
				//the tile was attacked while being constructed,
				//the units involved were lost
			}else{
				print("constructing");
				print(getTile(m.tile));
				game.map.tiles[m.tile[1]][m.tile[0]].building=m.type;
				if(m.type=="city"){
					getTile(m.tile).buildingData.size=1;
				}
			}})});
	
	
	game.players[game.player].orders={
		movement:[],
		build:[],
		raze:[]};
	
	//refresh entire map, I don't know how this doesn't flicker, must be magic
	drawMap();
	game.input.selected=null;
	
	id("endturnbutton").disabled=false;
	if(quit){
		sendRequest('action=notifyquit');
		alert('you have no more forces, returning to the lobby');
		setTimeout(()=>{window.location.replace('index.php?playername='+game.player)},1000);
		id("endturnbutton").disabled=true;
	}
	
	if(win){
		win();
		id("endturnbutton").disabled=true;
	}
	
	
	
	//send map back
	var mapdata=encodeURI(JSON.stringify(game.map));
	sendRequest("action=uploadmap&mapdata="+mapdata);
}


function win(){
	alert('there is nothing left to do, you must retire now');
	window.location.replace('index.php?playername='+game.player);
}

function init(){
	
	game={
		lobby:null,
		input:{selected:null},
		map:{x:0,y:0,tiles:null},
		terrain:{path:(name)=>{return "img/terrain/"+name+".png"},grass:"grass",dirt:"dirt"},
		building:{path:(name)=>{return "img/building/"+name+".png"},wall:"wall",city:"city",camp:"camp"},
		gfx:{tileDim:[64,74],grid:id("main")},
		players:{},
		numPlayers:0,
		player:"",
		buildingCosts:{"city":10,"wall":5,"camp":7}};

	//first copy the variables needed to bootstrap the rest of the game data
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
	
	
	
	var forcePerPlayer=params.dim[0]*params.dim[1];
	
	var counts=Object.keys(game.players).map((e)=>{
		return {name:e,toplace:forcePerPlayer}
	});
	
	
	//placement probabilites
	var structP=[{P:7,val:"city"},{P:16,val:"wall"},{P:5,val:"camp"},{p:72,val:"none"}];
	
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
					tile.buildingData={size:0};
				}
				
			}
		}
	}
	game.map.tiles=tiles;
	
	print(counts);
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
			print([x,y]);
			var t=getTile([x,y]);
			print("ok");
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
	
	if(y){
		endTurn();
		setTimeout(()=>{},500);
		sendRequest('action=notifyquit');
	}
	setTimeout(()=>{location.replace("index.php?playername="+game.player)},3000);
}

function handleClick(tileRef){
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
				console.log("checking "+e+"=="+destRef);
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
		print(force);
		if(force==0){
			print("heyo"); 	
			//there should be no move in this direction now
			return;
		}
		if(force>source.uncommitedForce){
			force=source.uncommitedForce;
		}
		
		returnForce(source,-force);
		console.log("direction "+dir);
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
	if (game.players[game.player].orders.build.some((e)=>{
		print("checking");
		print(e);
		if(e.tile.isEqual(game.input.selected)){
			alert("you can't build two things at once in the same place");
			return true;
		}
	})) return true;
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
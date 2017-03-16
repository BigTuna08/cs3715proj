"use strict";//do not delete, enables warnings
var game;//persistent game state



//initialise game data
function init(){
	
	game={
		input:{selected:null},
		map:{x:4,y:4,tiles:null},
		terrain:{path:(name)=>{return "img/terrain/"+name+".png"},grass:"grass",dirt:"dirt"},
		building:{path:(name)=>{return "img/building/"+name+".png"},wall:"wall",city:"city"},
		gfx:{tileDim:[64,74],grid:id("main")},
		players:[],
		player:0};

	//TODO initialize things from input lobby
	//
	game.players=[{name:'player1',orders:[]},{name:'player2',orders:[]}];
	game.player=0;
	
	game.players=game.players.map((element,index)=>{element.colour=index*360/game.players.length;return element});
	game.map.tiles=generateMap();
	populateMap();
	drawMap();
}

//create 2d hex grid
function generateMap(){
	var tiles=Array(game.map.y);
	for(var y=0;y<tiles.length;y++){
		tiles[y]=Array(game.map.x);
		for(var x=0;x<tiles[y].length;x++){
			tiles[y][x]={terrain:game.terrain[(Math.random()>0.8)?"grass":"dirt"]};
		}
	}
	return tiles;
}

function populateMap(){
	game.map.tiles.forEach((row,y)=>{
		row.forEach((tile,x)=>{
			
			tile.building=game.building[(Math.random()>0.5)?"city":"wall"];
			tile.owner=(pick(0,game.players.length));
			tile.force=pick(0,20);
			tile.uncommitedForce=tile.force;
			if(tile.building=="city"){
				tile.buildingData={pop:pick(5,10),available:pick(5,10)};
			}
		})
	})
}



//create html from hex grid
function drawMap(){
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
			
		
			if(tile.building!=""){
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
					popCount.style.color="#FFFF00";
					popCount.style.zIndex="20";
					popCount.style.textShadow="1px 1px black";
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
				forceCount.style.color="white";
				forceCount.style.zIndex="20";
				forceCount.style.textShadow="1px 1px black";
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
	
	
	if(game.input.selected==null){
		print("adding filter, selecting source");
		game.input.selected=tileRef;
		highlight(tileRef);
	}else if(game.input.selected.isEqual(tileRef)){
		print("removing filter, unselecting");
		//unselect tile
		unhighlight(tileRef);
		game.input.selected=null;
	}else {
		print("source "+game.input.selected);
		print("dest "+tileRef);
		var adjacent=false;
		var dir=0;
		get_adjacency(game.input.selected).some(
			(e,i)=>{
				if(e.isEqual(tileRef)){
					adjacent=true;
					dir=i;
					return true;
				}});
		print(dir);
		if(!adjacent){
			print(game.input.selected);	
			getTile(game.input.selected).container.style.filter="";
			game.input.selected=tileRef;
			highlight(tileRef);
			return;
		}
		
		var force=Number(prompt("Force","0"));
		//TODO lookup existing moves and simplify automatically
		if(force==0){
			unhighlight(game.input.selected);
			game.input.selected=null;
		
			return;
		}else if(force>tile.uncommitedForce){
			//assume they want everything
			force=tile.uncommitedForce;
			force.uncommitedForce=0;
		}
		
		
		
		game.players[game.player].orders.push(new mvOrder(game.input.selected,tileRef,force));
		//TODO add html
		unhighlight(game.input.selected);
		game.input.selected=null;
		
		
	}
	//local functions
	function highlight(tileRef){
		getTile(tileRef).container.style.filter="brightness(1.4)";
	}
	function unhighlight(tileRef){
		getTile(tileRef).container.style.filter="";
	}
}

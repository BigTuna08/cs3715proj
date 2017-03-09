"use strict";//do not delete, enables warnings
var game;//persistent game state

//initialise game data
function init(){
	game={
		map:{x:4,y:4,tiles:null},
		player:{player1:{color:"4"},player2:{color:"6"}},
		terrain:{path:(name)=>{return "img/terrain/"+name+".png"},ext:".png",grass:"grass",dirt:"dirt"},
		building:{path:(name)=>{return "img/building/"+name+".png"},wall:"wall",city:"city"},
		gfx:{tileDim:[64,74],grid:id("main")},
		game:{}};
	
	//game.player=[player1:{},player2:{}];
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
			print(game.player["player"+((Math.random()>0.5)?"1":"2")]);
			print(game.player['player1'])
			tile.owner=game.player["player"+((Math.random()>0.5)?"1":"2")];
			print(tile);
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
			//print(tile);
			var container=document.createElement('div');
			
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
			
			var building=document.createElement('img');
			building.style.position="absolute";
			building.className="point-through";
			building.style.zIndex="10";
			print(game.terrain.path(tile.building));
			building.src=game.building.path(tile.building);
			
			building.style.filter="hue-rotate("+tile.owner.color+"0deg)";
			print(building.style.filter)
			container.appendChild(building);
			
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
			function Handler(x,y,img,z){
				return function(event){
					img.style.filter="brightness("+z+") hue-rotate(180deg)";
					
					print([x,y]);
				}
			}
			
			
			areaTag.onmouseenter=Handler(x,y,img,1.5);
			areaTag.onmouseleave=Handler(x,y,img,1);
			
			
			imageMap.appendChild(areaTag);
		})
	})
	
}
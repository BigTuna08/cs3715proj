"use strict";//do not delete, enables warnings
var game;//persistent game state

//initialise game data
function init(){
	game={
		map:{x:10,y:10,tiles:null},
		player:[],
		terrain:{path:(name)=>{return "img/terrain/"+name+".png"},ext:".png",grass:"grass",dirt:"dirt"},
		gfx:{tileDim:[64,74],grid:id("main")},
		game:{}};
	game.map.tiles=generateMap();
	drawMap();
}

//create 2d hex grid
function generateMap(){
	var tiles=Array(game.map.y);
	for(var y=0;y<tiles.length;y++){
		tiles[y]=Array(game.map.x);
		for(var x=0;x<tiles[y].length;x++){
			tiles[y][x]={terrain:game.terrain[(Math.random()>0.8)?"grass":"dirt"],element:null};
		}
	}
	return tiles;
}

//create html from hex grid
function drawMap(){
	var map=game.map.tiles;
	var tileHeight=game.gfx.tileDim[1];
	var tileWidth=game.gfx.tileDim[0];
	var imageMap=document.createElement('map');
	imageMap.name='backmap';
	game.gfx.grid.appendChild(imageMap);
	for(var y=0;y<map.length;y++){
		for(var x=0;x<map[y].length;x++){
			var tile=map[y][x];
			var img=document.createElement("img");
			img.className = "point-through";
			img.src=game.terrain.path(tile.terrain);
			var offset=(y%2==0)?0:tileWidth/2;//offset for odd rows
			var topInterv=tileHeight - (tileWidth/2) / Math.sqrt(3);
			var leftInterv=tileWidth;
			var top=y*topInterv;
			var left=x*leftInterv+offset;
			img.style.position="absolute";
			img.style.top=top+"px";
			img.style.left=left+"px";
			game.gfx.grid.appendChild(img);
			var areaTag=document.createElement('area');
			areaTag.shape="poly";
			
			var mid=add([left,top],[tileWidth/2,tileHeight/2]);
			var shiftToMid=function(coord){
				return add(mid,coord);
			}
			var coords=range(6).scale(Math.PI/3)
				.addScalar(Math.PI/2)
				.map(cmplxExp)
				.map(function(coord){return coord.scale(tileHeight/2);})
				.map(shiftToMid)
				.squish();
			areaTag.coords=String(coords);
			function Handler(x,y){
				return function(event){
					print([x,y]);
				}
			}
			areaTag.onclick=Handler(x,y);
			imageMap.appendChild(areaTag);
		}
	}
}
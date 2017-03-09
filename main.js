"use strict";//do not delete, enables warnings
//constants
var tileWidth=64;
var tileHeight=74;
var x_squares = 2;
var y_squares = 2;
var map=[];
var main;//the element containing the grid
//array of offsets that are adjacent to the hex
function get_adjacency(x,y){
	//east clockwise to northeast, even/odd rows
	var neighbours=[[[1,0],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1]],
				[[1,0],[1,1],[0,1],[-1,0],[0,-1],[1,-1]]];
	return neighbours[y%2];
}
function generateMap(){
	var dim={x:x_squares,y:y_squares};
	var seed=71;
	for(var i=0;i<dim.x;i++){
		map[i]=[];
		for(var j=0;j<dim.y;j++){
			var terrain="img/terrain/"+((Math.random()>0.8)?"grass":"dirt")	;
			var tile=new MapTile(terrain,null);
			map[i][j]=tile;
		}
	}
}
function MapTile(terrain,element){
	this.terrain=terrain;
	this.element=element;
	//this.building="yes";
}
function init(){
	console.log('initializing');
	main=document.getElementById("main");
	generateMap();
	drawMap();
	
}
function drawMap(){
	var imageMap=document.createElement('map');
	imageMap.name='backmap';
	main.appendChild(imageMap);
	for(var y=0;y<map.length;y++){
		for(var x=0;x<map[y].length;x++){
			var tile=map[y][x];
			var img=document.createElement("img");
			img.className = "point-through";
			img.src=tile.terrain+".png";
			var offset=(y%2==0)?0:tileWidth/2;//offset for odd rows
			var topInterv=tileHeight - (tileWidth/2) / Math.sqrt(3);
			var leftInterv=tileWidth;
			var top=y*topInterv;
			var left=x*leftInterv+offset;
			img.style.position="absolute";
			img.style.top=top+"px";
			img.style.left=left+"px";
			main.appendChild(img);
			
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
			areaTag.onclick=function(event){
				console.log(event);//make this do stuff
			}
			imageMap.appendChild(areaTag);
		}
	}
}
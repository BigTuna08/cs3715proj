"use strict";

/**
 * Misc
 */

//everything is nondestructive unless noted

//PRNG with seed because Math.random() isn't deterministic
function Prng(x){
	var f=function(){
		return (x=(x*1664525+1013904223)%4294967296)/4294967296;
	}
	f();f();f();f();f();f();f();f();
	return f;
}

var prng=new Prng(prngSeed);

//add two arrays
function add(a,b){
	return a.map((val,i)=>{return val+b[i]});
}

//random integer between i and t
function pick(i,t){
	return Math.floor(prng()*(t-i)+i);
}

Array.prototype.isEqual=function(o){
	if(this.length!=o.length)return false;
	for(var i=0;i<this.length;i++){
		if(this[i]!=o[i]){
			return false;
		}
	}
	return true;
}

//add scalar to each element of array
Array.prototype.addScalar=function(c){
	return this.map((val)=>{return val+c});
}

//multiply each element by scalar
Array.prototype.scale=function(c){
	return this.map((val)=>{return val*c});
}

//one level of flattening
Array.prototype.squish=function(){
	return this.concat.apply([],this);
}

//e^i*theta
function cmplxExp(theta){
	return [Math.cos(theta),-Math.sin(theta)];
}

//array containing 0..n
function range(n){
	return Array(n).fill(0).map(function(element,index){return index});
}

//pretty print
function print(x){
	console.log(JSON.stringify(x));
}

/**
 * DOM Tools
 */
 
function id(id){
	return document.getElementById(id);
}

/**
 * Hexagon Tools
 */

//get offset of coordinates of adjacent tiles
function get_adjacency(tileRef){
	//east clockwise to northeast, even/odd rows
	var neighbours=[[[1,0],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1]],
				[[1,0],[1,1],[0,1],[-1,0],[0,-1],[1,-1]]];
	return neighbours[tileRef[1]%2].map((e)=>{return add(e,tileRef)});
}


function getTile(tileRef){
	return game.map.tiles[tileRef[1]][tileRef[0]];
}

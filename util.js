"use strict";
//everything is nondestructive unless noted

//add two arrays
function add(a,b){
	return a.map((val,i)=>{return val+b[i]});
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
function get_adjacency(x,y){
	//east clockwise to northeast, even/odd rows
	var neighbours=[[[1,0],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1]],
				[[1,0],[1,1],[0,1],[-1,0],[0,-1],[1,-1]]];
	return neighbours[y%2];
}
"use strict"
//this file contains constructors and methods for game objects
//we ended up not useing it very much

//mvOrder is an instruction to move units
function mvOrder(source,dest,force,container){
	this.source=source;
	this.dest=dest;
	this.force=force;
	this.container=container;
}

//list of images of arrows
var arrows=["e","se","sw","w","nw","ne"].map((e)=>{return "img/arrow"+e+".png";});

//local coordinates of where arrows should be placed on tiles
var arrowPos=[[32,0],[17,27],[-17,27],[-32,0],[-17,-27],[17,-27]].map((e)=>{return add([-5,-5],add(e,[32,37]))});
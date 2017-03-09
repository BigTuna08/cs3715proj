
function add(a,b){
	var ret=Array(a.length);
	for(var i=0;i<a.length;i++){
		ret[i]=a[i]+b[i];
	}
	return ret;
}

Array.prototype.addScalar=function(c){
	for(var i=0;i<this.length;i++){
		this[i]+=c;
	}
	return this;
}

Array.prototype.scale=function(c){
	for(var i=0;i<this.length;i++){
		this[i]*=c;
	}
	return this;
}

//one level of flattening
Array.prototype.squish=function(){
	return this.concat.apply([],this);
}

function cmplxExp(theta){
	return [Math.cos(theta),-Math.sin(theta)];
}

function range(n){
	return Array(n).fill(0).map(function(element,index){return index});
}

function print(x){
	console.log(JSON.stringify(x));
}
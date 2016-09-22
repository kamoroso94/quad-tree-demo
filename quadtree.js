"use strict";
var QuadTree = function(w,h,res) {
	w = Math.abs(w);
	h = Math.abs(h);
	res = (res>0)?res:1;
	this.width = w;
	this.height = h;
	this.resolution = res;
	this.root = new QuadTree.Node(0,0,w,h,res);
	
	this.get = function(x,y) {
		return this.root.get(x,y);
	};
	this.getAll = function(x,y,w,h) {
		return this.root.getAll(x,y,w,h);
	};
	this.set = function(x,y,val) {
		return this.root.set(x,y,val);
	};
	this.remove = function(x,y,val) {
		this.root.remove(x,y,val);
	};
	this.isEmpty = function() {
		return this.root.isEmpty();
	};
	this.clear = function() {
		this.root = new QuadTree.Node(0,0,this.width,this.height,this.resolution);
	};
	this.draw = function(context) {
		this.root.draw(context);
	};
};
QuadTree.Node = function(x,y,w,h,res) {
	this.x = x;
	this.y = y;
	this.width = w;
	this.height = h;
	this.resolution = res;
	this.childNodes = [null,null,null,null];
	this.values = [];
	
	this.get = function(x,y) {
		if(!this.isLeaf()) {
			var bitLeft = (x<this.x+this.width/2)?0:1;
			var bitTop = (y<this.y+this.height/2)?0:1;
			
			var childId = bitLeft<<1|bitTop;
			var child = this.childNodes[childId];
			
			if(child==null) {
				return [];
			}
			return child.get(x,y);
		}
		return [].concat(this.values);
	};
	this.getAll = function(x,y,w,h) {
		if(!this.isLeaf()) {
			var all = [];
			for(var i=0; i<this.childNodes.length; i++) {
				var child = this.childNodes[i];
				var childX = this.x+((i&2)>>1)*this.width/2;
				var childY = this.y+(i&1)*this.height/2;
				var childW = this.width/2;
				var childH = this.height/2;
				
				// child exists and intersects range
				// "Fast rectangle to rectangle intersection" http://stackoverflow.com/a/2752387/2727710
				if(child!=null&&!(childX>x+w||childX+childW<x||childY>y+h||childY+childH<y)) {
					all = all.concat(child.getAll(x,y,w,h));
				}
			}
			return all;
		}
		return [].concat(this.values);
	};
	this.set = function(x,y,val) {
		if(!this.isLeaf()) {
			var bitLeft = (x<this.x+this.width/2)?0:1;
			var bitTop = (y<this.y+this.height/2)?0:1;
			
			var childId = bitLeft<<1|bitTop;
			var child = this.childNodes[childId];
			
			if(child==null) {
				child = new QuadTree.Node(
					this.x+bitLeft*this.width/2,
					this.y+bitTop*this.height/2,
					this.width/2,
					this.height/2,
					this.resolution
				);
				this.childNodes[childId] = child;
			}
			return child.set(x,y,val);
		}
		var index = this.values.indexOf(val);
		if(index<0) {
			this.values.push(val);
			return true;
		}
		return false;
	};
	this.remove = function(x,y,val) {
		if(!this.isLeaf()) {
			var bitLeft = (x<this.x+this.width/2)?0:1;
			var bitTop = (y<this.y+this.height/2)?0:1;
			
			var childId = bitLeft<<1|bitTop;
			var child = this.childNodes[childId];
			
			if(child==null) {
				return false;
			}
			if(!child.remove(x,y,val)) {
				return false;
			}
			this.childNodes[childId] = null;
			return this.isEmpty();
		}
		var index = this.values.indexOf(val);
		if(index<0) {
			return false;
		}
		this.values.splice(index,1);
		return this.isEmpty();
	};
	this.isEmpty = function() {
		for(var i=0; i<this.childNodes.length; i++) {
			if(this.childNodes[i]!=null) {
				return false;
			}
		}
		return this.values.length==0;
	};
	this.isLeaf = function() {
		return this.width<=this.resolution||this.height<=this.resolution;
	};
	this.draw = function(context) {
		context.strokeRect(this.x,this.y,this.width,this.height);
		for(var i=0; i<this.childNodes.length; i++) {
			var child = this.childNodes[i];
			if(child!=null) {
				child.draw(context);
			}
		}
	};
};
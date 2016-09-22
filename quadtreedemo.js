"use strict";
var canvas,ctx,lastDraw,lastTick,drawId,tickId,qt,particles;
var MAX_PARTICLES = 512;
var RADIUS = 8;
var TPS = 30;

window.addEventListener("load",init);

function init() {
	canvas = document.querySelector("canvas");
	ctx = canvas.getContext("2d");
	
	qt = new QuadTree(canvas.width,canvas.height,2*RADIUS);
	particles = [];
	
	canvas.addEventListener("click",function(e) {
		var bcr = canvas.getBoundingClientRect();
		var angle = 2*Math.PI*Math.random();
		var p = {
			x: e.clientX-bcr.left,
			y: e.clientY-bcr.top,
			vx: 100*Math.cos(angle),
			vy: 100*Math.sin(angle)
		};
		qt.set(p.x,p.y,p);
		particles.push(p);
	});
	document.getElementById("explode").addEventListener("click",function() {
		var boomCount = 50;
		var boomRadius = RADIUS/Math.sin(Math.PI/boomCount);
		for(var i=0; i<boomCount&&particles.length<MAX_PARTICLES; i++) {
			var angle = i/boomCount*2*Math.PI;
			var sin = Math.sin(angle);
			var cos = Math.cos(angle);
			
			var p = {
				x: canvas.width/2+boomRadius*cos,
				y: canvas.height/2+boomRadius*sin,
				vx: 200*cos,
				vy: 200*sin
			};
			qt.set(p.x,p.y,p);
			particles.push(p);
		}
	});
	document.getElementById("toggle").addEventListener("click",function() {
		if(this.hasAttribute("data-paused")) {
			this.removeAttribute("data-paused");
			this.textContent = "Pause";
			resume();
		} else {
			this.setAttribute("data-paused",true);
			this.textContent = "Play";
			pause();
		}
	});
	document.getElementById("clear").addEventListener("click",function() {
		qt.clear();
		particles = [];
	});

	lastDraw = Date.now();
	drawId = requestAnimationFrame(draw);
	lastTick = Date.now();
	tickId = setTimeout(tick,1000/TPS);
}

function draw() {
	var currentDraw = Date.now();
	var dt = (currentDraw-lastDraw)/1000;
	
	ctx.clearRect(0,0,canvas.width,canvas.height);
	
	ctx.strokeStyle = "#0f0";
	qt.draw(ctx);
	
	// fix QuadTree::getAll
	for(var i=0; i<particles.length; i++) {
		var p1 = particles[i];
		var neighbors = qt.getAll(p1.x-2*RADIUS,p1.y-2*RADIUS,4*RADIUS,4*RADIUS);
		ctx.fillStyle = "#00f";
		
		for(var j=0; j<neighbors.length; j++) {
			var p2 = neighbors[j];
			if(p1!=p2) {
				var dx = p2.x-p1.x;
				var dy = p2.y-p1.y;
				var dist = Math.sqrt(dx*dx+dy*dy);
				if(dist<2*RADIUS) {
					ctx.fillStyle = "#f00";
					break;
				}
			}
		}
		
		ctx.beginPath();
		ctx.arc(p1.x,p1.y,RADIUS,0,2*Math.PI);
		ctx.fill();
	}
	
	lastDraw = currentDraw;
	drawId = requestAnimationFrame(draw);
}

function tick() {
	var currentTick = Date.now();
	var dt = (currentTick-lastTick)/1000;
	
	for(var i=0; i<particles.length; i++) {
		var p = particles[i];
		var neighbors = qt.get(p.x,p.y);
		
		if(neighbors.indexOf(p)<0) {
			console.log("lost in the quadtree",p,qt);
			return;
		}
		
		qt.remove(p.x,p.y,p);
		if(qt.get(p.x,p.y).indexOf(p)>=0) {
			console.log("failed to remove");
			return;
		}
		
		p.x+=p.vx*dt;
		p.y+=p.vy*dt;
		
		if(p.x<0) {
			p.x = 0;
			p.vx*=-1;
		}
		if(p.x>=canvas.width) {
			p.x = canvas.width-1;
			p.vx*=-1;
		}
		if(p.y<0) {
			p.y = 0;
			p.vy*=-1;
		}
		if(p.y>=canvas.height) {
			p.y = canvas.height-1;
			p.vy*=-1;
		}
		
		qt.set(p.x,p.y,p);
		neighbors = qt.get(p.x,p.y);
		if(neighbors.indexOf(p)<0) {
			console.log("failed to set");
			return;
		}
		if(neighbors.length>5) {
			console.log("limiting neighbors");
			qt.remove(p.x,p.y,p);
			if(qt.get(p.x,p.y).indexOf(p)>=0) {
				console.log("failed to remove");
				return;
			}
			particles.splice(i,1);
			i--;
		}
	}
	
	document.getElementById("particles").textContent = particles.length;
	
	lastTick = currentTick;
	tickId = setTimeout(tick,1000/TPS);
}

function resume() {
	lastDraw = Date.now();
	drawId = requestAnimationFrame(draw);
	lastTick = Date.now();
	tickId = setTimeout(tick,1000/TPS);
}

function pause() {
	cancelAnimationFrame(drawId);
	clearTimeout(tickId);
}
"use strict";
var canvas, ctx, lastDraw, lastTick, drawId, tickId, qt, particles;
var MAX_PARTICLES = 512;
var BOOM_COUNT = 64;
var RADIUS = 8;
var TPS = 60;

window.addEventListener("load", init);

function init() {
	canvas = document.querySelector("canvas");
	ctx = canvas.getContext("2d");

	qt = new QuadTree(0, 0, canvas.width, canvas.height);
	particles = [];

	canvas.addEventListener("click", function(e) {
		var bcr = canvas.getBoundingClientRect();
		var angle = 2 * Math.PI * Math.random();
		var p = {
			x: e.clientX - bcr.left,
			y: e.clientY - bcr.top,
			vx: 100 * Math.cos(angle),
			vy: 100 * Math.sin(angle)
		};

		if(!qt.put({x: p.x, y: p.y}, p)) {
			console.log("Failed to put", p);

			if(particles.indexOf(p) < 0) {
				console.log("Not in particles");
			}
		} else {
			particles.push(p);
		}
	});

	document.getElementById("explode").addEventListener("click", function() {
		var boomRadius = RADIUS / Math.sin(Math.PI / BOOM_COUNT);

		for(var i = 0; i < BOOM_COUNT && particles.length < MAX_PARTICLES; i++) {
			var angle = i / BOOM_COUNT * 2 * Math.PI;
			var sin = Math.sin(angle);
			var cos = Math.cos(angle);

			var p = {
				x: canvas.width / 2 + boomRadius * cos,
				y: canvas.height / 2 + boomRadius * sin,
				vx: 200 * cos,
				vy: 200 * sin
			};

			if(!qt.put({x: p.x, y: p.y}, p)) {
				console.log("Failed to put", p);

				if(particles.indexOf(p) < 0) {
					console.log("Not in particles");
				}
			} else {
				particles.push(p);
			}
		}
	});

	document.getElementById("toggle").addEventListener("click", function() {
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

	document.getElementById("clear").addEventListener("click", function() {
		qt.clear();
		particles = [];
	});

	lastDraw = Date.now();
	drawId = requestAnimationFrame(draw);
	lastTick = Date.now();
	tickId = setTimeout(tick, 1000 / TPS);
}

function draw() {
	var currentDraw = Date.now();

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	particles.forEach(function(p1) {
		var neighbors = qt.getAll(p1.x - 2 * RADIUS, p1.y - 2 * RADIUS, 4 * RADIUS, 4 * RADIUS);

		ctx.fillStyle = "#0000ff";

		if(neighbors.some(p2 => {
			if(p1 != p2) {
				var dx = p2.x - p1.x;
				var dy = p2.y - p1.y;

				if(dx * dx + dy * dy < 4 * RADIUS * RADIUS) {
					return true;
				}
			}
			return false;
		})) {
			ctx.fillStyle = "#ff0000";
		}

		ctx.beginPath();
		ctx.arc(p1.x, p1.y, RADIUS, 0, 2 * Math.PI);
		ctx.fill();
	});

	ctx.strokeStyle = "#00ff00";
	qt.draw(ctx);

	lastDraw = currentDraw;
	drawId = requestAnimationFrame(draw);
}

function tick() {
	var currentTick = Date.now();
	var dt = (currentTick - lastTick) / 1000;

	qt.clear();
	for(var i = 0; i < particles.length; i++) {
		var p = particles[i];

		p.x += p.vx * dt;
		p.y += p.vy * dt;

		if(p.x - RADIUS < 0) {
			p.x = RADIUS;
			p.vx *= -1;
		}
		if(p.x + RADIUS >= canvas.width) {
			p.x = canvas.width - RADIUS - 1;
			p.vx *= -1;
		}
		if(p.y - RADIUS < 0) {
			p.y = RADIUS;
			p.vy *= -1;
		}
		if(p.y + RADIUS >= canvas.height) {
			p.y = canvas.height - RADIUS - 1;
			p.vy *= -1;
		}

		if(!qt.put({x: p.x, y: p.y}, p)) {
			console.log("Failed to put", p);

			particles.splice(i, 1);
			i--;
		}

		if(qt.get({x: p.x, y: p.y}) == null) {
			console.log("Failed to put", p);
			return;
		}
	}

	document.getElementById("particles").textContent = particles.length;

	lastTick = currentTick;
	tickId = setTimeout(tick, 1000 / TPS);
}

function resume() {
	lastDraw = Date.now();
	drawId = requestAnimationFrame(draw);
	lastTick = Date.now();
	tickId = setTimeout(tick, 1000 / TPS);
}

function pause() {
	cancelAnimationFrame(drawId);
	clearTimeout(tickId);
}

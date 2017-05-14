"use strict";

let canvas, ctx, lastDraw, lastTick, drawId, tickId, qt, particles;
const MAX_PARTICLES = 512;
const BOOM_COUNT = 64;
const RADIUS = 8;
const TPS = 60;

window.addEventListener("load", init);

function init() {
	canvas = document.querySelector("canvas");
	ctx = canvas.getContext("2d");

	qt = new QuadTree(0, 0, canvas.width, canvas.height);
	particles = [];

	canvas.addEventListener("click", (event) => {
		const bcr = canvas.getBoundingClientRect();
		const angle = 2 * Math.PI * Math.random();
		const p = {
			x: event.clientX - bcr.left,
			y: event.clientY - bcr.top,
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

	document.getElementById("explode").addEventListener("click", () => {
		const boomRadius = RADIUS / Math.sin(Math.PI / BOOM_COUNT);

		for(let i = 0; i < BOOM_COUNT && particles.length < MAX_PARTICLES; i++) {
			const angle = i / BOOM_COUNT * 2 * Math.PI;
			const sin = Math.sin(angle);
			const cos = Math.cos(angle);

			const p = {
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

	const toggleBtn = document.getElementById("toggle");
	toggleBtn.addEventListener("click", () => {
		if(canvas.hasAttribute("data-paused")) {
			canvas.removeAttribute("data-paused");
			toggleBtn.textContent = "Pause";
			resume();
		} else {
			canvas.setAttribute("data-paused", true);
			toggleBtn.textContent = "Play";
			pause();
		}
	});

	document.getElementById("clear").addEventListener("click", () => {
		qt.clear();
		particles = [];
	});

	lastDraw = Date.now();
	drawId = requestAnimationFrame(draw);
	lastTick = Date.now();
	tickId = setTimeout(tick, 1000 / TPS);
}

function draw() {
	const currentDraw = Date.now();

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	particles.forEach(function(p1) {
		const neighbors = qt.getAll(p1.x - 2 * RADIUS, p1.y - 2 * RADIUS, 4 * RADIUS, 4 * RADIUS);

		ctx.fillStyle = "#0000ff";

		if(neighbors.some(p2 => {
			if(p1 != p2) {
				const dx = p2.x - p1.x;
				const dy = p2.y - p1.y;

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
	const currentTick = Date.now();
	const dt = (currentTick - lastTick) / 1000;

	qt.clear();
	for(let i = 0; i < particles.length; i++) {
		const p = particles[i];

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

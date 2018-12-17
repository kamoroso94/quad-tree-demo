import QuadTree from './quadtree.js';

// transform iterable into iterable flattened by one level
function* flatten(iter) {
  for(const item of iter) {
    if(Array.isArray(item)) {
      yield* item;
    } else {
      yield item;
    }
  }
}

// draws the outlines of the AABBs in the tree
function drawNode(node, ctx) {
  for(const child of node.children) {
    if(child != null) drawNode(child, ctx);
  }

  ctx.strokeRect(node.aabb.x, node.aabb.y, node.aabb.width, node.aabb.height);
}

function getBoomCount() {
  const clamp = (val, min, max) => Math.max(min, Math.min(val, max));
  const boomCountTag = document.getElementById('boom-count');
  return clamp(Math.floor(boomCountTag.value), 2, 97);
}

// page load listener
window.addEventListener('load', () => {
  let lastTick;
  let paused = false;
  const MAX_PARTICLES = 512;
  const VELOCITY = 100;
  const RADIUS = 8;
  const TPS = 60;
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const particles = new QuadTree({
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height
  });
  console.log(particles);

  // spawn particle in canvas at mouse click
  canvas.addEventListener('click', (event) => {
    const bcr = canvas.getBoundingClientRect();
    const angle = 2 * Math.PI * Math.random();
    const p = {
      x: event.clientX - bcr.left,
      y: event.clientY - bcr.top,
      vx: VELOCITY * Math.cos(angle),
      vy: VELOCITY * Math.sin(angle)
    };
    const key = [p.x, p.y];

    if(particles.has(key)) {
      particles.get(key).push(p);
    } else {
      particles.set(key, [p]);
    }
  });

  // trigger particle explosion on click of #explode
  document.getElementById('explode').addEventListener('click', () => {
    const boomCount = getBoomCount();
    const boomRadius = RADIUS / Math.sin(Math.PI / boomCount);

    for(let i = 0; i < boomCount && particles.size() < MAX_PARTICLES; i++) {
      const angle = 2 * Math.PI * i / boomCount;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);

      const p = {
        x: canvas.width / 2 + boomRadius * cos,
        y: canvas.height / 2 + boomRadius * sin,
        vx: 200 * cos,
        vy: 200 * sin
      };
      const key = [p.x, p.y];

      if(particles.has(key)) {
        particles.get(key).push(p);
      } else {
        particles.set(key, [p]);
      }
    }
  });

  // toggles freeze of simulation
  const toggleBtn = document.getElementById('toggle');
  toggleBtn.addEventListener('click', () => {
    paused = !paused;
    toggleBtn.textContent = paused ? 'Play' : 'Pause';
  });

  // removes all particles from canvas
  document.getElementById('clear').addEventListener('click', () => {
    particles.clear();
  });

  lastTick = performance.now();
  requestAnimationFrame(loop);

  function loop(now) {
    const dt = (now - lastTick) / 1000;
    draw();
    if (!paused) tick(dt);
    lastTick = now;
    requestAnimationFrame(loop);
  }

  // refresh canvas
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for(const p1 of flatten(particles.values())) {
      const {x: x1, y: y1} = p1;
      const neighbors = flatten(particles.getAll({
        x: x1 - 2 * RADIUS,
        y: y1 - 2 * RADIUS,
        width: 4 * RADIUS,
        height: 4 * RADIUS
      }));

      ctx.fillStyle = '#0000ff';

      if(Array.from(neighbors).some((p2) => {
        if(p1 == p2) return false;

        const {x: x2, y: y2} = p2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx ** 2 + dy ** 2 < (2 * RADIUS) ** 2;
      })) {
        ctx.fillStyle = '#ff0000';
      }

      ctx.beginPath();
      ctx.arc(x1, y1, RADIUS, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.strokeStyle = '#00ff00';
    drawNode(particles.root, ctx);

    document.getElementById('particles').textContent = particles.size();
  }

  // tick all particles by one
  function tick(dt) {

    // NOTE: lastGen holds reference to old root node
    const lastGen = flatten(particles.values());
    particles.clear();

    for(const p of lastGen) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if(p.x - RADIUS < 0) {
        p.x = 2 * RADIUS - p.x;
        p.vx *= -1;
      }
      if(p.x + RADIUS >= canvas.width) {
        p.x = 2 * (canvas.width - RADIUS) - p.x;
        p.vx *= -1;
      }
      if(p.y - RADIUS < 0) {
        p.y = 2 * RADIUS - p.y;
        p.vy *= -1;
      }
      if(p.y + RADIUS >= canvas.height) {
        p.y = 2 * (canvas.height - RADIUS) - p.y;
        p.vy *= -1;
      }

      const key = [p.x, p.y];

      if(particles.has(key)) {
        particles.get(key).push(p);
      } else if(!particles.aabb.contains(key)) {
        console.error('Point flew away', p);
      } else {
        if(!particles.set(key, [p])) console.error('Failed to set', p);
      }
    }
  }
});

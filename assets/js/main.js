(function () {
  const body = document.body;
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('site-nav');
  const navLinks = nav ? Array.from(nav.querySelectorAll('a[href^="#"]')) : [];

  function closeMenu() {
    body.classList.remove('menu-open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
    }
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      const isOpen = body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && body.classList.contains('menu-open')) {
      closeMenu();
      if (toggle) {
        toggle.focus();
      }
    }
  });

  document.addEventListener('click', function (event) {
    if (!body.classList.contains('menu-open')) return;
    if (nav && nav.contains(event.target)) return;
    if (toggle && toggle.contains(event.target)) return;
    closeMenu();
  });

  const sections = navLinks
    .map(function (link) {
      return document.getElementById(link.getAttribute('href').slice(1));
    })
    .filter(Boolean);

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute('id');
        navLinks.forEach(function (link) {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      });
    },
    // Mark a section active when it crosses the middle band of the viewport,
    // so tall sections still register regardless of their height.
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });

  const year = document.getElementById('year');
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  initTrackingFeed(document.getElementById('tracking-feed'));
})();

// Hero illustration: a broadcast-style view of a cricket ground with
// tracked players, drawn on canvas. Field coordinates run from -1 to 1
// on both axes and are projected with a simple camera tilt.
function initTrackingFeed(canvas) {
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colors = {
    feed: '#0e1a20',
    grass: '#16302a',
    grassBand: '#1a372f',
    line: 'rgba(214, 229, 222, 0.38)',
    pitch: '#5b5a45',
    box: '#f2b33d',
    trail: 'rgba(242, 179, 61, ',
    hud: 'rgba(230, 238, 243, 0.86)',
    hudDim: 'rgba(230, 238, 243, 0.55)',
    live: '#e5484d'
  };
  const mono = '500 {size}px "IBM Plex Mono", ui-monospace, monospace';

  let width = 0;
  let height = 0;
  let frame = 4812;
  let running = false;
  let lastTick = 0;

  // Deterministic pseudo-random so the static frame looks the same each load.
  let seed = 7;
  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function near(home) {
    return { x: home.x + (random() - 0.5) * 0.3, y: home.y + (random() - 0.5) * 0.3 };
  }

  const players = [];
  // Spread fielders around the ground, each wandering near its own position.
  for (let i = 0; i < 11; i++) {
    const angle = (i / 11) * Math.PI * 2 + 0.3;
    const r = 0.4 + random() * 0.45;
    const home = { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
    players.push({ id: 3 + i * 2, x: home.x, y: home.y, home: home, target: near(home), speed: 0.0008 + random() * 0.001 });
  }
  players.push({ id: 1, x: 0, y: -0.2, target: { x: 0, y: 0.2 }, speed: 0.0022, runner: true });
  players.push({ id: 2, x: 0, y: 0.2, target: { x: 0, y: -0.2 }, speed: 0.0022, runner: true });
  players.forEach(function (p) {
    p.trail = [];
    p.conf = 0.9 + random() * 0.09;
  });

  function project(x, y) {
    // Far edge of the ground (y = -1) sits higher and narrower on screen.
    const depth = (y + 1) / 2;
    const scale = 0.62 + 0.38 * depth;
    return {
      x: width / 2 + x * width * 0.46 * scale,
      y: height * 0.14 + depth * height * 0.8,
      scale: scale
    };
  }

  function tracePath(points) {
    ctx.beginPath();
    points.forEach(function (pt, i) {
      const s = project(pt.x, pt.y);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
  }

  function ellipse(radius, steps) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      points.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
    }
    return points;
  }

  function drawField() {
    ctx.fillStyle = colors.feed;
    ctx.fillRect(0, 0, width, height);

    tracePath(ellipse(0.98, 96));
    ctx.fillStyle = colors.grass;
    ctx.fill();

    // Mowing bands, clipped to the ground.
    ctx.save();
    tracePath(ellipse(0.98, 96));
    ctx.clip();
    ctx.fillStyle = colors.grassBand;
    for (let i = -1; i < 1; i += 0.2) {
      const a = project(-1, i);
      const b = project(1, i);
      const c = project(1, i + 0.1);
      const d = project(-1, i + 0.1);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.fill();
    }
    ctx.restore();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = colors.line;
    tracePath(ellipse(0.98, 96));
    ctx.stroke();

    ctx.setLineDash([4, 6]);
    tracePath(ellipse(0.46, 72));
    ctx.stroke();
    ctx.setLineDash([]);

    tracePath([{ x: -0.035, y: -0.22 }, { x: 0.035, y: -0.22 }, { x: 0.035, y: 0.22 }, { x: -0.035, y: 0.22 }, { x: -0.035, y: -0.22 }]);
    ctx.fillStyle = colors.pitch;
    ctx.fill();
  }

  function drawPlayers() {
    // Draw far players first so nearer boxes and labels sit on top.
    const ordered = players.slice().sort(function (a, b) { return a.y - b.y; });
    const compact = width < 480;
    ordered.forEach(function (p) {
      if (p.trail.length > 1) {
        for (let i = 1; i < p.trail.length; i++) {
          const a = project(p.trail[i - 1].x, p.trail[i - 1].y);
          const b = project(p.trail[i].x, p.trail[i].y);
          ctx.strokeStyle = colors.trail + (0.5 * i / p.trail.length).toFixed(3) + ')';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      const s = project(p.x, p.y);
      const unit = Math.max(4, width / 90) * s.scale;
      const boxW = unit * 2.2;
      const boxH = unit * 3.6;
      const left = s.x - boxW / 2;
      const top = s.y - boxH;

      // Player marker.
      ctx.fillStyle = '#e8eef2';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - boxH * 0.42, unit * 0.55, unit * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, unit * 0.9, unit * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corner-bracket bounding box.
      const c = Math.min(boxW, boxH) * 0.32;
      ctx.strokeStyle = colors.box;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, top + c); ctx.lineTo(left, top); ctx.lineTo(left + c, top);
      ctx.moveTo(left + boxW - c, top); ctx.lineTo(left + boxW, top); ctx.lineTo(left + boxW, top + c);
      ctx.moveTo(left + boxW, top + boxH - c); ctx.lineTo(left + boxW, top + boxH); ctx.lineTo(left + boxW - c, top + boxH);
      ctx.moveTo(left + c, top + boxH); ctx.lineTo(left, top + boxH); ctx.lineTo(left, top + boxH - c);
      ctx.stroke();

      const label = String(p.id).padStart(2, '0') + (compact ? '' : ' ' + p.conf.toFixed(2));
      const size = Math.max(9, Math.round(width / 70 * s.scale));
      ctx.font = mono.replace('{size}', size);
      const textW = ctx.measureText(label).width;
      ctx.fillStyle = colors.box;
      ctx.fillRect(left, top - size - 6, textW + 8, size + 5);
      ctx.fillStyle = '#10171c';
      ctx.fillText(label, left + 4, top - 5);
    });
  }

  function drawHud() {
    const size = Math.max(10, Math.round(width / 58));
    const pad = Math.round(size * 1.2);
    ctx.font = mono.replace('{size}', size);
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = colors.live;
    ctx.beginPath();
    ctx.arc(pad + size * 0.35, pad + size * 0.1, size * 0.33, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.hud;
    ctx.fillText('LIVE   CAM 03   4K 50fps', pad + size, pad + size * 0.45);

    const frameText = 'frame ' + String(frame).padStart(6, '0');
    ctx.fillStyle = colors.hudDim;
    ctx.fillText(frameText, width - pad - ctx.measureText(frameText).width, pad + size * 0.45);
    ctx.fillText('tracks ' + players.length, pad, height - pad);
  }

  function step() {
    players.forEach(function (p) {
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.02) {
        p.target = p.runner ? { x: 0, y: -p.target.y } : near(p.home);
      } else {
        p.x += (dx / dist) * p.speed;
        p.y += (dy / dist) * p.speed;
      }
      if (frame % 3 === 0) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 24) p.trail.shift();
      }
      if (frame % 20 === 0) {
        p.conf = Math.min(0.99, Math.max(0.86, p.conf + (random() - 0.5) * 0.04));
      }
    });
    frame += 1;
  }

  function render() {
    drawField();
    drawPlayers();
    drawHud();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    render();
  }

  function loop(time) {
    if (!running) return;
    // Cap at ~30fps; the motion is slow and this halves the work.
    if (time - lastTick > 33) {
      lastTick = time;
      step();
      render();
    }
    requestAnimationFrame(loop);
  }

  // Warm up so trails are already present on the first paint.
  for (let i = 0; i < 90; i++) step();

  resize();
  window.addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(render);
  }

  if (reduceMotion) return;

  new IntersectionObserver(function (entries) {
    const visible = entries[0].isIntersecting;
    if (visible && !running) {
      running = true;
      requestAnimationFrame(loop);
    } else if (!visible) {
      running = false;
    }
  }).observe(canvas);
}

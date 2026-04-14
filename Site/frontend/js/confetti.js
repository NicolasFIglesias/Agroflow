/* ── AgriFlow Confetti ─────────────────────────────────────── */
const Confetti = (() => {
  const COLORS = ['#639922','#4a7219','#EAF3DE','#FFD700','#FF6B6B','#54C5F8','#A78BFA','#FFA94D','#fff'];
  const SHAPES = ['circle','rect','star'];

  function _rand(min, max) { return Math.random() * (max - min) + min; }

  function _createParticle(x, y) {
    const el = document.createElement('div');
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const size  = _rand(7, 16);
    const rot   = _rand(0, 360);
    const drift = _rand(-180, 180);
    const dur   = _rand(900, 1600);

    el.style.cssText = `
      position:fixed;
      left:${x}px;
      top:${y}px;
      width:${size}px;
      height:${shape === 'rect' ? size * 0.5 : size}px;
      background:${color};
      border-radius:${shape === 'circle' ? '50%' : shape === 'star' ? '2px' : '2px'};
      pointer-events:none;
      z-index:99999;
      transform:rotate(${rot}deg);
      opacity:1;
      transition:none;
    `;

    if (shape === 'star') {
      el.textContent = '★';
      el.style.background = 'none';
      el.style.color = color;
      el.style.fontSize = size + 'px';
      el.style.lineHeight = '1';
      el.style.width = 'auto';
      el.style.height = 'auto';
    }

    document.body.appendChild(el);

    const startTime = performance.now();
    const vy = _rand(4, 10);
    const vx = drift / dur * 16;
    let currentY = y;
    let currentX = x;
    let currentRot = rot;
    const rotSpeed = _rand(-6, 6);

    function step(now) {
      const elapsed = now - startTime;
      const progress = elapsed / dur;
      if (progress >= 1) { el.remove(); return; }

      currentY += vy;
      currentX += vx;
      currentRot += rotSpeed;
      const opacity = 1 - Math.pow(progress, 2);

      el.style.transform = `translate(${currentX - x}px, ${currentY - y}px) rotate(${currentRot}deg)`;
      el.style.opacity = opacity;
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function burst(x, y, count = 55) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const ox = x + _rand(-20, 20);
        const oy = y + _rand(-20, 20);
        _createParticle(ox, oy);
      }, _rand(0, 180));
    }
  }

  // Burst centered on screen (for modal confirmations)
  function center(count = 70) {
    const x = window.innerWidth / 2;
    const y = window.innerHeight * 0.42;
    burst(x, y, count);
  }

  // Burst from a button element
  function fromEl(el, count = 55) {
    if (!el) { center(count); return; }
    const rect = el.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, count);
  }

  return { burst, center, fromEl };
})();

window.Confetti = Confetti;

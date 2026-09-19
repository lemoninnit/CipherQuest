import { useEffect, useRef } from 'react';
import './VictoryConfetti.css';

const CONFETTI_COLORS = [
  '#00e5ff', // neon cyan
  '#39ff14', // neon green
  '#ffd700', // gold
  '#ff007f', // hot pink
  '#a855f7', // neon purple
  '#ffffff', // bright white
  '#38bdf8', // sky blue
];

export default function VictoryConfetti({ isPaused = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Check reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = [];
    const DURATION_MS = 2500;
    const SPAWN_MS = 1400;
    const startTime = performance.now();
    let animId = null;

    const createParticle = (side) => {
      const isLeft = side === 'left';
      const x = isLeft ? Math.random() * 20 : width - Math.random() * 20;
      const y = height * (0.35 + Math.random() * 0.45);

      // Launch inward and upward
      const angle = isLeft
        ? (Math.random() * 50 - 65) * (Math.PI / 180) // -65 to -15 degrees (up-right)
        : (Math.random() * 50 - 165) * (Math.PI / 180); // -165 to -115 degrees (up-left)

      const speed = 12 + Math.random() * 16;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const size = 6 + Math.random() * 8;
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const rotation = Math.random() * 360;
      const rotSpeed = (Math.random() - 0.5) * 12;
      const shape = Math.random() > 0.3 ? 'rect' : 'circle';

      return {
        x,
        y,
        vx,
        vy,
        size,
        color,
        rotation,
        rotSpeed,
        shape,
        opacity: 1,
        drag: 0.982,
        gravity: 0.38 + Math.random() * 0.18,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.08 + Math.random() * 0.08,
      };
    };

    // Initial burst from both sides
    for (let i = 0; i < 40; i++) {
      particles.push(createParticle('left'));
      particles.push(createParticle('right'));
    }

    let lastSpawn = startTime;

    const render = (now) => {
      if (isPaused) {
        animId = requestAnimationFrame(render);
        return;
      }

      const elapsed = now - startTime;
      if (elapsed > DURATION_MS && particles.length === 0) {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      // Continuous spawning during the spawn window
      if (elapsed < SPAWN_MS && now - lastSpawn > 60) {
        lastSpawn = now;
        for (let i = 0; i < 4; i++) {
          particles.push(createParticle('left'));
          particles.push(createParticle('right'));
        }
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx + Math.sin(p.wobble) * 1.5;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.wobble += p.wobbleSpeed;

        if (elapsed > 1800) {
          p.opacity = Math.max(0, p.opacity - 0.025);
        }

        if (p.y > height + 20 || p.opacity <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (particles.length > 0 || elapsed < DURATION_MS) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPaused]);

  return <canvas ref={canvasRef} className="cq-victory-confetti" aria-hidden="true" />;
}

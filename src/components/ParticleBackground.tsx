import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  opacitySpeed: number;
}

const PARTICLE_COUNT = 30;
const CONNECTION_DISTANCE = 100;
const PARTICLE_COLOR = '99, 102, 241';

const ParticleBackground = React.memo(function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  // ── Chrome mobile detection ──────────────────────────────────────────
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  const isMobile = window.innerWidth < 768;

  // Skip particle canvas on Chrome mobile — GPU can't handle it
  if (isChrome && isMobile) {
    return (
      <div className="fixed inset-0 -z-10 pointer-events-none bg-[#09090b] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/3 blur-[140px]" />
      </div>
    );
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.4 + 0.05,
      opacitySpeed: (Math.random() - 0.5) * 0.003,
    }));

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouse);

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        p.opacity += p.opacitySpeed;
        if (p.opacity > 0.5 || p.opacity < 0.03) p.opacitySpeed *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${PARTICLE_COLOR}, ${p.opacity})`;
        ctx.fill();

        // Draw connections every 4th frame (reduced from 3rd for performance)
        if (frame % 4 === 0) {
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONNECTION_DISTANCE) {
              const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.08;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(${PARTICLE_COLOR}, ${alpha})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }

        // Mouse interaction
        const mdx = mouse.x - p.x;
        const mdy = mouse.y - p.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < 120) {
          const force = (120 - mDist) / 120;
          p.vx += (mdx / mDist) * force * 0.01;
          p.vy += (mdy / mDist) * force * 0.01;
        }

        p.vx *= 0.999;
        p.vy *= 0.999;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  return (
    <>
      {/* Static glow orbs as fallback + ambient base */}
      <div className="fixed inset-0 -z-10 pointer-events-none bg-[#09090b] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/3 blur-[140px]" />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-brand-accent/2 blur-[100px]" />
      </div>

      {/* Canvas particle layer — reduced opacity for performance */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-5 pointer-events-none"
        style={{ opacity: 0.5 }}
      />
    </>
  );
});

export default ParticleBackground;

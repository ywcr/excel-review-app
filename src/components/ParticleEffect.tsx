"use client";

import { useEffect, useRef } from "react";
import { useAtmosphereSettings } from "./AtmosphereSettings";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  emoji?: string;
}

export default function ParticleEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const { settings } = useAtmosphereSettings();

  useEffect(() => {
    if (!settings.enableParticles) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const getThemeParticles = () => {
      switch (settings.theme) {
        case "romantic":
          return ["💕", "💖", "💗", "💝", "🌹", "✨", "💫", "⭐"];
        case "cute":
          return ["🌸", "🌺", "🦋", "🌈", "☁️", "✨", "💫", "⭐"];
        case "professional":
          return ["⚡", "💼", "📊", "✅", "🎯", "💡", "🔥", "⭐"];
        default:
          return ["✨", "💫", "⭐", "🌟", "💎", "🔮", "🎊", "🎉"];
      }
    };

    const createParticle = (x?: number, y?: number): Particle => {
      const emojis = getThemeParticles();
      return {
        x: x ?? Math.random() * canvas.width,
        y: y ?? Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 0,
        maxLife: 100 + Math.random() * 100,
        size: 12 + Math.random() * 8,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
      };
    };

    // 初始化粒子
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push(createParticle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 更新和绘制粒子
      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.life++;
        particle.x += particle.vx;
        particle.y += particle.vy;

        // 边界检查
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // 透明度计算
        const alpha = 1 - particle.life / particle.maxLife;

        if (particle.emoji) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.font = `${particle.size}px Arial`;
          ctx.textAlign = "center";
          ctx.fillText(particle.emoji, particle.x, particle.y);
          ctx.restore();
        } else {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        return particle.life < particle.maxLife;
      });

      // 添加新粒子
      if (Math.random() < 0.1 && particlesRef.current.length < 30) {
        particlesRef.current.push(createParticle());
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [settings.enableParticles, settings.theme]);

  if (!settings.enableParticles) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ background: "transparent" }}
    />
  );
}

import { useEffect, useRef } from "react";
import styles from "./environment.module.css";
import {
  advanceRainParticle,
  createRainParticles,
  type RainParticle,
} from "./rainParticles";
import type { WeatherIntensity } from "./useEnvironment";

interface RainCanvasProps {
  intensity: WeatherIntensity;
}

function drawRain(
  context: CanvasRenderingContext2D,
  particles: RainParticle[],
): void {
  context.clearRect(
    0,
    0,
    context.canvas.clientWidth,
    context.canvas.clientHeight,
  );
  context.lineCap = "round";

  for (const particle of particles) {
    context.beginPath();
    context.lineWidth = particle.width;
    context.strokeStyle = `rgba(191, 219, 254, ${particle.opacity})`;
    context.moveTo(particle.x, particle.y);
    context.lineTo(
      particle.x + particle.drift * 0.02,
      particle.y + particle.length,
    );
    context.stroke();
  }
}

export function RainCanvas({ intensity }: RainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let width = 0;
    let height = 0;
    let particles: RainParticle[] = [];
    let animationFrame = 0;
    let lastTimestamp = performance.now();
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      particles = createRainParticles(intensity, width, height);
      drawRain(context, particles);
    };

    const frame = (timestamp: number) => {
      const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;
      particles = particles.map((particle) =>
        advanceRainParticle(particle, deltaSeconds, width, height),
      );
      drawRain(context, particles);
      animationFrame = requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(animationFrame);
      lastTimestamp = performance.now();
      if (reducedMotionQuery.matches) {
        drawRain(context, particles);
        return;
      }
      animationFrame = requestAnimationFrame(frame);
    };

    resize();
    start();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const onMotionPreferenceChange = () => start();
    reducedMotionQuery.addEventListener("change", onMotionPreferenceChange);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      reducedMotionQuery.removeEventListener(
        "change",
        onMotionPreferenceChange,
      );
    };
  }, [intensity]);

  return (
    <canvas ref={canvasRef} className={styles.rainCanvas} aria-hidden="true" />
  );
}

import React, { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
}

interface StarfieldBackgroundProps {
  isShadowMode: boolean;
}

export const StarfieldBackground: React.FC<StarfieldBackgroundProps> = ({ isShadowMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Number of stars
    const numStars = 250;
    const stars: Star[] = [];

    // Colors for standard/friendly mode (warm/pale colors)
    const friendlyColors = [
      "rgba(255, 255, 255, 0.9)", // Pure white
      "rgba(244, 244, 255, 0.8)", // Soft blueish white
      "rgba(255, 253, 235, 0.75)", // Soft yellowish white
      "rgba(253, 244, 255, 0.8)", // Soft violet white
    ];

    // Colors for shadow mode (intense neon cyan/blue/purple)
    const shadowColors = [
      "rgba(34, 211, 238, 0.95)",  // Neon Cyan
      "rgba(59, 130, 246, 0.9)",   // Royal Blue
      "rgba(168, 85, 247, 0.95)",  // Purple
      "rgba(14, 116, 144, 0.8)",   // Dark Cyan
      "rgba(255, 255, 255, 0.95)", // Brilliant White
    ];

    const getRandomColor = (shadow: boolean) => {
      const arr = shadow ? shadowColors : friendlyColors;
      return arr[Math.floor(Math.random() * arr.length)];
    };

    // Initialize stars in 3D space
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 3000,
        y: (Math.random() - 0.5) * 3000,
        z: Math.random() * 2000,
        size: 0.8 + Math.random() * 1.5,
        color: getRandomColor(isShadowMode),
      });
    }

    // Interactive mouse state
    const mouse = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 to 1 based on screen size
      mouse.targetX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      mouse.targetY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Use ResizeObserver for perfect sizing on layout transitions or container updates
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: entryWidth, height: entryHeight } = entry.contentRect;
        width = canvas.width = entryWidth || window.innerWidth;
        height = canvas.height = entryHeight || window.innerHeight;
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Animation Loop
    const draw = () => {
      // Smoothly interpolate mouse drift for organic motion response
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      // When shadow mode is active, introduce a subtle glitching scanline effect on top of background
      if (isShadowMode) {
        ctx.fillStyle = "rgba(2, 2, 4, 0.18)"; // Faster decay for motion trail speed blur
      } else {
        ctx.fillStyle = "rgba(5, 5, 7, 0.25)"; // Standard dark space clear
      }
      ctx.fillRect(0, 0, width, height);

      // Dynamically adjust operational variables based on active mode
      const speedModifier = isShadowMode ? 32 : 12; // Much faster warp in shadow mode
      const centerOffsetX = mouse.x * (isShadowMode ? 140 : 50); // High sensitivity in shadow mode
      const centerOffsetY = mouse.y * (isShadowMode ? 140 : 50);

      const cx = width / 2 - centerOffsetX;
      const cy = height / 2 - centerOffsetY;

      stars.forEach((star) => {
        // Pre-update depth for tracking previous position (allows beautifully trailing streaks)
        const prevZ = star.z;

        // Move the star closer
        star.z -= speedModifier;

        // Reset stars that went past the screen viewport
        if (star.z <= 0) {
          star.z = 2000;
          star.x = (Math.random() - 0.5) * 3000;
          star.y = (Math.random() - 0.5) * 3000;
          star.size = 0.8 + Math.random() * 1.5;
          star.color = getRandomColor(isShadowMode);
        }

        // Calculate 2D coordinates for current position
        const k = 400; // projection constant
        const px = (star.x / star.z) * k + cx;
        const py = (star.y / star.z) * k + cy;

        // Draw star only if it falls inside screen bounds
        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const size = (1 - star.z / 2000) * star.size * (isShadowMode ? 2.5 : 1.25);

          // Calculate previous position for drawing motion warp lines (trail effect)
          const prevPx = (star.x / prevZ) * k + cx;
          const prevPy = (star.y / prevZ) * k + cy;

          // Shadow Mode intensifies the streak length and adds high-tech glowing trails
          if (isShadowMode) {
            ctx.beginPath();
            ctx.moveTo(prevPx, prevPy);
            ctx.lineTo(px, py);
            ctx.strokeStyle = star.color;
            ctx.lineWidth = size * 1.5;
            ctx.stroke();

            // Add glowing core
            ctx.beginPath();
            ctx.arc(px, py, size * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
          } else {
            // Standard Mode: draw simple organic stars (or minimal elegant lines if moving fast)
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fillStyle = star.color;
            ctx.fill();
          }
        }
      });

      // Subtle atmospheric center glow
      if (isShadowMode) {
        const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, 350);
        gradient.addColorStop(0, "rgba(6, 182, 212, 0.05)");
        gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.02)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();
    };
  }, [isShadowMode]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block pointer-events-none"
      id="generative-starfield-background"
    />
  );
};

import React, { useEffect, useRef } from "react";

interface BinaryMatrixRainProps {
  isActive: boolean;
}

export const BinaryMatrixRain: React.FC<BinaryMatrixRainProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Grid configuration
    const fontSize = 14;
    let columns = Math.floor(width / fontSize);

    // Tracks falling speed & position of each column
    const drops: number[] = [];
    const speeds: number[] = [];

    // Initialize drop positions & speeds
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // start offscreen or scattered
      speeds[i] = 0.8 + Math.random() * 1.5; // randomized falling speed
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      const newColumns = Math.floor(width / fontSize);
      
      // Sync size of drops array
      while (drops.length < newColumns) {
        drops.push(Math.random() * -100);
        speeds.push(0.8 + Math.random() * 1.5);
      }
      columns = newColumns;
    };

    window.addEventListener("resize", handleResize);

    const draw = () => {
      // Semi-transparent black background overlay to create trailing fade effect
      ctx.fillStyle = "rgba(2, 2, 4, 0.06)";
      ctx.fillRect(0, 0, width, height);

      ctx.font = `bold ${fontSize}px "JetBrains Mono", "Fira Code", monospace`;

      for (let i = 0; i < columns; i++) {
        // Random binary digit '0' or '1'
        const text = Math.random() > 0.5 ? "1" : "0";
        
        // Randomize character color occasionally for tech glitch highlights (cyan sparkle / dark blue-teal)
        const isHighlight = Math.random() > 0.985;
        if (isHighlight) {
          ctx.fillStyle = "rgba(165, 243, 252, 0.95)"; // Brighter neon cyan sparkle
        } else {
          // Standard tactical glowing cyan/blue-grey tones of Shadow mode
          const r = 6;
          const g = Math.floor(130 + Math.random() * 80); // 130 - 210
          const b = Math.floor(200 + Math.random() * 55); // 200 - 255
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.random() * 0.35 + 0.15})`;
        }

        // x-coordinate of the column, y-coordinate of the drop
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(text, x, y);

        // Update drop position using its specific speed
        drops[i] += speeds[i];

        // Reset drop back to top with randomized position & speed when it leaves viewport
        if (y > height && Math.random() > 0.975) {
          drops[i] = Math.random() * -10;
          speeds[i] = 0.8 + Math.random() * 1.5;
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block pointer-events-none opacity-[0.22] mix-blend-screen"
    />
  );
};

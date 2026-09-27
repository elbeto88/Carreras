import React, { useEffect, useRef } from 'react';
import { CarState, LevelConfig } from '../types';

interface MiniMapProps {
  player: CarState;
  opponents: CarState[];
  level: LevelConfig;
}

export const MiniMap: React.FC<MiniMapProps> = ({ player, opponents, level }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Coordinate mapping parameters
    const straight = level.straightLength;
    const radius = level.curveRadius;
    const worldTotalX = radius * 2 + 25;
    const worldTotalZ = straight + radius * 2 + 25;

    // Scale so it fits in canvas
    const scale = Math.min((width - 24) / worldTotalX, (height - 24) / worldTotalZ);
    const centerX = width / 2;
    const centerY = height / 2;

    const toCanvasX = (worldX: number) => centerX + worldX * scale;
    const toCanvasY = (worldZ: number) => centerY - worldZ * scale;

    // 1. Draw Oval Track Roadway
    ctx.lineWidth = Math.max(8, level.trackWidth * scale);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b'; // dark asphalt

    ctx.beginPath();
    // Straight 1: Right (x = +radius, z from -straight/2 to +straight/2)
    ctx.moveTo(toCanvasX(radius), toCanvasY(-straight / 2));
    ctx.lineTo(toCanvasX(radius), toCanvasY(straight / 2));

    // North Semicircle (from x = radius to x = -radius around (0, straight/2))
    ctx.arc(toCanvasX(0), toCanvasY(straight / 2), radius * scale, 0, Math.PI, true);

    // Straight 2: Left (x = -radius, z from straight/2 to -straight/2)
    ctx.lineTo(toCanvasX(-radius), toCanvasY(-straight / 2));

    // South Semicircle (from x = -radius to x = radius around (0, -straight/2))
    ctx.arc(toCanvasX(0), toCanvasY(-straight / 2), radius * scale, Math.PI, 0, true);

    ctx.closePath();
    ctx.stroke();

    // 2. Track inner border accent
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    // 3. Start / Finish line
    const finishStartX = toCanvasX(radius - level.trackWidth / 2);
    const finishEndX = toCanvasX(radius + level.trackWidth / 2);
    const finishY = toCanvasY(0);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(finishStartX, finishY);
    ctx.lineTo(finishEndX, finishY);
    ctx.stroke();

    // 4. Draw Opponents (Red/Orange dots)
    opponents.forEach((opp) => {
      const ox = toCanvasX(opp.x);
      const oy = toCanvasY(opp.z);

      ctx.fillStyle = opp.color || '#ef4444';
      ctx.beginPath();
      ctx.arc(ox, oy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 5. Draw Player (Bright Cyan pulsing dot with heading pointer)
    const px = toCanvasX(player.x);
    const py = toCanvasY(player.z);

    // Pulse aura
    ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();

    // Player car dot
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Direction indicator
    const dirLength = 9;
    const forwardX = Math.sin(player.rotationY);
    const forwardZ = Math.cos(player.rotationY);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + forwardX * dirLength, py - forwardZ * dirLength);
    ctx.stroke();
  }, [player.x, player.z, player.rotationY, opponents, level]);

  return (
    <div
      id="race-minimap-panel"
      className="bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/70 shadow-lg flex flex-col items-center"
    >
      <div className="text-[10px] font-racing text-slate-400 font-bold uppercase tracking-wider mb-0.5">
        ÓVALO 3D
      </div>
      <canvas
        ref={canvasRef}
        width={100}
        height={130}
        className="w-[85px] h-[110px] sm:w-[100px] sm:h-[130px]"
      />
    </div>
  );
};

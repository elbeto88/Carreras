import React from 'react';
import { Volume2, VolumeX, Pause, Play, RotateCcw, Crosshair, Users } from 'lucide-react';
import { CarState, LevelConfig } from '../types';
import { MiniMap } from './MiniMap';
import { QuickTauntsBar } from './QuickTauntsBar';

interface HUDProps {
  player: CarState;
  opponents: CarState[];
  level: LevelConfig;
  position: number;
  totalRacers: number;
  countdown: number | null; // 3, 2, 1, 0 (GO), null (racing)
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  lapBanner: string | null;
  rivalsHitCount: number;
  shootCooldown: number;
  isMultiplayer?: boolean;
  roomCode?: string;
  onSendTaunt?: (emoji: string) => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  opponents,
  level,
  position,
  totalRacers,
  countdown,
  isMuted,
  isPaused,
  onToggleMute,
  onTogglePause,
  onRestart,
  lapBanner,
  rivalsHitCount,
  shootCooldown: _shootCooldown,
  isMultiplayer = false,
  roomCode,
  onSendTaunt,
}) => {
  const speedKmh = Math.max(0, Math.round(Math.abs(player.speed) * 3.6));

  const getPositionSuffix = (pos: number) => {
    return `${pos}º`;
  };

  return (
    <div id="game-hud-overlay" className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-2 sm:p-4">
      {/* Top Header Row */}
      <div className="flex justify-between items-start w-full max-w-6xl mx-auto gap-2">
        {/* Left: Lap Counter, Position & Multiplayer Tag */}
        <div className="flex items-center gap-2">
          {/* Position Badge */}
          <div
            id="hud-position-badge"
            className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-slate-700/80 shadow-lg flex flex-col items-center"
          >
            <span className="text-[10px] sm:text-xs font-racing font-bold text-slate-400 uppercase tracking-widest leading-none">
              POSICIÓN
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-2xl sm:text-3xl font-racing font-extrabold leading-none ${
                  position === 1
                    ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                    : position === 2
                    ? 'text-slate-200'
                    : 'text-amber-600'
                }`}
              >
                {getPositionSuffix(position)}
              </span>
              <span className="text-xs sm:text-sm font-racing text-slate-400">/{totalRacers}</span>
            </div>
          </div>

          {/* Lap Counter (Always out of 4) */}
          <div
            id="hud-lap-badge"
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl backdrop-blur-md border shadow-lg flex flex-col items-center transition-all ${
              player.currentLap === 4
                ? 'bg-rose-950/80 border-rose-500 animate-pulse text-rose-300'
                : 'bg-slate-900/85 border-slate-700/80 text-white'
            }`}
          >
            <span className="text-[10px] sm:text-xs font-racing font-bold uppercase tracking-widest leading-none text-slate-400">
              VUELTA
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-racing font-extrabold text-cyan-400 leading-none">
                {Math.min(4, player.currentLap)}
              </span>
              <span className="text-xs sm:text-sm font-racing text-slate-400 font-bold">/ 4</span>
            </div>
          </div>

          {/* Multiplayer Live Tag */}
          {isMultiplayer && (
            <div className="hidden sm:flex items-center gap-1.5 bg-cyan-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-cyan-500/50 text-cyan-300 text-xs font-racing font-bold">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>SALA #{roomCode}</span>
            </div>
          )}

          {/* Rivals Hit Combat Counter */}
          {rivalsHitCount > 0 && (
            <div
              id="hud-combat-counter"
              className="hidden sm:flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-red-500/40 text-red-400"
            >
              <Crosshair className="w-4 h-4 text-red-400 animate-spin" />
              <span className="text-xs font-racing font-bold">BLANCOS: {rivalsHitCount}</span>
            </div>
          )}
        </div>

        {/* Right: Quick Settings & MiniMap */}
        <div className="flex items-start gap-2">
          {/* Action Buttons */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/70">
            <button
              id="btn-toggle-sound"
              onClick={onToggleMute}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95"
              aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {!isMultiplayer && (
              <button
                id="btn-toggle-pause"
                onClick={onTogglePause}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95"
                aria-label={isPaused ? 'Reanudar' : 'Pausar'}
              >
                {isPaused ? <Play className="w-4 h-4 text-amber-400" /> : <Pause className="w-4 h-4" />}
              </button>
            )}

            {!isMultiplayer && (
              <button
                id="btn-restart-race"
                onClick={onRestart}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95"
                aria-label="Reiniciar nivel"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mini-map */}
          <MiniMap player={player} opponents={opponents} level={level} />
        </div>
      </div>

      {/* Center: Lap Alerts & Countdown Banner */}
      <div className="flex flex-col items-center justify-center pointer-events-none">
        {countdown !== null && (
          <div className="bg-slate-950/80 backdrop-blur-md px-8 py-4 rounded-3xl border-2 border-amber-400/80 shadow-2xl shadow-amber-500/20 text-center animate-bounce">
            <div className="text-5xl sm:text-7xl font-racing font-black text-amber-400 tracking-wider">
              {countdown === 0 ? '¡YA!' : countdown}
            </div>
            <div className="text-xs sm:text-sm font-racing text-slate-300 tracking-widest mt-1">
              {countdown === 0 ? '¡ARRANCA A TODA VELOCIDAD!' : 'PREPÁRATE...'}
            </div>
          </div>
        )}

        {lapBanner && (
          <div className="bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white px-6 py-2 sm:px-8 sm:py-3 rounded-2xl shadow-2xl font-racing font-black text-xl sm:text-3xl uppercase tracking-widest border-2 border-white/80 animate-pulse mt-4">
            {lapBanner}
          </div>
        )}

        {player.spinOutTimer > 0 && (
          <div className="bg-red-600/90 text-white px-5 py-2 rounded-xl font-racing font-bold text-sm sm:text-base border border-white/60 animate-shake mt-2">
            ⚠️ ¡IMPACTADO! PERDIENDO CONTROL
          </div>
        )}
      </div>

      {/* Speedometer & Taunts Center-Bottom */}
      <div className="w-full max-w-xs mx-auto mb-20 sm:mb-24 flex flex-col items-center gap-2">
        {/* Quick Taunts Bar for Multiplayer */}
        {isMultiplayer && onSendTaunt && (
          <QuickTauntsBar onSendTaunt={onSendTaunt} />
        )}

        {/* Speedometer */}
        <div
          id="hud-speedometer"
          className="bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/80 shadow-xl flex items-center gap-3"
        >
          {/* Digital Speed reading */}
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-racing font-black text-white tabular-nums tracking-tight">
                {speedKmh}
              </span>
              <span className="text-xs font-racing font-bold text-cyan-400">KM/H</span>
            </div>
          </div>

          {/* Jump / Air State */}
          <div className="flex flex-col items-center border-l border-slate-700 pl-3">
            <span className="text-[10px] font-racing text-slate-400 uppercase tracking-wider">ESTADO</span>
            <span
              className={`text-xs font-racing font-bold mt-0.5 ${
                !player.isGrounded ? 'text-cyan-400 animate-bounce' : 'text-emerald-400'
              }`}
            >
              {!player.isGrounded ? '🦘 EN EL AIRE' : 'EN PISTA'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

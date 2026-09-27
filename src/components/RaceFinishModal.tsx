import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, RotateCcw, ArrowRight, Flag, Crosshair, Users, LogOut } from 'lucide-react';
import { LevelConfig } from '../types';

interface MultiplayerResult {
  playerId: string;
  name: string;
  color: string;
  finishPosition: number;
  finishTime: number;
}

interface RaceFinishModalProps {
  position: number;
  totalRacers: number;
  totalTime: number;
  rivalsHit: number;
  level: LevelConfig;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onRetry: () => void;
  onSelectLevel: () => void;
  isMultiplayer?: boolean;
  multiplayerResults?: MultiplayerResult[];
  myPlayerId?: string;
  isHost?: boolean;
  onReturnToLobby?: () => void;
  onLeaveMultiplayer?: () => void;
}

export const RaceFinishModal: React.FC<RaceFinishModalProps> = ({
  position,
  totalRacers,
  totalTime,
  rivalsHit,
  level,
  hasNextLevel,
  onNextLevel,
  onRetry,
  onSelectLevel,
  isMultiplayer = false,
  multiplayerResults = [],
  myPlayerId,
  isHost = false,
  onReturnToLobby,
  onLeaveMultiplayer,
}) => {
  const isWinner = position === 1;

  useEffect(() => {
    if (isWinner) {
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {}
    }
  }, [isWinner]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${Number(secs) < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      id="race-finish-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-racing"
    >
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl text-white">
        {/* Trophy / Medal Icon */}
        <div className="flex justify-center mb-3">
          {isWinner ? (
            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/30 animate-bounce">
              <Trophy className="w-10 h-10 fill-current" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-slate-300 shadow-lg">
              <Award className="w-10 h-10" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-3xl sm:text-4xl font-racing font-black uppercase tracking-wide">
          {isWinner ? '¡VICTORIA TOTAL!' : '¡CARRERA FINALIZADA!'}
        </h2>
        <p className="text-slate-400 font-racing text-sm mt-1">
          {isWinner
            ? '¡Has dominado las 4 vueltas de la pista ovalada en 1º lugar!'
            : `Terminaste en ${position}º posición de ${totalRacers} corredores.`}
        </p>

        {/* Level Name */}
        <div className="mt-4 py-1.5 px-3 bg-slate-800/80 rounded-xl border border-slate-700 inline-block font-racing text-xs text-amber-400 font-semibold uppercase tracking-wider">
          {level.name} - 4 Vueltas
        </div>

        {/* Multiplayer Leaderboard Podium */}
        {isMultiplayer && multiplayerResults.length > 0 ? (
          <div className="my-5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-left">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Users className="w-3.5 h-3.5" /> Podio Multijugador
              </span>
              <span>4 Vueltas Completadas</span>
            </div>

            <div className="space-y-1.5">
              {multiplayerResults.map((res) => {
                const isMe = res.playerId === myPlayerId;
                return (
                  <div
                    key={res.playerId}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
                      res.finishPosition === 1
                        ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                        : isMe
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 font-black text-sm text-center">
                        {res.finishPosition === 1
                          ? '🥇'
                          : res.finishPosition === 2
                          ? '🥈'
                          : res.finishPosition === 3
                          ? '🥉'
                          : `${res.finishPosition}º`}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: res.color }}
                      />
                      <span className="font-bold text-sm">
                        {res.name} {isMe && '(Tú)'}
                      </span>
                    </div>

                    <span className="text-xs font-mono font-bold text-slate-400">
                      {formatTime(res.finishTime)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Stats Grid for Solo Mode */
          <div className="grid grid-cols-2 gap-3 my-5">
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 flex flex-col items-center">
              <span className="text-[11px] font-racing text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-cyan-400" /> Vueltas
              </span>
              <span className="text-xl font-racing font-black text-cyan-400 mt-0.5">4 / 4</span>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 flex flex-col items-center">
              <span className="text-[11px] font-racing text-slate-400 uppercase tracking-wider">Tiempo Total</span>
              <span className="text-xl font-racing font-black text-white mt-0.5">{formatTime(totalTime)}</span>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 flex flex-col items-center col-span-2">
              <span className="text-[11px] font-racing text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5 text-rose-400" /> Rivales Impactados con Cañones
              </span>
              <span className="text-xl font-racing font-black text-rose-400 mt-0.5">{rivalsHit}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 mt-4">
          {isMultiplayer ? (
            <>
              {isHost ? (
                <button
                  id="btn-multiplayer-lobby"
                  onClick={onReturnToLobby}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 font-racing font-extrabold text-base tracking-wider shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" /> CORRER OTRA VEZ (LOBBY)
                </button>
              ) : (
                <button
                  id="btn-multiplayer-wait"
                  onClick={onReturnToLobby}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-racing font-extrabold text-base tracking-wider shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  VOLVER A LA SALA
                </button>
              )}

              <button
                id="btn-multiplayer-leave"
                onClick={onLeaveMultiplayer}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-racing font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> SALIR DEL MULTIJUGADOR
              </button>
            </>
          ) : (
            <>
              {isWinner && hasNextLevel ? (
                <button
                  id="btn-next-level"
                  onClick={onNextLevel}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 text-slate-950 font-racing font-extrabold text-base tracking-wider shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  SIGUIENTE NIVEL <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  id="btn-retry-race"
                  onClick={onRetry}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-racing font-extrabold text-base tracking-wider shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" /> REINTENTAR NIVEL
                </button>
              )}

              <div className="flex gap-2">
                <button
                  id="btn-modal-replay"
                  onClick={onRetry}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-racing font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Repetir
                </button>
                <button
                  id="btn-modal-select-level"
                  onClick={onSelectLevel}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-racing font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Elegir Nivel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

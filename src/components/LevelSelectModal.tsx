import React from 'react';
import { Play, Sparkles, Flag, Volume2, Shield, Crosshair, ArrowUpCircle, X } from 'lucide-react';
import { LevelConfig } from '../types';
import { GAME_LEVELS } from '../game/trackGenerator';

interface LevelSelectModalProps {
  currentLevelId: number;
  onSelectLevel: (level: LevelConfig) => void;
  playerColor: string;
  onSelectColor: (colorHex: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const CAR_COLORS = [
  { name: 'Rojo Ferrari', hex: '#ef4444' },
  { name: 'Azul Eléctrico', hex: '#06b6d4' },
  { name: 'Verde Neón', hex: '#10b981' },
  { name: 'Naranja Fuego', hex: '#f97316' },
  { name: 'Púrpura Rayo', hex: '#a855f7' },
  { name: 'Oro Nitro', hex: '#eab308' },
];

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevelId,
  onSelectLevel,
  playerColor,
  onSelectColor,
  onClose,
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="level-select-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto"
    >
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-7 max-w-2xl w-full text-white shadow-2xl relative my-auto">
        {/* Close Button */}
        <button
          id="btn-close-level-modal"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-amber-400 text-xs font-racing font-bold uppercase tracking-wider mb-2">
            <Flag className="w-3.5 h-3.5" /> 4 Vueltas por Nivel • Pistas Ovaladas
          </div>
          <h2 className="text-2xl sm:text-3xl font-racing font-black uppercase tracking-wide">
            CARRERAS 3D OVAL
          </h2>
          <p className="text-slate-400 font-racing text-xs sm:text-sm mt-1 max-w-md mx-auto">
            Acelera, salta rampas con tu carro y dispara cohetes a los contrincantes para liderar la carrera.
          </p>
        </div>

        {/* Car Color Selection */}
        <div className="mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/80">
          <span className="text-xs font-racing font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
            Personalizar Color del Carro:
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {CAR_COLORS.map((c) => (
              <button
                key={c.hex}
                id={`btn-color-${c.hex.replace('#', '')}`}
                onClick={() => onSelectColor(c.hex)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-racing font-semibold transition-all ${
                  playerColor.toLowerCase() === c.hex.toLowerCase()
                    ? 'border-white bg-slate-700 text-white shadow-md scale-105'
                    : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-white/40 shadow-inner"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Levels Grid */}
        <div className="space-y-3 mb-6">
          <span className="text-xs font-racing font-bold text-slate-300 uppercase tracking-wider block">
            Seleccionar Circuito Ovalado:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GAME_LEVELS.map((lvl) => {
              const isSelected = lvl.id === currentLevelId;
              return (
                <div
                  key={lvl.id}
                  id={`level-card-${lvl.id}`}
                  onClick={() => {
                    onSelectLevel(lvl);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                      : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-racing font-bold text-sm text-white">{lvl.name}</h3>
                      <span className="text-[10px] font-racing bg-slate-900 px-2 py-0.5 rounded-md text-cyan-400 border border-slate-700 font-bold">
                        4 VUELTAS
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs line-clamp-2 mt-0.5">{lvl.description}</p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/60 text-[11px] font-racing text-slate-400">
                    <span>Rivales: {lvl.opponentsCount}</span>
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      {isSelected ? '✓ Seleccionado' : 'Jugar este nivel →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gameplay Controls Reference */}
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-xs font-racing text-slate-300 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-cyan-400" />
            <span>
              <strong>Salto:</strong> Botón Salto o Barra Espaciadora
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-rose-400" />
            <span>
              <strong>Disparo:</strong> Botón Cohetes o tecla F/J
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              <strong>Conducción:</strong> Botones táctiles o Flechas/WASD
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

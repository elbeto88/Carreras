import React from 'react';

export interface CarLabelData {
  id: string;
  name: string;
  color: string;
  screenX: number;
  screenY: number;
  visible: boolean;
  currentLap: number;
  taunt?: { emoji: string; text?: string };
}

interface CarLabelsOverlayProps {
  labels: CarLabelData[];
}

export const CarLabelsOverlay: React.FC<CarLabelsOverlayProps> = ({ labels }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {labels.map((lbl) => {
        if (!lbl.visible) return null;

        return (
          <div
            key={lbl.id}
            className="absolute transform -translate-x-1/2 -translate-y-full transition-transform duration-75 flex flex-col items-center gap-1 select-none"
            style={{
              left: `${lbl.screenX}px`,
              top: `${lbl.screenY}px`,
            }}
          >
            {/* Taunt Emoji Bubble */}
            {lbl.taunt && (
              <div className="animate-bounce bg-slate-900/90 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/60 shadow-lg text-xs font-bold flex items-center gap-1">
                <span className="text-base">{lbl.taunt.emoji}</span>
                {lbl.taunt.text && <span className="text-[11px] text-white">{lbl.taunt.text}</span>}
              </div>
            )}

            {/* Racer Name & Lap Pill */}
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-sm border shadow-md"
              style={{ borderColor: lbl.color }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: lbl.color }}
              />
              <span className="text-[11px] font-racing font-bold text-white tracking-wider max-w-[90px] truncate">
                {lbl.name}
              </span>
              <span className="text-[9px] font-racing font-black px-1 rounded bg-slate-800 text-amber-400">
                V{lbl.currentLap}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React from 'react';

interface QuickTauntsBarProps {
  onSendTaunt: (emoji: string) => void;
}

const TAUNT_EMOJIS = ['🚀', '🔥', '💨', '💥', '😎', '🏁'];

export const QuickTauntsBar: React.FC<QuickTauntsBarProps> = ({ onSendTaunt }) => {
  return (
    <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-slate-700/80 shadow-lg pointer-events-auto">
      {TAUNT_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSendTaunt(emoji)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 active:scale-125 transition-transform text-base"
          title={`Enviar ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

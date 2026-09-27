import React, { useState } from 'react';
import { MultiplayerRoom, MultiplayerPlayer, ChatMessage } from '../types';
import { multiplayerService } from '../services/multiplayerSocket';
import { GAME_LEVELS } from '../game/trackGenerator';
import {
  Users,
  Crown,
  CheckCircle2,
  Clock,
  Send,
  Copy,
  Check,
  LogOut,
  Play,
  Share2,
} from 'lucide-react';

interface LobbyRoomModalProps {
  room: MultiplayerRoom;
  myPlayerId: string;
  onLeaveRoom: () => void;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
}

const QUICK_CHAT_MESSAGES = [
  '🏎️ ¡Listo para correr!',
  '🔥 ¡Que gane el mejor!',
  '💥 ¡Cuidado con mis disparos!',
  '🏁 ¡A por las 4 vueltas!',
  '👋 ¡Hola a todos!',
];

export const LobbyRoomModal: React.FC<LobbyRoomModalProps> = ({
  room,
  myPlayerId,
  onLeaveRoom,
  chatMessages,
  onSendChat,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const me = room.players[myPlayerId];
  const isHost = me?.isHost || false;
  const currentLevel = GAME_LEVELS.find((l) => l.id === room.levelId) || GAME_LEVELS[0];
  const playersList = Object.values(room.players);
  const totalPlayers = playersList.length;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(room.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleToggleReady = () => {
    if (!me) return;
    multiplayerService.setReady(!me.isReady);
  };

  const handleStartRace = () => {
    if (!isHost) return;
    multiplayerService.startRace();
  };

  const handleChangeLevel = (levelId: number) => {
    if (!isHost) return;
    multiplayerService.setLevel(levelId);
  };

  const handleSendChatForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md font-racing">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/50 overflow-hidden text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-cyan-950/60 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide text-cyan-300">
                  {room.name}
                </h2>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-cyan-500/50">
                  <span className="text-xs font-mono font-black text-cyan-400">#{room.id}</span>
                  <button
                    onClick={handleCopyCode}
                    className="p-0.5 text-slate-400 hover:text-white transition-colors"
                    title="Copiar código"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                {totalPlayers} de {room.maxPlayers} corredores en la sala
              </p>
            </div>
          </div>

          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-bold transition-all active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>

        {/* Room Body Grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Column: Circuit & Players */}
          <div className="md:col-span-7 space-y-4">
            {/* Track Selector / Banner */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Circuito Ovalado (4 Vueltas)
                </span>
                <span className="text-[11px] font-bold text-amber-400">
                  4 Vueltas para Ganar
                </span>
              </div>

              {isHost ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {GAME_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => handleChangeLevel(lvl.id)}
                      className={`p-2 rounded-lg border text-left text-xs font-bold transition-all ${
                        room.levelId === lvl.id
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div>{lvl.name}</div>
                      <div className="text-[10px] text-slate-400 font-sans font-normal truncate">
                        {lvl.description}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-cyan-300">{currentLevel.name}</div>
                    <div className="text-xs text-slate-400 font-sans">{currentLevel.description}</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 font-sans">
                    Elegido por anfitrión
                  </span>
                </div>
              )}
            </div>

            {/* Racers List */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Pilotos en la Carrera</span>
                <span className="text-cyan-400 font-bold">{totalPlayers} / {room.maxPlayers}</span>
              </div>

              <div className="space-y-2">
                {playersList.map((player) => (
                  <div
                    key={player.id}
                    className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full ring-2 ring-white/30"
                        style={{ backgroundColor: player.color }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                          <span>{player.name}</span>
                          {player.id === myPlayerId && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900 text-cyan-300">
                              TÚ
                            </span>
                          )}
                          {player.isHost && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-sans">
                              <Crown className="w-3 h-3" /> Anfitrión
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      {player.isReady ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> ¡Listo!
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-slate-400 font-sans bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-700">
                          <Clock className="w-3 h-3" /> Esperando
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty slot indicators */}
                {Array.from({ length: Math.max(0, room.maxPlayers - totalPlayers) }).map((_, idx) => (
                  <div
                    key={`empty_${idx}`}
                    className="p-2.5 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-600 font-sans"
                  >
                    Esperando a otro piloto... (Comparte el código #{room.id})
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live Room Chat & Ready / Start Button */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-3">
            {/* Chat Box */}
            <div className="flex-1 flex flex-col p-3 rounded-xl bg-slate-950/80 border border-slate-800 min-h-[220px]">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Chat de la Sala</span>
                <span className="text-[10px] text-slate-500 font-sans">En vivo</span>
              </div>

              {/* Chat Message feed */}
              <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[170px] pr-1 text-xs font-sans">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-center text-[11px]">
                    Envía un mensaje o emoji a los otros corredores
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="leading-snug break-words">
                      <strong style={{ color: msg.color }} className="font-racing text-[11px] mr-1">
                        {msg.senderName}:
                      </strong>
                      <span className="text-slate-200">{msg.text}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-1 overflow-x-auto py-1 mt-2 no-scrollbar">
                {QUICK_CHAT_MESSAGES.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => onSendChat(preset)}
                    className="shrink-0 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendChatForm} className="mt-1 flex gap-1.5">
                <input
                  type="text"
                  maxLength={60}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Host or Ready Action Buttons */}
            <div className="space-y-2 pt-2">
              {isHost ? (
                <button
                  onClick={handleStartRace}
                  disabled={totalPlayers < 1}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm tracking-widest shadow-lg shadow-emerald-950/60 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" />
                  INICIAR CARRERA (4 VUELTAS)
                </button>
              ) : (
                <button
                  onClick={handleToggleReady}
                  className={`w-full py-3.5 rounded-xl font-black text-sm tracking-widest shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 ${
                    me?.isReady
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/50'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/50'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {me?.isReady ? 'CANCELAR LISTO' : '¡ESTOY LISTO PARA CORRER!'}
                </button>
              )}

              <button
                onClick={handleCopyCode}
                className="w-full py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-sans flex items-center justify-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                {copiedCode ? '¡Código copiado al portapapeles!' : `Invitar amigos (Código #${room.id})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

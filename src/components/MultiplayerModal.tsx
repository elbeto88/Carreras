import React, { useState, useEffect } from 'react';
import { multiplayerService } from '../services/multiplayerSocket';
import { GAME_LEVELS } from '../game/trackGenerator';
import { Users, PlusCircle, LogIn, RefreshCw, X, Trophy, Check, Sparkles } from 'lucide-react';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  playerColor: string;
  onUpdatePlayerColor: (color: string) => void;
}

const CAR_COLORS = [
  { name: 'Rojo Furia', hex: '#ef4444' },
  { name: 'Azul Trueno', hex: '#3b82f6' },
  { name: 'Verde Neón', hex: '#10b981' },
  { name: 'Dorado Élite', hex: '#eab308' },
  { name: 'Púrpura Rayo', hex: '#a855f7' },
  { name: 'Naranja Fuego', hex: '#f97316' },
  { name: 'Cian Turbo', hex: '#06b6d4' },
  { name: 'Rosa Nitro', hex: '#ec4899' },
];

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  playerName,
  onUpdatePlayerName,
  playerColor,
  onUpdatePlayerColor,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'join'>('browse');
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Request room list
    multiplayerService.getRooms();

    const unsubRooms = multiplayerService.on('rooms_list', (roomList) => {
      setRooms(roomList);
      setIsLoading(false);
    });

    const unsubError = multiplayerService.on('error', (err) => {
      setErrorMsg(err);
      setIsLoading(false);
    });

    return () => {
      unsubRooms();
      unsubError();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRefreshRooms = () => {
    setIsLoading(true);
    setErrorMsg(null);
    multiplayerService.getRooms();
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setErrorMsg('Ingresa tu nombre de piloto');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    multiplayerService.createRoom({
      roomName: newRoomName.trim() || `Pista de ${playerName}`,
      playerName: playerName.trim(),
      carColor: playerColor,
      levelId: selectedLevelId,
      maxPlayers,
    });
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) {
      setErrorMsg('Ingresa un código de sala válido');
      return;
    }
    if (!playerName.trim()) {
      setErrorMsg('Ingresa tu nombre de piloto');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    multiplayerService.joinRoom({
      roomId: code,
      playerName: playerName.trim(),
      carColor: playerColor,
    });
  };

  const handleQuickJoinRoom = (roomId: string) => {
    if (!playerName.trim()) {
      setErrorMsg('Ingresa tu nombre de piloto');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    multiplayerService.joinRoom({
      roomId,
      playerName: playerName.trim(),
      carColor: playerColor,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md font-racing">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/50 overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-cyan-950/50 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-cyan-300">
                MULTIJUGADOR ONLINE
              </h2>
              <p className="text-[11px] text-slate-400 font-sans">
                Compite en tiempo real contra amigos y pilotos de todo el mundo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pilot Setup Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Nombre de Piloto
            </label>
            <input
              type="text"
              maxLength={15}
              value={playerName}
              onChange={(e) => onUpdatePlayerName(e.target.value)}
              placeholder="Tu apodo"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Color de tu Auto
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CAR_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onUpdatePlayerColor(c.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    playerColor === c.hex ? 'scale-115 border-white ring-2 ring-cyan-400' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-3 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-colors ${
              activeTab === 'browse'
                ? 'bg-slate-800 text-cyan-300 border-t border-x border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Salas Públicas
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-colors ${
              activeTab === 'create'
                ? 'bg-slate-800 text-cyan-300 border-t border-x border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Crear Sala
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-colors ${
              activeTab === 'join'
                ? 'bg-slate-800 text-cyan-300 border-t border-x border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Unirse con Código
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-sans flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* TAB 1: BROWSE ROOMS */}
          {activeTab === 'browse' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-sans">
                  {rooms.length} sala(s) disponible(s)
                </span>
                <button
                  onClick={handleRefreshRooms}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans transition-colors active:scale-95"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
              </div>

              {rooms.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
                  <Trophy className="w-12 h-12 text-slate-600 mb-2 stroke-[1.5]" />
                  <p className="text-sm font-bold text-slate-300">No hay salas abiertas en este momento</p>
                  <p className="text-xs text-slate-500 font-sans mt-1">¡Crea tu propia sala e invita a tus amigos!</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wider shadow-lg shadow-cyan-900/40 active:scale-95 transition-all"
                  >
                    CREAR SALA AHORA
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {rooms.map((r) => {
                    const level = GAME_LEVELS.find((l) => l.id === r.levelId) || GAME_LEVELS[0];
                    const isFull = r.playerCount >= r.maxPlayers;
                    const isRacing = r.state === 'racing';

                    return (
                      <div
                        key={r.id}
                        className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-cyan-500/50 flex flex-col justify-between transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-white truncate max-w-[140px]">
                              {r.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 text-cyan-400 border border-cyan-800">
                              #{r.id}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 font-sans mt-1 flex items-center justify-between">
                            <span>Circuito: <strong className="text-slate-200">{level.name}</strong></span>
                            <span className="text-amber-400 font-bold">4 Vueltas</span>
                          </div>

                          <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                            Anfitrión: <span className="text-slate-300">{r.hostName}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-700/60">
                          <span className="text-xs font-bold text-slate-300">
                            🏎️ {r.playerCount} / {r.maxPlayers}
                          </span>

                          <button
                            onClick={() => handleQuickJoinRoom(r.id)}
                            disabled={isFull || isRacing}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isRacing
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : isFull
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow active:scale-95'
                            }`}
                          >
                            {isRacing ? 'En Carrera' : isFull ? 'Completa' : 'UNIRSE'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE ROOM */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Nombre de la Sala
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder={`Sala de ${playerName || 'Carreras'}`}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Circuito Ovalado (4 Vueltas)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GAME_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setSelectedLevelId(lvl.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedLevelId === lvl.id
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-md ring-1 ring-cyan-400'
                          : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>{lvl.name}</span>
                        {selectedLevelId === lvl.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5 line-clamp-1">
                        {lvl.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Máximo de Pilotos
                </label>
                <div className="flex gap-2">
                  {[2, 3, 4, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxPlayers(num)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        maxPlayers === num
                          ? 'bg-cyan-600 border-cyan-400 text-white shadow'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {num} Pilotos
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-black text-sm tracking-wider shadow-lg shadow-cyan-950/60 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                CREAR SALA Y ABRIR LOBBY
              </button>
            </form>
          )}

          {/* TAB 3: JOIN BY CODE */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinByCode} className="space-y-4 max-w-sm mx-auto py-4">
              <div className="text-center">
                <p className="text-xs text-slate-400 font-sans">
                  Pide el código de 4 caracteres al anfitrión de la sala e ingrésalo a continuación:
                </p>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="EJ: 4A8K"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-slate-700 text-center text-2xl font-mono font-black tracking-widest text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-black text-sm tracking-wider shadow-lg shadow-cyan-950/60 active:scale-98 transition-all"
              >
                CONECTAR A LA SALA
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

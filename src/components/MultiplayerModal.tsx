import React, { useState, useEffect } from 'react';
import {
  multiplayerService,
  SocketStatus,
  isHostedOnVercelOrStatic,
  getEffectiveWsUrl,
} from '../services/multiplayerSocket';
import { GAME_LEVELS } from '../game/trackGenerator';
import {
  Users,
  PlusCircle,
  LogIn,
  RefreshCw,
  X,
  Trophy,
  Check,
  Sparkles,
  Server,
  AlertTriangle,
  Bot,
  ExternalLink,
  Wifi,
  WifiOff,
  Copy,
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'join' | 'server'>('browse');
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Server state & testing
  const [socketStatus, setSocketStatus] = useState<SocketStatus>(multiplayerService.getStatus());
  const [customServerInput, setCustomServerInput] = useState('');
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  const isVercel = isHostedOnVercelOrStatic();

  useEffect(() => {
    if (!isOpen) return;

    setSocketStatus(multiplayerService.getStatus());
    const saved = localStorage.getItem('carreras_custom_ws_url') || '';
    setCustomServerInput(saved);

    // Request room list if connected
    if (multiplayerService.getStatus() === 'connected') {
      multiplayerService.getRooms();
    }

    const unsubStatus = multiplayerService.on('status_change', (status: SocketStatus) => {
      setSocketStatus(status);
      if (status === 'connected') {
        multiplayerService.getRooms();
        setErrorMsg(null);
      }
    });

    const unsubRooms = multiplayerService.on('rooms_list', (roomList) => {
      setRooms(roomList);
      setIsLoading(false);
    });

    const unsubError = multiplayerService.on('error', (err) => {
      setErrorMsg(err);
      setIsLoading(false);
    });

    return () => {
      unsubStatus();
      unsubRooms();
      unsubError();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRefreshRooms = () => {
    setIsLoading(true);
    setErrorMsg(null);
    if (socketStatus !== 'connected') {
      multiplayerService.connect();
      setTimeout(() => setIsLoading(false), 2000);
      return;
    }
    multiplayerService.getRooms();
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setErrorMsg('Ingresa tu nombre de piloto');
      return;
    }

    if (socketStatus !== 'connected') {
      setErrorMsg(
        '⚠️ No hay conexión con el servidor WebSocket. En Vercel necesitas conectar un backend Node.js (ej: Render/Railway) o probar la Sala Simulada con Bots.'
      );
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

  const handleCreateSimulatedRoom = () => {
    if (!playerName.trim()) {
      setErrorMsg('Ingresa tu nombre de piloto');
      return;
    }
    setErrorMsg(null);
    multiplayerService.createSimulatedRoom({
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

    if (socketStatus !== 'connected') {
      setErrorMsg('⚠️ No hay conexión con el servidor WebSocket.');
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

    if (socketStatus !== 'connected') {
      setErrorMsg('⚠️ Sin conexión al servidor.');
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

  const handleTestCustomServer = async () => {
    const target = customServerInput.trim() || multiplayerService.getActiveUrl();
    setIsTestingServer(true);
    setTestResult(null);
    const result = await multiplayerService.testConnection(target);
    setIsTestingServer(false);
    setTestResult(result);
  };

  const handleSaveCustomServer = () => {
    multiplayerService.setCustomServerUrl(customServerInput.trim() || null);
    setTestResult(null);
  };

  const handleResetDefaultServer = () => {
    setCustomServerInput('');
    multiplayerService.setCustomServerUrl(null);
    setTestResult(null);
  };

  const activeWsInfo = getEffectiveWsUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md font-racing">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/50 overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-900 via-cyan-950/50 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide text-cyan-300">
                  MULTIJUGADOR ONLINE
                </h2>
                {/* Connection Status Pill */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold border ${
                    socketStatus === 'connected'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                      : socketStatus === 'connecting'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                      : 'bg-red-950/80 text-red-300 border-red-500/50'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      socketStatus === 'connected'
                        ? 'bg-emerald-400 animate-pulse'
                        : socketStatus === 'connecting'
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-red-400'
                    }`}
                  />
                  {socketStatus === 'connected'
                    ? 'Conectado'
                    : socketStatus === 'connecting'
                    ? 'Conectando...'
                    : 'Desconectado'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Carreras en tiempo real en pistas ovaladas de 4 vueltas
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

        {/* Vercel / Disconnected Alert Banner */}
        {socketStatus !== 'connected' && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/40 font-sans text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200">
                  {isVercel
                    ? 'Servidor WebSocket no disponible en Vercel (Hosting Estático)'
                    : 'Sin conexión con el servidor WebSocket'}
                </p>
                <p className="text-[11px] text-slate-300">
                  {isVercel
                    ? 'Vercel es Serverless y no ejecuta servidores Node.js con WebSockets continuos.'
                    : 'Verifica tu conexión a internet o la URL del backend.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleCreateSimulatedRoom}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-racing font-bold text-[10px] tracking-wider flex items-center gap-1 transition-all active:scale-95"
                title="Crea una sala de prueba con bots IA"
              >
                <Bot className="w-3 h-3" />
                <span>PROBAR CON BOTS</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('server')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
              >
                <Server className="w-3 h-3" />
                <span>SOLUCIÓN</span>
              </button>
            </div>
          </div>
        )}

        {/* Pilot Setup Bar */}
        <div className="p-3.5 bg-slate-950/60 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-3 pt-2 gap-1.5 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-colors shrink-0 ${
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
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-colors shrink-0 ${
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
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-colors shrink-0 ${
              activeTab === 'join'
                ? 'bg-slate-800 text-cyan-300 border-t border-x border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Unirse con Código
          </button>
          <button
            onClick={() => setActiveTab('server')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-colors shrink-0 ml-auto ${
              activeTab === 'server'
                ? 'bg-slate-800 text-emerald-300 border-t border-x border-emerald-500/30'
                : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Servidor / Vercel
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-sans flex items-start justify-between gap-2">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white shrink-0">
              ✕
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
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
                <div className="py-10 flex flex-col items-center justify-center text-center text-slate-400">
                  <Trophy className="w-12 h-12 text-slate-600 mb-2 stroke-[1.5]" />
                  <p className="text-sm font-bold text-slate-300">No hay salas abiertas en este momento</p>
                  <p className="text-xs text-slate-500 font-sans mt-1">¡Crea tu propia sala e invita a tus amigos!</p>

                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => setActiveTab('create')}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wider shadow-lg shadow-cyan-900/40 active:scale-95 transition-all"
                    >
                      CREAR SALA
                    </button>
                    <button
                      onClick={handleCreateSimulatedRoom}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      PROBAR SALA CON BOTS
                    </button>
                  </div>
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
                          <span className="text-[11px] text-slate-300 font-sans">
                            {r.playerCount} / {r.maxPlayers} Pilotos
                          </span>

                          <button
                            onClick={() => handleQuickJoinRoom(r.id)}
                            disabled={isFull || isRacing}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              isFull
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : isRacing
                                ? 'bg-amber-950 text-amber-400 border border-amber-700 cursor-not-allowed'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white active:scale-95'
                            }`}
                          >
                            {isFull ? 'Llena' : isRacing ? 'En Carrera' : 'Unirse'}
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

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-black text-sm tracking-wider shadow-lg shadow-cyan-950/60 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>CREAR SALA ONLINE</span>
                </button>

                {/* Option to create simulated bot room */}
                <button
                  type="button"
                  onClick={handleCreateSimulatedRoom}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <span>PROBAR SALA CON BOTS IA (NO REQUIERE SERVIDOR)</span>
                </button>
              </div>
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

          {/* TAB 4: SERVER CONFIG & VERCEL GUIDE */}
          {activeTab === 'server' && (
            <div className="space-y-4 font-sans text-xs">
              {/* Status card */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold uppercase text-[11px]">
                    Estado de la Conexión WebSocket
                  </span>
                  <div className="flex items-center gap-1.5 font-bold">
                    {socketStatus === 'connected' ? (
                      <>
                        <Wifi className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Activo y Conectado</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">Sin Conexión Activa</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 font-mono bg-slate-900 p-2 rounded border border-slate-800 break-all">
                  <span className="text-cyan-400">URL Activa:</span> {multiplayerService.getActiveUrl() || activeWsInfo.url}
                </div>
              </div>

              {/* Custom Server Input */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                <label className="block text-slate-300 font-bold text-xs">
                  Conectar a Servidor WebSocket Externo
                </label>
                <p className="text-[11px] text-slate-400">
                  Si tu frontend está en Vercel, ingresa aquí la URL de tu backend alojado en Render o Railway (ej: <code className="text-cyan-300">wss://mi-servidor.onrender.com/ws</code>):
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customServerInput}
                    onChange={(e) => setCustomServerInput(e.target.value)}
                    placeholder="wss://tu-backend.onrender.com/ws"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleTestCustomServer}
                    disabled={isTestingServer}
                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-all active:scale-95 shrink-0"
                  >
                    {isTestingServer ? 'Probando...' : 'Probar'}
                  </button>
                </div>

                {/* Test Result Message */}
                {testResult && (
                  <div
                    className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                      testResult.success
                        ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/80 border border-red-500/40 text-red-300'
                    }`}
                  >
                    {testResult.success ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>¡Conexión exitosa! Latencia estimada: {testResult.latencyMs} ms</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{testResult.error || 'Error al conectar'}</span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveCustomServer}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-racing font-bold text-xs tracking-wider transition-all"
                  >
                    GUARDAR Y CONECTAR
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefaultServer}
                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition-all"
                  >
                    Restablecer
                  </button>
                </div>
              </div>

              {/* Why Vercel fails & 2-Minute Solution */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-cyan-300 font-racing font-bold text-xs tracking-wider">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>¿POR QUÉ VERCEL NO GENERA LA SALA Y CÓMO SOLUCIONARLO?</span>
                </div>

                <div className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    <strong className="text-white">Causa:</strong> Vercel es una plataforma <em>Serverless / Estática</em>. Al desplegar en Vercel, solo se compila la parte visual de React en la carpeta <code className="text-cyan-300">dist/</code>. Vercel <strong>NO ejecuta</strong> servidores persistentes de Node.js con conexiones WebSockets continuas (<code className="text-cyan-300">server.ts</code>). Por eso, al intentar crear o buscar salas, no encuentra el servidor.
                  </p>

                  <p>
                    <strong className="text-white">Solución rápida (100% Gratuita en 2 minutos):</strong>
                  </p>

                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-300">
                    <li>
                      Entra a <strong className="text-cyan-300">Render.com</strong> o <strong className="text-cyan-300">Railway.app</strong> y crea una cuenta gratuita.
                    </li>
                    <li>
                      Haz clic en <strong>New &gt; Web Service</strong> y selecciona tu repositorio de GitHub del juego.
                    </li>
                    <li>
                      Configura estos 2 comandos sencillos:
                      <div className="bg-slate-900 p-2 rounded mt-1 font-mono text-[10px] space-y-0.5 border border-slate-800">
                        <div><span className="text-slate-400">Build Command:</span> <code className="text-emerald-400">npm install && npm run build</code></div>
                        <div><span className="text-slate-400">Start Command:</span> <code className="text-emerald-400">npm start</code></div>
                      </div>
                    </li>
                    <li>
                      Copia la URL pública que te dé Render (ejemplo: <code className="text-cyan-300">https://carreras-backend.onrender.com</code>).
                    </li>
                    <li>
                      Pega esa URL aquí arriba en <em>"Conectar a Servidor WebSocket Externo"</em> o en tu proyecto de Vercel agrega la variable:
                      <div className="bg-slate-900 p-1.5 rounded mt-1 font-mono text-[10px] text-emerald-400 border border-slate-800">
                        VITE_WS_URL = wss://tu-servicio.onrender.com/ws
                      </div>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

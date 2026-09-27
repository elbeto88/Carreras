import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameCanvas } from './game/GameCanvas';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { RaceFinishModal } from './components/RaceFinishModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { LobbyRoomModal } from './components/LobbyRoomModal';
import { DownloadRepoModal } from './components/DownloadRepoModal';
import { CarLabelsOverlay, CarLabelData } from './components/CarLabelsOverlay';
import { CarState, LevelConfig, MultiplayerRoom, ChatMessage } from './types';
import { GAME_LEVELS } from './game/trackGenerator';
import { soundManager } from './audio/soundManager';
import { multiplayerService } from './services/multiplayerSocket';
import { Palette, Users, Wifi, Download } from 'lucide-react';

export default function App() {
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(GAME_LEVELS[0]);
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('oval_pilot_name') || `Piloto_${Math.floor(100 + Math.random() * 900)}`;
  });
  const [playerColor, setPlayerColor] = useState<string>('#ef4444');
  const [countdown, setCountdown] = useState<number | null>(3);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState<boolean>(false);
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [lapBanner, setLapBanner] = useState<string | null>(null);
  const [rivalsHitCount, setRivalsHitCount] = useState<number>(0);
  const [shootCooldown, setShootCooldown] = useState<number>(0);

  // Multiplayer Room State
  const [activeRoom, setActiveRoom] = useState<MultiplayerRoom | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('player');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [carLabels, setCarLabels] = useState<CarLabelData[]>([]);

  // Live HUD State
  const [hudData, setHudData] = useState<{
    player: CarState;
    opponents: CarState[];
    position: number;
    totalRacers: number;
    speedKmh: number;
  }>({
    player: {
      id: 'player',
      name: playerName,
      color: playerColor,
      accentColor: '#0f172a',
      isPlayer: true,
      x: 0,
      y: 0,
      z: 0,
      rotationY: 0,
      verticalVelocity: 0,
      isGrounded: true,
      speed: 0,
      angularVelocity: 0,
      spinOutTimer: 0,
      currentLap: 1,
      lapProgress: 0,
      totalDistance: 0,
      finished: false,
      laneOffset: 0,
      aiAggressiveness: 1,
    },
    opponents: [],
    position: 1,
    totalRacers: 4,
    speedKmh: 0,
  });

  // Finish modal state
  const [finishStats, setFinishStats] = useState<{
    finished: boolean;
    position: number;
    totalTime: number;
    rivalsHit: number;
  }>({
    finished: false,
    position: 1,
    totalTime: 0,
    rivalsHit: 0,
  });

  // Save player nickname
  const handleUpdatePlayerName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('oval_pilot_name', name);
  };

  // Input states tracked synchronously in Ref for the 60fps loop
  const inputRef = useRef({
    throttle: 0,
    brake: 0,
    steer: 0,
    jump: false,
    shoot: false,
  });

  // Start Local Countdown Sequence (Solo Mode)
  const startLocalCountdown = useCallback(() => {
    setCountdown(3);
    soundManager.playCountdown(false);

    const timer1 = setTimeout(() => {
      setCountdown(2);
      soundManager.playCountdown(false);
    }, 1000);

    const timer2 = setTimeout(() => {
      setCountdown(1);
      soundManager.playCountdown(false);
    }, 2000);

    const timer3 = setTimeout(() => {
      setCountdown(0); // ¡YA!
      soundManager.playCountdown(true);
    }, 3000);

    const timer4 = setTimeout(() => {
      setCountdown(null);
    }, 3800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  // Initialize countdown on mount or solo level reset
  useEffect(() => {
    if (!activeRoom) {
      const cleanup = startLocalCountdown();
      return cleanup;
    }
  }, [currentLevel, activeRoom, startLocalCountdown]);

  // Check URL query param for ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      multiplayerService.joinRoom({
        roomId: roomParam.toUpperCase(),
        playerName,
        carColor: playerColor,
      });
    }
  }, []);

  // Setup Multiplayer Service Listeners
  useEffect(() => {
    const unsubConnected = multiplayerService.on('connected', (id: string) => {
      setMyPlayerId(id);
    });

    const unsubRoomJoined = multiplayerService.on('room_joined', (room: MultiplayerRoom, id: string) => {
      setActiveRoom(room);
      setMyPlayerId(id || multiplayerService.getPlayerId() || 'player');
      setIsMultiplayerModalOpen(false);

      // Sync room level
      const roomLvl = GAME_LEVELS.find((l) => l.id === room.levelId) || GAME_LEVELS[0];
      setCurrentLevel(roomLvl);

      setFinishStats({ finished: false, position: 1, totalTime: 0, rivalsHit: 0 });
      setLapBanner(null);
    });

    const unsubPlayerJoined = multiplayerService.on('player_joined', (_player, room: MultiplayerRoom) => {
      setActiveRoom({ ...room });
    });

    const unsubPlayerLeft = multiplayerService.on('player_left', (_pId, room: MultiplayerRoom) => {
      setActiveRoom({ ...room });
    });

    const unsubLeftRoom = multiplayerService.on('left_room', () => {
      setActiveRoom(null);
      setChatMessages([]);
      setCarLabels([]);
      startLocalCountdown();
    });

    const unsubReadyChanged = multiplayerService.on('player_ready_changed', (_pId, _ready, room: MultiplayerRoom) => {
      setActiveRoom({ ...room });
    });

    const unsubLevelChanged = multiplayerService.on('level_changed', (levelId: number) => {
      const lvl = GAME_LEVELS.find((l) => l.id === levelId) || GAME_LEVELS[0];
      setCurrentLevel(lvl);
      if (activeRoom) {
        setActiveRoom((prev) => (prev ? { ...prev, levelId } : null));
      }
    });

    const unsubCountdown = multiplayerService.on('race_countdown', (val: number, room: MultiplayerRoom) => {
      setActiveRoom({ ...room });
      setCountdown(val);

      if (val > 0) {
        soundManager.playCountdown(false);
      } else if (val === 0) {
        soundManager.playCountdown(true);
        setTimeout(() => {
          setCountdown(null);
        }, 1200);
      }
    });

    const unsubChat = multiplayerService.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev.slice(-30), msg]);
    });

    const unsubTaunt = multiplayerService.on('player_taunt', (pId: string, emoji: string, text?: string) => {
      setCarLabels((prev) =>
        prev.map((lbl) =>
          lbl.id === pId ? { ...lbl, taunt: { emoji, text } } : lbl
        )
      );
    });

    const unsubFinishedResult = multiplayerService.on(
      'player_finished_result',
      (pId: string, _pos: number, _time: number, results: any[]) => {
        if (pId === myPlayerId) {
          // My car finished
        }
        if (activeRoom) {
          setActiveRoom((prev) => (prev ? { ...prev, results } : null));
        }
      }
    );

    const unsubRaceComplete = multiplayerService.on('race_complete', (results: any[], room: MultiplayerRoom) => {
      setActiveRoom({ ...room, results, state: 'finished' });
      const myResult = results.find((r) => r.playerId === myPlayerId);
      const myPos = myResult ? myResult.finishPosition : 1;
      const myTime = myResult ? myResult.finishTime : 0;
      setFinishStats({
        finished: true,
        position: myPos,
        totalTime: myTime,
        rivalsHit: rivalsHitCount,
      });
    });

    const unsubRoomReset = multiplayerService.on('room_reset', (room: MultiplayerRoom) => {
      setActiveRoom({ ...room });
      setFinishStats({ finished: false, position: 1, totalTime: 0, rivalsHit: 0 });
      setLapBanner(null);
    });

    return () => {
      unsubConnected();
      unsubRoomJoined();
      unsubPlayerJoined();
      unsubPlayerLeft();
      unsubLeftRoom();
      unsubReadyChanged();
      unsubLevelChanged();
      unsubCountdown();
      unsubChat();
      unsubTaunt();
      unsubFinishedResult();
      unsubRaceComplete();
      unsubRoomReset();
    };
  }, [myPlayerId, activeRoom, rivalsHitCount, startLocalCountdown]);

  // Handle Keyboard Inputs (Desktop support)
  useEffect(() => {
    const keysDown = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.code);

      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        inputRef.current.throttle = 1;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        inputRef.current.brake = 1;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        inputRef.current.steer = -1;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        inputRef.current.steer = 1;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        inputRef.current.jump = true;
      }
      if (e.code === 'KeyF' || e.code === 'KeyJ' || e.code === 'Enter') {
        e.preventDefault();
        inputRef.current.shoot = true;
        setShootCooldown(1);
        setTimeout(() => setShootCooldown(0), 550);
      }
      if (e.code === 'KeyP' && !activeRoom) {
        setIsPaused((prev) => !prev);
      }
      if (e.code === 'KeyM') {
        const muted = soundManager.toggleMute();
        setIsMuted(muted);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);

      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        inputRef.current.throttle = keysDown.has('ArrowUp') || keysDown.has('KeyW') ? 1 : 0;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        inputRef.current.brake = keysDown.has('ArrowDown') || keysDown.has('KeyS') ? 1 : 0;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD') {
        if (keysDown.has('ArrowLeft') || keysDown.has('KeyA')) {
          inputRef.current.steer = -1;
        } else if (keysDown.has('ArrowRight') || keysDown.has('KeyD')) {
          inputRef.current.steer = 1;
        } else {
          inputRef.current.steer = 0;
        }
      }
      if (e.code === 'Space') {
        inputRef.current.jump = false;
      }
      if (e.code === 'KeyF' || e.code === 'KeyJ' || e.code === 'Enter') {
        inputRef.current.shoot = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeRoom]);

  // Touch Handlers for Mobile Virtual Controls
  const handleTouchSteer = (dir: number) => {
    inputRef.current.steer = dir;
  };

  const handleTouchThrottle = (active: boolean) => {
    inputRef.current.throttle = active ? 1 : 0;
  };

  const handleTouchBrake = (active: boolean) => {
    inputRef.current.brake = active ? 1 : 0;
  };

  const handleTouchJump = () => {
    inputRef.current.jump = true;
    setTimeout(() => {
      inputRef.current.jump = false;
    }, 150);
  };

  const handleTouchShoot = () => {
    inputRef.current.shoot = true;
    setShootCooldown(1);
    setTimeout(() => {
      inputRef.current.shoot = false;
    }, 120);
    setTimeout(() => {
      setShootCooldown(0);
    }, 550);
  };

  // Lap Completion Trigger
  const handleLapCompleted = (lap: number) => {
    if (lap === 4) {
      setLapBanner('🔥 ¡ÚLTIMA VUELTA! (4 / 4) 🔥');
    } else {
      setLapBanner(`🏁 ¡VUELTA ${lap} DE 4! 🏁`);
    }

    setTimeout(() => {
      setLapBanner(null);
    }, 2400);
  };

  // Race Finish Trigger
  const handleRaceFinished = (position: number, totalTime: number, rivalsHit: number) => {
    setFinishStats({
      finished: true,
      position,
      totalTime,
      rivalsHit,
    });
  };

  // Restart Solo Race
  const handleRestart = () => {
    setFinishStats({ finished: false, position: 1, totalTime: 0, rivalsHit: 0 });
    setRivalsHitCount(0);
    setLapBanner(null);
    startLocalCountdown();
  };

  // Next Level (Solo Mode)
  const handleNextLevel = () => {
    const nextIdx = (GAME_LEVELS.findIndex((l) => l.id === currentLevel.id) + 1) % GAME_LEVELS.length;
    setCurrentLevel(GAME_LEVELS[nextIdx]);
    handleRestart();
  };

  const handleSelectLevel = (level: LevelConfig) => {
    setCurrentLevel(level);
    handleRestart();
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleTogglePause = () => {
    if (activeRoom) return; // Cannot pause live multiplayer
    setIsPaused((p) => !p);
  };

  const handleRivalHit = () => {
    setRivalsHitCount((c) => c + 1);
  };

  // Multiplayer Actions
  const handleLeaveRoom = () => {
    multiplayerService.leaveRoom();
    setActiveRoom(null);
    setFinishStats({ finished: false, position: 1, totalTime: 0, rivalsHit: 0 });
    setCarLabels([]);
    startLocalCountdown();
  };

  const handleSendChat = (text: string) => {
    multiplayerService.sendChat(text);
  };

  const handleSendTaunt = (emoji: string) => {
    multiplayerService.sendTaunt(emoji);
  };

  const handleReturnToLobby = () => {
    if (activeRoom?.hostId === myPlayerId) {
      multiplayerService.playAgain();
    } else {
      setActiveRoom((prev) => (prev ? { ...prev, state: 'lobby' } : null));
    }
    setFinishStats({ finished: false, position: 1, totalTime: 0, rivalsHit: 0 });
  };

  const isMultiplayerActive = !!activeRoom;
  const isInLobby = activeRoom && activeRoom.state === 'lobby';

  return (
    <div
      id="car-racing-3d-app"
      className="relative w-screen h-screen overflow-hidden select-none bg-slate-950 font-racing"
    >
      {/* 3D WebGL Canvas Viewport */}
      <GameCanvas
        key={`${currentLevel.id}-${playerColor}-${activeRoom ? activeRoom.id : 'solo'}-${finishStats.finished ? 'f' : 'r'}`}
        level={currentLevel}
        playerColor={playerColor}
        isPaused={isPaused}
        onUpdateHUD={setHudData}
        onLapCompleted={handleLapCompleted}
        onRaceFinished={handleRaceFinished}
        inputRef={inputRef}
        onRivalHit={handleRivalHit}
        countdown={countdown}
        isMultiplayer={isMultiplayerActive}
        multiplayerRoom={activeRoom}
        myPlayerId={myPlayerId}
        onUpdateCarLabels={setCarLabels}
      />

      {/* Floating 3D Player Tags in Multiplayer */}
      {isMultiplayerActive && !isInLobby && (
        <CarLabelsOverlay labels={carLabels} />
      )}

      {/* In-Game Heads Up Display (HUD) */}
      {!isInLobby && (
        <HUD
          player={hudData.player}
          opponents={hudData.opponents}
          level={currentLevel}
          position={hudData.position}
          totalRacers={hudData.totalRacers}
          countdown={countdown}
          isMuted={isMuted}
          isPaused={isPaused}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onRestart={handleRestart}
          lapBanner={lapBanner}
          rivalsHitCount={rivalsHitCount}
          shootCooldown={shootCooldown}
          isMultiplayer={isMultiplayerActive}
          roomCode={activeRoom?.id}
          onSendTaunt={handleSendTaunt}
        />
      )}

      {/* Mobile Virtual Controls */}
      {!isInLobby && (
        <TouchControls
          onSteer={handleTouchSteer}
          onThrottle={handleTouchThrottle}
          onBrake={handleTouchBrake}
          onJump={handleTouchJump}
          onShoot={handleTouchShoot}
          jumpReady={hudData.player.isGrounded}
          shootCooldown={shootCooldown}
        />
      )}

      {/* Top Menu Buttons (Garage & Multiplayer) */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2">
        {/* Solo Garage / Level Select */}
        {!isMultiplayerActive && (
          <button
            id="btn-open-garage"
            onClick={() => setIsLevelModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-xs font-racing text-slate-300 hover:text-white shadow-lg active:scale-95 transition-all"
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">NIVELES & COLOR</span>
            <span className="text-[10px] text-amber-400 font-bold sm:hidden">NIVEL {currentLevel.id}</span>
          </button>
        )}

        {/* Download Repo Button */}
        <button
          id="btn-download-repo"
          onClick={() => setIsDownloadModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-emerald-500/50 text-xs font-racing text-emerald-300 hover:text-white shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
          title="Descargar código del juego para subir a repositorio"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">DESCARGAR CÓDIGO</span>
          <span className="sm:hidden text-[10px] font-bold">CÓDIGO</span>
        </button>

        {/* Multiplayer Button */}
        {!isMultiplayerActive ? (
          <button
            id="btn-open-multiplayer"
            onClick={() => setIsMultiplayerModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-400/50 shadow-lg shadow-cyan-950/50 hover:brightness-110 active:scale-95 transition-all text-xs font-racing font-bold tracking-wide animate-pulse"
          >
            <Users className="w-3.5 h-3.5 text-cyan-200" />
            <span>MULTIJUGADOR ONLINE</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 backdrop-blur-md border border-cyan-500/50 text-cyan-300 text-xs font-racing font-bold">
              <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>SALA #{activeRoom.id}</span>
              <span className="text-[10px] text-slate-400">({Object.keys(activeRoom.players).length}P)</span>
            </div>

            <button
              onClick={handleLeaveRoom}
              className="px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-300 hover:text-white text-xs font-bold transition-all active:scale-95"
            >
              Salir
            </button>
          </div>
        )}
      </div>

      {/* Level Select & Car Garage Modal (Solo) */}
      <LevelSelectModal
        isOpen={isLevelModalOpen}
        currentLevelId={currentLevel.id}
        onSelectLevel={handleSelectLevel}
        playerColor={playerColor}
        onSelectColor={setPlayerColor}
        onClose={() => setIsLevelModalOpen(false)}
      />

      {/* Multiplayer Browser & Create Room Modal */}
      <MultiplayerModal
        isOpen={isMultiplayerModalOpen}
        onClose={() => setIsMultiplayerModalOpen(false)}
        playerName={playerName}
        onUpdatePlayerName={handleUpdatePlayerName}
        playerColor={playerColor}
        onUpdatePlayerColor={setPlayerColor}
      />

      {/* Download Repo Modal */}
      <DownloadRepoModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      {/* In-Room Lobby Modal (Waiting for race start) */}
      {isInLobby && activeRoom && (
        <LobbyRoomModal
          room={activeRoom}
          myPlayerId={myPlayerId}
          onLeaveRoom={handleLeaveRoom}
          chatMessages={chatMessages}
          onSendChat={handleSendChat}
        />
      )}

      {/* Race Finish Modal (4 Laps Completed) */}
      {finishStats.finished && (
        <RaceFinishModal
          position={finishStats.position}
          totalRacers={hudData.totalRacers}
          totalTime={finishStats.totalTime}
          rivalsHit={finishStats.rivalsHit}
          level={currentLevel}
          hasNextLevel={currentLevel.id < GAME_LEVELS.length}
          onNextLevel={handleNextLevel}
          onRetry={handleRestart}
          onSelectLevel={() => {
            setIsLevelModalOpen(true);
            setFinishStats((prev) => ({ ...prev, finished: false }));
          }}
          isMultiplayer={isMultiplayerActive}
          multiplayerResults={activeRoom?.results || []}
          myPlayerId={myPlayerId}
          isHost={activeRoom?.hostId === myPlayerId}
          onReturnToLobby={handleReturnToLobby}
          onLeaveMultiplayer={handleLeaveRoom}
        />
      )}
    </div>
  );
}

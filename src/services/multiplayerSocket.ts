import { MultiplayerPlayer, MultiplayerRoom, ChatMessage } from '../types';
import { GAME_LEVELS, getOvalPoint } from '../game/trackGenerator';

export type SocketStatus = 'disconnected' | 'connecting' | 'connected';

export interface RemotePlayerState {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  speed: number;
  currentLap: number;
  lapProgress: number;
  isGrounded: boolean;
  spinOutTimer: number;
  finished: boolean;
  taunt?: { emoji: string; text?: string; expiresAt: number };
}

export function normalizeWsUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return '';

  if (url.startsWith('https://')) {
    url = 'wss://' + url.slice(8);
  } else if (url.startsWith('http://')) {
    url = 'ws://' + url.slice(7);
  } else if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    url = (isHttps ? 'wss://' : 'ws://') + url;
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // If path is not specified or ends at root, append /ws
  try {
    const parsed = new URL(url.replace(/^wss?:/, 'http:'));
    if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname === '') {
      url = `${url}/ws`;
    }
  } catch {
    if (!url.includes('/ws')) {
      url = `${url}/ws`;
    }
  }

  return url;
}

export function getEffectiveWsUrl(): { url: string; source: 'custom' | 'env' | 'origin' } {
  if (typeof window === 'undefined') {
    return { url: 'ws://localhost:3000/ws', source: 'origin' };
  }

  const custom = localStorage.getItem('carreras_custom_ws_url')?.trim();
  if (custom) {
    return { url: normalizeWsUrl(custom), source: 'custom' };
  }

  const envUrl = (import.meta.env.VITE_WS_URL as string)?.trim();
  if (envUrl) {
    return { url: normalizeWsUrl(envUrl), source: 'env' };
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return { url: `${protocol}//${host}/ws`, source: 'origin' };
}

export function isHostedOnVercelOrStatic(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host.endsWith('vercel.app') ||
    host.endsWith('netlify.app') ||
    host.endsWith('github.io') ||
    host.endsWith('pages.dev')
  );
}

type EventCallback = (...args: any[]) => void;

class MultiplayerService {
  private ws: WebSocket | null = null;
  private myPlayerId: string | null = null;
  private currentRoom: MultiplayerRoom | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private status: SocketStatus = 'disconnected';
  private reconnectTimer: number | null = null;
  private lastUpdateSent: number = 0;
  private queuedMessages: string[] = [];
  private activeWsUrl: string = '';

  // Simulated Offline Room Mode
  private isSimulated: boolean = false;
  private simTickTimer: number | null = null;
  private simBotsState: Array<{
    id: string;
    name: string;
    color: string;
    progress: number;
    speed: number;
    lap: number;
    finished: boolean;
    offset: number;
    spinOut: number;
  }> = [];

  constructor() {
    this.connect();
  }

  public getStatus(): SocketStatus {
    return this.status;
  }

  public getPlayerId(): string | null {
    return this.myPlayerId;
  }

  public getCurrentRoom(): MultiplayerRoom | null {
    return this.currentRoom;
  }

  public getActiveUrl(): string {
    return this.activeWsUrl;
  }

  public isSimulatedMode(): boolean {
    return this.isSimulated;
  }

  public on(event: string, cb: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => {
      this.listeners.get(event)?.delete(cb);
    };
  }

  private emit(event: string, ...args: any[]) {
    const cbs = this.listeners.get(event);
    if (cbs) {
      cbs.forEach((cb) => {
        try {
          cb(...args);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  }

  public connect(overrideUrl?: string) {
    // If in simulation mode, leave it first
    if (this.isSimulated) {
      this.stopSimulation();
    }

    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const { url } = overrideUrl ? { url: normalizeWsUrl(overrideUrl) } : getEffectiveWsUrl();
    this.activeWsUrl = url;

    this.status = 'connecting';
    this.emit('status_change', this.status);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.status = 'connected';
        this.emit('status_change', this.status);

        // Send queued messages if any
        while (this.queuedMessages.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
          const msg = this.queuedMessages.shift();
          if (msg) this.ws.send(msg);
        }

        // Request initial room list
        this.getRooms();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        this.status = 'disconnected';
        this.emit('status_change', this.status);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.status = 'disconnected';
        this.emit('status_change', this.status);
      };
    } catch (e) {
      console.warn('Failed to instantiate WebSocket:', e);
      this.status = 'disconnected';
      this.emit('status_change', this.status);
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
    this.emit('status_change', this.status);
  }

  public setCustomServerUrl(url: string | null) {
    if (url && url.trim()) {
      localStorage.setItem('carreras_custom_ws_url', url.trim());
    } else {
      localStorage.removeItem('carreras_custom_ws_url');
    }
    this.connect();
  }

  public async testConnection(targetUrl: string): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const normalized = normalizeWsUrl(targetUrl);
    if (!normalized) {
      return { success: false, error: 'URL vacía o no válida' };
    }

    return new Promise((resolve) => {
      const startTime = performance.now();
      let testWs: WebSocket | null = null;
      let isSettled = false;

      const timeout = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          if (testWs) {
            testWs.onclose = null;
            testWs.onerror = null;
            testWs.close();
          }
          resolve({ success: false, error: 'Tiempo de espera agotado (Timeout > 4s)' });
        }
      }, 4000);

      try {
        testWs = new WebSocket(normalized);

        testWs.onopen = () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeout);
            const latencyMs = Math.round(performance.now() - startTime);
            testWs?.close();
            resolve({ success: true, latencyMs });
          }
        };

        testWs.onerror = () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeout);
            resolve({ success: false, error: 'No se pudo conectar (Servidor no responde o rechaza WebSockets)' });
          }
        };
      } catch (err: any) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeout);
          resolve({ success: false, error: err?.message || 'Error al instanciar WebSocket' });
        }
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    // Don't eagerly reconnect every second if hosted on vercel without custom url to avoid spamming console
    const isVercelWithoutConfig = isHostedOnVercelOrStatic() && !localStorage.getItem('carreras_custom_ws_url');
    const delay = isVercelWithoutConfig ? 15000 : 3500;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private send(data: any) {
    if (this.isSimulated) {
      this.handleSimulatedSend(data);
      return;
    }

    const payload = JSON.stringify(data);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      if (this.queuedMessages.length < 50) {
        this.queuedMessages.push(payload);
      }
    }
  }

  private handleIncomingMessage(msg: any) {
    switch (msg.type) {
      case 'connected':
        this.myPlayerId = msg.playerId;
        this.emit('connected', msg.playerId);
        break;

      case 'rooms_list':
        this.emit('rooms_list', msg.rooms);
        break;

      case 'room_joined':
        this.currentRoom = msg.room;
        this.emit('room_joined', msg.room, msg.playerId || this.myPlayerId);
        break;

      case 'player_joined':
        if (this.currentRoom && msg.room) {
          this.currentRoom = msg.room;
        }
        this.emit('player_joined', msg.player, msg.room);
        break;

      case 'player_left':
        if (this.currentRoom && msg.room) {
          this.currentRoom = msg.room;
        }
        this.emit('player_left', msg.playerId, msg.room);
        break;

      case 'left_room':
        this.currentRoom = null;
        this.emit('left_room');
        break;

      case 'player_ready_changed':
        if (this.currentRoom && msg.room) {
          this.currentRoom = msg.room;
        }
        this.emit('player_ready_changed', msg.playerId, msg.isReady, msg.room);
        break;

      case 'level_changed':
        if (this.currentRoom) {
          this.currentRoom.levelId = msg.levelId;
        }
        this.emit('level_changed', msg.levelId);
        break;

      case 'race_countdown':
        if (this.currentRoom && msg.room) {
          this.currentRoom = msg.room;
        }
        this.emit('race_countdown', msg.countdown, msg.room);
        break;

      case 'room_state_tick':
        this.emit('room_state_tick', msg.playerStates);
        break;

      case 'projectile_spawned':
        this.emit('projectile_spawned', msg.ownerId, msg.projectiles);
        break;

      case 'player_hit':
        this.emit('player_hit', msg.targetId, msg.hitterId, msg.x, msg.y, msg.z);
        break;

      case 'player_finished_result':
        if (this.currentRoom && msg.room) {
          this.currentRoom = msg.room;
        }
        this.emit('player_finished_result', msg.playerId, msg.position, msg.finishTime, msg.results);
        break;

      case 'race_complete':
        if (this.currentRoom && msg.room) {
          this.currentRoom = msg.room;
        }
        this.emit('race_complete', msg.results, msg.room);
        break;

      case 'chat_message':
        this.emit('chat_message', msg.message);
        break;

      case 'player_taunt':
        this.emit('player_taunt', msg.playerId, msg.emoji, msg.text);
        break;

      case 'room_reset':
        if (this.currentRoom && msg.room) {
          this.currentRoom = msg.room;
        }
        this.emit('room_reset', msg.room);
        break;

      case 'error':
        this.emit('error', msg.message);
        break;
    }
  }

  // API Methods
  public createRoom(options: {
    roomName: string;
    playerName: string;
    carColor: string;
    levelId: number;
    maxPlayers?: number;
  }) {
    if (this.status !== 'connected') {
      const isVercel = isHostedOnVercelOrStatic();
      const hint = isVercel
        ? '⚠️ No hay conexión con el servidor WebSocket. Vercel es un hosting estático (Serverless) y no ejecuta procesos Node.js continuos con WebSockets. Despliega el backend en Render/Railway o prueba la Sala Simulada con Bots.'
        : '⚠️ No se pudo conectar al servidor WebSocket. Revisa tu conexión o la URL configurada.';
      this.emit('error', hint);
      return;
    }

    this.send({
      type: 'create_room',
      ...options,
    });
  }

  public joinRoom(options: { roomId: string; playerName: string; carColor: string }) {
    if (this.status !== 'connected') {
      this.emit('error', '⚠️ Sin conexión al servidor WebSocket para unirse a la sala.');
      return;
    }

    this.send({
      type: 'join_room',
      ...options,
    });
  }

  public leaveRoom() {
    if (this.isSimulated) {
      this.stopSimulation();
      this.currentRoom = null;
      this.emit('left_room');
      return;
    }

    this.send({ type: 'leave_room' });
    this.currentRoom = null;
  }

  public getRooms() {
    if (this.status === 'connected') {
      this.send({ type: 'get_rooms' });
    }
  }

  public setReady(isReady: boolean) {
    this.send({ type: 'set_ready', isReady });
  }

  public setLevel(levelId: number) {
    this.send({ type: 'set_level', levelId });
  }

  public startRace() {
    this.send({ type: 'start_race_request' });
  }

  public sendPlayerUpdate(state: {
    x: number;
    y: number;
    z: number;
    rotationY: number;
    speed: number;
    currentLap: number;
    lapProgress: number;
    isGrounded: boolean;
    spinOutTimer?: number;
    finished?: boolean;
  }) {
    const now = performance.now();
    if (now - this.lastUpdateSent < 38) return;
    this.lastUpdateSent = now;

    this.send({
      type: 'player_update',
      ...state,
    });
  }

  public fireProjectiles(projectiles: any[]) {
    this.send({
      type: 'fire_projectile',
      projectiles: projectiles.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        z: p.z,
        vx: p.vx,
        vy: p.vy,
        vz: p.vz,
      })),
    });
  }

  public reportHit(targetId: string, x: number, y: number, z: number) {
    this.send({
      type: 'hit_player',
      targetId,
      x,
      y,
      z,
    });
  }

  public reportFinished(finishTime: number) {
    this.send({
      type: 'player_finished',
      finishTime,
    });
  }

  public sendChat(text: string) {
    this.send({
      type: 'send_chat',
      text,
    });
  }

  public sendTaunt(emoji: string, text?: string) {
    this.send({
      type: 'send_taunt',
      emoji,
      text,
    });
  }

  public playAgain() {
    this.send({
      type: 'play_again',
    });
  }

  // ==========================================
  // OFFLINE SIMULATED MULTIPLAYER ROOM (BOTS)
  // Allows testing rooms, countdown, 4-lap races
  // and podium on Vercel or any static host!
  // ==========================================
  public createSimulatedRoom(options: {
    roomName: string;
    playerName: string;
    carColor: string;
    levelId: number;
    maxPlayers?: number;
  }) {
    this.stopSimulation();
    this.isSimulated = true;
    this.myPlayerId = 'player_local';

    const myPlayer: MultiplayerPlayer = {
      id: this.myPlayerId,
      name: options.playerName,
      color: options.carColor,
      accentColor: '#ffffff',
      isHost: true,
      isReady: true,
      x: 0,
      y: 0,
      z: 0,
      rotationY: 0,
      speed: 0,
      currentLap: 1,
      lapProgress: 0.98,
      isGrounded: true,
      spinOutTimer: 0,
      finished: false,
    };

    const botsData = [
      { id: 'bot_1', name: 'Rival Rayo ⚡', color: '#ef4444', offset: 4.5, speedFactor: 0.97 },
      { id: 'bot_2', name: 'Piloto Turbo 🚀', color: '#10b981', offset: -4.5, speedFactor: 1.02 },
      { id: 'bot_3', name: 'Cometa Neón 🌟', color: '#eab308', offset: 2.0, speedFactor: 0.94 },
    ];

    const playersRecord: Record<string, MultiplayerPlayer> = {
      [this.myPlayerId]: myPlayer,
    };

    this.simBotsState = botsData.map((b, idx) => {
      const botPlayer: MultiplayerPlayer = {
        id: b.id,
        name: b.name,
        color: b.color,
        accentColor: '#ffffff',
        isHost: false,
        isReady: true,
        x: 0,
        y: 0,
        z: 0,
        rotationY: 0,
        speed: 0,
        currentLap: 1,
        lapProgress: 0.98 - (idx + 1) * 0.008,
        isGrounded: true,
        spinOutTimer: 0,
        finished: false,
      };
      playersRecord[b.id] = botPlayer;

      return {
        id: b.id,
        name: b.name,
        color: b.color,
        progress: botPlayer.lapProgress,
        speed: 0,
        lap: 1,
        finished: false,
        offset: b.offset,
        spinOut: 0,
      };
    });

    const room: MultiplayerRoom = {
      id: 'BOTS',
      name: `${options.roomName} (Simulación)`,
      hostId: this.myPlayerId,
      levelId: options.levelId,
      maxPlayers: options.maxPlayers || 4,
      state: 'lobby',
      players: playersRecord,
      results: [],
    };

    this.currentRoom = room;
    this.emit('room_joined', room, this.myPlayerId);
  }

  private stopSimulation() {
    this.isSimulated = false;
    if (this.simTickTimer) {
      clearInterval(this.simTickTimer);
      this.simTickTimer = null;
    }
    this.simBotsState = [];
  }

  private handleSimulatedSend(data: any) {
    if (!this.currentRoom) return;

    switch (data.type) {
      case 'set_ready': {
        if (this.currentRoom.players[this.myPlayerId!]) {
          this.currentRoom.players[this.myPlayerId!].isReady = data.isReady;
          this.emit('player_ready_changed', this.myPlayerId, data.isReady, this.currentRoom);
        }
        break;
      }

      case 'set_level': {
        this.currentRoom.levelId = data.levelId;
        this.emit('level_changed', data.levelId);
        break;
      }

      case 'start_race_request': {
        this.currentRoom.state = 'countdown';
        this.emit('race_countdown', 3, this.currentRoom);

        setTimeout(() => {
          if (!this.isSimulated || !this.currentRoom) return;
          this.emit('race_countdown', 2, this.currentRoom);
        }, 1000);

        setTimeout(() => {
          if (!this.isSimulated || !this.currentRoom) return;
          this.emit('race_countdown', 1, this.currentRoom);
        }, 2000);

        setTimeout(() => {
          if (!this.isSimulated || !this.currentRoom) return;
          this.currentRoom.state = 'racing';
          this.emit('race_countdown', 0, this.currentRoom);
          this.startSimulatedBotLoop();
        }, 3000);
        break;
      }

      case 'player_update': {
        if (this.currentRoom && this.currentRoom.players[this.myPlayerId!]) {
          const p = this.currentRoom.players[this.myPlayerId!];
          p.x = data.x;
          p.y = data.y;
          p.z = data.z;
          p.rotationY = data.rotationY;
          p.speed = data.speed;
          p.currentLap = data.currentLap;
          p.lapProgress = data.lapProgress;
          p.finished = data.finished || false;
        }
        break;
      }

      case 'hit_player': {
        const bot = this.simBotsState.find((b) => b.id === data.targetId);
        if (bot) {
          bot.spinOut = 2.0; // 2 seconds spin
          this.emit('player_hit', bot.id, this.myPlayerId, 0, 0, 0);
        }
        break;
      }

      case 'player_finished': {
        if (this.currentRoom) {
          const myP = this.currentRoom.players[this.myPlayerId!];
          if (myP) myP.finished = true;

          const results = [
            { playerId: this.myPlayerId!, name: myP?.name || 'Tú', color: myP?.color || '#3b82f6', finishTime: data.finishTime, finishPosition: 1 },
            ...this.simBotsState.map((b, i) => ({
              playerId: b.id,
              name: b.name,
              color: b.color,
              finishTime: data.finishTime + (i + 1) * 2.3,
              finishPosition: i + 2,
            })),
          ];

          this.currentRoom.state = 'finished';
          this.currentRoom.results = results;
          this.emit('player_finished_result', this.myPlayerId!, 1, data.finishTime, results);
          this.emit('race_complete', results, this.currentRoom);
        }
        break;
      }

      case 'send_chat': {
        const msg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          senderId: this.myPlayerId!,
          senderName: this.currentRoom.players[this.myPlayerId!]?.name || 'Piloto',
          color: this.currentRoom.players[this.myPlayerId!]?.color || '#3b82f6',
          text: data.text,
          time: Date.now(),
        };
        this.emit('chat_message', msg);
        break;
      }

      case 'send_taunt': {
        this.emit('player_taunt', this.myPlayerId!, data.emoji, data.text);
        break;
      }

      case 'play_again': {
        if (this.currentRoom) {
          this.currentRoom.state = 'lobby';
          this.currentRoom.results = [];
          this.simBotsState.forEach((b, idx) => {
            b.progress = 0.98 - (idx + 1) * 0.008;
            b.lap = 1;
            b.finished = false;
            b.speed = 0;
            b.spinOut = 0;
          });
          this.emit('room_reset', this.currentRoom);
        }
        break;
      }
    }
  }

  private startSimulatedBotLoop() {
    if (this.simTickTimer) clearInterval(this.simTickTimer);

    const level = GAME_LEVELS.find((l) => l.id === (this.currentRoom?.levelId || 1)) || GAME_LEVELS[0];

    this.simTickTimer = window.setInterval(() => {
      if (!this.isSimulated || !this.currentRoom || this.currentRoom.state !== 'racing') {
        return;
      }

      const playerStates: Record<string, RemotePlayerState> = {};

      this.simBotsState.forEach((bot) => {
        if (bot.finished) return;

        if (bot.spinOut > 0) {
          bot.spinOut -= 0.04;
          bot.speed = Math.max(0, bot.speed - 30);
        } else {
          bot.speed = Math.min(105, bot.speed + 1.2);
          bot.progress += 0.0016 * (bot.speed / 100);

          if (bot.progress >= 1.0) {
            bot.progress -= 1.0;
            bot.lap++;
            if (bot.lap > 4) {
              bot.finished = true;
              bot.lap = 4;
              bot.progress = 1.0;
            }
          }
        }

        const pointData = getOvalPoint(bot.progress, level.straightLength, level.curveRadius, bot.offset);
        const posX = pointData.position.x;
        const posY = 0;
        const posZ = pointData.position.z;
        const rotY = Math.atan2(pointData.tangent.x, pointData.tangent.z);

        playerStates[bot.id] = {
          x: posX,
          y: posY,
          z: posZ,
          rotationY: rotY,
          speed: bot.speed,
          currentLap: bot.lap,
          lapProgress: bot.progress,
          isGrounded: true,
          spinOutTimer: bot.spinOut,
          finished: bot.finished,
        };

        if (this.currentRoom && this.currentRoom.players[bot.id]) {
          const bp = this.currentRoom.players[bot.id];
          bp.x = posX;
          bp.y = posY;
          bp.z = posZ;
          bp.rotationY = rotY;
          bp.speed = bot.speed;
          bp.currentLap = bot.lap;
          bp.lapProgress = bot.progress;
          bp.finished = bot.finished;
        }
      });

      this.emit('room_state_tick', playerStates);
    }, 45);
  }
}

export const multiplayerService = new MultiplayerService();

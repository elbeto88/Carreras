import { MultiplayerPlayer, MultiplayerRoom, ChatMessage } from '../types';

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

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.status = 'connecting';
    this.emit('status_change', this.status);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.status = 'connected';
        this.emit('status_change', this.status);

        // Send queued messages if any
        while (this.queuedMessages.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
          const msg = this.queuedMessages.shift();
          if (msg) this.ws.send(msg);
        }
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

      this.ws.onerror = (err) => {
        console.warn('WebSocket error, reconnecting soon:', err);
      };
    } catch (e) {
      console.error('Failed to instantiate WebSocket:', e);
      this.status = 'disconnected';
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  private send(data: any) {
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
    this.send({
      type: 'create_room',
      ...options,
    });
  }

  public joinRoom(options: { roomId: string; playerName: string; carColor: string }) {
    this.send({
      type: 'join_room',
      ...options,
    });
  }

  public leaveRoom() {
    this.send({ type: 'leave_room' });
    this.currentRoom = null;
  }

  public getRooms() {
    this.send({ type: 'get_rooms' });
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
    // Throttle to ~25 updates per second (~40ms)
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
}

export const multiplayerService = new MultiplayerService();

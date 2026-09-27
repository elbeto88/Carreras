import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MultiplayerPlayer, MultiplayerRoom, ChatMessage } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientSession {
  ws: WebSocket;
  playerId: string;
  roomId: string | null;
  name: string;
  color: string;
  accentColor: string;
  lastPing: number;
}

const clients = new Map<WebSocket, ClientSession>();
const rooms = new Map<string, MultiplayerRoom>();

// Generate short 4-character room codes
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
  const room = rooms.get(roomId);
  if (!room) return;
  const payload = JSON.stringify(message);

  clients.forEach((session, ws) => {
    if (session.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

function sendTo(ws: WebSocket, message: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Periodic tick to clean up disconnected rooms and broadcast synced state
setInterval(() => {
  // Sync high-frequency racer coordinates in active racing rooms
  rooms.forEach((room, roomId) => {
    if (room.state === 'racing' || room.state === 'countdown') {
      const playerStates: Record<string, any> = {};
      Object.values(room.players).forEach((p) => {
        playerStates[p.id] = {
          x: p.x,
          y: p.y,
          z: p.z,
          rotationY: p.rotationY,
          speed: p.speed,
          currentLap: p.currentLap,
          lapProgress: p.lapProgress,
          isGrounded: p.isGrounded,
          spinOutTimer: p.spinOutTimer,
          finished: p.finished,
          taunt: p.taunt,
        };
      });

      broadcastToRoom(roomId, {
        type: 'room_state_tick',
        playerStates,
      });
    }
  });
}, 45); // ~22 updates/sec keeps movement fluid while bandwidth light

wss.on('connection', (ws: WebSocket) => {
  const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
  const session: ClientSession = {
    ws,
    playerId,
    roomId: null,
    name: 'Piloto',
    color: '#ef4444',
    accentColor: '#0f172a',
    lastPing: Date.now(),
  };
  clients.set(ws, session);

  sendTo(ws, {
    type: 'connected',
    playerId,
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      handleMessage(ws, session, data);
    } catch (e) {
      console.error('Error parsing client message:', e);
    }
  });

  ws.on('close', () => {
    handlePlayerLeave(session);
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
  });
});

function handlePlayerLeave(session: ClientSession) {
  if (!session.roomId) return;
  const roomId = session.roomId;
  const room = rooms.get(roomId);
  session.roomId = null;

  if (!room) return;

  delete room.players[session.playerId];
  const remainingPlayers = Object.values(room.players);

  if (remainingPlayers.length === 0) {
    rooms.delete(roomId);
    return;
  }

  // If host left, elect new host
  if (room.hostId === session.playerId) {
    room.hostId = remainingPlayers[0].id;
    remainingPlayers[0].isHost = true;
  }

  broadcastToRoom(roomId, {
    type: 'player_left',
    playerId: session.playerId,
    room,
  });
}

function handleMessage(ws: WebSocket, session: ClientSession, msg: any) {
  switch (msg.type) {
    case 'get_rooms': {
      const roomList = Array.from(rooms.values()).map((r) => ({
        id: r.id,
        name: r.name,
        levelId: r.levelId,
        state: r.state,
        playerCount: Object.keys(r.players).length,
        maxPlayers: r.maxPlayers,
        hostName: r.players[r.hostId]?.name || 'Anfitrión',
      }));
      sendTo(ws, { type: 'rooms_list', rooms: roomList });
      break;
    }

    case 'create_room': {
      let code = generateRoomCode();
      while (rooms.has(code)) {
        code = generateRoomCode();
      }

      session.name = (msg.playerName || 'Piloto').slice(0, 16);
      session.color = msg.carColor || '#ef4444';
      session.accentColor = msg.accentColor || '#0f172a';

      const hostPlayer: MultiplayerPlayer = {
        id: session.playerId,
        name: session.name,
        color: session.color,
        accentColor: session.accentColor,
        isReady: true,
        isHost: true,
        x: 0,
        y: 0,
        z: 0,
        rotationY: 0,
        speed: 0,
        currentLap: 1,
        lapProgress: 0.985,
        isGrounded: true,
        spinOutTimer: 0,
        finished: false,
      };

      const newRoom: MultiplayerRoom = {
        id: code,
        name: (msg.roomName || `Sala de ${session.name}`).slice(0, 24),
        hostId: session.playerId,
        levelId: Number(msg.levelId) || 1,
        state: 'lobby',
        players: { [session.playerId]: hostPlayer },
        maxPlayers: Math.min(6, Math.max(2, Number(msg.maxPlayers) || 4)),
        results: [],
      };

      rooms.set(code, newRoom);
      session.roomId = code;

      sendTo(ws, {
        type: 'room_joined',
        room: newRoom,
        playerId: session.playerId,
      });
      break;
    }

    case 'join_room': {
      const targetRoomId = (msg.roomId || '').toUpperCase().trim();
      const room = rooms.get(targetRoomId);

      if (!room) {
        sendTo(ws, { type: 'error', message: 'La sala especificada no existe.' });
        return;
      }

      if (Object.keys(room.players).length >= room.maxPlayers) {
        sendTo(ws, { type: 'error', message: 'La sala está completa.' });
        return;
      }

      if (room.state === 'racing') {
        sendTo(ws, { type: 'error', message: 'La carrera ya ha comenzado en esta sala.' });
        return;
      }

      session.name = (msg.playerName || 'Piloto').slice(0, 16);
      session.color = msg.carColor || '#3b82f6';
      session.accentColor = msg.accentColor || '#0f172a';
      session.roomId = room.id;

      const playerIndex = Object.keys(room.players).length;
      const newPlayer: MultiplayerPlayer = {
        id: session.playerId,
        name: session.name,
        color: session.color,
        accentColor: session.accentColor,
        isReady: false,
        isHost: false,
        x: (playerIndex % 2 === 0 ? -1.8 : 1.8),
        y: 0,
        z: playerIndex * 5,
        rotationY: 0,
        speed: 0,
        currentLap: 1,
        lapProgress: 0.985,
        isGrounded: true,
        spinOutTimer: 0,
        finished: false,
      };

      room.players[session.playerId] = newPlayer;

      sendTo(ws, {
        type: 'room_joined',
        room,
        playerId: session.playerId,
      });

      broadcastToRoom(room.id, {
        type: 'player_joined',
        player: newPlayer,
        room,
      }, ws);
      break;
    }

    case 'leave_room': {
      handlePlayerLeave(session);
      sendTo(ws, { type: 'left_room' });
      break;
    }

    case 'set_ready': {
      if (!session.roomId) return;
      const room = rooms.get(session.roomId);
      if (!room || !room.players[session.playerId]) return;

      room.players[session.playerId].isReady = !!msg.isReady;
      broadcastToRoom(room.id, {
        type: 'player_ready_changed',
        playerId: session.playerId,
        isReady: room.players[session.playerId].isReady,
        room,
      });
      break;
    }

    case 'set_level': {
      if (!session.roomId) return;
      const room = rooms.get(session.roomId);
      if (!room || room.hostId !== session.playerId) return;

      room.levelId = Number(msg.levelId) || 1;
      broadcastToRoom(room.id, {
        type: 'level_changed',
        levelId: room.levelId,
        room,
      });
      break;
    }

    case 'start_race_request': {
      if (!session.roomId) return;
      const room = rooms.get(session.roomId);
      if (!room || room.hostId !== session.playerId) return;

      room.state = 'countdown';
      room.countdownValue = 3;
      room.results = [];

      // Reset racers starting positions
      const playerList = Object.values(room.players);
      playerList.forEach((p, idx) => {
        p.currentLap = 1;
        p.lapProgress = 0.985;
        p.speed = 0;
        p.y = 0;
        p.isGrounded = true;
        p.spinOutTimer = 0;
        p.finished = false;
        p.finishPosition = undefined;
        p.finishTime = undefined;
      });

      broadcastToRoom(room.id, {
        type: 'race_countdown',
        countdown: 3,
        room,
      });

      // Synchronized 3, 2, 1, 0 sequence
      setTimeout(() => {
        if (room.state !== 'countdown') return;
        room.countdownValue = 2;
        broadcastToRoom(room.id, { type: 'race_countdown', countdown: 2, room });
      }, 1000);

      setTimeout(() => {
        if (room.state !== 'countdown') return;
        room.countdownValue = 1;
        broadcastToRoom(room.id, { type: 'race_countdown', countdown: 1, room });
      }, 2000);

      setTimeout(() => {
        if (room.state !== 'countdown') return;
        room.countdownValue = 0; // GO!
        room.state = 'racing';
        room.raceStartTime = Date.now();
        broadcastToRoom(room.id, { type: 'race_countdown', countdown: 0, room });
      }, 3000);
      break;
    }

    case 'player_update': {
      if (!session.roomId) return;
      const room = rooms.get(session.roomId);
      if (!room || !room.players[session.playerId]) return;

      const p = room.players[session.playerId];
      p.x = Number(msg.x) || 0;
      p.y = Number(msg.y) || 0;
      p.z = Number(msg.z) || 0;
      p.rotationY = Number(msg.rotationY) || 0;
      p.speed = Number(msg.speed) || 0;
      p.currentLap = Number(msg.currentLap) || 1;
      p.lapProgress = Number(msg.lapProgress) || 0;
      p.isGrounded = !!msg.isGrounded;
      if (typeof msg.spinOutTimer === 'number') {
        p.spinOutTimer = msg.spinOutTimer;
      }
      break;
    }

    case 'fire_projectile': {
      if (!session.roomId) return;
      broadcastToRoom(session.roomId, {
        type: 'projectile_spawned',
        ownerId: session.playerId,
        projectiles: msg.projectiles,
      }, ws);
      break;
    }

    case 'hit_player': {
      if (!session.roomId) return;
      const room = rooms.get(session.roomId);
      if (!room) return;

      const target = room.players[msg.targetId];
      if (target) {
        target.spinOutTimer = 1.5;
        target.speed *= 0.2;
      }

      broadcastToRoom(session.roomId, {
        type: 'player_hit',
        targetId: msg.targetId,
        hitterId: session.playerId,
        x: msg.x,
        y: msg.y,
        z: msg.z,
      });
      break;
    }

    case 'player_finished': {
      if (!session.roomId) return;
      const room = rooms.get(session.roomId);
      if (!room || !room.players[session.playerId]) return;

      const p = room.players[session.playerId];
      if (p.finished) return;

      p.finished = true;
      p.finishTime = Number(msg.finishTime) || 0;
      if (!room.results) room.results = [];

      const position = room.results.length + 1;
      p.finishPosition = position;

      room.results.push({
        playerId: p.id,
        name: p.name,
        color: p.color,
        finishPosition: position,
        finishTime: p.finishTime,
      });

      broadcastToRoom(session.roomId, {
        type: 'player_finished_result',
        playerId: p.id,
        position,
        finishTime: p.finishTime,
        results: room.results,
        room,
      });

      // Check if all racers in room have completed the 4 laps
      const allFinished = Object.values(room.players).every((player) => player.finished);
      if (allFinished) {
        room.state = 'finished';
        broadcastToRoom(session.roomId, {
          type: 'race_complete',
          results: room.results,
          room,
        });
      }
      break;
    }

    case 'send_chat': {
      if (!session.roomId) return;
      const chatMsg: ChatMessage = {
        id: 'msg_' + Math.random().toString(36).substring(2, 9),
        senderId: session.playerId,
        senderName: session.name,
        color: session.color,
        text: (msg.text || '').slice(0, 80),
        time: Date.now(),
      };

      broadcastToRoom(session.roomId, {
        type: 'chat_message',
        message: chatMsg,
      });
      break;
    }

    case 'send_taunt': {
      if (!session.roomId) return;
      const room = rooms.get(session.roomId);
      if (!room || !room.players[session.playerId]) return;

      const emoji = (msg.emoji || '🏎️').slice(0, 4);
      room.players[session.playerId].taunt = {
        emoji,
        text: msg.text ? String(msg.text).slice(0, 20) : undefined,
        expiresAt: Date.now() + 3000,
      };

      broadcastToRoom(session.roomId, {
        type: 'player_taunt',
        playerId: session.playerId,
        emoji,
        text: msg.text,
      });
      break;
    }

    case 'play_again': {
      if (!session.roomId) return;
      const room = rooms.get(session.roomId);
      if (!room || room.hostId !== session.playerId) return;

      room.state = 'lobby';
      room.results = [];
      Object.values(room.players).forEach((p) => {
        p.isReady = p.isHost;
        p.finished = false;
        p.finishPosition = undefined;
        p.finishTime = undefined;
        p.currentLap = 1;
        p.lapProgress = 0.985;
        p.speed = 0;
      });

      broadcastToRoom(room.id, {
        type: 'room_reset',
        room,
      });
      break;
    }
  }
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    connections: clients.size,
    rooms: rooms.size,
  });
});

// Download project zip endpoint
app.get('/api/download-zip', (_req, res) => {
  const zipPath = path.resolve(__dirname, 'public', 'carreras-3d-multijugador.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="carreras-3d-multijugador.zip"');
    res.sendFile(zipPath);
  } else {
    res.status(404).json({ error: 'Archivo no encontrado' });
  }
});

// Vite Dev Server / Static Production Server
async function setupApp() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🏎️ Server running on http://0.0.0.0:${PORT}`);
  });
}

setupApp().catch((err) => {
  console.error('Failed to start server:', err);
});

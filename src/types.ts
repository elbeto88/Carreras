export interface CarStats {
  speed: number;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  jumpForce: number;
}

export interface CarConfig {
  id: string;
  name: string;
  color: string;
  accentColor: string;
  isPlayer: boolean;
}

export interface CarState {
  id: string;
  name: string;
  color: string;
  accentColor: string;
  isPlayer: boolean;
  x: number;
  y: number; // height (jumping/air)
  z: number;
  rotationY: number;
  verticalVelocity: number;
  isGrounded: boolean;
  speed: number;
  angularVelocity: number;
  spinOutTimer: number; // when hit by projectile
  mesh?: any;
  wheels?: any[];
  currentLap: number; // 1 to 4
  lapProgress: number; // 0.0 to 1.0 along the oval
  totalDistance: number;
  finished: boolean;
  finishTime?: number;
  finishPosition?: number;
  laneOffset: number; // target lateral distance from center for AI
  aiAggressiveness: number;
}

export interface Projectile {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  mesh?: any;
}

export interface ExplosionParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface Ramp {
  x: number;
  z: number;
  rotationY: number;
  width: number;
  height: number;
  length: number;
}

export interface BoostPad {
  x: number;
  z: number;
  rotationY: number;
  active: boolean;
}

export interface LevelConfig {
  id: number;
  name: string;
  theme: 'daytona' | 'neon' | 'desert' | 'cyberpunk';
  skyColor: number;
  fogColor: number;
  groundColor: number;
  trackColor: number;
  barrierColor: number;
  straightLength: number; // Length of the two straightaways
  curveRadius: number;    // Radius of the two semicircles
  trackWidth: number;
  lapsToWin: number;      // Fixed to 4 by user requirements
  opponentsCount: number;
  ambientLight: number;
  directionalLight: number;
  description: string;
}

export interface ControlInput {
  throttle: number; // 0 to 1
  brake: number;    // 0 to 1 (or reverse)
  steer: number;    // -1 (left) to 1 (right)
  jump: boolean;    // trigger jump
  shoot: boolean;   // trigger shoot
}

export type GameStatus = 'menu' | 'countdown' | 'racing' | 'paused' | 'finished';

export interface MultiplayerPlayer {
  id: string;
  name: string;
  color: string;
  accentColor: string;
  isReady: boolean;
  isHost: boolean;
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
  finishTime?: number;
  finishPosition?: number;
  taunt?: { emoji: string; text?: string; expiresAt: number };
}

export interface MultiplayerRoom {
  id: string;
  name: string;
  hostId: string;
  levelId: number;
  state: 'lobby' | 'countdown' | 'racing' | 'finished';
  players: Record<string, MultiplayerPlayer>;
  maxPlayers: number;
  countdownValue?: number;
  raceStartTime?: number;
  results?: {
    playerId: string;
    name: string;
    color: string;
    finishPosition: number;
    finishTime: number;
  }[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  color: string;
  text: string;
  time: number;
}

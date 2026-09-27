import * as THREE from 'three';
import { CarState, Projectile, Ramp, BoostPad, ExplosionParticle, LevelConfig } from '../types';
import { getOvalPoint } from './trackGenerator';

export const GRAVITY = 32.0;

/**
 * Updates player car movement, steering, jumping, and ramp interactions.
 */
export function updatePlayerCar(
  car: CarState,
  inputs: { throttle: number; brake: number; steer: number; jump: boolean },
  dt: number,
  ramps: Ramp[],
  boostPads: BoostPad[],
  onJumpTriggered?: () => void
) {
  if (car.spinOutTimer > 0) {
    car.spinOutTimer -= dt;
    car.rotationY += dt * 10;
    car.speed *= 0.94;
  } else {
    // Acceleration & Braking
    const maxForwardSpeed = 52.0; // ~190 km/h
    const maxReverseSpeed = -15.0;
    const accelRate = 28.0;
    const brakeRate = 38.0;
    const friction = 12.0;

    if (inputs.throttle > 0) {
      car.speed = Math.min(maxForwardSpeed, car.speed + accelRate * inputs.throttle * dt);
    } else if (inputs.brake > 0) {
      if (car.speed > 0.5) {
        car.speed = Math.max(0, car.speed - brakeRate * inputs.brake * dt);
      } else {
        car.speed = Math.max(maxReverseSpeed, car.speed - accelRate * inputs.brake * dt * 0.6);
      }
    } else {
      // Natural rolling resistance
      if (car.speed > 0) {
        car.speed = Math.max(0, car.speed - friction * dt);
      } else if (car.speed < 0) {
        car.speed = Math.min(0, car.speed + friction * dt);
      }
    }

    // Steering
    if (Math.abs(car.speed) > 0.1) {
      const steerSensitivity = car.isGrounded ? 2.4 : 1.2;
      const dirSign = car.speed >= 0 ? 1 : -1;
      car.rotationY += -inputs.steer * steerSensitivity * dirSign * dt;
    }
  }

  // Jump Trigger (Salto manual)
  if (inputs.jump && car.isGrounded && car.spinOutTimer <= 0) {
    car.verticalVelocity = 14.5;
    car.isGrounded = false;
    if (onJumpTriggered) onJumpTriggered();
  }

  // Vertical physics (Airborne, gravity & landing)
  if (!car.isGrounded) {
    car.y += car.verticalVelocity * dt;
    car.verticalVelocity -= GRAVITY * dt;

    if (car.y <= 0) {
      car.y = 0;
      car.verticalVelocity = 0;
      car.isGrounded = true;
    }
  }

  // Check Ramp interactions
  ramps.forEach((ramp) => {
    const dx = car.x - ramp.x;
    const dz = car.z - ramp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < ramp.length * 0.7 && car.speed > 8.0 && car.isGrounded) {
      // Launch car off ramp!
      car.verticalVelocity = 16.0 + (car.speed / 50.0) * 4.0;
      car.isGrounded = false;
      if (onJumpTriggered) onJumpTriggered();
    }
  });

  // Check Nitro Boost Pads
  boostPads.forEach((pad) => {
    const dx = car.x - pad.x;
    const dz = car.z - pad.z;
    if (Math.sqrt(dx * dx + dz * dz) < 3.5) {
      car.speed = Math.min(68.0, car.speed + 18.0 * dt);
    }
  });

  // Move forward in facing direction
  const moveDist = car.speed * dt;
  car.x += Math.sin(car.rotationY) * moveDist;
  car.z += Math.cos(car.rotationY) * moveDist;
}

/**
 * Updates AI opponents along the oval track path.
 */
export function updateAICar(
  car: CarState,
  dt: number,
  level: LevelConfig,
  ramps: Ramp[],
  playerPos: { x: number; z: number }
) {
  if (car.finished) return;

  if (car.spinOutTimer > 0) {
    car.spinOutTimer -= dt;
    car.rotationY += dt * 10;
    car.speed *= 0.95;
    const moveDist = car.speed * dt;
    car.x += Math.sin(car.rotationY) * moveDist;
    car.z += Math.cos(car.rotationY) * moveDist;
    return;
  }

  // Target speed based on level and AI profile
  const baseTargetSpeed = 38.0 + car.aiAggressiveness * 12.0;

  // Advance AI along oval spline
  const totalLength = 2 * level.straightLength + 2 * Math.PI * level.curveRadius;
  const speedProgressRate = (car.speed / totalLength);

  car.lapProgress = (car.lapProgress + speedProgressRate * dt) % 1.0;
  car.totalDistance += car.speed * dt;

  // Track laps
  const currentLapsCompleted = Math.floor(car.totalDistance / totalLength);
  car.currentLap = Math.min(level.lapsToWin, currentLapsCompleted + 1);

  if (car.currentLap >= level.lapsToWin && car.lapProgress > 0.98) {
    car.finished = true;
  }

  // Get ideal point on oval
  const lookAheadProgress = (car.lapProgress + 0.02) % 1.0;
  const targetPt = getOvalPoint(lookAheadProgress, level.straightLength, level.curveRadius, car.laneOffset);

  // Smoothly steer towards target
  const targetAngle = Math.atan2(targetPt.position.x - car.x, targetPt.position.z - car.z);
  let angleDiff = targetAngle - car.rotationY;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  car.rotationY += angleDiff * 5.0 * dt;

  // Smooth acceleration
  if (car.speed < baseTargetSpeed) {
    car.speed += 18.0 * dt;
  } else {
    car.speed -= 10.0 * dt;
  }

  // Air physics for AI (if ramp launch)
  if (!car.isGrounded) {
    car.y += car.verticalVelocity * dt;
    car.verticalVelocity -= GRAVITY * dt;
    if (car.y <= 0) {
      car.y = 0;
      car.verticalVelocity = 0;
      car.isGrounded = true;
    }
  }

  // Ramp interaction for AI
  ramps.forEach((ramp) => {
    const dx = car.x - ramp.x;
    const dz = car.z - ramp.z;
    if (Math.sqrt(dx * dx + dz * dz) < ramp.length * 0.6 && car.speed > 10.0 && car.isGrounded) {
      car.verticalVelocity = 14.0;
      car.isGrounded = false;
    }
  });

  const moveDist = car.speed * dt;
  car.x += Math.sin(car.rotationY) * moveDist;
  car.z += Math.cos(car.rotationY) * moveDist;
}

/**
 * Calculates track boundaries and lap progress for the player car.
 */
export function evaluatePlayerTrackProgress(
  car: CarState,
  level: LevelConfig,
  onLapComplete: (lap: number) => void
) {
  const { straightLength, curveRadius, trackWidth } = level;
  const halfWidth = trackWidth / 2;

  // Estimate progress along oval from (x, z)
  let t = 0;
  const straightDist = straightLength;
  const curveDist = Math.PI * curveRadius;
  const totalLength = 2 * straightDist + 2 * curveDist;

  // Geometry partition
  if (car.z >= -straightLength / 2 && car.z <= straightLength / 2) {
    if (car.x >= 0) {
      // Right straightaway (progress 0 to straightDist / totalLength)
      const frac = (car.z + straightLength / 2) / straightLength;
      t = (frac * straightDist) / totalLength;
    } else {
      // Left straightaway
      const frac = (straightLength / 2 - car.z) / straightLength;
      t = (straightDist + curveDist + frac * straightDist) / totalLength;
    }
  } else if (car.z > straightLength / 2) {
    // North turn
    const angle = Math.atan2(car.z - straightLength / 2, car.x);
    if (angle >= 0 && angle <= Math.PI) {
      t = (straightDist + (angle / Math.PI) * curveDist) / totalLength;
    }
  } else {
    // South turn
    const angle = Math.atan2(car.z - (-straightLength / 2), car.x);
    let southAngle = angle;
    if (southAngle < 0) southAngle += Math.PI * 2;
    t = (2 * straightDist + curveDist + ((southAngle - Math.PI) / Math.PI) * curveDist) / totalLength;
  }

  t = Math.max(0, Math.min(0.9999, t));

  // Detect lap completion: crossing from ~0.90 to ~0.05
  const prevProgress = car.lapProgress;
  if (prevProgress > 0.82 && t < 0.18) {
    if (car.currentLap < level.lapsToWin) {
      car.currentLap += 1;
      onLapComplete(car.currentLap);
    } else if (car.currentLap === level.lapsToWin && !car.finished) {
      car.finished = true;
      onLapComplete(5); // Race finished!
    }
  }
  car.lapProgress = t;

  // Barrier bounce if player strays too far from track center
  const idealPt = getOvalPoint(t, straightLength, curveRadius, 0);
  const dx = car.x - idealPt.position.x;
  const dz = car.z - idealPt.position.z;
  const lateralDist = Math.sqrt(dx * dx + dz * dz);

  if (lateralDist > halfWidth + 1.2) {
    // Push car back towards track center smoothly
    const pushDirX = (idealPt.position.x - car.x) / lateralDist;
    const pushDirZ = (idealPt.position.z - car.z) / lateralDist;
    car.x += pushDirX * 0.5;
    car.z += pushDirZ * 0.5;
    car.speed *= 0.85; // slight deceleration on barrier impact
  }
}

/**
 * Spawns 2 blaster plasma rockets from player car hood
 */
export function fireProjectiles(player: CarState): Projectile[] {
  const shootSpeed = 95.0; // rockets travel rapidly forward
  const forwardX = Math.sin(player.rotationY);
  const forwardZ = Math.cos(player.rotationY);
  const rightX = Math.cos(player.rotationY);
  const rightZ = -Math.sin(player.rotationY);

  const leftRocket: Projectile = {
    id: 'proj_' + Math.random().toString(36).substr(2, 9),
    ownerId: player.id,
    x: player.x - rightX * 0.7 + forwardX * 1.5,
    y: player.y + 0.65,
    z: player.z - rightZ * 0.7 + forwardZ * 1.5,
    vx: forwardX * shootSpeed,
    vy: 0,
    vz: forwardZ * shootSpeed,
    life: 1.8,
    maxLife: 1.8,
  };

  const rightRocket: Projectile = {
    id: 'proj_' + Math.random().toString(36).substr(2, 9),
    ownerId: player.id,
    x: player.x + rightX * 0.7 + forwardX * 1.5,
    y: player.y + 0.65,
    z: player.z + rightZ * 0.7 + forwardZ * 1.5,
    vx: forwardX * shootSpeed,
    vy: 0,
    vz: forwardZ * shootSpeed,
    life: 1.8,
    maxLife: 1.8,
  };

  return [leftRocket, rightRocket];
}

/**
 * Updates projectiles and checks hits against opponent cars
 */
export function updateProjectiles(
  projectiles: Projectile[],
  opponents: CarState[],
  dt: number,
  onHit: (hitCar: CarState, x: number, y: number, z: number) => void
): Projectile[] {
  const remaining: Projectile[] = [];

  for (let i = 0; i < projectiles.length; i++) {
    const p = projectiles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;

    if (p.mesh) {
      p.mesh.position.set(p.x, p.y, p.z);
    }

    if (p.life <= 0) continue;

    // Check hit against opponent cars
    let collided = false;
    for (const rival of opponents) {
      if (rival.id === p.ownerId) continue;
      const dx = rival.x - p.x;
      const dy = rival.y - p.y;
      const dz = rival.z - p.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 2.4) {
        collided = true;
        rival.spinOutTimer = 1.4; // Rival spins out and slows!
        rival.speed *= 0.2;
        onHit(rival, p.x, p.y, p.z);
        break;
      }
    }

    if (!collided) {
      remaining.push(p);
    }
  }

  return remaining;
}

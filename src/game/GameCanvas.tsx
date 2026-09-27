import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  CarState,
  LevelConfig,
  Projectile,
  Ramp,
  BoostPad,
  ExplosionParticle,
  MultiplayerRoom,
  MultiplayerPlayer,
} from '../types';
import { createCarModel, BuiltCar } from './carModel';
import { createOvalTrack, OvalTrackData } from './trackGenerator';
import {
  updatePlayerCar,
  updateAICar,
  evaluatePlayerTrackProgress,
  fireProjectiles,
  updateProjectiles,
} from './physics';
import { soundManager } from '../audio/soundManager';
import { multiplayerService } from '../services/multiplayerSocket';
import { CarLabelData } from '../components/CarLabelsOverlay';

interface GameCanvasProps {
  level: LevelConfig;
  playerColor: string;
  isPaused: boolean;
  onUpdateHUD: (data: {
    player: CarState;
    opponents: CarState[];
    position: number;
    totalRacers: number;
    speedKmh: number;
  }) => void;
  onLapCompleted: (lap: number) => void;
  onRaceFinished: (position: number, totalTime: number, rivalsHit: number) => void;
  inputRef: React.MutableRefObject<{
    throttle: number;
    brake: number;
    steer: number;
    jump: boolean;
    shoot: boolean;
  }>;
  onRivalHit: () => void;
  countdown: number | null;
  isMultiplayer?: boolean;
  multiplayerRoom?: MultiplayerRoom | null;
  myPlayerId?: string;
  onUpdateCarLabels?: (labels: CarLabelData[]) => void;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  playerColor,
  isPaused,
  onUpdateHUD,
  onLapCompleted,
  onRaceFinished,
  inputRef,
  onRivalHit,
  countdown,
  isMultiplayer = false,
  multiplayerRoom = null,
  myPlayerId = 'player',
  onUpdateCarLabels,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep references to mutable game objects inside animation frame loop
  const gameStateRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    trackData: OvalTrackData;
    playerCar: CarState;
    playerBuiltCar: BuiltCar;
    opponents: { state: CarState; built: BuiltCar; isRemoteHuman?: boolean }[];
    remoteCarMap: Map<string, { built: BuiltCar; state: CarState; targetPos: THREE.Vector3; targetRotY: number }>;
    projectiles: Projectile[];
    projectileMeshes: Map<string, THREE.Mesh>;
    particles: ExplosionParticle[];
    particleSystem: THREE.Points | null;
    particleGeo: THREE.BufferGeometry | null;
    raceStartTime: number;
    totalTime: number;
    rivalsHitCount: number;
    hasTriggeredFinish: boolean;
    shootCooldownTimer: number;
    lastTime: number;
  } | null>(null);

  // Setup 3D Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(level.skyColor);
    scene.fog = new THREE.FogExp2(level.fogColor, 0.0035);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.5, 1000);
    camera.position.set(0, 8, -12);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(level.ambientLight, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(level.directionalLight, 1.4);
    dirLight.position.set(60, 100, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 300;
    dirLight.shadow.camera.left = -120;
    dirLight.shadow.camera.right = 120;
    dirLight.shadow.camera.top = 120;
    dirLight.shadow.camera.bottom = -120;
    scene.add(dirLight);

    // 5. Track Generation (Oval)
    const trackData = createOvalTrack(level);
    scene.add(trackData.group);

    // Determine grid slot for local player
    let myGridIndex = 0;
    if (isMultiplayer && multiplayerRoom) {
      const pIds = Object.keys(multiplayerRoom.players);
      const idx = pIds.indexOf(myPlayerId);
      if (idx !== -1) myGridIndex = idx;
    }

    const gridLaneOffset = myGridIndex % 2 === 0 ? -1.8 : 1.8;
    const gridZOffset = Math.floor(myGridIndex / 2) * 6.5;

    // 6. Player Car
    const playerBuilt = createCarModel(playerColor, 0x0f172a, true);
    scene.add(playerBuilt.root);

    const playerState: CarState = {
      id: myPlayerId,
      name: isMultiplayer && multiplayerRoom?.players[myPlayerId] ? multiplayerRoom.players[myPlayerId].name : 'Tú',
      color: playerColor,
      accentColor: '#0f172a',
      isPlayer: true,
      x: trackData.startPosition.x + gridLaneOffset,
      y: 0,
      z: trackData.startPosition.z + gridZOffset,
      rotationY: trackData.startRotationY,
      verticalVelocity: 0,
      isGrounded: true,
      speed: 0,
      angularVelocity: 0,
      spinOutTimer: 0,
      currentLap: 1,
      lapProgress: 0.985,
      totalDistance: 0,
      finished: false,
      laneOffset: gridLaneOffset,
      aiAggressiveness: 1.0,
    };

    playerBuilt.root.position.set(playerState.x, playerState.y, playerState.z);
    playerBuilt.root.rotation.y = playerState.rotationY;

    // 7. Opponents Setup
    const opponentsList: { state: CarState; built: BuiltCar; isRemoteHuman?: boolean }[] = [];
    const remoteCarMap = new Map<string, { built: BuiltCar; state: CarState; targetPos: THREE.Vector3; targetRotY: number }>();

    if (isMultiplayer && multiplayerRoom) {
      // Spawn Remote Human Players
      const otherPlayers = Object.values(multiplayerRoom.players).filter((p) => p.id !== myPlayerId);
      const allPlayerIds = Object.keys(multiplayerRoom.players);

      otherPlayers.forEach((rp) => {
        const remoteIdx = allPlayerIds.indexOf(rp.id);
        const rLaneOffset = remoteIdx % 2 === 0 ? -1.8 : 1.8;
        const rZOffset = Math.floor(remoteIdx / 2) * 6.5;

        const built = createCarModel(rp.color, rp.accentColor || 0x0f172a, false);
        scene.add(built.root);

        const rState: CarState = {
          id: rp.id,
          name: rp.name,
          color: rp.color,
          accentColor: rp.accentColor || '#0f172a',
          isPlayer: false,
          x: trackData.startPosition.x + rLaneOffset,
          y: 0,
          z: trackData.startPosition.z + rZOffset,
          rotationY: trackData.startRotationY,
          verticalVelocity: 0,
          isGrounded: true,
          speed: 0,
          angularVelocity: 0,
          spinOutTimer: 0,
          currentLap: rp.currentLap || 1,
          lapProgress: rp.lapProgress || 0.985,
          totalDistance: 0,
          finished: rp.finished || false,
          laneOffset: rLaneOffset,
          aiAggressiveness: 1.0,
        };

        built.root.position.set(rState.x, rState.y, rState.z);
        built.root.rotation.y = rState.rotationY;

        const record = {
          built,
          state: rState,
          targetPos: new THREE.Vector3(rState.x, rState.y, rState.z),
          targetRotY: rState.rotationY,
        };

        remoteCarMap.set(rp.id, record);
        opponentsList.push({ state: rState, built, isRemoteHuman: true });
      });
    } else {
      // Solo Mode AI Opponents
      const opponentColors = [
        { name: 'Rival Dorado', hex: 0xfacc15, accent: 0x1e293b, lane: 2.2, agg: 0.85 },
        { name: 'Rival Neón', hex: 0x10b981, accent: 0x064e3b, lane: -2.4, agg: 0.95 },
        { name: 'Rival Púrpura', hex: 0x9333ea, accent: 0x3b0764, lane: 1.5, agg: 0.9 },
        { name: 'Rival Naranja', hex: 0xf97316, accent: 0x7c2d12, lane: -1.0, agg: 1.05 },
      ];

      const count = Math.min(level.opponentsCount, opponentColors.length);
      for (let i = 0; i < count; i++) {
        const cfg = opponentColors[i];
        const built = createCarModel(cfg.hex, cfg.accent, false);
        scene.add(built.root);

        const startT = (0.985 + (i + 1) * 0.015) % 1.0;
        const pt = trackData.startPosition.clone();
        const oppState: CarState = {
          id: `ai_${i}`,
          name: cfg.name,
          color: `#${cfg.hex.toString(16).padStart(6, '0')}`,
          accentColor: `#${cfg.accent.toString(16).padStart(6, '0')}`,
          isPlayer: false,
          x: pt.x + cfg.lane * 1.2,
          y: 0,
          z: pt.z + (i + 1) * 6,
          rotationY: trackData.startRotationY,
          verticalVelocity: 0,
          isGrounded: true,
          speed: 0,
          angularVelocity: 0,
          spinOutTimer: 0,
          currentLap: 1,
          lapProgress: startT,
          totalDistance: (i + 1) * 6,
          finished: false,
          laneOffset: cfg.lane,
          aiAggressiveness: cfg.agg,
        };

        built.root.position.set(oppState.x, oppState.y, oppState.z);
        built.root.rotation.y = oppState.rotationY;

        opponentsList.push({ state: oppState, built, isRemoteHuman: false });
      }
    }

    // 8. Particle System for Explosions & Sparks
    const maxParticles = 300;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(maxParticles * 3);
    const particleColors = new Float32Array(maxParticles * 3);
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    gameStateRef.current = {
      scene,
      camera,
      renderer,
      trackData,
      playerCar: playerState,
      playerBuiltCar: playerBuilt,
      opponents: opponentsList,
      remoteCarMap,
      projectiles: [],
      projectileMeshes: new Map(),
      particles: [],
      particleSystem,
      particleGeo,
      raceStartTime: performance.now(),
      totalTime: 0,
      rivalsHitCount: 0,
      hasTriggeredFinish: false,
      shootCooldownTimer: 0,
      lastTime: performance.now(),
    };

    soundManager.startEngine();
    soundManager.startBGM();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      soundManager.stopEngine();
      soundManager.stopBGM();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [level, playerColor, isMultiplayer, multiplayerRoom?.id]);

  // Handle Multiplayer WebSocket Events (remote movements, projectiles, hits)
  useEffect(() => {
    if (!isMultiplayer) return;

    // 1. Remote racer state tick
    const unsubState = multiplayerService.on('room_state_tick', (playerStates: Record<string, any>) => {
      const state = gameStateRef.current;
      if (!state) return;

      Object.entries(playerStates).forEach(([pId, pData]) => {
        if (pId === myPlayerId) return;

        const remote = state.remoteCarMap.get(pId);
        if (remote) {
          remote.targetPos.set(pData.x, pData.y, pData.z);
          remote.targetRotY = pData.rotationY;
          remote.state.speed = pData.speed;
          remote.state.currentLap = pData.currentLap;
          remote.state.lapProgress = pData.lapProgress;
          remote.state.isGrounded = pData.isGrounded;
          remote.state.spinOutTimer = pData.spinOutTimer || 0;
          remote.state.finished = pData.finished || false;
        }
      });
    });

    // 2. Remote projectiles fired
    const unsubProj = multiplayerService.on('projectile_spawned', (ownerId: string, projectiles: any[]) => {
      const state = gameStateRef.current;
      if (!state || ownerId === myPlayerId) return;

      soundManager.playShoot();

      projectiles.forEach((r) => {
        const projGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
        projGeo.rotateX(Math.PI / 2);
        const projMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        const mesh = new THREE.Mesh(projGeo, projMat);
        mesh.position.set(r.x, r.y, r.z);

        const heading = Math.atan2(r.vx, r.vz);
        mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading);

        state.scene.add(mesh);

        const newP: Projectile = {
          id: r.id,
          ownerId,
          x: r.x,
          y: r.y,
          z: r.z,
          vx: r.vx,
          vy: r.vy,
          vz: r.vz,
          life: 1.8,
          maxLife: 1.8,
          mesh,
        };

        state.projectileMeshes.set(newP.id, mesh);
        state.projectiles.push(newP);
      });
    });

    // 3. Player Hit event
    const unsubHit = multiplayerService.on('player_hit', (targetId: string, hitterId: string, x: number, y: number, z: number) => {
      const state = gameStateRef.current;
      if (!state) return;

      soundManager.playExplosion();

      // If local player was hit!
      if (targetId === myPlayerId) {
        state.playerCar.spinOutTimer = 1.5;
        state.playerCar.speed *= 0.25;
      }

      // Spawn explosion particles
      for (let i = 0; i < 35; i++) {
        const speed = 4.0 + Math.random() * 12.0;
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.2) * Math.PI;

        state.particles.push({
          x,
          y: y + 0.5,
          z,
          vx: Math.cos(angle) * Math.cos(elevation) * speed,
          vy: Math.sin(elevation) * speed + 3.0,
          vz: Math.sin(angle) * Math.cos(elevation) * speed,
          color: Math.random() > 0.4 ? 0xf97316 : 0xfef08a,
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1.0,
          size: 0.7,
        });
      }
    });

    return () => {
      unsubState();
      unsubProj();
      unsubHit();
    };
  }, [isMultiplayer, myPlayerId]);

  // Main 60FPS Game Loop
  useEffect(() => {
    let animId: number;

    const loop = (currentTime: number) => {
      animId = requestAnimationFrame(loop);

      const state = gameStateRef.current;
      if (!state || isPaused) return;

      const dt = Math.min((currentTime - state.lastTime) / 1000, 0.1);
      state.lastTime = currentTime;

      const isRacing = countdown === null || countdown === 0;

      // Handle Shooting input
      if (state.shootCooldownTimer > 0) {
        state.shootCooldownTimer = Math.max(0, state.shootCooldownTimer - dt);
      }

      if (inputRef.current.shoot && state.shootCooldownTimer <= 0 && isRacing) {
        state.shootCooldownTimer = 0.55;
        soundManager.playShoot();

        const newRockets = fireProjectiles(state.playerCar);
        newRockets.forEach((r) => {
          const projGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
          projGeo.rotateX(Math.PI / 2);
          const projMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
          const mesh = new THREE.Mesh(projGeo, projMat);
          mesh.position.set(r.x, r.y, r.z);
          mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), state.playerCar.rotationY);
          state.scene.add(mesh);
          r.mesh = mesh;
          state.projectileMeshes.set(r.id, mesh);
          state.projectiles.push(r);
        });

        // Broadcast to multiplayer room
        if (isMultiplayer) {
          multiplayerService.fireProjectiles(newRockets);
        }
      }

      // Update Player Car Physics
      if (isRacing) {
        state.totalTime += dt;

        updatePlayerCar(
          state.playerCar,
          {
            throttle: inputRef.current.throttle,
            brake: inputRef.current.brake,
            steer: inputRef.current.steer,
            jump: inputRef.current.jump,
          },
          dt,
          state.trackData.ramps,
          state.trackData.boostPads,
          () => soundManager.playJump()
        );

        // Lap & Finish evaluation
        evaluatePlayerTrackProgress(state.playerCar, level, (lap) => {
          if (lap <= level.lapsToWin) {
            onLapCompleted(lap);
            soundManager.playLapComplete(lap === level.lapsToWin);
          } else {
            // Race finished (4 Laps)
            if (!state.hasTriggeredFinish) {
              state.hasTriggeredFinish = true;
              soundManager.playVictory();

              const finalPos = computePosition(
                state.playerCar,
                state.opponents.map((o) => o.state),
                level
              );

              if (isMultiplayer) {
                multiplayerService.reportFinished(state.totalTime);
              }

              onRaceFinished(finalPos, state.totalTime, state.rivalsHitCount);
            }
          }
        });

        // Network sync for multiplayer
        if (isMultiplayer) {
          multiplayerService.sendPlayerUpdate({
            x: state.playerCar.x,
            y: state.playerCar.y,
            z: state.playerCar.z,
            rotationY: state.playerCar.rotationY,
            speed: state.playerCar.speed,
            currentLap: state.playerCar.currentLap,
            lapProgress: state.playerCar.lapProgress,
            isGrounded: state.playerCar.isGrounded,
            spinOutTimer: state.playerCar.spinOutTimer,
            finished: state.playerCar.finished,
          });
        }
      }

      // Update Engine Sound
      soundManager.updateEnginePitch(Math.abs(state.playerCar.speed) / 50.0);

      // Sync Player 3D Mesh
      state.playerBuiltCar.root.position.set(state.playerCar.x, state.playerCar.y, state.playerCar.z);
      state.playerBuiltCar.root.rotation.y = state.playerCar.rotationY;

      // Wheel rotation
      const wheelRotSpeed = state.playerCar.speed * dt * 3.5;
      state.playerBuiltCar.wheels.forEach((w) => {
        w.rotation.x += wheelRotSpeed;
      });

      // Front wheel steering
      if (state.playerBuiltCar.wheels.length >= 2) {
        const steerVisual = -inputRef.current.steer * 0.35;
        state.playerBuiltCar.wheels[0].rotation.y = steerVisual;
        state.playerBuiltCar.wheels[1].rotation.y = steerVisual;
      }

      // Nitro flame
      state.playerBuiltCar.nitroFlame.visible = state.playerCar.speed > 48.0;

      // Update Opponents (AI or Remote Players)
      const labels: CarLabelData[] = [];
      const canvasWidth = containerRef.current?.clientWidth || window.innerWidth;
      const canvasHeight = containerRef.current?.clientHeight || window.innerHeight;

      state.opponents.forEach(({ state: opp, built, isRemoteHuman }) => {
        if (isRemoteHuman) {
          // Smooth remote interpolation
          const remoteRec = state.remoteCarMap.get(opp.id);
          if (remoteRec) {
            built.root.position.lerp(remoteRec.targetPos, 0.28);
            built.root.rotation.y = lerpAngle(built.root.rotation.y, remoteRec.targetRotY, 0.28);

            opp.x = built.root.position.x;
            opp.y = built.root.position.y;
            opp.z = built.root.position.z;
            opp.rotationY = built.root.rotation.y;
          }

          // Spinout flash
          if (opp.spinOutTimer > 0) {
            (built.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(0xef4444);
            built.root.rotation.y += dt * 10;
          } else {
            (built.bodyMesh.material as THREE.MeshStandardMaterial).color.set(opp.color);
          }

          // Wheels
          built.wheels.forEach((w) => {
            w.rotation.x += opp.speed * dt * 3.5;
          });

          // Nitro flame
          built.nitroFlame.visible = opp.speed > 48.0;

          // 2D Screen projection for floating Player Tag
          const tagPos = built.root.position.clone().add(new THREE.Vector3(0, 2.3, 0));
          tagPos.project(state.camera);

          const isVisible = tagPos.z > 0 && tagPos.z < 1.0;
          const screenX = (tagPos.x * 0.5 + 0.5) * canvasWidth;
          const screenY = (-(tagPos.y * 0.5) + 0.5) * canvasHeight;

          const pInfo = multiplayerRoom?.players[opp.id];
          const taunt = pInfo?.taunt && pInfo.taunt.expiresAt > Date.now() ? pInfo.taunt : undefined;

          labels.push({
            id: opp.id,
            name: opp.name,
            color: opp.color,
            screenX,
            screenY,
            visible: isVisible,
            currentLap: opp.currentLap,
            taunt,
          });
        } else {
          // Standard AI update
          if (isRacing) {
            updateAICar(opp, dt, level, state.trackData.ramps, {
              x: state.playerCar.x,
              z: state.playerCar.z,
            });
          }
          built.root.position.set(opp.x, opp.y, opp.z);
          built.root.rotation.y = opp.rotationY;

          built.wheels.forEach((w) => {
            w.rotation.x += opp.speed * dt * 3.5;
          });

          if (opp.spinOutTimer > 0) {
            (built.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(0xef4444);
          } else {
            (built.bodyMesh.material as THREE.MeshStandardMaterial).color.set(opp.color);
          }
        }
      });

      if (onUpdateCarLabels) {
        onUpdateCarLabels(labels);
      }

      // Update Projectiles & Check Collisions
      const allRivalCars = state.opponents.map((o) => o.state);
      state.projectiles = updateProjectiles(
        state.projectiles,
        allRivalCars,
        dt,
        (hitCar, hx, hy, hz) => {
          soundManager.playExplosion();
          state.rivalsHitCount += 1;
          onRivalHit();

          if (isMultiplayer) {
            multiplayerService.reportHit(hitCar.id, hx, hy, hz);
          }

          // Spawn explosion particles
          for (let i = 0; i < 35; i++) {
            const speed = 4.0 + Math.random() * 12.0;
            const angle = Math.random() * Math.PI * 2;
            const elevation = (Math.random() - 0.2) * Math.PI;

            state.particles.push({
              x: hx,
              y: hy,
              z: hz,
              vx: Math.cos(angle) * Math.cos(elevation) * speed,
              vy: Math.sin(elevation) * speed + 3.0,
              vz: Math.sin(angle) * Math.cos(elevation) * speed,
              color: Math.random() > 0.4 ? 0xf97316 : 0xfef08a,
              life: 0.6 + Math.random() * 0.4,
              maxLife: 1.0,
              size: 0.7,
            });
          }
        }
      );

      // Clean up dead projectile meshes
      const activeIds = new Set(state.projectiles.map((p) => p.id));
      state.projectileMeshes.forEach((mesh, id) => {
        if (!activeIds.has(id)) {
          state.scene.remove(mesh);
          mesh.geometry.dispose();
          state.projectileMeshes.delete(id);
        }
      });

      // Update Explosion Particles
      if (state.particleGeo) {
        const positions = state.particleGeo.attributes.position.array as Float32Array;
        const colors = state.particleGeo.attributes.color.array as Float32Array;
        let pCount = 0;

        for (let i = state.particles.length - 1; i >= 0; i--) {
          const p = state.particles[i];
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vy -= 16.0 * dt;

          if (p.life <= 0) {
            state.particles.splice(i, 1);
            continue;
          }

          if (pCount < 300) {
            positions[pCount * 3] = p.x;
            positions[pCount * 3 + 1] = p.y;
            positions[pCount * 3 + 2] = p.z;

            const ratio = p.life / p.maxLife;
            colors[pCount * 3] = 1.0 * ratio;
            colors[pCount * 3 + 1] = 0.5 * ratio;
            colors[pCount * 3 + 2] = 0.1 * ratio;
            pCount++;
          }
        }

        for (let i = pCount; i < 300; i++) {
          positions[i * 3] = 0;
          positions[i * 3 + 1] = -1000;
          positions[i * 3 + 2] = 0;
        }

        state.particleGeo.attributes.position.needsUpdate = true;
        state.particleGeo.attributes.color.needsUpdate = true;
      }

      // Smooth Dynamic Chase Camera
      const camOffsetDist = 11.5;
      const camOffsetHeight = 5.2 + state.playerCar.y * 0.4;
      const targetCamX = state.playerCar.x - Math.sin(state.playerCar.rotationY) * camOffsetDist;
      const targetCamZ = state.playerCar.z - Math.cos(state.playerCar.rotationY) * camOffsetDist;
      const targetCamY = state.playerCar.y + camOffsetHeight;

      state.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.14);
      state.camera.lookAt(state.playerCar.x, state.playerCar.y + 1.2, state.playerCar.z);

      // Speed FOV effect
      const targetFov = 65 + (Math.abs(state.playerCar.speed) / 55.0) * 12;
      state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, targetFov, 0.08);
      state.camera.updateProjectionMatrix();

      // Render Scene
      state.renderer.render(state.scene, state.camera);

      // Update HUD in React
      const currentPos = computePosition(
        state.playerCar,
        state.opponents.map((o) => o.state),
        level
      );

      onUpdateHUD({
        player: state.playerCar,
        opponents: state.opponents.map((o) => o.state),
        position: currentPos,
        totalRacers: state.opponents.length + 1,
        speedKmh: Math.round(Math.abs(state.playerCar.speed) * 3.6),
      });
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [level, isPaused, countdown, isMultiplayer]);

  return (
    <div
      ref={containerRef}
      id="game-webgl-container"
      className="absolute inset-0 w-full h-full overflow-hidden touch-none"
    />
  );
};

function computePosition(player: CarState, opponents: CarState[], _level: LevelConfig): number {
  const allCars = [player, ...opponents];
  allCars.sort((a, b) => {
    const scoreA = a.currentLap * 1000 + a.lapProgress * 1000;
    const scoreB = b.currentLap * 1000 + b.lapProgress * 1000;
    return scoreB - scoreA;
  });

  const rank = allCars.findIndex((c) => c.id === player.id) + 1;
  return Math.max(1, rank);
}

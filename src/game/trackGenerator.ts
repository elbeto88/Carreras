import * as THREE from 'three';
import { LevelConfig, Ramp, BoostPad } from '../types';

export interface OvalTrackData {
  group: THREE.Group;
  totalLength: number;
  ramps: Ramp[];
  boostPads: BoostPad[];
  startPosition: THREE.Vector3;
  startRotationY: number;
}

/**
 * Returns position, tangent, and normal for an oval track at progress t in [0, 1]
 */
export function getOvalPoint(
  t: number,
  straightLength: number,
  radius: number,
  laneOffset: number = 0
): { position: THREE.Vector3; tangent: THREE.Vector3; normal: THREE.Vector3; isCurve: boolean } {
  // Normalize t to [0, 1)
  const normT = ((t % 1) + 1) % 1;

  const straightDist = straightLength;
  const curveDist = Math.PI * radius;
  const totalLength = 2 * straightDist + 2 * curveDist;

  const s = normT * totalLength;

  // Segment 1: Right Straightaway (going from -straight/2 to +straight/2 along Z, at X = +radius)
  if (s < straightDist) {
    const frac = s / straightDist;
    const z = -straightLength / 2 + frac * straightLength;
    const x = radius + laneOffset;
    return {
      position: new THREE.Vector3(x, 0, z),
      tangent: new THREE.Vector3(0, 0, 1),
      normal: new THREE.Vector3(1, 0, 0),
      isCurve: false,
    };
  }

  // Segment 2: North Turn / Semicircle (from x = +radius to x = -radius around center (0, 0, +straight/2))
  if (s < straightDist + curveDist) {
    const curveS = s - straightDist;
    const angle = (curveS / curveDist) * Math.PI; // 0 to PI
    // angle 0 is at (radius, zNorth), angle PI is at (-radius, zNorth)
    const effectiveRadius = radius + laneOffset;
    const x = Math.cos(angle) * effectiveRadius;
    const z = straightLength / 2 + Math.sin(angle) * effectiveRadius;
    const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize();
    const normal = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
    return {
      position: new THREE.Vector3(x, 0, z),
      tangent,
      normal,
      isCurve: true,
    };
  }

  // Segment 3: Left Straightaway (going from +straight/2 to -straight/2 along Z, at X = -radius)
  if (s < 2 * straightDist + curveDist) {
    const straightS = s - (straightDist + curveDist);
    const frac = straightS / straightDist;
    const z = straightLength / 2 - frac * straightLength;
    const x = -radius - laneOffset;
    return {
      position: new THREE.Vector3(x, 0, z),
      tangent: new THREE.Vector3(0, 0, -1),
      normal: new THREE.Vector3(-1, 0, 0),
      isCurve: false,
    };
  }

  // Segment 4: South Turn / Semicircle (from x = -radius to x = +radius around center (0, 0, -straight/2))
  const curveS = s - (2 * straightDist + curveDist);
  const angle = Math.PI + (curveS / curveDist) * Math.PI; // PI to 2*PI
  const effectiveRadius = radius + laneOffset;
  const x = Math.cos(angle) * effectiveRadius;
  const z = -straightLength / 2 + Math.sin(angle) * effectiveRadius;
  const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize();
  const normal = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
  return {
    position: new THREE.Vector3(x, 0, z),
    tangent,
    normal,
    isCurve: true,
  };
}

/**
 * Builds the complete 3D oval track mesh, barriers, curbs, start/finish line, and theme props.
 */
export function createOvalTrack(level: LevelConfig): OvalTrackData {
  const trackGroup = new THREE.Group();
  const { straightLength, curveRadius, trackWidth } = level;
  const totalLength = 2 * straightLength + 2 * Math.PI * curveRadius;

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(curveRadius * 4 + straightLength * 2, curveRadius * 4 + straightLength * 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: level.groundColor,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  trackGroup.add(ground);

  // Generate Oval Track ribbon geometry with high subdivision for smooth curves
  const segments = 240;
  const trackPositions: number[] = [];
  const trackIndices: number[] = [];
  const trackUvs: number[] = [];

  const curbInnerPos: number[] = [];
  const curbOuterPos: number[] = [];
  const curbInnerIndices: number[] = [];
  const curbOuterIndices: number[] = [];
  const curbInnerColors: number[] = [];
  const curbOuterColors: number[] = [];

  const barrierInnerPos: number[] = [];
  const barrierOuterPos: number[] = [];
  const barrierInnerIndices: number[] = [];
  const barrierOuterIndices: number[] = [];

  const halfWidth = trackWidth / 2;
  const curbWidth = 1.6;
  const barrierHeight = 1.8;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = getOvalPoint(t, straightLength, curveRadius, 0);

    // Track surface vertices
    const leftX = pt.position.x - pt.normal.x * halfWidth;
    const leftZ = pt.position.z - pt.normal.z * halfWidth;
    const rightX = pt.position.x + pt.normal.x * halfWidth;
    const rightZ = pt.position.z + pt.normal.z * halfWidth;

    trackPositions.push(leftX, 0.02, leftZ);
    trackPositions.push(rightX, 0.02, rightZ);

    trackUvs.push(0, t * 60);
    trackUvs.push(1, t * 60);

    // Curbs (Red and White alternating stripes)
    const isRed = Math.floor(t * 80) % 2 === 0;
    const r = isRed ? 0.9 : 1.0;
    const g = isRed ? 0.15 : 1.0;
    const b = isRed ? 0.15 : 1.0;

    // Inner curb
    const innerEdgeX = leftX - pt.normal.x * curbWidth;
    const innerEdgeZ = leftZ - pt.normal.z * curbWidth;
    curbInnerPos.push(leftX, 0.04, leftZ);
    curbInnerPos.push(innerEdgeX, 0.15, innerEdgeZ);
    curbInnerColors.push(r, g, b, r, g, b);

    // Outer curb
    const outerEdgeX = rightX + pt.normal.x * curbWidth;
    const outerEdgeZ = rightZ + pt.normal.z * curbWidth;
    curbOuterPos.push(rightX, 0.04, rightZ);
    curbOuterPos.push(outerEdgeX, 0.15, outerEdgeZ);
    curbOuterColors.push(r, g, b, r, g, b);

    // Outer and Inner Safety Barriers
    barrierInnerPos.push(innerEdgeX, 0.1, innerEdgeZ);
    barrierInnerPos.push(innerEdgeX, barrierHeight, innerEdgeZ);

    barrierOuterPos.push(outerEdgeX, 0.1, outerEdgeZ);
    barrierOuterPos.push(outerEdgeX, barrierHeight, outerEdgeZ);

    if (i < segments) {
      const v = i * 2;
      trackIndices.push(v, v + 1, v + 2);
      trackIndices.push(v + 1, v + 3, v + 2);

      curbInnerIndices.push(v, v + 1, v + 2);
      curbInnerIndices.push(v + 1, v + 3, v + 2);

      curbOuterIndices.push(v, v + 1, v + 2);
      curbOuterIndices.push(v + 1, v + 3, v + 2);

      barrierInnerIndices.push(v, v + 1, v + 2);
      barrierInnerIndices.push(v + 1, v + 3, v + 2);

      barrierOuterIndices.push(v, v + 1, v + 2);
      barrierOuterIndices.push(v + 1, v + 3, v + 2);
    }
  }

  // Build Track Mesh
  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(trackPositions, 3));
  trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(trackUvs, 2));
  trackGeo.setIndex(trackIndices);
  trackGeo.computeVertexNormals();

  const trackMat = new THREE.MeshStandardMaterial({
    color: level.trackColor,
    roughness: 0.8,
    metalness: 0.2,
  });
  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.receiveShadow = true;
  trackGroup.add(trackMesh);

  // Build Curbs Meshes
  const curbMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.6,
  });

  const curbInnerGeo = new THREE.BufferGeometry();
  curbInnerGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbInnerPos, 3));
  curbInnerGeo.setAttribute('color', new THREE.Float32BufferAttribute(curbInnerColors, 3));
  curbInnerGeo.setIndex(curbInnerIndices);
  curbInnerGeo.computeVertexNormals();
  const curbInnerMesh = new THREE.Mesh(curbInnerGeo, curbMat);
  trackGroup.add(curbInnerMesh);

  const curbOuterGeo = new THREE.BufferGeometry();
  curbOuterGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbOuterPos, 3));
  curbOuterGeo.setAttribute('color', new THREE.Float32BufferAttribute(curbOuterColors, 3));
  curbOuterGeo.setIndex(curbOuterIndices);
  curbOuterGeo.computeVertexNormals();
  const curbOuterMesh = new THREE.Mesh(curbOuterGeo, curbMat);
  trackGroup.add(curbOuterMesh);

  // Safety Barriers
  const barrierMat = new THREE.MeshStandardMaterial({
    color: level.barrierColor,
    metalness: 0.7,
    roughness: 0.3,
    side: THREE.DoubleSide,
  });

  const barrierInnerGeo = new THREE.BufferGeometry();
  barrierInnerGeo.setAttribute('position', new THREE.Float32BufferAttribute(barrierInnerPos, 3));
  barrierInnerGeo.setIndex(barrierInnerIndices);
  barrierInnerGeo.computeVertexNormals();
  trackGroup.add(new THREE.Mesh(barrierInnerGeo, barrierMat));

  const barrierOuterGeo = new THREE.BufferGeometry();
  barrierOuterGeo.setAttribute('position', new THREE.Float32BufferAttribute(barrierOuterPos, 3));
  barrierOuterGeo.setIndex(barrierOuterIndices);
  barrierOuterGeo.computeVertexNormals();
  trackGroup.add(new THREE.Mesh(barrierOuterGeo, barrierMat));

  // Centerline Dashed Line on track
  const dashCount = 60;
  const dashGeo = new THREE.BoxGeometry(0.3, 0.05, 3);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < dashCount; i++) {
    const t = i / dashCount;
    const pt = getOvalPoint(t, straightLength, curveRadius, 0);
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.position.copy(pt.position);
    dash.position.y = 0.05;
    dash.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pt.tangent);
    trackGroup.add(dash);
  }

  // START / FINISH LINE ARCH & Checkered Grid
  const finishPt = getOvalPoint(0, straightLength, curveRadius, 0);
  const archGroup = new THREE.Group();
  archGroup.position.copy(finishPt.position);
  archGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), finishPt.tangent);

  // Pillars
  const pillarGeo = new THREE.BoxGeometry(1.2, 8, 1.2);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
  const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
  leftPillar.position.set(-halfWidth - 1.5, 4, 0);
  archGroup.add(leftPillar);

  const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
  rightPillar.position.set(halfWidth + 1.5, 4, 0);
  archGroup.add(rightPillar);

  // Crossbar
  const crossbarGeo = new THREE.BoxGeometry(trackWidth + 4.5, 2.0, 1.4);
  const crossbarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
  const crossbar = new THREE.Mesh(crossbarGeo, crossbarMat);
  crossbar.position.set(0, 7.5, 0);
  archGroup.add(crossbar);

  // Checkered banner
  const bannerGeo = new THREE.BoxGeometry(trackWidth + 3.8, 1.5, 0.1);
  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x222222,
  });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(0, 7.5, 0.72);
  archGroup.add(banner);

  // Start/Finish Ground Marking (Checkered Line)
  const finishLineGeo = new THREE.PlaneGeometry(trackWidth, 2.5);
  const finishLineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
  const finishLine = new THREE.Mesh(finishLineGeo, finishLineMat);
  finishLine.rotation.x = -Math.PI / 2;
  finishLine.position.set(0, 0.06, 0);
  archGroup.add(finishLine);

  trackGroup.add(archGroup);

  // Ramps on the track! Enables exciting high jumps.
  const ramps: Ramp[] = [];
  const rampConfigs = [
    { t: 0.15, offset: -halfWidth * 0.35 },
    { t: 0.65, offset: halfWidth * 0.35 },
  ];

  const rampMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.5,
    roughness: 0.4,
  });

  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  rampConfigs.forEach((cfg) => {
    const pt = getOvalPoint(cfg.t, straightLength, curveRadius, cfg.offset);
    const rampMesh = new THREE.Group();
    rampMesh.position.copy(pt.position);
    rampMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pt.tangent);

    // Wedge geometry for jump ramp
    const rWidth = 4.5;
    const rLength = 7.0;
    const rHeight = 1.6;

    const wedgeShape = new THREE.Shape();
    wedgeShape.moveTo(0, 0);
    wedgeShape.lineTo(rLength, 0);
    wedgeShape.lineTo(rLength, rHeight);
    wedgeShape.closePath();

    const extrudeSettings = { depth: rWidth, bevelEnabled: false };
    const wedgeGeo = new THREE.ExtrudeGeometry(wedgeShape, extrudeSettings);
    wedgeGeo.rotateY(Math.PI / 2);
    wedgeGeo.translate(rWidth / 2, 0, -rLength / 2);

    const rampBody = new THREE.Mesh(wedgeGeo, rampMat);
    rampMesh.add(rampBody);

    // Warning / Boost arrows on the ramp slope
    const arrowGeo = new THREE.PlaneGeometry(1.6, 1.2);
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = -0.25;
    arrow.position.set(0, 0.9, 0);
    rampMesh.add(arrow);

    trackGroup.add(rampMesh);

    ramps.push({
      x: pt.position.x,
      z: pt.position.z,
      rotationY: Math.atan2(pt.tangent.x, pt.tangent.z),
      width: rWidth,
      height: rHeight,
      length: rLength,
    });
  });

  // Boost Nitro Pads on straightaways
  const boostPads: BoostPad[] = [];
  const boostConfigs = [
    { t: 0.28, offset: halfWidth * 0.35 },
    { t: 0.78, offset: -halfWidth * 0.35 },
  ];

  const padGeo = new THREE.PlaneGeometry(3.6, 6.0);
  const padMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    side: THREE.DoubleSide,
  });

  boostConfigs.forEach((bCfg) => {
    const pt = getOvalPoint(bCfg.t, straightLength, curveRadius, bCfg.offset);
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(pt.position);
    pad.position.y = 0.06;
    pad.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0));
    pad.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pt.tangent);
    pad.rotateX(-Math.PI / 2);
    trackGroup.add(pad);

    boostPads.push({
      x: pt.position.x,
      z: pt.position.z,
      rotationY: Math.atan2(pt.tangent.x, pt.tangent.z),
      active: true,
    });
  });

  // Stadium Lights and Props around the oval
  const lightCount = 8;
  for (let i = 0; i < lightCount; i++) {
    const t = i / lightCount;
    const ptOuter = getOvalPoint(t, straightLength, curveRadius, halfWidth + 8);
    const poleGroup = new THREE.Group();
    poleGroup.position.copy(ptOuter.position);

    // Tall light pole
    const poleGeo = new THREE.CylinderGeometry(0.3, 0.45, 16, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 8;
    poleGroup.add(pole);

    // Lamp rack
    const rackGeo = new THREE.BoxGeometry(4.5, 1.2, 1.2);
    const rack = new THREE.Mesh(rackGeo, poleMat);
    rack.position.y = 16;
    poleGroup.add(rack);

    // Light emitting face
    const lampFaceGeo = new THREE.PlaneGeometry(4.2, 1.0);
    const lampFaceMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    const lampFace = new THREE.Mesh(lampFaceGeo, lampFaceMat);
    lampFace.position.set(0, 16, 0.65);
    lampFace.rotation.x = 0.3;
    poleGroup.add(lampFace);

    trackGroup.add(poleGroup);
  }

  // Starting grid coordinates for player (just behind finish line, t = 0.985)
  const playerStart = getOvalPoint(0.985, straightLength, curveRadius, -1.8);
  const startRot = Math.atan2(playerStart.tangent.x, playerStart.tangent.z);

  return {
    group: trackGroup,
    totalLength,
    ramps,
    boostPads,
    startPosition: playerStart.position,
    startRotationY: startRot,
  };
}

export const GAME_LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Nivel 1: Circuito Daytona Clásico',
    theme: 'daytona',
    skyColor: 0x38bdf8,
    fogColor: 0x93c5fd,
    groundColor: 0x166534, // vibrant grass
    trackColor: 0x27272a,  // dark asphalt
    barrierColor: 0x3b82f6,
    straightLength: 95,
    curveRadius: 46,
    trackWidth: 16,
    lapsToWin: 4, // 4 laps required
    opponentsCount: 3,
    ambientLight: 0xffffff,
    directionalLight: 0xfffbeb,
    description: 'Pista ovalada abierta de asfalto. Domina el salto y adelanta a 3 rivales en 4 vueltas.',
  },
  {
    id: 2,
    name: 'Nivel 2: Óvalo Desierto Canyon',
    theme: 'desert',
    skyColor: 0xfb923c,
    fogColor: 0xfdba74,
    groundColor: 0x9a3412, // orange desert rock
    trackColor: 0x3f3f46,
    barrierColor: 0xd97706,
    straightLength: 110,
    curveRadius: 52,
    trackWidth: 17,
    lapsToWin: 4,
    opponentsCount: 3,
    ambientLight: 0xffedd5,
    directionalLight: 0xf97316,
    description: 'Pista desértica veloz bajo el atardecer con curvas amplias y rampas elevadas.',
  },
  {
    id: 3,
    name: 'Nivel 3: Cyber Oval Neón',
    theme: 'neon',
    skyColor: 0x090d16,
    fogColor: 0x0f172a,
    groundColor: 0x020617,
    trackColor: 0x18181b,
    barrierColor: 0x06b6d4, // glowing cyan barriers
    straightLength: 125,
    curveRadius: 56,
    trackWidth: 18,
    lapsToWin: 4,
    opponentsCount: 4,
    ambientLight: 0x38bdf8,
    directionalLight: 0xa855f7,
    description: 'Circuito oval nocturno con luces neón y rivales más agresivos. ¡Usa tus cañones!',
  },
  {
    id: 4,
    name: 'Nivel 4: Super Speedway Champions',
    theme: 'cyberpunk',
    skyColor: 0x450a0a,
    fogColor: 0x7f1d1d,
    groundColor: 0x18181b,
    trackColor: 0x09090b,
    barrierColor: 0xef4444,
    straightLength: 140,
    curveRadius: 62,
    trackWidth: 19,
    lapsToWin: 4,
    opponentsCount: 4,
    ambientLight: 0xffffff,
    directionalLight: 0xf43f5e,
    description: 'El óvalo definitivo a máxima velocidad. 4 vueltas de pura adrenalina y combate.',
  },
];

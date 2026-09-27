import * as THREE from 'three';

export interface BuiltCar {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  wheels: THREE.Mesh[];
  blasters: THREE.Group;
  leftExhaust: THREE.Mesh;
  rightExhaust: THREE.Mesh;
  nitroFlame: THREE.Mesh;
}

/**
 * Procedural 3D race car with chassis, cockpit, spoiler, wheels, and blaster cannons.
 */
export function createCarModel(
  bodyColorHex: string | number,
  accentColorHex: string | number = 0x111827,
  isPlayer: boolean = false
): BuiltCar {
  const carGroup = new THREE.Group();

  // Convert colors
  const primaryMat = new THREE.MeshStandardMaterial({
    color: bodyColorHex,
    metalness: 0.6,
    roughness: 0.35,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColorHex,
    metalness: 0.4,
    roughness: 0.5,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85,
  });

  const wheelRubberMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.8,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.8,
    roughness: 0.2,
  });

  const lightMat = new THREE.MeshBasicMaterial({
    color: isPlayer ? 0x38bdf8 : 0xfef08a,
  });

  const tailLightMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
  });

  // 1. Lower Chassis
  const lowerChassisGeo = new THREE.BoxGeometry(1.8, 0.45, 3.8);
  const lowerChassis = new THREE.Mesh(lowerChassisGeo, primaryMat);
  lowerChassis.position.y = 0.45;
  lowerChassis.castShadow = true;
  lowerChassis.receiveShadow = true;
  carGroup.add(lowerChassis);

  // 2. Cabin / Cockpit
  const cabinGeo = new THREE.BoxGeometry(1.35, 0.45, 1.8);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, 0.85, -0.2);
  cabin.castShadow = true;
  carGroup.add(cabin);

  // Cabin Roof
  const roofGeo = new THREE.BoxGeometry(1.3, 0.08, 1.4);
  const roof = new THREE.Mesh(roofGeo, accentMat);
  roof.position.set(0, 1.1, -0.2);
  carGroup.add(roof);

  // 3. Hood Scoop / Aerodynamic Nose
  const noseGeo = new THREE.BoxGeometry(1.7, 0.25, 1.2);
  const nose = new THREE.Mesh(noseGeo, primaryMat);
  nose.position.set(0, 0.48, 1.3);
  nose.rotation.x = -0.12;
  carGroup.add(nose);

  // Front splitter
  const splitterGeo = new THREE.BoxGeometry(1.9, 0.08, 0.5);
  const splitter = new THREE.Mesh(splitterGeo, accentMat);
  splitter.position.set(0, 0.2, 1.95);
  carGroup.add(splitter);

  // 4. Rear Spoiler (Alerón)
  const spoilerStrutGeo = new THREE.BoxGeometry(0.08, 0.4, 0.15);
  const leftStrut = new THREE.Mesh(spoilerStrutGeo, accentMat);
  leftStrut.position.set(-0.6, 0.85, -1.7);
  carGroup.add(leftStrut);

  const rightStrut = new THREE.Mesh(spoilerStrutGeo, accentMat);
  rightStrut.position.set(0.6, 0.85, -1.7);
  carGroup.add(rightStrut);

  const wingGeo = new THREE.BoxGeometry(2.0, 0.08, 0.45);
  const wing = new THREE.Mesh(wingGeo, accentMat);
  wing.position.set(0, 1.05, -1.75);
  wing.rotation.x = 0.08;
  carGroup.add(wing);

  // 5. Headlights & Taillights
  const headlightGeo = new THREE.BoxGeometry(0.35, 0.12, 0.1);
  const leftLight = new THREE.Mesh(headlightGeo, lightMat);
  leftLight.position.set(-0.65, 0.5, 1.9);
  carGroup.add(leftLight);

  const rightLight = new THREE.Mesh(headlightGeo, lightMat);
  rightLight.position.set(0.65, 0.5, 1.9);
  carGroup.add(rightLight);

  const tailLightGeo = new THREE.BoxGeometry(0.4, 0.12, 0.1);
  const leftTail = new THREE.Mesh(tailLightGeo, tailLightMat);
  leftTail.position.set(-0.6, 0.55, -1.9);
  carGroup.add(leftTail);

  const rightTail = new THREE.Mesh(tailLightGeo, tailLightMat);
  rightTail.position.set(0.6, 0.55, -1.9);
  carGroup.add(rightTail);

  // 6. Blaster Cannons (Disparadores) mounted on hood/fenders
  const blastersGroup = new THREE.Group();
  const cannonBarrelGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.7, 8);
  cannonBarrelGeo.rotateX(Math.PI / 2);

  const cannonMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.9,
    roughness: 0.2,
  });

  const muzzleMat = new THREE.MeshBasicMaterial({
    color: isPlayer ? 0x06b6d4 : 0xf97316,
  });

  // Left Cannon
  const leftCannon = new THREE.Mesh(cannonBarrelGeo, cannonMat);
  leftCannon.position.set(-0.65, 0.65, 1.0);
  const leftMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 8), muzzleMat);
  leftMuzzle.rotateX(Math.PI / 2);
  leftMuzzle.position.set(-0.65, 0.65, 1.35);
  blastersGroup.add(leftCannon);
  blastersGroup.add(leftMuzzle);

  // Right Cannon
  const rightCannon = new THREE.Mesh(cannonBarrelGeo, cannonMat);
  rightCannon.position.set(0.65, 0.65, 1.0);
  const rightMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 8), muzzleMat);
  rightMuzzle.rotateX(Math.PI / 2);
  rightMuzzle.position.set(0.65, 0.65, 1.35);
  blastersGroup.add(rightCannon);
  blastersGroup.add(rightMuzzle);

  carGroup.add(blastersGroup);

  // 7. Exhaust Pipes
  const exhaustGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.25, 8);
  exhaustGeo.rotateX(Math.PI / 2);
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.8 });

  const leftExhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
  leftExhaust.position.set(-0.4, 0.28, -1.95);
  carGroup.add(leftExhaust);

  const rightExhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
  rightExhaust.position.set(0.4, 0.28, -1.95);
  carGroup.add(rightExhaust);

  // Nitro flame (hidden by default, scaled during boost)
  const flameGeo = new THREE.ConeGeometry(0.18, 0.6, 6);
  flameGeo.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.85,
  });
  const nitroFlame = new THREE.Mesh(flameGeo, flameMat);
  nitroFlame.position.set(0, 0.28, -2.3);
  nitroFlame.visible = false;
  carGroup.add(nitroFlame);

  // 8. 4 Wheels (Tires + Rims)
  const wheels: THREE.Mesh[] = [];
  const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.35, 16);
  tireGeo.rotateZ(Math.PI / 2);

  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.36, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    { x: -0.95, y: 0.38, z: 1.15 }, // front left
    { x: 0.95, y: 0.38, z: 1.15 },  // front right
    { x: -0.98, y: 0.42, z: -1.15 }, // rear left (slightly bigger)
    { x: 0.98, y: 0.42, z: -1.15 },  // rear right
  ];

  wheelPositions.forEach((pos) => {
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, wheelRubberMat);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    tire.castShadow = true;
    wheelGroup.add(tire);
    wheelGroup.add(rim);

    wheelGroup.position.set(pos.x, pos.y, pos.z);
    carGroup.add(wheelGroup);
    wheels.push(wheelGroup as any);
  });

  return {
    root: carGroup,
    bodyMesh: lowerChassis,
    wheels,
    blasters: blastersGroup,
    leftExhaust,
    rightExhaust,
    nitroFlame,
  };
}

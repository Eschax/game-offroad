import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { VehicleEntry } from '../core/GameManager';

export type GearMode = '2H' | '4H' | '4L';
export type SuspensionStiffness = 'soft' | 'firm';

export class VehiclePhysics {
  public mesh: THREE.Group;
  public chassisBody: CANNON.Body;
  public vehicleRaycast: CANNON.RaycastVehicle;
  public wheelMeshes: THREE.Mesh[] = [];

  // Config stat
  public entry: VehicleEntry;

  // Offroad Systems
  public gearMode: GearMode = '4H';
  public diffLock: boolean = false;
  public tirePressureLow: boolean = false; // Air Down
  public fuel: number;
  public maxFuel: number;

  // Suspension Realtime Controls
  public rideHeightLevel: 'low' | 'normal' | 'high' = 'normal';
  public stiffnessMode: SuspensionStiffness = 'soft';

  // Steering & Throttle State
  public steerAngle: number = 0;
  public throttle: number = 0; // -1 (reverse) to 1 (forward)
  public handbrake: boolean = false;

  private scene: THREE.Scene;
  private world: CANNON.World;

  constructor(scene: THREE.Scene, world: CANNON.World, entry: VehicleEntry, spawnPos: CANNON.Vec3) {
    this.scene = scene;
    this.world = world;
    this.entry = entry;
    this.fuel = entry.specs.fuel_capacity_l;
    this.maxFuel = entry.specs.fuel_capacity_l;

    this.mesh = new THREE.Group();
    this.scene.add(this.mesh);

    // 1. Chassis Body Cannon
    const halfExtents = new CANNON.Vec3(1.0, 0.45, entry.specs.wheelbase_m * 0.7);
    const chassisShape = new CANNON.Box(halfExtents);
    this.chassisBody = new CANNON.Body({
      mass: entry.specs.mass_kg,
      position: spawnPos
    });
    this.chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 0.4, 0));
    this.chassisBody.angularDamping = 0.5;
    this.world.addBody(this.chassisBody);

    // 2. Chassis 3D Mesh
    this.createChassisVisual(entry);

    // 3. Setup Raycast Vehicle
    this.vehicleRaycast = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2
    });

    this.setupWheels(entry);
    this.vehicleRaycast.addToWorld(this.world);
  }

  private createChassisVisual(entry: VehicleEntry) {
    // Body Box
    let color = 0xd97706; // Rubicon Amber
    if (entry.id === 'dmax') color = 0x2563eb; // Blue
    if (entry.id === 'patrol') color = 0xe2e8f0; // White
    if (entry.id === 'ram') color = 0x111827; // Matte Black

    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.6
    });

    const bodyGeo = new THREE.BoxGeometry(1.9, 0.75, entry.specs.wheelbase_m * 1.3);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.4;
    bodyMesh.castShadow = true;
    this.mesh.add(bodyMesh);

    // Cabin / Roof
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 });
    const cabinGeo = new THREE.BoxGeometry(1.7, 0.65, entry.specs.wheelbase_m * 0.75);
    const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.position.set(0, 0.9, -0.2);
    cabinMesh.castShadow = true;
    this.mesh.add(cabinMesh);

    // Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.1), lightMat);
    hl1.position.set(0.65, 0.45, entry.specs.wheelbase_m * 0.65 + 0.05);
    const hl2 = hl1.clone();
    hl2.position.x = -0.65;
    this.mesh.add(hl1);
    this.mesh.add(hl2);
  }

  private setupWheels(entry: VehicleEntry) {
    const wheelRadius = 0.48;
    const wheelHalfWidth = 0.2;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelHalfWidth * 2, 24);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });

    const wb = entry.specs.wheelbase_m;
    const trackWidth = 1.05;

    const wheelOptions = {
      radius: wheelRadius,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: entry.specs.default_stiffness,
      suspensionRestLength: entry.specs.base_ride_height + 0.35,
      frictionSlip: 1.8,
      dampingRelaxation: entry.specs.default_damping,
      dampingCompression: entry.specs.default_damping * 0.8,
      maxSuspensionForce: 100000,
      rollInfluence: 0.15,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
      maxSuspensionTravel: entry.specs.suspension_travel_m,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true
    };

    const positions = [
      new CANNON.Vec3(-trackWidth, 0.2, wb * 0.5),  // Front Left
      new CANNON.Vec3(trackWidth, 0.2, wb * 0.5),   // Front Right
      new CANNON.Vec3(-trackWidth, 0.2, -wb * 0.5), // Rear Left
      new CANNON.Vec3(trackWidth, 0.2, -wb * 0.5)   // Rear Right
    ];

    for (let i = 0; i < 4; i++) {
      wheelOptions.chassisConnectionPointLocal = positions[i];
      this.vehicleRaycast.addWheel(wheelOptions);

      const wMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wMesh.castShadow = true;
      this.scene.add(wMesh);
      this.wheelMeshes.push(wMesh);
    }
  }

  public setRideHeight(level: 'low' | 'normal' | 'high') {
    this.rideHeightLevel = level;
    let offset = 0.35;
    if (level === 'low') offset = 0.20;
    if (level === 'high') offset = 0.55;

    for (let i = 0; i < 4; i++) {
      this.vehicleRaycast.wheelInfos[i].suspensionRestLength = this.entry.specs.base_ride_height + offset;
    }
  }

  public setStiffness(mode: SuspensionStiffness) {
    this.stiffnessMode = mode;
    const base = this.entry.specs.default_stiffness;
    const factor = mode === 'soft' ? 0.7 : 1.35;

    for (let i = 0; i < 4; i++) {
      this.vehicleRaycast.wheelInfos[i].suspensionStiffness = base * factor;
    }
  }

  public setGearMode(gear: GearMode) {
    this.gearMode = gear;
  }

  public toggleDiffLock() {
    this.diffLock = !this.diffLock;
  }

  public toggleTirePressure() {
    this.tirePressureLow = !this.tirePressureLow;
    const friction = this.tirePressureLow ? 2.5 : 1.8;
    for (let i = 0; i < 4; i++) {
      this.vehicleRaycast.wheelInfos[i].frictionSlip = friction;
    }
  }

  public update(delta: number) {
    // 1. Calculate Engine Torque based on Gearbox Mode
    let torqueMultiplier = 1.0;
    if (this.gearMode === '4L') {
      torqueMultiplier = 2.6; // High Torque for rock climbing
    }

    const appliedEngineForce = this.throttle * (this.entry.specs.engine_torque_nm * 4.5) * torqueMultiplier;
    const appliedBrake = this.handbrake ? 60 : (this.throttle === 0 ? 3 : 0);

    // 2. Drive Wheels: 2WD vs 4WD
    if (this.gearMode === '2H') {
      // Rear wheel drive only
      this.vehicleRaycast.applyEngineForce(0, 0);
      this.vehicleRaycast.applyEngineForce(0, 1);
      this.vehicleRaycast.applyEngineForce(appliedEngineForce, 2);
      this.vehicleRaycast.applyEngineForce(appliedEngineForce, 3);
    } else {
      // 4WD (4H / 4L)
      for (let i = 0; i < 4; i++) {
        this.vehicleRaycast.applyEngineForce(appliedEngineForce * 0.5, i);
      }
    }

    for (let i = 0; i < 4; i++) {
      this.vehicleRaycast.setBrake(appliedBrake, i);
    }

    // 3. Steering front wheels
    const maxSteer = 0.52; // ~30 degrees
    const currentSteer = this.steerAngle * maxSteer;
    this.vehicleRaycast.setSteeringValue(currentSteer, 0);
    this.vehicleRaycast.setSteeringValue(currentSteer, 1);

    // 4. Fuel consumption
    if (Math.abs(this.throttle) > 0.1 && this.fuel > 0) {
      const consumption = (this.gearMode === '4L' ? 1.8 : 1.0) * this.entry.specs.fuel_consumption_rate * delta * 0.2;
      this.fuel = Math.max(0, this.fuel - consumption);
    }

    // 5. Sync Cannon Bodies with Three.js Meshes
    this.mesh.position.copy(this.chassisBody.position as any);
    this.mesh.quaternion.copy(this.chassisBody.quaternion as any);

    for (let i = 0; i < this.vehicleRaycast.wheelInfos.length; i++) {
      this.vehicleRaycast.updateWheelTransform(i);
      const t = this.vehicleRaycast.wheelInfos[i].worldTransform;
      this.wheelMeshes[i].position.copy(t.position as any);
      this.wheelMeshes[i].quaternion.copy(t.quaternion as any);
    }
  }

  public refillFuel() {
    this.fuel = this.maxFuel;
  }
}

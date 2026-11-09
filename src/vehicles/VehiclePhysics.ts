import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { VehicleEntry } from '../core/GameManager';
import { VehicleVisualBuilder, VisualSuspensionComponents } from './VehicleVisualBuilder';
import { SoundEngine } from '../core/SoundEngine';

export type GearMode = '2H' | '4H' | '4L';
export type SuspensionStiffness = 'soft' | 'firm';

export class VehiclePhysics {
  public mesh: THREE.Group;
  public chassisBody: CANNON.Body;
  public vehicleRaycast: CANNON.RaycastVehicle;
  public wheelMeshes: THREE.Mesh[] = [];
  public suspensionVisuals: VisualSuspensionComponents;

  // Config stat
  public entry: VehicleEntry;

  // Offroad Systems
  public gearMode: GearMode = '4H';
  public diffLock: boolean = false;
  public tirePressureLow: boolean = false; // Air Down
  public fuel: number;
  public maxFuel: number;
  public isEngineFlooded: boolean = false;
  public waterDepth: number = 0;
  private floodTimer: number = 0;

  // Suspension Realtime Controls
  public rideHeightLevel: 'low' | 'normal' | 'high' = 'normal';
  public stiffnessMode: SuspensionStiffness = 'soft';

  // Steering & Throttle State
  public steerAngle: number = 0;
  public throttle: number = 0; // -1 (reverse) to 1 (forward)
  public handbrake: boolean = false;

  private scene: THREE.Scene;
  private world: CANNON.World;
  private hasSnorkel: boolean;

  constructor(
    scene: THREE.Scene,
    world: CANNON.World,
    entry: VehicleEntry,
    spawnPos: CANNON.Vec3,
    mods: { lift_kit: number; tires_tier: number; has_winch: boolean; has_snorkel: boolean }
  ) {
    this.scene = scene;
    this.world = world;
    this.entry = entry;
    this.fuel = entry.specs.fuel_capacity_l;
    this.maxFuel = entry.specs.fuel_capacity_l;
    this.hasSnorkel = mods.has_snorkel;

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

    // 2. Build High-Detail Realistic 3D Visual Mesh
    const visual = VehicleVisualBuilder.buildDetailedVehicle(entry, mods);
    this.mesh = visual.vehicleGroup;
    this.suspensionVisuals = visual.suspension;
    this.scene.add(this.mesh);

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

  private setupWheels(entry: VehicleEntry) {
    const wheelRadius = 0.48;
    const wheelHalfWidth = 0.22;
    const wb = entry.specs.wheelbase_m;
    const trackWidth = 1.05;

    const wheelOptions = {
      radius: wheelRadius,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: entry.specs.default_stiffness,
      suspensionRestLength: entry.specs.base_ride_height + 0.35,
      frictionSlip: 2.0,
      dampingRelaxation: entry.specs.default_damping,
      dampingCompression: entry.specs.default_damping * 0.8,
      maxSuspensionForce: 100000,
      rollInfluence: 0.12,
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

      // Create Detailed Alloy Beadlock Tire Mesh
      const wMesh = VehicleVisualBuilder.createTireMesh(wheelRadius, wheelHalfWidth);
      wMesh.castShadow = true;
      this.scene.add(wMesh);
      this.wheelMeshes.push(wMesh);
    }
  }

  public setRideHeight(level: 'low' | 'normal' | 'high') {
    this.rideHeightLevel = level;
    let offset = 0.35;
    if (level === 'low') offset = 0.18;
    if (level === 'high') offset = 0.58;

    for (let i = 0; i < 4; i++) {
      this.vehicleRaycast.wheelInfos[i].suspensionRestLength = this.entry.specs.base_ride_height + offset;
    }
  }

  public setStiffness(mode: SuspensionStiffness) {
    this.stiffnessMode = mode;
    const base = this.entry.specs.default_stiffness;
    const factor = mode === 'soft' ? 0.7 : 1.4;

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
    const friction = this.tirePressureLow ? 2.8 : 2.0;
    for (let i = 0; i < 4; i++) {
      this.vehicleRaycast.wheelInfos[i].frictionSlip = friction;
      // Visual scale effect for deflated tire
      const scaleY = this.tirePressureLow ? 0.88 : 1.0;
      this.wheelMeshes[i].scale.set(1.0, scaleY, 1.0);
    }
  }

  public checkWaterAndTerrain(waterLevel: number, delta: number) {
    const vPos = this.chassisBody.position;
    // Water depth relative to chassis bottom
    if (vPos.y < waterLevel) {
      this.waterDepth = waterLevel - vPos.y;
      // Hydrodynamic water resistance
      this.chassisBody.velocity.scale(0.96, this.chassisBody.velocity);

      // Engine Hydrolock check if water reaches hood (> 0.7m) and no snorkel
      if (this.waterDepth > 0.75 && !this.hasSnorkel) {
        this.floodTimer += delta;
        if (this.floodTimer > 3.0) {
          this.isEngineFlooded = true;
        }
      }
    } else {
      this.waterDepth = 0;
      this.floodTimer = Math.max(0, this.floodTimer - delta);
    }
  }

  public update(delta: number) {
    // Check if flooded or out of fuel
    const canDrive = !this.isEngineFlooded && this.fuel > 0;

    // 1. Calculate Engine Torque based on Gearbox Mode
    let torqueMultiplier = 1.0;
    if (this.gearMode === '4L') {
      torqueMultiplier = 2.8; // High Torque for rock crawling
    }

    const appliedEngineForce = canDrive
      ? this.throttle * (this.entry.specs.engine_torque_nm * 4.8) * torqueMultiplier
      : 0;
    const appliedBrake = this.handbrake ? 80 : (this.throttle === 0 ? 3 : 0);

    // 2. Drive Wheels: 2WD vs 4WD
    if (this.gearMode === '2H') {
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
    const maxSteer = 0.55;
    const currentSteer = this.steerAngle * maxSteer;
    this.vehicleRaycast.setSteeringValue(currentSteer, 0);
    this.vehicleRaycast.setSteeringValue(currentSteer, 1);

    // 4. Fuel consumption
    if (Math.abs(this.throttle) > 0.1 && canDrive) {
      const consumption = (this.gearMode === '4L' ? 1.8 : 1.0) * this.entry.specs.fuel_consumption_rate * delta * 0.2;
      this.fuel = Math.max(0, this.fuel - consumption);
    }

    // 5. Sync Cannon Bodies with Three.js Meshes
    this.mesh.position.copy(this.chassisBody.position as any);
    this.mesh.quaternion.copy(this.chassisBody.quaternion as any);

    // 6. Update Wheels & Animate Visible Suspension Axles & Springs
    for (let i = 0; i < this.vehicleRaycast.wheelInfos.length; i++) {
      this.vehicleRaycast.updateWheelTransform(i);
      const t = this.vehicleRaycast.wheelInfos[i].worldTransform;
      this.wheelMeshes[i].position.copy(t.position as any);
      this.wheelMeshes[i].quaternion.copy(t.quaternion as any);
    }

    // Calculate suspension spring compression based on wheel distance to chassis
    const suspensionCompFactor = this.rideHeightLevel === 'high' ? 1.4 : (this.rideHeightLevel === 'low' ? 0.7 : 1.0);
    for (let i = 0; i < 4; i++) {
      if (this.suspensionVisuals.springs[i]) {
        this.suspensionVisuals.springs[i].scale.set(1.0, suspensionCompFactor, 1.0);
      }
    }

    // Update Brake Lights brightness
    const isBraking = this.throttle < 0 || this.handbrake;
    for (const bl of this.suspensionVisuals.brakeLights) {
      (bl.material as THREE.MeshStandardMaterial).emissive.setHex(isBraking ? 0xef4444 : 0x450a0a);
    }

    // Audio Engine Update
    const speedKmh = this.chassisBody.velocity.length() * 3.6;
    SoundEngine.getInstance().updateEngineRPM(this.throttle, speedKmh);
  }

  public refillFuel() {
    this.fuel = this.maxFuel;
    this.isEngineFlooded = false;
  }
}

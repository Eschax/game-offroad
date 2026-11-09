import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GameManager } from './core/GameManager';
import { AchievementManager } from './core/AchievementManager';
import { VehiclePhysics } from './vehicles/VehiclePhysics';
import { WinchSystem } from './vehicles/WinchSystem';
import { TerrainGenerator, TerrainObstacleInfo } from './terrains/TerrainGenerator';
import { ParticleSystem } from './terrains/ParticleSystem';
import { SoundEngine } from './core/SoundEngine';
import { UIManager } from './ui/UIManager';

type CameraViewMode = 'chase' | 'crawler' | 'hood';

class GameApp {
  private container: HTMLElement;
  private uiLayer: HTMLElement;
  private gm: GameManager;
  private achManager: AchievementManager;
  private uiManager: UIManager;

  // Three.js & Physics
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private world!: CANNON.World;

  // Active Gameplay
  private isPlaying: boolean = false;
  private activeVehicle: VehiclePhysics | null = null;
  private winchSystem: WinchSystem | null = null;
  private particleSystem: ParticleSystem | null = null;
  private terrainInfo: TerrainObstacleInfo | null = null;
  private activeMapId: string = 'map_01_pinewood';
  private cameraMode: CameraViewMode = 'chase';
  private lastCheckpointPos = new CANNON.Vec3(0, 1.5, 0);

  private clock = new THREE.Clock();

  constructor() {
    this.container = document.getElementById('game-container')!;
    this.uiLayer = document.getElementById('ui-layer')!;
    this.gm = GameManager.getInstance();
    this.achManager = AchievementManager.getInstance();

    this.uiManager = new UIManager(
      this.uiLayer,
      (mapId) => this.startPlay(mapId),
      () => this.exitToMenu(),
      () => this.toggleCameraMode(),
      () => this.respawnToCheckpoint()
    );

    this.init();
  }

  private async init() {
    await this.gm.initConfigs();

    this.setupThree();
    this.setupPhysics();

    window.addEventListener('resize', () => this.onResize());

    // Check First Launch
    if (this.gm.data.is_first_launch) {
      this.uiManager.showFirstTimePopup();
    } else {
      this.uiManager.showMainMenu();
    }

    this.animate();
  }

  private setupThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.012);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 5, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Dynamic Sun & Sky Lighting
    const ambientLight = new THREE.AmbientLight(0xfffbeb, 0.65);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    sunLight.position.set(40, 80, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    this.scene.add(sunLight);
  }

  private setupPhysics() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = 12;
  }

  private startPlay(mapId: string) {
    this.activeMapId = mapId;
    this.isPlaying = true;

    // Reset Scene & World
    this.cleanupGameplay();

    // 1. Build Terrain
    this.terrainInfo = TerrainGenerator.buildTrail(this.scene, this.world, mapId);

    // 2. Spawn Vehicle
    const selId = this.gm.data.selected_vehicle_id;
    const vEntry = this.gm.vehicles[selId] || Object.values(this.gm.vehicles)[0];
    const mods = this.gm.data.vehicle_mods[selId] || { lift_kit: 0, tires_tier: 1, has_winch: true, has_snorkel: false };

    this.lastCheckpointPos.set(0, 1.5, 0);
    this.activeVehicle = new VehiclePhysics(this.scene, this.world, vEntry, this.lastCheckpointPos, mods);
    this.winchSystem = new WinchSystem(this.scene, this.world);
    this.particleSystem = new ParticleSystem(this.scene);

    // Sound Engine Start
    SoundEngine.getInstance().startEngine();

    // 3. Show HUD
    this.uiManager.showGameplayHUD(this.activeVehicle, this.winchSystem, this.terrainInfo.anchorPositions);
  }

  private toggleCameraMode() {
    if (this.cameraMode === 'chase') this.cameraMode = 'crawler';
    else if (this.cameraMode === 'crawler') this.cameraMode = 'hood';
    else this.cameraMode = 'chase';
  }

  private respawnToCheckpoint() {
    if (!this.activeVehicle) return;
    this.activeVehicle.chassisBody.position.copy(this.lastCheckpointPos);
    this.activeVehicle.chassisBody.quaternion.set(0, 0, 0, 1);
    this.activeVehicle.chassisBody.velocity.set(0, 0, 0);
    this.activeVehicle.chassisBody.angularVelocity.set(0, 0, 0);
    this.activeVehicle.isEngineFlooded = false;
    if (this.winchSystem) this.winchSystem.disconnect();
  }

  private cleanupGameplay() {
    SoundEngine.getInstance().stopEngine();

    if (this.particleSystem) {
      this.particleSystem.destroy();
      this.particleSystem = null;
    }

    // Clear 3D objects except lights
    const toRemove: THREE.Object3D[] = [];
    this.scene.children.forEach(c => {
      if (!(c instanceof THREE.Light)) toRemove.push(c);
    });
    toRemove.forEach(c => this.scene.remove(c));

    // Clear Cannon World
    while (this.world.bodies.length > 0) {
      this.world.removeBody(this.world.bodies[0]);
    }
  }

  private exitToMenu() {
    this.isPlaying = false;
    this.cleanupGameplay();
    this.uiManager.showMainMenu();
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (this.isPlaying && this.activeVehicle && this.winchSystem) {
      // Step Cannon Physics
      this.world.step(1 / 60, delta, 3);

      if (this.terrainInfo) {
        this.activeVehicle.checkWaterAndTerrain(this.terrainInfo.waterLevel, delta);
      }

      this.activeVehicle.update(delta);
      this.winchSystem.update(this.activeVehicle);

      // Particle update & emit from rear wheels if throttle active
      if (this.particleSystem) {
        this.particleSystem.update(delta);
        if (Math.abs(this.activeVehicle.throttle) > 0.2) {
          const wPos1 = this.activeVehicle.wheelMeshes[2].position;
          const wPos2 = this.activeVehicle.wheelMeshes[3].position;
          this.particleSystem.emitFromWheel(wPos1, true, false);
          this.particleSystem.emitFromWheel(wPos2, true, false);
        }
      }

      // Camera Follow Modes (Chase / Crawler / Hood)
      const vPos = this.activeVehicle.mesh.position;
      if (this.cameraMode === 'chase') {
        const targetCamPos = new THREE.Vector3(vPos.x, vPos.y + 3.6, vPos.z + 7.2);
        this.camera.position.lerp(targetCamPos, 0.12);
        this.camera.lookAt(vPos.x, vPos.y + 0.8, vPos.z - 2.0);
      } else if (this.cameraMode === 'crawler') {
        // Close wheel-crawler cam
        const targetCamPos = new THREE.Vector3(vPos.x - 2.8, vPos.y + 1.2, vPos.z + 2.0);
        this.camera.position.lerp(targetCamPos, 0.15);
        this.camera.lookAt(vPos.x, vPos.y + 0.3, vPos.z + 0.5);
      } else if (this.cameraMode === 'hood') {
        // Driver / Hood Cam
        const targetCamPos = new THREE.Vector3(vPos.x, vPos.y + 1.4, vPos.z + 0.4);
        this.camera.position.copy(targetCamPos);
        this.camera.lookAt(vPos.x, vPos.y + 1.2, vPos.z - 15.0);
      }

      // Check Fuel Checkpoints / Finish
      if (this.terrainInfo) {
        // Fuel Station Refill Check
        for (const fp of this.terrainInfo.fuelStationPositions) {
          if (vPos.distanceTo(fp) < 4.0) {
            this.activeVehicle.refillFuel();
            this.lastCheckpointPos.copy(this.activeVehicle.chassisBody.position);
          }
        }

        // Finish Line Check
        if (vPos.z <= this.terrainInfo.finishZonePos.z) {
          this.gm.completeMap(this.activeMapId);
          this.achManager.checkAchievements();
          alert('🏆 SELAMAT! Anda berhasil menaklukkan jalur map ini!');
          this.exitToMenu();
        }
      }

      this.uiManager.updateHUD(this.activeVehicle);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});

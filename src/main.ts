import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GameManager } from './core/GameManager';
import { AchievementManager } from './core/AchievementManager';
import { VehiclePhysics } from './vehicles/VehiclePhysics';
import { WinchSystem } from './vehicles/WinchSystem';
import { TerrainGenerator, TerrainObstacleInfo } from './terrains/TerrainGenerator';
import { UIManager } from './ui/UIManager';

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
  private terrainInfo: TerrainObstacleInfo | null = null;
  private activeMapId: string = 'map_01_pinewood';

  private clock = new THREE.Clock();

  constructor() {
    this.container = document.getElementById('game-container')!;
    this.uiLayer = document.getElementById('ui-layer')!;
    this.gm = GameManager.getInstance();
    this.achManager = AchievementManager.getInstance();

    this.uiManager = new UIManager(
      this.uiLayer,
      (mapId) => this.startPlay(mapId),
      () => this.exitToMenu()
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
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 5, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.4);
    dirLight.position.set(30, 60, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 40;
    dirLight.shadow.camera.bottom = -40;
    this.scene.add(dirLight);
  }

  private setupPhysics() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = 10;
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

    const spawnPos = new CANNON.Vec3(0, 1.5, 0);
    this.activeVehicle = new VehiclePhysics(this.scene, this.world, vEntry, spawnPos);
    this.winchSystem = new WinchSystem(this.scene, this.world);

    // 3. Show HUD
    this.uiManager.showGameplayHUD(this.activeVehicle, this.winchSystem, this.terrainInfo.anchorPositions);
  }

  private cleanupGameplay() {
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

      this.activeVehicle.update(delta);
      this.winchSystem.update(this.activeVehicle);

      // Camera Follow Smooth
      const vPos = this.activeVehicle.mesh.position;
      const targetCamPos = new THREE.Vector3(
        vPos.x,
        vPos.y + 3.8,
        vPos.z + 7.5
      );
      this.camera.position.lerp(targetCamPos, 0.1);
      this.camera.lookAt(vPos.x, vPos.y + 1.0, vPos.z - 2.0);

      // Check Checkpoints / Finish
      if (this.terrainInfo) {
        // Fuel Station Refill Check
        for (const fp of this.terrainInfo.fuelStationPositions) {
          if (vPos.distanceTo(fp) < 4.0) {
            this.activeVehicle.refillFuel();
          }
        }

        // Finish Line Check (Z <= finishZonePos.z)
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

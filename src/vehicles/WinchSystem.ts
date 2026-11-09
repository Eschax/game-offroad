import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { VehiclePhysics } from '../vehicles/VehiclePhysics';
import { GameManager } from '../core/GameManager';

export class WinchSystem {
  private scene: THREE.Scene;
  private world: CANNON.World;
  private lineMesh: THREE.Line;
  public isConnected: boolean = false;
  private targetAnchorPos: THREE.Vector3 | null = null;
  private lineGeo: THREE.BufferGeometry;

  constructor(scene: THREE.Scene, world: CANNON.World) {
    this.scene = scene;
    this.world = world;

    const lineMat = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 3 });
    this.lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    this.lineMesh = new THREE.Line(this.lineGeo, lineMat);
    this.lineMesh.visible = false;
    this.scene.add(this.lineMesh);
  }

  public toggleWinch(vehicle: VehiclePhysics, anchors: THREE.Vector3[]): boolean {
    if (this.isConnected) {
      this.disconnect();
      return false;
    }

    // Find closest anchor within 25 meters
    const vPos = new THREE.Vector3(
      vehicle.chassisBody.position.x,
      vehicle.chassisBody.position.y,
      vehicle.chassisBody.position.z
    );

    let closest: THREE.Vector3 | null = null;
    let minDist = 25.0;

    for (const a of anchors) {
      const d = vPos.distanceTo(a);
      if (d < minDist) {
        minDist = d;
        closest = a;
      }
    }

    if (closest) {
      this.isConnected = true;
      this.targetAnchorPos = closest;
      this.lineMesh.visible = true;
      GameManager.getInstance().data.stats.winch_used_count++;
      GameManager.getInstance().saveData();
      return true;
    }

    return false;
  }

  public disconnect() {
    this.isConnected = false;
    this.targetAnchorPos = null;
    this.lineMesh.visible = false;
  }

  public update(vehicle: VehiclePhysics) {
    if (!this.isConnected || !this.targetAnchorPos) return;

    const vPos = new THREE.Vector3(
      vehicle.chassisBody.position.x,
      vehicle.chassisBody.position.y + 0.5,
      vehicle.chassisBody.position.z
    );

    // Update Line visual
    const positions = new Float32Array([
      vPos.x, vPos.y, vPos.z,
      this.targetAnchorPos.x, this.targetAnchorPos.y, this.targetAnchorPos.z
    ]);
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.lineGeo.attributes.position.needsUpdate = true;

    // Apply spring pulling force towards anchor
    const dir = new CANNON.Vec3(
      this.targetAnchorPos.x - vPos.x,
      this.targetAnchorPos.y - vPos.y,
      this.targetAnchorPos.z - vPos.z
    );
    const dist = dir.length();

    if (dist < 2.0 || dist > 30.0) {
      this.disconnect();
      return;
    }

    dir.normalize();
    const pullForce = 18000; // Strong winch pull
    vehicle.chassisBody.applyForce(dir.scale(pullForce), vehicle.chassisBody.position);
  }
}


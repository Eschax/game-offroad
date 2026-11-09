import * as THREE from 'three';

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private geo: THREE.BufferGeometry;
  private positions: Float32Array;
  private velocities: Float32Array;
  private count: number = 80;
  private nextIndex: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);

    // Initial positions hidden below ground
    for (let i = 0; i < this.count * 3; i++) {
      this.positions[i] = -999;
      this.velocities[i] = 0;
    }

    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x573e20, // Mud/Dust color
      size: 0.35,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });

    this.particles = new THREE.Points(this.geo, mat);
    this.scene.add(this.particles);
  }

  public emitFromWheel(wheelPos: THREE.Vector3, isMud: boolean, isSnow: boolean) {
    const idx = this.nextIndex * 3;
    this.positions[idx] = wheelPos.x + (Math.random() - 0.5) * 0.4;
    this.positions[idx + 1] = wheelPos.y + 0.1;
    this.positions[idx + 2] = wheelPos.z + (Math.random() - 0.5) * 0.4;

    this.velocities[idx] = (Math.random() - 0.5) * 2.0;
    this.velocities[idx + 1] = 1.5 + Math.random() * 2.5;
    this.velocities[idx + 2] = 2.0 + Math.random() * 3.0;

    this.nextIndex = (this.nextIndex + 1) % this.count;
    this.geo.attributes.position.needsUpdate = true;
  }

  public update(delta: number) {
    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      if (this.positions[idx + 1] > -900) {
        this.positions[idx] += this.velocities[idx] * delta;
        this.positions[idx + 1] += this.velocities[idx + 1] * delta;
        this.positions[idx + 2] += this.velocities[idx + 2] * delta;

        // Gravity
        this.velocities[idx + 1] -= 9.8 * delta;

        // Ground hit
        if (this.positions[idx + 1] < 0) {
          this.positions[idx + 1] = -999;
        }
      }
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  public destroy() {
    this.scene.remove(this.particles);
    this.geo.dispose();
  }
}

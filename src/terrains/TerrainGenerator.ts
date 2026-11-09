import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export interface TerrainObstacleInfo {
  anchorPositions: THREE.Vector3[];
  fuelStationPositions: THREE.Vector3[];
  finishZonePos: THREE.Vector3;
}

export class TerrainGenerator {
  public static buildTrail(scene: THREE.Scene, world: CANNON.World, mapId: string): TerrainObstacleInfo {
    const anchors: THREE.Vector3[] = [];
    const fuelStations: THREE.Vector3[] = [];

    // 1. Base Ground (150m x 250m)
    const groundMat = new CANNON.Material('groundMat');
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: groundMat
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    // Ground Visual
    let groundColor = 0x57534e; // Gravel Brown
    if (mapId === 'map_02_swamp') groundColor = 0x3f3f46; // Muddy Swamp
    if (mapId === 'map_03_frostbite') groundColor = 0xf1f5f9; // Snow White
    if (mapId === 'map_04_devils_canyon') groundColor = 0xb45309; // Red Canyon Rock

    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(250, 400),
      new THREE.MeshStandardMaterial({ color: groundColor, roughness: 0.9 })
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // 2. Obstacles Along the Trail (Z = -20 to -220)
    // Section A: Rocks (Z = -40 to -70)
    for (let i = 0; i < 14; i++) {
      const rx = (Math.random() - 0.5) * 14;
      const rz = -40 - Math.random() * 30;
      const size = 1.0 + Math.random() * 1.8;

      const rockShape = new CANNON.Box(new CANNON.Vec3(size * 0.5, size * 0.35, size * 0.5));
      const rockBody = new CANNON.Body({
        mass: 0, // Static
        position: new CANNON.Vec3(rx, size * 0.35, rz)
      });
      rockBody.addShape(rockShape);
      world.addBody(rockBody);

      const rockMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(size * 0.7),
        new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 })
      );
      rockMesh.position.set(rx, size * 0.35, rz);
      rockMesh.castShadow = true;
      scene.add(rockMesh);
    }

    // Section B: Mud / Swamp Zone (Z = -80 to -120)
    const mudMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 40),
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.2, metalness: 0.1 })
    );
    mudMesh.rotation.x = -Math.PI / 2;
    mudMesh.position.set(0, 0.05, -100);
    mudMesh.receiveShadow = true;
    scene.add(mudMesh);

    // Section C: Wooden Bridge / Fallen Logs (Z = -130 to -160)
    for (let i = 0; i < 8; i++) {
      const lz = -130 - i * 3.5;
      const logBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(3.5, 0.3, 0.4)),
        position: new CANNON.Vec3(0, 0.3, lz)
      });
      world.addBody(logBody);

      const logMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 7, 12),
        new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.8 })
      );
      logMesh.rotation.z = Math.PI / 2;
      logMesh.position.set(0, 0.3, lz);
      logMesh.castShadow = true;
      scene.add(logMesh);
    }

    // Trees as Winch Anchors along sides
    for (let z = -20; z >= -220; z -= 25) {
      const treePos1 = new THREE.Vector3(-10, 0, z);
      const treePos2 = new THREE.Vector3(10, 0, z + 12);
      anchors.push(treePos1, treePos2);

      this.createTreeVisual(scene, treePos1);
      this.createTreeVisual(scene, treePos2);
    }

    // Fuel Station at Checkpoint (Z = -110)
    const fuelPos = new THREE.Vector3(6, 0, -110);
    fuelStations.push(fuelPos);
    this.createFuelStationVisual(scene, fuelPos);

    // Finish Arch (Z = -220)
    const finishPos = new THREE.Vector3(0, 0, -220);
    this.createFinishArchVisual(scene, finishPos);

    return {
      anchorPositions: anchors,
      fuelStationPositions: fuelStations,
      finishZonePos: finishPos
    };
  }

  private static createTreeVisual(scene: THREE.Scene, pos: THREE.Vector3) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 3.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
    );
    trunk.position.set(pos.x, 1.75, pos.z);
    trunk.castShadow = true;
    scene.add(trunk);

    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 5, 8),
      new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.6 })
    );
    foliage.position.set(pos.x, 5.0, pos.z);
    foliage.castShadow = true;
    scene.add(foliage);
  }

  private static createFuelStationVisual(scene: THREE.Scene, pos: THREE.Vector3) {
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 1.8, 16),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })
    );
    drum.position.set(pos.x, 0.9, pos.z);
    drum.castShadow = true;
    scene.add(drum);

    const label = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.85),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    label.position.set(pos.x, 1.2, pos.z);
    scene.add(label);
  }

  private static createFinishArchVisual(scene: THREE.Scene, pos: THREE.Vector3) {
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), postMat);
    p1.position.set(pos.x - 4, 2.5, pos.z);
    const p2 = p1.clone();
    p2.position.x = pos.x + 4;

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.0, 0.5), postMat);
    crossbar.position.set(pos.x, 5.0, pos.z);

    scene.add(p1);
    scene.add(p2);
    scene.add(crossbar);
  }
}

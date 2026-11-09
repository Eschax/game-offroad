import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export interface TerrainObstacleInfo {
  anchorPositions: THREE.Vector3[];
  fuelStationPositions: THREE.Vector3[];
  finishZonePos: THREE.Vector3;
  waterLevel: number;
}

export class TerrainGenerator {
  public static buildTrail(scene: THREE.Scene, world: CANNON.World, mapId: string): TerrainObstacleInfo {
    const anchors: THREE.Vector3[] = [];
    const fuelStations: THREE.Vector3[] = [];
    const waterLevel = 0.5;

    // 1. Procedural Noise Bump Texture Generator for Realistic PBR Ground
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    for (let x = 0; x < 256; x++) {
      for (let y = 0; y < 256; y++) {
        const val = Math.floor(Math.random() * 80 + 100);
        ctx.fillStyle = `rgb(${val},${val},${val})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    const noiseTex = new THREE.CanvasTexture(canvas);
    noiseTex.wrapS = THREE.RepeatWrapping;
    noiseTex.wrapT = THREE.RepeatWrapping;
    noiseTex.repeat.set(16, 24);

    // 2. Base Ground Colors by Map
    let groundColor = 0x57534e; // Gravel Brown
    let rockColor = 0x78716c;
    if (mapId === 'map_02_swamp') {
      groundColor = 0x3f3f46; // Muddy Swamp
      rockColor = 0x52525b;
    } else if (mapId === 'map_03_frostbite') {
      groundColor = 0xf8fafc; // Snow White
      rockColor = 0x94a3b8;
    } else if (mapId === 'map_04_devils_canyon') {
      groundColor = 0xb45309; // Red Canyon
      rockColor = 0xd97706;
    }

    const groundMat = new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.85,
      metalness: 0.1,
      bumpMap: noiseTex,
      bumpScale: 0.08
    });

    // 3. SEGMENTED ROLLING HILLS & ELEVATION TERRAIN (Z = 10 to -240)
    // Cannon Ground Plane
    const groundBodyMat = new CANNON.Material('groundMat');
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: groundBodyMat
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    // Three.js Ground Mesh with Elevation Waves
    const terrainGeo = new THREE.PlaneGeometry(160, 360, 64, 120);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i); // Note: PlaneGeometry is in XY before rotation

      // Wave mountains on borders (|x| > 12)
      let zElevation = 0;
      if (Math.abs(x) > 12) {
        zElevation = Math.pow((Math.abs(x) - 12) * 0.35, 1.8);
      }

      // Trail natural undulating bumps
      zElevation += Math.sin(y * 0.08) * 0.6 + Math.cos(x * 0.1) * 0.4;

      // Deep River Basin at Z = -100 to -115 (y in Plane is -pos.z)
      if (y > 90 && y < 120) {
        zElevation -= 1.4;
      }

      posAttr.setZ(i, zElevation);
    }
    terrainGeo.computeVertexNormals();

    const terrainMesh = new THREE.Mesh(terrainGeo, groundMat);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.position.set(0, 0, -100);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // 4. REALISTIC WATER CROSSING (Sungai Air Berarus di Cekungan)
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.72,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6
    });
    const riverMesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 26), waterMat);
    riverMesh.rotation.x = -Math.PI / 2;
    riverMesh.position.set(0, waterLevel, -105);
    scene.add(riverMesh);

    // 5. ROCK CRAWLING SECTION (Z = -35 to -70)
    for (let i = 0; i < 18; i++) {
      const rx = (Math.random() - 0.5) * 14;
      const rz = -35 - Math.random() * 35;
      const size = 1.2 + Math.random() * 1.8;

      const rockShape = new CANNON.Box(new CANNON.Vec3(size * 0.5, size * 0.4, size * 0.5));
      const rockBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(rx, size * 0.35, rz)
      });
      rockBody.addShape(rockShape);
      world.addBody(rockBody);

      const rockGeo = new THREE.DodecahedronGeometry(size * 0.7, 1);
      const rockMesh = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({
        color: rockColor,
        roughness: 0.9,
        bumpMap: noiseTex,
        bumpScale: 0.12
      }));
      rockMesh.position.set(rx, size * 0.35, rz);
      rockMesh.castShadow = true;
      scene.add(rockMesh);
    }

    // 6. DEEP MUD SWAMP ZONE (Z = -75 to -95)
    const mudMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.25,
      metalness: 0.2
    });
    const mudMesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 24), mudMat);
    mudMesh.rotation.x = -Math.PI / 2;
    mudMesh.position.set(0, 0.08, -85);
    mudMesh.receiveShadow = true;
    scene.add(mudMesh);

    // 7. TWO-TRACK LOG BRIDGE (Jembatan Kayu Kembar di atas Jurang/Sungai)
    const logMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.85 });
    for (let i = 0; i < 10; i++) {
      const lz = -125 - i * 2.8;

      // Track Kiri
      const logBodyL = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.55, 0.2, 1.3)),
        position: new CANNON.Vec3(-1.1, 0.35, lz)
      });
      world.addBody(logBodyL);

      const logMeshL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 2.6), logMat);
      logMeshL.position.set(-1.1, 0.35, lz);
      logMeshL.castShadow = true;
      scene.add(logMeshL);

      // Track Kanan
      const logBodyR = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.55, 0.2, 1.3)),
        position: new CANNON.Vec3(1.1, 0.35, lz)
      });
      world.addBody(logBodyR);

      const logMeshR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 2.6), logMat);
      logMeshR.position.set(1.1, 0.35, lz);
      logMeshR.castShadow = true;
      scene.add(logMeshR);
    }

    // 8. WINCH ANCHOR TREES ALONG TRAIL
    for (let z = -20; z >= -240; z -= 22) {
      const treePos1 = new THREE.Vector3(-10.5, 0, z);
      const treePos2 = new THREE.Vector3(10.5, 0, z + 11);
      anchors.push(treePos1, treePos2);

      this.createTreeVisual(scene, treePos1);
      this.createTreeVisual(scene, treePos2);
    }

    // 9. FUEL CHECKPOINT (Z = -115)
    const fuelPos = new THREE.Vector3(5.5, 0, -115);
    fuelStations.push(fuelPos);
    this.createFuelStationVisual(scene, fuelPos);

    // 10. FINISH LINE ARCH (Z = -230)
    const finishPos = new THREE.Vector3(0, 0, -230);
    this.createFinishArchVisual(scene, finishPos);

    return {
      anchorPositions: anchors,
      fuelStationPositions: fuelStations,
      finishZonePos: finishPos,
      waterLevel
    };
  }

  private static createTreeVisual(scene: THREE.Scene, pos: THREE.Vector3) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.6, 3.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
    );
    trunk.position.set(pos.x, 1.9, pos.z);
    trunk.castShadow = true;
    scene.add(trunk);

    const foliage1 = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 4.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.6 })
    );
    foliage1.position.set(pos.x, 4.5, pos.z);
    foliage1.castShadow = true;

    const foliage2 = new THREE.Mesh(
      new THREE.ConeGeometry(1.8, 3.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 })
    );
    foliage2.position.set(pos.x, 6.5, pos.z);
    foliage2.castShadow = true;

    scene.add(foliage1, foliage2);
  }

  private static createFuelStationVisual(scene: THREE.Scene, pos: THREE.Vector3) {
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 2.0, 16),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.2 })
    );
    drum.position.set(pos.x, 1.0, pos.z);
    drum.castShadow = true;
    scene.add(drum);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 1.0),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    sign.position.set(pos.x, 1.4, pos.z);
    scene.add(sign);
  }

  private static createFinishArchVisual(scene: THREE.Scene, pos: THREE.Vector3) {
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.4 });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.6), postMat);
    p1.position.set(pos.x - 4.5, 3.0, pos.z);
    const p2 = p1.clone();
    p2.position.x = pos.x + 4.5;

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.2, 0.6), postMat);
    crossbar.position.set(pos.x, 6.0, pos.z);

    scene.add(p1, p2, crossbar);
  }
}

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

    // 1. GENERATE REALISTIC BLENDED TEXTURE (Rumput Hijau Alami + Jalur Bekas Roda Ban Berlumpur/Kerikil)
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 1024;
    texCanvas.height = 1024;
    const ctx = texCanvas.getContext('2d')!;

    // Dasar Rumput Pinus & Tanah Hutan
    ctx.fillStyle = '#2d4a22'; // Hijau pinus gelap
    ctx.fillRect(0, 0, 1024, 1024);

    // Tambah variasi bintik rumput & lumut liar
    for (let i = 0; i < 4000; i++) {
      const rx = Math.random() * 1024;
      const ry = Math.random() * 1024;
      ctx.fillStyle = Math.random() > 0.5 ? '#365314' : '#14532d';
      ctx.fillRect(rx, ry, Math.random() * 6 + 2, Math.random() * 6 + 2);
    }

    // Jalur Utama Bekas Roda Mobil (Offroad 2-Rut Trail di tengah, X = 400 s/d 624)
    ctx.fillStyle = '#452c16'; // Tanah coklat tanah liat
    ctx.fillRect(380, 0, 264, 1024);

    // Alur Roda Kiri & Kanan (Tire Ruts pekat berlumpur)
    ctx.fillStyle = '#26170d';
    ctx.fillRect(410, 0, 70, 1024);
    ctx.fillRect(544, 0, 70, 1024);

    // Kerikil & Batu lepas di tengah jalur
    for (let i = 0; i < 1800; i++) {
      const kx = 380 + Math.random() * 264;
      const ky = Math.random() * 1024;
      ctx.fillStyle = Math.random() > 0.6 ? '#78716c' : '#57534e';
      ctx.beginPath();
      ctx.arc(kx, ky, Math.random() * 4 + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    const groundDiffuseTex = new THREE.CanvasTexture(texCanvas);
    groundDiffuseTex.wrapS = THREE.RepeatWrapping;
    groundDiffuseTex.wrapT = THREE.RepeatWrapping;
    groundDiffuseTex.repeat.set(1, 14);

    // Normal & Bump Map Prosedural
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 256;
    bumpCanvas.height = 256;
    const bCtx = bumpCanvas.getContext('2d')!;
    for (let x = 0; x < 256; x++) {
      for (let y = 0; y < 256; y++) {
        const val = Math.floor(Math.random() * 120 + 70);
        bCtx.fillStyle = `rgb(${val},${val},${val})`;
        bCtx.fillRect(x, y, 1, 1);
      }
    }
    const groundBumpTex = new THREE.CanvasTexture(bumpCanvas);
    groundBumpTex.wrapS = THREE.RepeatWrapping;
    groundBumpTex.wrapT = THREE.RepeatWrapping;
    groundBumpTex.repeat.set(8, 28);

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundDiffuseTex,
      bumpMap: groundBumpTex,
      bumpScale: 0.15,
      roughness: 0.82,
      metalness: 0.08
    });

    // 2. KONTUR JALUR 3D REALISTIS (3D Bumpy Terrain with Slopes & Ruts)
    const terrainLength = 320;
    const terrainWidth = 120;
    const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainLength, 48, 128);
    const posAttr = terrainGeo.attributes.position;

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i); // Y pada plane = -Z posisi dunia

      let zElevation = 0;

      // Tebing & Bukit Pembatas Jalur Kiri/Kanan (|x| > 9)
      if (Math.abs(x) > 9) {
        zElevation = Math.pow((Math.abs(x) - 9) * 0.45, 1.85);
      }

      // Tanjakan Curam & Turunan Bergelombang (Bumpy Trail)
      zElevation += Math.sin(y * 0.06) * 1.8 + Math.cos(x * 0.15) * 0.4;

      // Cekungan Jalur Roda (Tire Ruts di X = -1.2 dan X = 1.2)
      if (Math.abs(x - 1.2) < 0.6 || Math.abs(x + 1.2) < 0.6) {
        zElevation -= 0.22;
      }

      // Lembah Cekungan Sungai di Y = 90 s/d 115
      if (y > 85 && y < 118) {
        zElevation -= 2.2;
      }

      posAttr.setZ(i, zElevation);
    }
    terrainGeo.computeVertexNormals();

    const terrainMesh = new THREE.Mesh(terrainGeo, groundMat);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.position.set(0, 0, -110);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Fisika Dasar Cannon Plane
    const groundBodyMat = new CANNON.Material('groundMat');
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: groundBodyMat
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    // Collider Tambahan untuk Rintangan Bukit & Tanjakan Utama
    this.addHillColliders(world);

    // 3. AIR SUNGAI REALISTIS BERGELOMBANG (Water Crossing)
    const riverGeo = new THREE.PlaneGeometry(36, 28, 16, 16);
    const riverMat = new THREE.MeshPhysicalMaterial({
      color: 0x0369a1,
      transparent: true,
      opacity: 0.78,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.5,
      ior: 1.33
    });
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.rotation.x = -Math.PI / 2;
    riverMesh.position.set(0, waterLevel, -100);
    scene.add(riverMesh);

    // 4. BATU TEBING REALISTIS (3D Jagged Rocks)
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.9,
      metalness: 0.1
    });

    for (let i = 0; i < 24; i++) {
      const rx = (Math.random() - 0.5) * 12;
      const rz = -35 - Math.random() * 45;
      const size = 1.3 + Math.random() * 2.0;

      const rockShape = new CANNON.Box(new CANNON.Vec3(size * 0.45, size * 0.35, size * 0.45));
      const rockBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(rx, size * 0.35, rz)
      });
      rockBody.addShape(rockShape);
      world.addBody(rockBody);

      const rockMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(size * 0.65, 1), rockMat);
      rockMesh.position.set(rx, size * 0.35, rz);
      rockMesh.castShadow = true;
      rockMesh.receiveShadow = true;
      scene.add(rockMesh);
    }

    // 5. JEMBATAN BALOK KAYU KEMBAR (Two-Track Log Bridge)
    const logMat = new THREE.MeshStandardMaterial({ color: 0x5c2b0c, roughness: 0.9 });
    for (let i = 0; i < 11; i++) {
      const lz = -120 - i * 2.6;

      // Track Kiri
      const bodyL = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.55, 0.18, 1.2)),
        position: new CANNON.Vec3(-1.15, 0.4, lz)
      });
      world.addBody(bodyL);

      const meshL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 2.4), logMat);
      meshL.position.set(-1.15, 0.4, lz);
      meshL.castShadow = true;
      scene.add(meshL);

      // Track Kanan
      const bodyR = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.55, 0.18, 1.2)),
        position: new CANNON.Vec3(1.15, 0.4, lz)
      });
      world.addBody(bodyR);

      const meshR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 2.4), logMat);
      meshR.position.set(1.15, 0.4, lz);
      meshR.castShadow = true;
      scene.add(meshR);
    }

    // 6. POHON PINUS HUTAN LEBAT (Realistic Pine Trees)
    for (let z = -15; z >= -240; z -= 18) {
      const p1 = new THREE.Vector3(-10.5, 0, z);
      const p2 = new THREE.Vector3(10.5, 0, z + 9);
      anchors.push(p1, p2);

      this.createPineTree(scene, p1);
      this.createPineTree(scene, p2);

      // Pohon ekstra di pinggir bukit
      this.createPineTree(scene, new THREE.Vector3(-16.0, 1.5, z - 4));
      this.createPineTree(scene, new THREE.Vector3(16.0, 1.5, z + 5));
    }

    // 7. DRUM BBM CHECKPOINT & GARIS FINISH
    const fuelPos = new THREE.Vector3(5.0, 0, -110);
    fuelStations.push(fuelPos);
    this.createFuelStationVisual(scene, fuelPos);

    const finishPos = new THREE.Vector3(0, 0, -225);
    this.createFinishArchVisual(scene, finishPos);

    return {
      anchorPositions: anchors,
      fuelStationPositions: fuelStations,
      finishZonePos: finishPos,
      waterLevel
    };
  }

  private static addHillColliders(world: CANNON.World) {
    // Tanjakan Bergelombang 1 di Z = -50
    const hill1 = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(8, 0.8, 10)),
      position: new CANNON.Vec3(0, 0.2, -50)
    });
    hill1.quaternion.setFromEuler(0.12, 0, 0);
    world.addBody(hill1);

    // Tanjakan Curam 2 di Z = -160
    const hill2 = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(8, 1.2, 14)),
      position: new CANNON.Vec3(0, 0.4, -160)
    });
    hill2.quaternion.setFromEuler(-0.16, 0, 0);
    world.addBody(hill2);
  }

  private static createPineTree(scene: THREE.Scene, pos: THREE.Vector3) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7 });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 4.0, 8), trunkMat);
    trunk.position.set(pos.x, 2.0, pos.z);
    trunk.castShadow = true;
    scene.add(trunk);

    const layer1 = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.8, 8), foliageMat);
    layer1.position.set(pos.x, 4.2, pos.z);
    layer1.castShadow = true;

    const layer2 = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.2, 8), foliageMat);
    layer2.position.set(pos.x, 6.0, pos.z);
    layer2.castShadow = true;

    const layer3 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.4, 8), foliageMat);
    layer3.position.set(pos.x, 7.5, pos.z);
    layer3.castShadow = true;

    scene.add(layer1, layer2, layer3);
  }

  private static createFuelStationVisual(scene: THREE.Scene, pos: THREE.Vector3) {
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 2.0, 16),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35, metalness: 0.3 })
    );
    drum.position.set(pos.x, 1.0, pos.z);
    drum.castShadow = true;
    scene.add(drum);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    sign.position.set(pos.x, 1.5, pos.z);
    scene.add(sign);
  }

  private static createFinishArchVisual(scene: THREE.Scene, pos: THREE.Vector3) {
    const postMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.6), postMat);
    p1.position.set(pos.x - 4.5, 3.0, pos.z);
    const p2 = p1.clone();
    p2.position.x = pos.x + 4.5;

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.2, 0.6), postMat);
    crossbar.position.set(pos.x, 6.0, pos.z);

    scene.add(p1, p2, crossbar);
  }
}

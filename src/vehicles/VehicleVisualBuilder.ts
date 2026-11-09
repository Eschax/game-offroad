import * as THREE from 'three';
import { VehicleEntry } from '../core/GameManager';

export interface VisualSuspensionComponents {
  frontAxle: THREE.Group;
  rearAxle: THREE.Group;
  springs: THREE.Mesh[];
  spotLights: THREE.SpotLight[];
  brakeLights: THREE.Mesh[];
}

export class VehicleVisualBuilder {
  public static buildDetailedVehicle(
    entry: VehicleEntry,
    mods: { lift_kit: number; tires_tier: number; has_winch: boolean; has_snorkel: boolean }
  ): { vehicleGroup: THREE.Group; suspension: VisualSuspensionComponents } {
    const group = new THREE.Group();

    // Palet Warna & Material Utama
    let bodyColor = 0xd97706; // Rubicon Amber
    if (entry.id === 'dmax') bodyColor = 0x2563eb; // Metallic Blue
    if (entry.id === 'patrol') bodyColor = 0xe2e8f0; // Pearl White
    if (entry.id === 'ram') bodyColor = 0x18181b; // Matte Charcoal

    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.35,
      metalness: 0.55
    });

    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.2
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.15,
      metalness: 0.95
    });

    const wb = entry.specs.wheelbase_m;

    // 1. CHASSIS FRAME (Rangka Besi Bawah)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
    const frame1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, wb * 1.55), frameMat);
    frame1.position.set(0.55, 0.15, 0);
    const frame2 = frame1.clone();
    frame2.position.x = -0.55;
    group.add(frame1, frame2);

    // 2. BODI UTAMA SESUAI KARAKTER KENDARAAN
    if (entry.id === 'rubicon') {
      // --- JEEP RUBICON 4X4 ---
      // Lower Tub
      const tub = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, wb * 1.4), bodyMat);
      tub.position.set(0, 0.45, 0);
      tub.castShadow = true;
      group.add(tub);

      // Fender Flares (Khas Kotak Rubicon)
      const fenderF1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.9), blackTrimMat);
      fenderF1.position.set(0.98, 0.5, wb * 0.48);
      const fenderF2 = fenderF1.clone();
      fenderF2.position.x = -0.98;
      const fenderR1 = fenderF1.clone();
      fenderR1.position.set(0.98, 0.5, -wb * 0.48);
      const fenderR2 = fenderR1.clone();
      fenderR2.position.x = -0.98;
      group.add(fenderF1, fenderF2, fenderR1, fenderR2);

      // Kabin Kotak & Kaca
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.7, wb * 0.95), blackTrimMat);
      cabin.position.set(0, 1.05, -0.2);
      cabin.castShadow = true;
      group.add(cabin);

      // Kaca Depan
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.08), glassMat);
      windshield.position.set(0, 1.02, wb * 0.28);
      windshield.rotation.x = -0.25;
      group.add(windshield);

      // Grille 7-Slot & Lampu Bulat
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.08), blackTrimMat);
      grille.position.set(0, 0.5, wb * 0.71);
      group.add(grille);

      // Ban Serep Belakang
      const spareTire = this.createTireMesh(0.46, 0.22);
      spareTire.rotation.y = Math.PI / 2;
      spareTire.position.set(0, 0.75, -wb * 0.75);
      group.add(spareTire);

    } else if (entry.id === 'dmax') {
      // --- ISUZU D-MAX PICKUP DOUBLE CABIN ---
      // Kabin Penumpang Depan
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.78, wb * 0.85), bodyMat);
      cabin.position.set(0, 0.95, wb * 0.15);
      cabin.castShadow = true;
      group.add(cabin);

      // Kaca Kabin
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 0.08), glassMat);
      windshield.position.set(0, 1.0, wb * 0.58);
      windshield.rotation.x = -0.4;
      group.add(windshield);

      // Kap Mesin Miring
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, wb * 0.55), bodyMat);
      hood.position.set(0, 0.6, wb * 0.65);
      hood.rotation.x = 0.05;
      group.add(hood);

      // Bak Belakang Terbuka
      const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.4, wb * 0.85), bodyMat);
      bedFloor.position.set(0, 0.45, -wb * 0.5);
      group.add(bedFloor);

      // Rollbar Belakang Besi
      const rollbar = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 8, 16, Math.PI), blackTrimMat);
      rollbar.rotation.z = Math.PI;
      rollbar.position.set(0, 1.25, -wb * 0.15);
      group.add(rollbar);

    } else if (entry.id === 'patrol') {
      // --- NISSAN PATROL OVERLAND EXPEDITION ---
      // Bodi Besar Panjang
      const mainBody = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.72, wb * 1.45), bodyMat);
      mainBody.position.set(0, 0.55, 0);
      mainBody.castShadow = true;
      group.add(mainBody);

      // Kabin & Kaca Jendela Panjang
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.7, wb * 1.1), bodyMat);
      cabin.position.set(0, 1.15, -0.15);
      group.add(cabin);

      const glassFront = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 0.08), glassMat);
      glassFront.position.set(0, 1.12, wb * 0.42);
      glassFront.rotation.x = -0.3;
      group.add(glassFront);

      // Roof Rack Ekspedisi di Atap
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, wb * 0.95), blackTrimMat);
      rack.position.set(0, 1.55, -0.15);
      group.add(rack);

      // Lampu Sorot LED Bar di Roof Rack
      const ledBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.12), chromeMat);
      ledBar.position.set(0, 1.58, wb * 0.35);
      group.add(ledBar);

    } else {
      // --- RAM HEAVY DUTY MUD TRUCK ---
      // Kap Mesin Tinggi & Berotot
      const hood = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.65, wb * 0.65), bodyMat);
      hood.position.set(0, 0.8, wb * 0.68);
      group.add(hood);

      // Grille Krom Raksasa
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.1), chromeMat);
      grille.position.set(0, 0.72, wb * 1.02);
      group.add(grille);

      // Kabin Crew Cab Lebar
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.85, wb * 0.95), bodyMat);
      cabin.position.set(0, 1.15, wb * 0.1);
      group.add(cabin);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 0.08), glassMat);
      windshield.position.set(0, 1.2, wb * 0.58);
      windshield.rotation.x = -0.35;
      group.add(windshield);

      // Bak Panjang Belakang
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, wb * 0.9), bodyMat);
      bed.position.set(0, 0.65, -wb * 0.55);
      group.add(bed);
    }

    // 3. FRONT BULLBAR & WINCH
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.35), blackTrimMat);
    bumper.position.set(0, 0.3, wb * 0.76);
    group.add(bumper);

    if (mods.has_winch) {
      const winchBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.25), chromeMat);
      winchBox.position.set(0, 0.42, wb * 0.85);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 12), chromeMat);
      hook.position.set(0, 0.38, wb * 0.98);
      group.add(winchBox, hook);
    }

    // 4. SNORKEL VISUAL MOD
    if (mods.has_snorkel) {
      const snorkelPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 10), blackTrimMat);
      snorkelPipe.position.set(0.95, 1.1, wb * 0.35);
      const snorkelHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), blackTrimMat);
      snorkelHead.position.set(0.95, 1.65, wb * 0.38);
      group.add(snorkelPipe, snorkelHead);
    }

    // 5. PENCAHAYAAN AKTIF (SpotLights & Brake Lights)
    const spotLights: THREE.SpotLight[] = [];
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const createHeadlight = (x: number) => {
      const hlMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.08), hlMat);
      hlMesh.position.set(x, 0.48, wb * 0.72);
      group.add(hlMesh);

      const spot = new THREE.SpotLight(0xfffbeb, 3.5, 60, Math.PI / 5, 0.35, 1.2);
      spot.position.set(x, 0.5, wb * 0.75);
      spot.target.position.set(x, 0, wb * 0.75 + 20);
      group.add(spot);
      group.add(spot.target);
      spotLights.push(spot);
    };

    createHeadlight(0.68);
    createHeadlight(-0.68);

    // Lampu Rem Belakang
    const brakeLights: THREE.Mesh[] = [];
    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x7f1d1d,
      roughness: 0.3
    });
    const brL1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.06), brakeMat);
    brL1.position.set(0.75, 0.5, -wb * 0.72);
    const brL2 = brL1.clone();
    brL2.position.x = -0.75;
    group.add(brL1, brL2);
    brakeLights.push(brL1, brL2);

    // 6. VISUAL SUSPENSION & AXLES (Gardan & Per Bergerak)
    const frontAxle = new THREE.Group();
    const rearAxle = new THREE.Group();
    const axleMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.6 });

    const axleGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.9, 12);
    axleGeo.rotateZ(Math.PI / 2);

    const fAxleMesh = new THREE.Mesh(axleGeo, axleMat);
    const rAxleMesh = new THREE.Mesh(axleGeo, axleMat);
    frontAxle.add(fAxleMesh);
    rearAxle.add(rAxleMesh);

    // Per Keong (Coil Springs)
    const springs: THREE.Mesh[] = [];
    const springGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 12);
    const springMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, metalness: 0.8 });

    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Mesh(springGeo, springMat);
      springs.push(sp);
      if (i < 2) frontAxle.add(sp);
      else rearAxle.add(sp);
    }
    springs[0].position.set(0.65, 0.22, 0);
    springs[1].position.set(-0.65, 0.22, 0);
    springs[2].position.set(0.65, 0.22, 0);
    springs[3].position.set(-0.65, 0.22, 0);

    frontAxle.position.set(0, 0.2, wb * 0.5);
    rearAxle.position.set(0, 0.2, -wb * 0.5);
    group.add(frontAxle, rearAxle);

    return {
      vehicleGroup: group,
      suspension: {
        frontAxle,
        rearAxle,
        springs,
        spotLights,
        brakeLights
      }
    };
  }

  public static createTireMesh(radius: number, halfWidth: number): THREE.Mesh {
    const tireGroup = new THREE.Group();

    // Tapak Ban Mud-Terrain (Aggressive Tread)
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.1
    });

    const tireGeo = new THREE.CylinderGeometry(radius, radius, halfWidth * 2, 28);
    tireGeo.rotateZ(Math.PI / 2);
    const mainTire = new THREE.Mesh(tireGeo, rubberMat);
    mainTire.castShadow = true;
    tireGroup.add(mainTire);

    // Velg Beadlock Alloy
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.3,
      metalness: 0.8
    });
    const rimGeo = new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, halfWidth * 2.05, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    tireGroup.add(rim);

    // Baut Roda Tengah (Lug Nuts)
    const boltMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9 });
    const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, halfWidth * 2.15, 12), boltMat);
    centerCap.rotateZ(Math.PI / 2);
    tireGroup.add(centerCap);

    // Return as single mesh container
    const wrapper = new THREE.Mesh();
    wrapper.add(tireGroup);
    return wrapper;
  }
}


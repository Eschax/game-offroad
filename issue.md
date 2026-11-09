# GitHub Issue Spec: Upgrade Visual Realistis (Aset Mobil, Lingkungan 3D, Fisika Tantangan) & Build File APK Android

> **Tujuan Dokumen Ini:** Spesifikasi teknis lanjutan (Phase 2 Upgrade) untuk meningkatkan kualitas visual, detail model 3D kendaraan, realisme lingkungan/medan, fisik rintangan offroad, serta memaketkan proyek menjadi file **`.apk` Android** yang siap di-install dan diuji langsung di perangkat smartphone.

---

## 1. Ringkasan Target Upgrade (Scope of Work)

Saat ini prototipe awal masih menggunakan geometri kotak sederhana (*basic primitives*) dan tanah datar. Issue ini bertujuan mengubah game menjadi **simulasi offroad 3D yang realistis** sekaligus menghasilkan **file `.apk` Android**:

1. **Aset & Model 3D Kendaraan Realistis:** Meningkatkan detail ke-4 mobil (**Jeep Rubicon**, **Isuzu D-Max**, **Nissan Patrol**, **RAM**) lengkap dengan komponen eksterior offroad, animasi batang suspensi/gardannya, lampu sorot aktif, dan ban bertapak (*mud-terrain tread*).
2. **Lingkungan & Terrain 3D Berkontur Realistis:** Mengganti bidang datar dengan *3D Heightmap / Kontur Medan* (tanjakan curam, lembah sungai, kubangan lumpur cekung, tebing batu), tekstur permukaan PBR (*procedural normal/roughness maps*), langit atmosferik, air sungai transparan berarus, serta efek partikel (cipratan lumpur, debu, asap knalpot).
3. **Tantangan & Fisika Offroad Serealistis Mungkin:** Deteksi permukaan per roda (*per-wheel surface physics*), kemiringan sasis (*Pitch & Roll Inclinometer HUD*), risiko mesin mati di sungai dalam (*Hydrolock* kecuali memakai *Snorkel*), jembatan kayu sempit, serta kamera *Rock-Crawling Wheel Cam*.
4. **Pembuatan File `.apk` Android:** Integrasi **Capacitor Android (`@capacitor/android`)** + **Gradle Build / GitHub Actions Workflow** untuk menghasilkan file `low-range-offroad-4x4-debug.apk` yang siap diunduh dan di-install di HP Android.

---

## 2. Spesifikasi Detail Aset Kendaraan Realistis (`src/vehicles/`)

Setiap kendaraan wajib memiliki proporsi bodi, *wheelbase*, dan komponen visual yang membedakan satu sama lain secara nyata (mendukung pemuatan file `.glb`/`.gltf` eksternal maupun *High-Detail Procedural Mesh Builder* sebagai bawaan):

### A. Komponen Wajib pada Keempat Kendaraan:
* **Bodi & Kabin Berkontur:** Kap mesin (*hood*) berventilasi, kaca depan & samping semi-transparan (*tinted glass*), pilar A/B/C, spion kiri-kanan, dan *fender flare* (lengkungan roda lebar).
* **Wajah Depan & Pencahayaan Aktif:** Grille depan khas tiap merek, *Bullbar / Steel Bumper* offroad lengkap dengan kait *Winch* di tengah, lampu depan (*Headlights*) dengan sorotan cahaya `THREE.SpotLight` yang menyinari jalan, serta lampu rem belakang (*Brake Lights*) yang menyala merah terang saat mengerem.
* **Sasis Bawah & Suspensi Terlihat (Visible Working Suspension):**
  * Batang *Axle* (gardan depan & belakang), *Coil Springs* (per keong), dan *Shock Absorbers* yang terhubung dari sasis ke roda.
  * Saat pemain menaikkan/menurunkan **Suspensi Aktif (Low / Normal / High)** di HUD, per dan batang suspensi memanjang/memendek secara visual dan real-time.
* **Roda & Ban Offroad Detail:** Ban *Mud-Terrain* dengan blok tapak kasar, velg *alloy/beadlock* berjari-jari, serta efek perubahan bentuk/visual saat mode **Air Down (Low PSI)** diaktifkan.

### B. Ciri Khas Visual Tiap Model:
| Kendaraan | Detail Visual Khusus |
| :--- | :--- |
| **1. Jeep Rubicon** | Grille 7-slot ikonik, lampu depan bulat, *fender* kotak tegas, atap *hardtop* modular, dan **ban serep menggantung di pintu belakang**. |
| **2. Isuzu D-Max** | Desain *Double Cabin Pickup* aerodinamis, bak belakang terbuka dengan *sport rollbar* hitam, lampu depan menyipit modern. |
| **3. Nissan Patrol** | Bodi *Full-Size SUV Wagon* panjang dan gagah, *roof rack* ekspedisi di atap lengkap dengan lampu sorot LED bar, serta ban serep belakang. |
| **4. RAM Heavy Duty** | Grille depan raksasa berlapis krom/hitam doff, kap mesin tinggi berotot, bodi *Crew Cab Pickup* panjang, dan *ground clearance* tertinggi. |

> **Integrasi Modifikasi Visual (`Mods`):** Jika pemain memasang **Snorkel** atau **Roof Rack** di menu *Mods*, objek 3D pipa snorkel di pilar kanan depan dan rak atap otomatis muncul pada mobil di dalam game.

---

## 3. Spesifikasi Lingkungan & Medan 3D Realistis (`src/terrains/`)

Hilangkan tanah datar polos dan ganti dengan lingkungan alam 3D yang hidup:

1. **Kontur Terrain 3D Berbukit (3D Elevation & Heightfield):**
   * Gunakan *Heightfield Physics* (`CANNON.Heightfield` atau segmen *sloped terrain meshes*) sehingga jalur memiliki **tanjakan terjal (15° hingga 40°)**, **turunan curam**, **cekungan kolam lumpur**, **kemiringan samping (*side-slope / off-camber*)**, dan **tebing ngarai**.
2. **Material Permukaan PBR & Tekstur Prosedural Detail:**
   * Buat generator tekstur *Canvas Normal + Roughness + Bump Map* untuk:
     * **Mud (Lumpur Basah):** Warna coklat gelap mengkilap (`roughness: 0.25`) dengan bekas alur ban dan partikel lumpur muncrat saat roda berputar.
     * **Snow & Ice (Salju & Es):** Permukaan putih kebiruan dengan bercak es licin mengkilap (`roughness: 0.15`) dan partikel butiran salju.
     * **Gravel (Kerikil Gunung):** Tekstur batu kerikil kasar (`bumpScale` tinggi) dengan debu beterbangan di belakang ban.
     * **Rock (Batu Tebing):** Bongkahan batu poligonal bertumpuk dengan tekstur retakan batu alami.
3. **Air Sungai Dinamis (Realistic Water Crossing):**
   * Permukaan air semi-transparan dengan animasi gelombang halus di area cekungan sungai.
   * Memberikan gaya apung/hambatan (*hydrodynamic drag*) dan arus samping saat mobil menyeberang.
4. **Vegetasi, Pepohonan Detail, & Langit Atmosferik:**
   * Pohon pinus/hutan berlapis dengan batang bertekstur kayu dan batu besar di pinggir jalur sebagai titik jangkar *Winch*.
   * Pencahayaan matahari dinamis (*Directional Sun Light* dengan bayangan tajam), langit bergradasi sesuai tema map (Cerah Pagi di *Pinewood*, Mendung Kabut Rawa di *Swamp*, Badai Salju di *Frostbite*, dan Senja Oranye di *Devil's Canyon*).

---

## 4. Tantangan Offroad & Fisika Simulasi Realistis

Untuk menghadirkan sensasi bermain seperti *Low Range: Offroad 4x4* di Roblox:

* **Deteksi Medan Per Roda (Per-Wheel Surface Physics):**
  * Setiap roda mendeteksi zona di bawahnya secara independen:
    * **Zona Mud:** Menurunkan `frictionSlip` menjadi `0.55`, menambah hambatan gerak (*linear drag*), dan menarik mobil perlahan ke bawah jika berhenti tanpa gas.
    * **Zona Snow/Ice:** Menurunkan `frictionSlip` menjadi `0.30`. Tanpa mode `4H`/`4L` dan `PSI: LOW`, mobil akan selip saat menanjak.
    * **Zona Rock Crawl:** Tanjakan batu berundak yang wajib dilewati dengan **Suspensi Tinggi + Mode Soft + 4L + Diff Lock** agar roda tidak kehilangan traksi saat salah satu ban terangkat di udara (*wheel lift*).
* **Mekanik Banjir Mesin (Water Hydrolock & Snorkel):**
  * Saat melewati **Water Crossing** yang dalam, tampilkan indikator kedalaman air. Jika air melebihi kap mesin dan mobil **belum memasang Snorkel**, tenaga mesin turun drastis dan mati setelah 4 detik (harus ditarik dengan *Winch* atau *Respawn* ke Checkpoint).
* **Rintangan Jembatan Kayu Sempit & Rock Steps:**
  * Jembatan balok kayu kembar (*Two-Track Log Bridge*) di atas sungai/jurang yang menuntut presisi kemudi tinggi agar roda tidak terperosok jatuh.
* **Fitur HUD & Kamera Baru:**
  * **Inclinometer HUD (Pitch & Roll Angle):** Indikator derajat kemiringan mobil secara real-time (peringatan merah jika kemiringan > 35° mendekati titik terguling/*rollover*).
  * **Multi-Camera View (`CAM` Toggle):**
    1. *Chase Cam* (Kamera belakang dinamis).
    2. *Crawler / Wheel Cam* (Sudut pandang dekat kolong/roda depan untuk melihat pijakan batu secara presisi).
    3. *Hood / Driver Cam* (Sudut pandang kap mesin untuk merasakan guncangan suspensi secara nyata).
  * **Tombol Reset / Respawn Checkpoint & Lampu Depan:** Memudahkan pemain kembali ke *Fuel Checkpoint* terakhir jika terjatuh ke jurang.

---

## 5. Spesifikasi Pembuatan File `.apk` Android (Capacitor + Build Pipeline)

Agar game dapat langsung di-install dan diuji di HP Android sebagai aplikasi native (`.apk`):

### A. Konfigurasi Capacitor Android:
1. Tambahkan paket `@capacitor/core`, `@capacitor/cli`, dan `@capacitor/android`.
2. Buat konfigurasi `capacitor.config.json`:
   * `appId`: `"com.lowrange.offroad4x4"`
   * `appName`: `"Low Range Offroad 4x4"`
   * `webDir`: `"dist"`
3. Konfigurasikan proyek Android (`android/`):
   * Set orientasi layar ke **Landscape (`sensorLandscape`)** di `AndroidManifest.xml`.
   * Aktifkan mode *Fullscreen Immersive* (sembunyikan status bar & navigation bar sistem Android).
   * Siapkan ikon aplikasi khusus bertema Offroad 4x4.

### B. Output File `.apk` Siap Install:
1. **Local Build (Jika Android SDK & Java tersedia di mesin lokal):**
   * Jalankan `npm run build` -> `npx cap sync android` -> `cd android && ./gradlew assembleDebug`.
   * Salin hasil build APK ke root proyek atau folder `release/low-range-offroad-4x4.apk`.
2. **Automated Cloud APK Build (GitHub Actions - `.github/workflows/build-apk.yml`):**
   * Buat workflow GitHub Actions otomatis yang meng-compile proyek Android menggunakan JDK 17 + Android SDK setiap kali ada push ke `main`, lalu mengunggah file **`low-range-offroad-4x4-debug.apk`** sebagai **GitHub Release / Build Artifact** sehingga pengguna dapat langsung mengunduh file `.apk` dari GitHub di HP Android mereka kapan saja.

---

## 6. Rencana Eksekusi Bertahap (Implementation Phases)

* **Fase 1: Upgrade Model 3D Kendaraan & Suspensi Visual (`VehicleMeshBuilder` & `VehiclePhysics`)**
  * Buat pemodelan 3D detail untuk Jeep Rubicon, Isuzu D-Max, Nissan Patrol, dan RAM lengkap dengan ban bertapak, kaca kabin, bumper winch, lampu sorot, snorkel/roof-rack mod, serta visual gardan/per suspensi yang bergerak naik-turun mengikuti roda.
* **Fase 2: Upgrade Terrain Berkontur, PBR Tekstur, Air, & Efek Partikel (`TerrainGenerator` & `ParticleSystem`)**
  * Bangun jalur 3D dengan tanjakan/turunan nyata, zona lumpur cekung, sungai transparan, jembatan balok kayu, batu tebing, tekstur prosedural PBR, dan efek partikel cipratan lumpur/debu.
* **Fase 3: Fisika Rintangan Realistis, Inclinometer HUD, Multi-Camera, & Audio Mesin**
  * Terapkan deteksi friksi/drag per zona medan, mekanik *Diff Lock* sejati (distribusi torsi ekstra saat roda menggantung), mekanik *Water Hydrolock* (mesin terendam air vs Snorkel), *Inclinometer Pitch/Roll HUD*, tombol ganti kamera (*Chase / Wheel Crawler / Hood*), dan suara deru mesin prosedural (Web Audio API).
* **Fase 4: Setup Capacitor Android & Build File `.apk`**
  * Inisialisasi platform `@capacitor/android`, atur `AndroidManifest.xml` ke *Landscape Fullscreen*, buat script `npm run build:apk`, jalankan kompilasi APK lokal (jika SDK tersedia), dan tambahkan workflow `.github/workflows/build-apk.yml` untuk menghasilkan file `.apk` siap pasang.

---

## 7. Kriteria Penerimaan (Acceptance Criteria Checklist)

- [ ] Keempat mobil (**Rubicon**, **D-Max**, **Patrol**, **RAM**) memiliki bentuk 3D realistis yang berbeda jelas (grille, kabin, bak pickup vs SUV, ban serep, bumper, lampu menyala, dan batang suspensi terlihat).
- [ ] Suspensi interaktif menampilkan perubahan tinggi bodi dan pegas secara visual dan memengaruhi *ground clearance* saat melewati batu besar.
- [ ] Lingkungan memiliki kontur tanjakan/turunan 3D nyata, tekstur permukaan detail, air sungai transparan, pepohonan, serta efek partikel roda.
- [ ] Rintangan **Mud**, **Snow/Ice**, **Gravel**, **Rock Crawling**, **Water Crossing**, dan **Log Bridge** memberikan efek fisika nyata (lumpur menghambat laju, es licin, air dalam mematikan mesin jika tanpa Snorkel).
- [ ] HUD dilengkapi **Inclinometer (kemiringan Pitch/Roll)**, indikator kedalaman air/permukaan saat ini, tombol **Kamera (Chase/Wheel/Hood)**, dan tombol **Respawn Checkpoint**.
- [ ] Proyek terintegrasi dengan **Capacitor Android (`android/`)** dan memiliki pipeline build `.apk` (lokal & GitHub Actions) sehingga menghasilkan file `.apk` yang bisa di-install di Android.

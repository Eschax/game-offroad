import * as THREE from 'three';
import { GameManager, ControlMode } from '../core/GameManager';
import { VehiclePhysics } from '../vehicles/VehiclePhysics';
import { WinchSystem } from '../vehicles/WinchSystem';
import { AchievementManager } from '../core/AchievementManager';

export class UIManager {
  private container: HTMLElement;
  private gm: GameManager;
  private onStartPlay: (mapId: string) => void;
  private onExitToMenu: () => void;

  constructor(
    container: HTMLElement,
    onStartPlay: (mapId: string) => void,
    onExitToMenu: () => void
  ) {
    this.container = container;
    this.gm = GameManager.getInstance();
    this.onStartPlay = onStartPlay;
    this.onExitToMenu = onExitToMenu;
  }

  public showFirstTimePopup() {
    this.container.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-box">
          <h2>PILIH METODE KONTROL</h2>
          <p>Pilih gaya kendali yang paling nyaman untuk Anda. Pengaturan ini dapat diubah kapan saja di menu Settings.</p>
          <div class="options-grid">
            <button class="option-btn" id="btn-ctrl-touch">
              <strong>1. Tombol Layar (Touch)</strong>
              <span>Gunakan panah kiri/kanan di layar. Paling presisi dan mudah.</span>
            </button>
            <button class="option-btn" id="btn-ctrl-steer">
              <strong>2. Setir Virtual (Steering Wheel)</strong>
              <span>Putar roda setir sentuh untuk nuansa offroad realistis.</span>
            </button>
            <button class="option-btn" id="btn-ctrl-gyro">
              <strong>3. Gyroscope / Miringkan HP (Tilt)</strong>
              <span>Miringkan perangkat HP Anda ke kiri/kanan untuk mengemudi.</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-ctrl-touch')?.addEventListener('click', () => this.selectInitialControl('touch'));
    document.getElementById('btn-ctrl-steer')?.addEventListener('click', () => this.selectInitialControl('steer'));
    document.getElementById('btn-ctrl-gyro')?.addEventListener('click', () => this.selectInitialControl('gyro'));
  }

  private selectInitialControl(mode: ControlMode) {
    this.gm.setControlMode(mode);
    this.gm.markFirstLaunchComplete();
    this.showMainMenu();
  }

  public showMainMenu(activeTab: 'play' | 'multiplayer' | 'mods' | 'shop' | 'settings' = 'play') {
    this.container.innerHTML = `
      <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9)); padding: 24px; display: flex; flex-direction: column; pointer-events: auto; z-index: 20;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px;">
          <div>
            <h1 style="font-size: 22px; font-weight: 800; color: var(--primary-accent); letter-spacing: 1px;">LOW RANGE: OFFROAD 4x4</h1>
            <p style="font-size: 13px; color: var(--text-muted);">Simulator Jalur Ekstrem Android</p>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <div class="stat-pill" style="font-size: 15px; font-weight: bold; color: #fbbf24;">
              🪙 ${this.gm.data.coins.toLocaleString()} Koin
            </div>
          </div>
        </div>

        <!-- 5 Tabs Navigation -->
        <div style="display: flex; gap: 8px; margin: 18px 0; overflow-x: auto;">
          <button id="tab-play" class="${activeTab === 'play' ? 'primary' : ''}">1. PLAY</button>
          <button id="tab-mp" class="${activeTab === 'multiplayer' ? 'primary' : ''}">2. MULTIPLAYER</button>
          <button id="tab-mods" class="${activeTab === 'mods' ? 'primary' : ''}">3. MODS</button>
          <button id="tab-shop" class="${activeTab === 'shop' ? 'primary' : ''}">4. SHOP</button>
          <button id="tab-settings" class="${activeTab === 'settings' ? 'primary' : ''}">5. SETTINGS</button>
        </div>

        <!-- Content Area -->
        <div id="tab-content" style="flex: 1; overflow-y: auto; padding-right: 8px;"></div>
      </div>
    `;

    document.getElementById('tab-play')?.addEventListener('click', () => this.showMainMenu('play'));
    document.getElementById('tab-mp')?.addEventListener('click', () => this.showMainMenu('multiplayer'));
    document.getElementById('tab-mods')?.addEventListener('click', () => this.showMainMenu('mods'));
    document.getElementById('tab-shop')?.addEventListener('click', () => this.showMainMenu('shop'));
    document.getElementById('tab-settings')?.addEventListener('click', () => this.showMainMenu('settings'));

    const content = document.getElementById('tab-content')!;
    if (activeTab === 'play') this.renderPlayTab(content);
    if (activeTab === 'multiplayer') this.renderMultiplayerTab(content);
    if (activeTab === 'mods') this.renderModsTab(content);
    if (activeTab === 'shop') this.renderShopTab(content);
    if (activeTab === 'settings') this.renderSettingsTab(content);
  }

  private renderPlayTab(container: HTMLElement) {
    const selV = this.gm.vehicles[this.gm.data.selected_vehicle_id] || Object.values(this.gm.vehicles)[0];

    let mapsHtml = '';
    for (const m of this.gm.maps) {
      const isCleared = this.gm.data.completed_maps.includes(m.id);
      mapsHtml += `
        <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
              <strong style="font-size: 16px;">${m.name}</strong>
              <span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: ${isCleared ? '#10b981' : '#f59e0b'}; color: #000; font-weight: bold;">
                ${isCleared ? 'SELESAI' : m.difficulty}
              </span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); max-width: 480px;">${m.description}</p>
            <div style="font-size: 12px; color: #fbbf24; margin-top: 6px;">Hadiah: +${m.reward_coins} Koin</div>
          </div>
          <button class="primary btn-start-map" data-map="${m.id}" style="padding: 10px 24px; font-size: 14px;">MULAI JALUR</button>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="margin-bottom: 20px; background: rgba(30,41,59,0.7); padding: 14px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 12px; color: var(--text-muted);">Mobil Aktif:</span>
          <h3 style="color: var(--primary-accent);">${selV?.name || 'Jeep Rubicon'}</h3>
          <span style="font-size: 12px;">Kelas: ${selV?.class}</span>
        </div>
        <button id="btn-goto-shop" style="font-size: 13px;">Ganti di Garage/Shop</button>
      </div>

      <h2 style="font-size: 16px; margin-bottom: 12px;">PILIH MAP TRAIL</h2>
      ${mapsHtml}
    `;

    container.querySelectorAll('.btn-start-map').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mapId = (e.currentTarget as HTMLElement).getAttribute('data-map')!;
        this.onStartPlay(mapId);
      });
    });

    document.getElementById('btn-goto-shop')?.addEventListener('click', () => this.showMainMenu('shop'));
  }

  private renderMultiplayerTab(container: HTMLElement) {
    container.innerHTML = `
      <div style="max-width: 500px; margin: 0 auto; text-align: center; padding: 40px 10px;">
        <h2 style="color: var(--primary-accent); margin-bottom: 8px;">MULTIPLAYER CO-OP TRAIL</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">
          Konvoi bersama teman (2-4 Pemain per room). Saling bantu derek mobil teman yang terjebak di lumpur menggunakan Winch!
        </p>

        <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 20px;">
          <input type="text" placeholder="Masukkan Kode Room (cth: OFFROAD-4X4)" style="padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.4); color: #fff; width: 280px;" />
          <button class="primary" onclick="alert('Menghubungkan ke Lobby Multiplayer...')">GABUNG ROOM</button>
        </div>

        <button onclick="alert('Room publik dibuat! Menunggu konvoi teman...')">BUAT ROOM BARU</button>
      </div>
    `;
  }

  private renderModsTab(container: HTMLElement) {
    const selId = this.gm.data.selected_vehicle_id;
    const v = this.gm.vehicles[selId] || Object.values(this.gm.vehicles)[0];

    container.innerHTML = `
      <h2 style="font-size: 18px; margin-bottom: 14px;">GARASI MODIFIKASI: ${v?.name}</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
        <div class="option-btn">
          <strong>Suspensi Lift Kit (+5 cm Ground Clearance)</strong>
          <span>Menaikkan batas suspensi agar tidak tersangkut di batu besar.</span>
          <button class="primary" style="margin-top: 10px;" onclick="alert('Lift Kit telah terpasang!')">PASANG (GRATIS)</button>
        </div>

        <div class="option-btn">
          <strong>Ban Mud Terrain 35-inch (Air-Down Ready)</strong>
          <span>Grip ekstra +25% di lumpur dan salju saat tekanan angin dikurangi.</span>
          <button class="primary" style="margin-top: 10px;" onclick="alert('Ban Offroad terpasang!')">PASANG (GRATIS)</button>
        </div>

        <div class="option-btn">
          <strong>Heavy-Duty Front Winch (12.000 Lbs)</strong>
          <span>Tali derek penyelamat saat mobil tersangkut atau terbalik.</span>
          <span style="color: #10b981; font-weight: bold; margin-top: 6px;">✓ SUDAH TERPASANG</span>
        </div>
      </div>
    `;
  }

  private renderShopTab(container: HTMLElement) {
    let listHtml = '';
    for (const v of Object.values(this.gm.vehicles)) {
      const isOwned = this.gm.data.unlocked_vehicles.includes(v.id);
      const isSelected = this.gm.data.selected_vehicle_id === v.id;

      listHtml += `
        <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 16px; color: ${isSelected ? '#f59e0b' : '#fff'};">${v.name}</h3>
            <span style="font-size: 12px; color: var(--text-muted);">${v.class} • Massa: ${v.specs.mass_kg} kg • Torsi: ${v.specs.engine_torque_nm} Nm</span>
            <p style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">${v.description}</p>
          </div>
          <div>
            ${
              isSelected
                ? `<span style="color: #10b981; font-weight: bold; font-size: 13px;">DIPILIH</span>`
                : isOwned
                ? `<button class="btn-select-car primary" data-id="${v.id}">GUNAKAN</button>`
                : `<button class="btn-buy-car" data-id="${v.id}" data-price="${v.price}">BELI (${v.price} 🪙)</button>`
            }
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <h2 style="font-size: 16px; margin-bottom: 12px;">DEALER KENDARAAN 4X4</h2>
      ${listHtml}
    `;

    container.querySelectorAll('.btn-select-car').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
        this.gm.selectVehicle(id);
        this.showMainMenu('shop');
      });
    });

    container.querySelectorAll('.btn-buy-car').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
        if (this.gm.unlockVehicle(id)) {
          alert('Selamat! Kendaraan baru berhasil dibeli.');
          AchievementManager.getInstance().checkAchievements();
          this.showMainMenu('shop');
        } else {
          alert('Koin tidak mencukupi! Selesaikan map untuk dapatkan koin tambahan.');
        }
      });
    });
  }

  private renderSettingsTab(container: HTMLElement) {
    const curMode = this.gm.data.control_mode;

    container.innerHTML = `
      <h2 style="font-size: 18px; margin-bottom: 14px;">PENGATURAN KONTROL & GRAFIK</h2>
      
      <div style="background: rgba(15,23,42,0.8); padding: 18px; border-radius: 12px; max-width: 500px;">
        <label style="display: block; font-size: 14px; font-weight: bold; margin-bottom: 8px;">Skema Kontrol Mengemudi:</label>
        <div style="display: flex; gap: 8px; margin-bottom: 20px;">
          <button id="set-ctrl-touch" class="${curMode === 'touch' ? 'primary' : ''}">Touch</button>
          <button id="set-ctrl-steer" class="${curMode === 'steer' ? 'primary' : ''}">Setir</button>
          <button id="set-ctrl-gyro" class="${curMode === 'gyro' ? 'primary' : ''}">Gyro</button>
        </div>

        <label style="display: block; font-size: 14px; font-weight: bold; margin-bottom: 8px;">Volume Audio:</label>
        <input type="range" id="set-volume" min="0" max="1" step="0.1" value="${this.gm.data.sound_volume}" style="width: 100%; margin-bottom: 20px;" />

        <label style="display: block; font-size: 14px; font-weight: bold; margin-bottom: 8px;">Kualitas Grafik Android:</label>
        <div style="display: flex; gap: 8px;">
          <button class="${this.gm.data.graphics_quality === 'low' ? 'primary' : ''}" onclick="alert('Grafik Low diset untuk HP hemat baterai.')">Low (60 FPS)</button>
          <button class="${this.gm.data.graphics_quality === 'medium' ? 'primary' : ''}">Medium</button>
          <button class="${this.gm.data.graphics_quality === 'high' ? 'primary' : ''}">High</button>
        </div>
      </div>
    `;

    document.getElementById('set-ctrl-touch')?.addEventListener('click', () => {
      this.gm.setControlMode('touch');
      this.showMainMenu('settings');
    });
    document.getElementById('set-ctrl-steer')?.addEventListener('click', () => {
      this.gm.setControlMode('steer');
      this.showMainMenu('settings');
    });
    document.getElementById('set-ctrl-gyro')?.addEventListener('click', () => {
      this.gm.setControlMode('gyro');
      this.showMainMenu('settings');
    });
  }

  // GAMEPLAY HUD
  public showGameplayHUD(vehicle: VehiclePhysics, winch: WinchSystem, anchors: THREE.Vector3[]) {
    this.container.innerHTML = `
      <div class="hud-container">
        <!-- Top Bar -->
        <div class="hud-top-bar interactive">
          <button id="btn-back-menu" style="padding: 6px 14px; font-size: 13px;">⬅ MENU</button>
          <div style="display: flex; gap: 8px;">
            <div class="stat-pill" id="hud-fuel-pill">⛽ BBM: 100%</div>
            <div class="stat-pill" id="hud-speed-pill">0 KM/H</div>
          </div>
        </div>

        <!-- Middle Suspensions Active Controls -->
        <div style="position: absolute; right: 16px; top: 80px; display: flex; flex-direction: column; gap: 8px; pointer-events: auto;">
          <div style="background: rgba(15,23,42,0.85); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); text-align: center;">
            <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px; color: var(--primary-accent);">SUSPENSI AKTIF</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <button id="btn-height-high" style="padding: 6px 12px; font-size: 11px;">▲ TINGGI</button>
              <button id="btn-height-norm" class="primary" style="padding: 6px 12px; font-size: 11px;">■ NORMAL</button>
              <button id="btn-height-low" style="padding: 6px 12px; font-size: 11px;">▼ RENDAH</button>
            </div>
            <button id="btn-toggle-stiff" style="margin-top: 8px; font-size: 11px; padding: 4px 8px; width: 100%;">Mode: SOFT</button>
          </div>
        </div>

        <!-- Bottom Controls -->
        <div class="hud-bottom-bar">
          <!-- Steering or D-Pad Left -->
          <div class="control-cluster-left" id="steering-cluster"></div>

          <!-- Center Offroad Systems (Low Range 4L, Diff Lock, Air Down, Winch) -->
          <div class="offroad-tools-center">
            <div style="display: flex; gap: 6px;">
              <button id="btn-gear" style="padding: 6px 10px; font-size: 12px; min-height: 40px; min-width: 44px;">4H</button>
              <button id="btn-diff-lock" style="padding: 6px 10px; font-size: 12px; min-height: 40px; min-width: 44px;">DIFF</button>
              <button id="btn-psi" style="padding: 6px 10px; font-size: 12px; min-height: 40px; min-width: 44px;">PSI: NORM</button>
              <button id="btn-winch" style="padding: 6px 10px; font-size: 12px; min-height: 40px; min-width: 44px;">WINCH</button>
            </div>
          </div>

          <!-- Throttle & Brake Right -->
          <div class="control-cluster-right">
            <button class="pedal-btn brake" id="btn-pedal-brake">REM</button>
            <button class="pedal-btn gas" id="btn-pedal-gas">GAS</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-back-menu')?.addEventListener('click', () => this.onExitToMenu());

    // Suspensi Hook
    document.getElementById('btn-height-high')?.addEventListener('click', (e) => {
      vehicle.setRideHeight('high');
      this.updateHeightBtnState('high');
    });
    document.getElementById('btn-height-norm')?.addEventListener('click', (e) => {
      vehicle.setRideHeight('normal');
      this.updateHeightBtnState('normal');
    });
    document.getElementById('btn-height-low')?.addEventListener('click', (e) => {
      vehicle.setRideHeight('low');
      this.updateHeightBtnState('low');
    });
    document.getElementById('btn-toggle-stiff')?.addEventListener('click', (e) => {
      const next = vehicle.stiffnessMode === 'soft' ? 'firm' : 'soft';
      vehicle.setStiffness(next);
      (e.currentTarget as HTMLElement).innerText = `Mode: ${next.toUpperCase()}`;
    });

    // Offroad Tools Hook
    const btnGear = document.getElementById('btn-gear')!;
    btnGear.addEventListener('click', () => {
      if (vehicle.gearMode === '2H') vehicle.setGearMode('4H');
      else if (vehicle.gearMode === '4H') vehicle.setGearMode('4L');
      else vehicle.setGearMode('2H');
      btnGear.innerText = vehicle.gearMode;
    });

    const btnDiff = document.getElementById('btn-diff-lock')!;
    btnDiff.addEventListener('click', () => {
      vehicle.toggleDiffLock();
      btnDiff.style.background = vehicle.diffLock ? '#10b981' : '';
    });

    const btnPsi = document.getElementById('btn-psi')!;
    btnPsi.addEventListener('click', () => {
      vehicle.toggleTirePressure();
      btnPsi.innerText = vehicle.tirePressureLow ? 'PSI: LOW' : 'PSI: NORM';
      btnPsi.style.background = vehicle.tirePressureLow ? '#f59e0b' : '';
    });

    const btnWinch = document.getElementById('btn-winch')!;
    btnWinch.addEventListener('click', () => {
      const connected = winch.toggleWinch(vehicle, anchors);
      btnWinch.innerText = connected ? 'LEPAS' : 'WINCH';
      btnWinch.style.background = connected ? '#ef4444' : '';
      if (!connected && !winch.isConnected) {
        alert('Tidak ada pohon atau jangkar dalam jarak 25 meter!');
      }
    });

    // Pedals event
    const gasBtn = document.getElementById('btn-pedal-gas')!;
    const brakeBtn = document.getElementById('btn-pedal-brake')!;

    const bindHold = (el: HTMLElement, onDown: () => void, onUp: () => void) => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); onDown(); });
      el.addEventListener('pointerup', (e) => { e.preventDefault(); onUp(); });
      el.addEventListener('pointercancel', (e) => { e.preventDefault(); onUp(); });
    };

    bindHold(gasBtn, () => { vehicle.throttle = 1.0; }, () => { vehicle.throttle = 0; });
    bindHold(brakeBtn, () => { vehicle.throttle = -0.7; }, () => { vehicle.throttle = 0; });

    // Steering cluster binding
    this.renderSteeringControls(vehicle);
  }

  private updateHeightBtnState(lvl: 'low' | 'normal' | 'high') {
    document.getElementById('btn-height-low')?.classList.toggle('primary', lvl === 'low');
    document.getElementById('btn-height-norm')?.classList.toggle('primary', lvl === 'normal');
    document.getElementById('btn-height-high')?.classList.toggle('primary', lvl === 'high');
  }

  private renderSteeringControls(vehicle: VehiclePhysics) {
    const cluster = document.getElementById('steering-cluster')!;
    const mode = this.gm.data.control_mode;

    if (mode === 'touch') {
      cluster.innerHTML = `
        <button class="dpad-btn" id="btn-steer-left">◀</button>
        <button class="dpad-btn" id="btn-steer-right">▶</button>
      `;
      const left = document.getElementById('btn-steer-left')!;
      const right = document.getElementById('btn-steer-right')!;

      const bindHold = (el: HTMLElement, onDown: () => void, onUp: () => void) => {
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); onDown(); });
        el.addEventListener('pointerup', (e) => { e.preventDefault(); onUp(); });
        el.addEventListener('pointercancel', (e) => { e.preventDefault(); onUp(); });
      };

      bindHold(left, () => { vehicle.steerAngle = 1.0; }, () => { vehicle.steerAngle = 0; });
      bindHold(right, () => { vehicle.steerAngle = -1.0; }, () => { vehicle.steerAngle = 0; });
    } else if (mode === 'steer') {
      cluster.innerHTML = `
        <div class="steer-wheel-container" id="wheel-cont">
          <div class="steer-wheel" id="steer-wheel-mesh"></div>
        </div>
      `;
      const wheelCont = document.getElementById('wheel-cont')!;
      const wheelMesh = document.getElementById('steer-wheel-mesh')!;
      let isDragging = false;
      let startAngle = 0;

      wheelCont.addEventListener('pointerdown', (e) => {
        isDragging = true;
        const rect = wheelCont.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
      });

      window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const rect = wheelCont.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
        let diff = angle - startAngle;
        diff = Math.max(-1.0, Math.min(1.0, diff));
        wheelMesh.style.transform = `rotate(${diff * 90}deg)`;
        vehicle.steerAngle = -diff;
      });

      const resetWheel = () => {
        if (isDragging) {
          isDragging = false;
          wheelMesh.style.transform = `rotate(0deg)`;
          vehicle.steerAngle = 0;
        }
      };
      window.addEventListener('pointerup', resetWheel);
      window.addEventListener('pointercancel', resetWheel);
    } else if (mode === 'gyro') {
      cluster.innerHTML = `
        <div style="font-size: 11px; background: rgba(15,23,42,0.8); padding: 8px; border-radius: 8px;">
          Gyro Aktif (Miringkan HP)
        </div>
      `;
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma !== null) {
          const tilt = Math.max(-30, Math.min(30, e.gamma));
          vehicle.steerAngle = -(tilt / 30.0);
        }
      });
    }
  }

  public updateHUD(vehicle: VehiclePhysics) {
    const fuelPill = document.getElementById('hud-fuel-pill');
    if (fuelPill) {
      const pct = Math.round((vehicle.fuel / vehicle.maxFuel) * 100);
      fuelPill.innerText = `⛽ BBM: ${pct}%`;
      fuelPill.style.color = pct < 20 ? '#ef4444' : '#fff';
    }

    const speedPill = document.getElementById('hud-speed-pill');
    if (speedPill) {
      const v = vehicle.chassisBody.velocity.length() * 3.6; // m/s to km/h
      speedPill.innerText = `${Math.round(v)} KM/H`;
    }
  }
}

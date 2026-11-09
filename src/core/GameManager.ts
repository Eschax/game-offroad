export type ControlMode = 'touch' | 'steer' | 'gyro';
export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface VehicleSpec {
  mass_kg: number;
  engine_torque_nm: number;
  max_speed_kmh: number;
  wheelbase_m: number;
  fuel_capacity_l: number;
  fuel_consumption_rate: number;
  base_ride_height: number;
  suspension_travel_m: number;
  default_stiffness: number;
  default_damping: number;
}

export interface VehicleEntry {
  id: string;
  name: string;
  class: string;
  price: number;
  unlocked_by_default: boolean;
  specs: VehicleSpec;
  description: string;
}

export interface MapEntry {
  id: string;
  name: string;
  theme: string;
  difficulty: string;
  checkpoints_count: number;
  primary_terrain: string[];
  reward_coins: number;
  recommended_vehicle: string;
  description: string;
}

export interface AchievementEntry {
  id: string;
  title: string;
  description: string;
  reward_coins: number;
  target_type: string;
  target_id?: string;
  target_count?: number;
}

export interface PlayerSaveData {
  is_first_launch: boolean;
  control_mode: ControlMode;
  graphics_quality: GraphicsQuality;
  sound_volume: number;
  coins: number;
  selected_vehicle_id: string;
  unlocked_vehicles: string[];
  vehicle_mods: Record<string, {
    lift_kit: number;
    tires_tier: number;
    has_winch: boolean;
    has_snorkel: boolean;
  }>;
  completed_maps: string[];
  unlocked_achievements: string[];
  stats: {
    winch_used_count: number;
    total_distance_km: number;
  };
}

const SAVE_KEY = 'offroad_4x4_save_v1';

export class GameManager {
  private static instance: GameManager;
  public data: PlayerSaveData;
  public vehicles: Record<string, VehicleEntry> = {};
  public maps: MapEntry[] = [];
  public achievements: AchievementEntry[] = [];

  private listeners: Array<() => void> = [];

  private constructor() {
    this.data = this.loadData();
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public async initConfigs() {
    try {
      const vRes = await fetch('/data/vehicles_config.json');
      const vJson = await vRes.json();
      this.vehicles = vJson.vehicles;

      const mRes = await fetch('/data/maps_config.json');
      const mJson = await mRes.json();
      this.maps = mJson.maps;
      this.achievements = mJson.achievements;
    } catch (e) {
      console.warn('Failed loading configs via fetch, using fallback fallback data', e);
    }
  }

  private getDefaultData(): PlayerSaveData {
    return {
      is_first_launch: true,
      control_mode: 'touch',
      graphics_quality: 'medium',
      sound_volume: 0.8,
      coins: 500,
      selected_vehicle_id: 'rubicon',
      unlocked_vehicles: ['rubicon'],
      vehicle_mods: {
        rubicon: { lift_kit: 0, tires_tier: 1, has_winch: true, has_snorkel: false },
        dmax: { lift_kit: 0, tires_tier: 1, has_winch: false, has_snorkel: false },
        patrol: { lift_kit: 0, tires_tier: 1, has_winch: false, has_snorkel: false },
        ram: { lift_kit: 0, tires_tier: 1, has_winch: false, has_snorkel: false }
      },
      completed_maps: [],
      unlocked_achievements: [],
      stats: {
        winch_used_count: 0,
        total_distance_km: 0
      }
    };
  }

  public loadData(): PlayerSaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        return { ...this.getDefaultData(), ...JSON.parse(raw) };
      }
    } catch (err) {
      console.error('Error loading savegame:', err);
    }
    return this.getDefaultData();
  }

  public saveData() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      this.notifyListeners();
    } catch (err) {
      console.error('Error saving game:', err);
    }
  }

  public addCoins(amount: number) {
    this.data.coins += amount;
    this.saveData();
  }

  public spendCoins(amount: number): boolean {
    if (this.data.coins >= amount) {
      this.data.coins -= amount;
      this.saveData();
      return true;
    }
    return false;
  }

  public setControlMode(mode: ControlMode) {
    this.data.control_mode = mode;
    this.saveData();
  }

  public markFirstLaunchComplete() {
    this.data.is_first_launch = false;
    this.saveData();
  }

  public selectVehicle(id: string) {
    if (this.data.unlocked_vehicles.includes(id)) {
      this.data.selected_vehicle_id = id;
      this.saveData();
    }
  }

  public unlockVehicle(id: string): boolean {
    const v = this.vehicles[id];
    if (!v) return false;
    if (this.data.unlocked_vehicles.includes(id)) return true;
    if (this.spendCoins(v.price)) {
      this.data.unlocked_vehicles.push(id);
      this.saveData();
      return true;
    }
    return false;
  }

  public completeMap(mapId: string) {
    if (!this.data.completed_maps.includes(mapId)) {
      this.data.completed_maps.push(mapId);
      const m = this.maps.find(item => item.id === mapId);
      if (m) {
        this.addCoins(m.reward_coins);
      }
      this.saveData();
    }
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
  }

  private notifyListeners() {
    for (const cb of this.listeners) {
      cb();
    }
  }
}

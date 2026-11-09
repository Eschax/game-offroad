import { GameManager } from './GameManager';

export class AchievementManager {
  private static instance: AchievementManager;
  private gm: GameManager;

  private constructor() {
    this.gm = GameManager.getInstance();
  }

  public static getInstance(): AchievementManager {
    if (!AchievementManager.instance) {
      AchievementManager.instance = new AchievementManager();
    }
    return AchievementManager.instance;
  }

  public checkAchievements() {
    const list = this.gm.achievements;
    const unlocked = this.gm.data.unlocked_achievements;

    for (const ach of list) {
      if (unlocked.includes(ach.id)) continue;

      let achieved = false;
      if (ach.target_type === 'map_clear' && ach.target_id) {
        achieved = this.gm.data.completed_maps.includes(ach.target_id);
      } else if (ach.target_type === 'all_vehicles_unlocked' && ach.target_count) {
        achieved = this.gm.data.unlocked_vehicles.length >= ach.target_count;
      } else if (ach.target_type === 'counter' && ach.target_count) {
        if (ach.id === 'ach_winch_helper') {
          achieved = this.gm.data.stats.winch_used_count >= ach.target_count;
        }
      }

      if (achieved) {
        this.unlock(ach.id, ach.title, ach.reward_coins);
      }
    }
  }

  public unlock(id: string, title: string, rewardCoins: number) {
    if (!this.gm.data.unlocked_achievements.includes(id)) {
      this.gm.data.unlocked_achievements.push(id);
      this.gm.addCoins(rewardCoins);
      this.gm.saveData();
      this.showToast(`🏆 Achievement Terbuka: ${title} (+${rewardCoins} Koin)`);
    }
  }

  private showToast(msg: string) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(245, 158, 11, 0.95)';
    toast.style.color = '#000';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '30px';
    toast.style.fontWeight = 'bold';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 6px 15px rgba(0,0,0,0.4)';
    toast.innerText = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.5s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    }, 3500);
  }
}

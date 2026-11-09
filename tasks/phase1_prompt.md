# AI Execution Prompt: Phase 1 — Core Architecture, Save System, & UI Flow

> **Petunjuk Penggunaan:** Salin seluruh teks di bawah garis pemisah ke model AI yang akan mengeksekusi proyek ini. Prompt ini dirancang *self-contained* (berdiri sendiri) agar AI dapat langsung menghasilkan kode tanpa halusinasi.

---

```markdown
Anda adalah Senior Game Developer yang bertugas mengimplementasikan FASE 1 untuk game Android "Low Range: Offroad 4x4".

### SPESIFIKASI ENGINE & BAHASA
- Engine: Godot Engine 4.x (Compatibility Renderer / GLES3) ATAU Three.js + TypeScript (sesuaikan dengan target proyek).
- Desain kode harus modular, bersih dari komentar berlebihan, dan menerapkan prinsip single-responsibility.

### TUJUAN FASE 1
1. Membuat Singleton/Autoload `GameManager` untuk mengelola state global, koin, mobil aktif, skema kontrol, dan data penyimpanan lokal (`user://savegame.json`).
2. Membuat `AchievementManager` untuk memantau event game (seperti map selesai, mobil terbuka, penggunaan winch) dan membuka achievement sesuai data `data/maps_config.json`.
3. Mengimplementasikan alur UI:
   - Cek `is_first_launch`: Jika true, tampilkan popup ramah sentuhan (Touch / Steer / Gyro). Simpan pilihan pemain lalu set `is_first_launch = false`.
   - Main Menu dengan 5 tab/layar navigasi fungsional: Play, Multiplayer, Mods, Shop, dan Settings.
   - Menu Settings yang memungkinkan pemain mengganti skema kontrol (Touch / Steer / Gyro) kapan saja, mengatur sensitivitas kemudi, volume audio, dan preset kualitas grafis.

### KRITERIA PENERIMAAN FASE 1
- [ ] Save/Load data JSON berjalan tanpa crash saat file belum ada (buat default state otomatis).
- [ ] Tombol UI memiliki ukuran target sentuh minimal 48x48 dp untuk layar smartphone.
- [ ] Skema kontrol tersimpan ke file savegame setiap kali diganti.
- [ ] Navigasi antar 5 menu berjalan mulus tanpa error.
```


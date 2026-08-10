# SIPEKA SAPA — SDN 01 Papahan
### Sistem Pengaduan & Konsultasi (Cloudflare Workers + Static Assets + D1)

Versi ini adalah redesign total dari versi lama (Google Apps Script +
Google Sheets). **Satu Cloudflare Worker** melayani dua hal sekaligus:

- Halaman statis (HTML/CSS/JS) di folder `public/` disajikan sebagai
  **Static Assets**.
- Semua panggilan data (`/api`) diproses oleh kode di `src/worker.js`,
  yang membaca/menulis ke **Cloudflare D1**.

Tidak ada lagi domain terpisah untuk frontend (GitHub Pages) dan
backend (Worker API) — semuanya jalan di satu domain
`https://sipekasapa.<akun-anda>.workers.dev` (atau custom domain kalau
sudah dipasang).

## Struktur Folder

```
sipekasapa/
├── public/                     → Semua file statis (di-serve sebagai Static Assets)
│   ├── index.html               → Beranda publik (+ galeri di bawah hero)
│   ├── form.html                  → Formulir kirim konsultasi/pengaduan
│   ├── lacak.html                  → Lacak status laporan
│   ├── galeri.html                  → Galeri foto (halaman penuh)
│   ├── admin-login.html            → Login admin
│   ├── admin-dashboard.html        → Dashboard admin
│   ├── admin-konsultasi.html       → Daftar konsultasi masuk
│   ├── admin-pengaduan.html        → Daftar pengaduan masuk
│   ├── admin-galeri.html           → Kelola galeri foto
│   ├── admin-cetak.html            → Cetak/ekspor laporan
│   ├── admin-pengaturan.html       → Kop surat, tampilan beranda, username & password admin
│   └── assets/
│       ├── css/style.css
│       └── js/{config.js, api.js, common.js}
├── src/worker.js                → Backend (API "/api") + fallback ke Static Assets
├── schema.sql                    → Skema database D1 (instalasi baru)
├── migration_galeri_floating.sql → Migrasi untuk DB lama (galeri + logo beranda)
├── migration_admin_login.sql     → Migrasi untuk DB lama (username/password admin)
├── wrangler.jsonc                 → ⚠️ Konfigurasi Worker, Static Assets & D1
└── package.json
```

## Deploy (Cloudflare Workers)

### Prasyarat
- Akun Cloudflare (gratis sudah cukup).
- Node.js terpasang di komputer Anda.
- `npx wrangler login` untuk menghubungkan CLI ke akun Cloudflare.

### Langkah-langkah

1. **Install dependencies**
   ```bash
   cd sipekasapa
   npm install
   npx wrangler login
   ```

2. **Buat database D1**
   ```bash
   npx wrangler d1 create sipekasapa-db
   ```
   Salin `database_id` yang muncul, lalu tempel ke `wrangler.jsonc`
   (ganti `PASTE_DATABASE_ID_DI_SINI`).

3. **Jalankan skema database (sekali saja untuk instalasi baru)**
   ```bash
   npm run db:init
   ```
   Kalau ini adalah lanjutan dari database yang SUDAH ADA isinya
   (bukan instalasi baru), jalankan juga file migrasi yang relevan,
   misalnya:
   ```bash
   npx wrangler d1 execute sipekasapa-db --remote --file=./migration_admin_login.sql
   npx wrangler d1 execute sipekasapa-db --remote --file=./migration_galeri_floating.sql
   ```

4. **(Opsional) Atur kredensial admin awal via Secret**
   ```bash
   npx wrangler secret put ADMIN_USER
   npx wrangler secret put ADMIN_PASS
   ```
   Kalau dilewati, kredensial awal adalah `admin` / `admin123`.
   Setelah login pertama kali, **segera ganti** lewat menu
   *Pengaturan → Username & Password Login* — begitu diganti lewat
   Pengaturan, kredensial disimpan di D1 dan Secret ini tidak dipakai
   lagi.

5. **Deploy**
   ```bash
   npm run deploy
   ```
   Wrangler akan menampilkan URL Worker Anda, formatnya:
   ```
   https://sipekasapa.NAMA-AKUN-ANDA.workers.dev
   ```
   Buka URL ini — situs publik dan panel admin sudah langsung jalan
   di domain yang sama, tidak perlu setup GitHub Pages terpisah lagi.

### Login Admin
Buka `/admin-login.html` di domain Worker Anda, login dengan
kredensial dari langkah 4 (atau `admin` / `admin123` kalau belum
diatur), lalu segera ganti lewat menu Pengaturan.

## Kenapa restrukturisasi ini diperlukan

Sebelumnya paket ini dirancang untuk deploy terpisah (frontend di
GitHub Pages, backend di Worker API dengan domain sendiri). Tapi di
lapangan, situs sudah berjalan di satu domain
`workers.dev` — artinya frontend dan backend sudah digabung jadi satu
Worker. Kode lama (`worker/src/index.js`) hanya berisi logika API dan
tidak tahu cara menyajikan file statis, sehingga saat browser mem-POST
ke path yang sama dengan `index.html`, Cloudflare Static Assets
menjawab **405 Method Not Allowed** (Static Assets cuma bisa GET/HEAD).

Perbaikannya:
- Semua panggilan API sekarang lewat path khusus **`/api`** (tidak
  ada file statis bernama itu), sehingga otomatis diteruskan ke
  `src/worker.js`.
- `assets/js/config.js` cukup `const API_URL = '/api'` — tidak perlu
  isi URL Worker secara manual lagi.
- `wrangler.jsonc` sekarang mendefinisikan `assets.directory` (folder
  `public/`) sekaligus `main` (Worker script) dalam satu konfigurasi.

## Konsep Warna SIPEKA SAPA

| Warna | Kode | Peran |
|---|---|---|
| 🟠 Oranye | `#F97316` | Identitas SIPEKA — tombol utama, highlight |
| 🔵 Navy | `#123B78` | Identitas SAPA — header, navbar, judul |
| 🟢 Hijau | `#16A34A` | Status: Selesai |
| 🟡 Kuning | `#F59E0B` | Status: Sedang diproses |
| 🔴 Merah | `#DC2626` | Info penting / error / hapus data |

## Keterbatasan yang Perlu Diketahui

1. **Bukan sistem keamanan tingkat tinggi.** Password admin di-hash
   (PBKDF2-SHA256) sebelum disimpan di D1, tapi sistemnya tetap
   sederhana (username/password tunggal, tanpa 2FA). Cocok untuk
   skala sekolah/instansi kecil.
2. **Ukuran logo/foto dibatasi** agar tidak membebani database dan
   payload API (logo ≤ ~30KB, foto galeri ≤ ~100–150KB file asli
   sebelum di-encode base64).
3. **Kuota Cloudflare Workers/D1 gratis** cukup besar untuk skala
   sekolah, tapi tetap ada batasnya — cek
   [dashboard Cloudflare](https://dash.cloudflare.com) Anda.
4. Setiap perubahan pada `src/worker.js` atau file di `public/`
   **harus di-deploy ulang** (`npm run deploy`).

## Struktur Data di D1

Tabel **`laporan`**:
| id | tanggal | nama | statusUser | noWa | jenis | pesan | statusData | tindakLanjut |
|---|---|---|---|---|---|---|---|---|

Tabel **`config`**: 1 baris (id selalu `1`) berisi kop surat, nama
sekolah, kepala sekolah, logo (base64), badge beranda, serta
**`adminUsername`** dan **`adminPasswordHash`** (diisi otomatis saat
admin mengganti kredensial lewat menu Pengaturan).

Tabel **`galeri`**: foto publik untuk beranda & halaman galeri.

Tabel **`counters`**: penomoran tiket berjalan per jenis layanan
(`Konsultasi`, `Pengaduan`).

Periksa isi database kapan saja lewat:
```bash
npx wrangler d1 execute sipekasapa-db --remote --command="SELECT * FROM laporan ORDER BY tanggal DESC LIMIT 20;"
```

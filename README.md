# SIPEKA SAPA — SDN 01 Papahan
### Sistem Pengaduan & Konsultasi (versi Redesign: GitHub Pages + Cloudflare Workers + D1)

Versi ini adalah hasil redesign total dari versi lama (Google Apps
Script + Google Sheets):

- **Hosting file statis** → GitHub Pages
- **Backend/API** → Cloudflare Workers
- **Database** → Cloudflare D1 (SQLite terdistribusi)
- **Desain baru** → identitas **SIPEKA SAPA**, palet Navy `#123B78`
  (kepercayaan) + Oranye `#F97316` (komunikasi & pelayanan), Tailwind
  CSS (CDN), font Plus Jakarta Sans, ikon Lucide, glassmorphism pada
  navbar, soft shadow di setiap kartu.

## Struktur Folder

```
sipekasapa/
├── index.html                → Beranda publik
├── form.html                  → Formulir kirim konsultasi/pengaduan
├── lacak.html                  → Lacak status laporan (input nomor tiket)
├── admin-login.html            → Login admin
├── admin-dashboard.html        → Dashboard admin (statistik & grafik)
├── admin-konsultasi.html       → Daftar konsultasi masuk
├── admin-pengaduan.html        → Daftar pengaduan masuk
├── admin-cetak.html            → Cetak/ekspor laporan (PDF/Word/Print)
├── admin-pengaturan.html       → Pengaturan kop surat & hapus data
├── assets/
│   ├── css/style.css           → Style bersama (glass, shadow, animasi)
│   └── js/
│       ├── config.js           → ⚠️ Tempat Anda menempel URL Worker
│       ├── api.js              → Fungsi pemanggil API (fetch)
│       └── common.js           → Toast, sidebar admin, badge status
└── worker/                     → Backend Cloudflare Worker + D1
    ├── src/index.js            → Kode backend (menggantikan Code.gs)
    ├── schema.sql               → Skema database D1
    ├── wrangler.toml            → ⚠️ Konfigurasi Worker & binding D1
    └── package.json
```

## Bagian 1 — Deploy Backend (Cloudflare Workers + D1)

### Prasyarat
- Akun Cloudflare (gratis sudah cukup).
- Node.js terpasang di komputer Anda.
- `npx wrangler login` untuk menghubungkan CLI ke akun Cloudflare.

### Langkah-langkah

1. **Masuk ke folder worker**
   ```bash
   cd sipekasapa/worker
   npm install
   npx wrangler login
   ```

2. **Buat database D1**
   ```bash
   npx wrangler d1 create sipekasapa-db
   ```
   Perintah ini akan menampilkan blok konfigurasi berisi
   `database_id`. Salin nilai `database_id` tersebut.

3. **Tempel `database_id` ke `wrangler.toml`**
   Buka `worker/wrangler.toml`, ganti baris:
   ```toml
   database_id = "PASTE_DATABASE_ID_DI_SINI"
   ```
   dengan ID asli dari langkah 2.

4. **Jalankan skema database**
   ```bash
   npm run db:init
   ```
   Ini akan membuat tabel `laporan`, `config`, `counters` di D1 Anda
   (sekali jalan saja).

5. **Atur kredensial admin (disimpan sebagai Secret, bukan di kode)**
   ```bash
   npx wrangler secret put ADMIN_USER
   # ketik: admin   (atau username pilihan Anda)
   npx wrangler secret put ADMIN_PASS
   # ketik: password pilihan Anda
   ```
   Jika langkah ini dilewati, sistem memakai default `admin` /
   `admin123` — **disarankan tetap diganti** untuk keamanan.

6. **Atur origin yang diizinkan (CORS)**
   Di `worker/wrangler.toml`, ganti:
   ```toml
   ALLOWED_ORIGIN = "*"
   ```
   dengan alamat GitHub Pages Anda setelah Bagian 2 selesai, misalnya:
   ```toml
   ALLOWED_ORIGIN = "https://namauser.github.io"
   ```
   (`*` boleh dipakai sementara untuk uji coba awal, tapi sebaiknya
   dipersempit setelah domain final diketahui.)

7. **Deploy Worker**
   ```bash
   npm run deploy
   ```
   Setelah selesai, Wrangler menampilkan URL Worker Anda, formatnya
   seperti:
   ```
   https://sipekasapa-api.NAMA-AKUN-ANDA.workers.dev
   ```
   Salin URL ini — akan dipakai di Bagian 2.

## Bagian 2 — Deploy Frontend (GitHub Pages)

1. Buat repository baru di GitHub (bisa publik atau privat + GitHub
   Pro untuk Pages privat).
2. Upload seluruh isi folder `sipekasapa/` **kecuali folder
   `worker/`** ke repository tersebut (folder `worker/` tidak perlu
   ikut di-hosting sebagai file statis, karena sudah dideploy
   terpisah sebagai Worker di Bagian 1).
3. Buka `assets/js/config.js`, ganti baris:
   ```js
   const API_URL = "PASTE_URL_CLOUDFLARE_WORKER_DI_SINI";
   ```
   dengan URL Worker dari Bagian 1 langkah 7.
4. Commit & push perubahan tersebut.
5. Di repository GitHub → **Settings → Pages** → pilih branch
   (biasanya `main`) dan folder root (`/`) → **Save**.
6. Tunggu beberapa menit, situs akan tersedia di:
   ```
   https://NAMA-USER.github.io/NAMA-REPO/
   ```
7. **Kembali ke Bagian 1 langkah 6** — perbarui `ALLOWED_ORIGIN` di
   `wrangler.toml` dengan alamat GitHub Pages final ini, lalu
   `npm run deploy` ulang agar CORS lebih ketat (tidak lagi `*`).

### Login Admin
Buka `admin-login.html` (atau klik ikon gembok kecil di pojok kanan
bawah halaman beranda) → login dengan kredensial yang Anda atur di
Bagian 1 langkah 5.

## Perubahan dari Versi Lama (Apps Script + Google Sheets)

| Hal | Versi Lama | Versi Baru (SIPEKA SAPA) |
|---|---|---|
| Hosting file | Bebas (disarankan hosting statis apa pun) | GitHub Pages |
| Backend/API | Google Apps Script (Web App) | Cloudflare Workers |
| Penyimpanan data | Google Sheets | Cloudflare D1 (SQLite) |
| Kredensial admin | Ditulis langsung di `Code.gs` | Cloudflare Worker Secret (`wrangler secret put`) |
| CORS | Disiasati dengan `text/plain` (workaround) | Ditangani langsung oleh Worker (`OPTIONS` preflight normal) |
| Desain | Biru monokrom, glass biru muda | Navy + Oranye, glassmorphism navbar navy, status hijau/kuning/merah |
| Nama produk | "Layanan Konsultasi & Pengaduan SDN 01 Papahan" | **SIPEKA SAPA** |

## Konsep Warna SIPEKA SAPA

| Warna | Kode | Peran |
|---|---|---|
| 🟠 Oranye | `#F97316` | Identitas SIPEKA — tombol utama, highlight, ikon komunikasi |
| 🔵 Navy | `#123B78` | Identitas SAPA — header, navbar, judul, sidebar admin |
| ⚪ Putih | `#FFFFFF` | Background utama |
| 🩶 Abu sangat muda | `#F8FAFC` | Background section/kartu |
| 🟢 Hijau | `#16A34A` | Status: Selesai / ditindaklanjuti |
| 🟡 Kuning | `#F59E0B` | Status: Sedang diproses |
| 🔴 Merah | `#DC2626` | Info penting / error / hapus data |

Prinsip: **Navy = fondasi visual & kepercayaan (SAPA)**, **Oranye =
aksen komunikasi & pelayanan (SIPEKA)** — bukan warna dominan di
seluruh halaman.

## Komponen Teknologi

- **CSS**: Tailwind CSS via CDN (`cdn.tailwindcss.com`) — tanpa proses
  build/compile.
- **Font**: Plus Jakarta Sans (Google Fonts).
- **Ikon**: Lucide Icons (`unpkg.com/lucide`).
- **Grafik dashboard**: Chart.js (CDN).
- **Ekspor PDF**: html2pdf.js (CDN).
- **Gaya visual**: rounded corners besar, glassmorphism pada navbar
  (`.glass-navbar`) dan sidebar (`.glass-sidebar`), soft shadow custom
  (`shadow-soft`, `shadow-glass`).

## Keterbatasan yang Perlu Diketahui

1. **Bukan sistem keamanan tingkat tinggi.** Autentikasi admin masih
   berbasis username/password sederhana yang diperiksa di Worker.
   Cocok untuk skala sekolah/instansi kecil.
2. **Ukuran logo kop surat dibatasi** (disarankan ≤ 30KB file asli
   sebelum di-encode base64) agar tidak membebani database dan
   payload API.
3. **Kuota Cloudflare Workers/D1 gratis**: paket gratis Cloudflare
   memiliki batas jumlah request & baca/tulis harian yang cukup besar
   untuk skala sekolah, namun tetap ada batasnya — cek
   [dashboard Cloudflare](https://dash.cloudflare.com) Anda.
4. Setiap perubahan pada `worker/src/index.js` **harus di-deploy
   ulang** (`npm run deploy`) agar berlaku di URL Worker yang sama.

## Struktur Data di D1

Tabel **`laporan`**:
| id | tanggal | nama | statusUser | noWa | jenis | pesan | statusData | tindakLanjut |
|---|---|---|---|---|---|---|---|---|

Tabel **`config`**: 1 baris (id selalu `1`) berisi kop surat, nama
sekolah, kepala sekolah, dan logo (base64).

Tabel **`counters`**: penomoran tiket berjalan per jenis layanan
(`Konsultasi`, `Pengaduan`).

Anda bisa memeriksa isi database kapan saja lewat:
```bash
npx wrangler d1 execute sipekasapa-db --remote --command="SELECT * FROM laporan ORDER BY tanggal DESC LIMIT 20;"
```

# Panduan Deploy SIPEKA SAPA — TANPA CLI (Cuma Pakai Browser)

Panduan ini tidak memakai `npx wrangler` atau terminal sama sekali.
Semua dikerjakan lewat browser: **GitHub** (untuk menyimpan kode) dan
**Cloudflare Dashboard** (untuk deploy + database).

Total ada 6 bagian. Ikuti urut dari atas ke bawah.

---

## Bagian 1 — Upload Kode ke GitHub

1. Buka [github.com](https://github.com) dan login (buat akun dulu
   kalau belum punya — gratis).
2. Klik tombol **"+"** di pojok kanan atas → **New repository**.
3. Isi **Repository name**, misalnya `sipekasapa`. Boleh Public atau
   Private, bebas. Klik **Create repository**.
4. Di halaman repo yang baru dibuat, klik **"uploading an existing
   file"** (atau menu **Add file → Upload files**).
5. Buka folder hasil ekstrak zip `sipekasapa-combined.zip` di
   komputer Anda. **Penting**: yang di-drag ke GitHub adalah **ISI**
   dari folder `sipekasapa/` (yaitu `public/`, `src/`, `schema.sql`,
   `wrangler.jsonc`, dll langsung), **BUKAN** folder `sipekasapa/`
   itu sendiri. Jadi setelah di-upload, susunan di GitHub harus
   seperti ini di root repo:
   ```
   public/
   src/
   schema.sql
   migration_admin_login.sql
   migration_galeri_floating.sql
   wrangler.jsonc
   package.json
   README.md
   ```
   Tips: drag folder `public` dan `src` langsung ke kotak upload
   GitHub — browser modern akan mempertahankan struktur foldernya.
6. Scroll ke bawah, klik **Commit changes**.

---

## Bagian 2 — Buat Database D1 di Cloudflare

1. Login ke [dash.cloudflare.com](https://dash.cloudflare.com).
2. Di sidebar kiri, cari menu **Storage & Databases** → **D1 SQL
   Database** (kalau tidak ketemu, coba menu **Workers & Pages** lalu
   cari tab/link **D1**).
3. Klik **Create Database**.
4. Nama database: `sipekasapa-db` → **Create**.
5. Setelah dibuat, akan tampil halaman detail database. **Salin**
   nilai **Database ID** yang tertera (bentuknya kode acak panjang,
   contoh: `a1b2c3d4-...`). Simpan sebentar, dipakai di Bagian 3.

---

## Bagian 3 — Jalankan schema.sql Lewat Console D1 (bukan CLI)

1. Masih di halaman database `sipekasapa-db` yang sama, cari tab
   **Console** (kadang disebut **Query**).
2. Buka file `schema.sql` (ada di paket yang Anda unduh), **copy
   semua isinya**.
3. **Paste** ke kotak query di Console D1 tadi, lalu klik
   **Execute** / **Run**.
4. Kalau berhasil, akan muncul konfirmasi tabel `laporan`, `config`,
   `galeri`, `counters` sudah dibuat. Ini instalasi database baru —
   cukup dijalankan **sekali saja**.

> **Kalau database Anda SEBELUMNYA sudah pernah dipakai/ada isinya**
> (bukan instalasi baru), JANGAN jalankan `schema.sql` lagi. Sebagai
> gantinya, copy-paste dan jalankan isi `migration_admin_login.sql`
> dan `migration_galeri_floating.sql` satu per satu di Console yang
> sama.

---

## Bagian 4 — Tempel Database ID ke `wrangler.jsonc` di GitHub

1. Balik ke repo GitHub Anda, buka file `wrangler.jsonc`.
2. Klik ikon pensil (**Edit this file**) di pojok kanan atas file.
3. Cari baris:
   ```
   "database_id": "PASTE_DATABASE_ID_DI_SINI"
   ```
   Ganti `PASTE_DATABASE_ID_DI_SINI` dengan Database ID yang Anda
   salin di Bagian 2 langkah 5. Contoh hasilnya:
   ```
   "database_id": "a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```
4. Scroll ke bawah, klik **Commit changes**.

---

## Bagian 5 — Hubungkan Repo ke Cloudflare Workers (Deploy)

1. Di Cloudflare Dashboard, buka menu **Workers & Pages**.
2. Klik **Create** → pilih **Import a repository** (atau **Connect
   to Git** / **Deploy from Git**, tergantung versi tampilan).
3. Pilih **GitHub**, lalu izinkan Cloudflare mengakses akun GitHub
   Anda (klik **Authorize**) kalau diminta.
4. Pilih repository `sipekasapa` yang tadi Anda buat.
5. Di halaman pengaturan build/deploy:
   - **Project name**: boleh dibiarkan `sipekasapa` atau ganti sesuai
     selera (ini akan jadi bagian dari URL: `NAMA.AKUN.workers.dev`).
   - Cloudflare biasanya otomatis mendeteksi `wrangler.jsonc` di root
     repo dan mengisi pengaturan build secara otomatis. Kalau ada
     kolom **Root directory** / **Build directory**, biarkan kosong
     atau `/` (karena `wrangler.jsonc` ada di root repo, sesuai
     Bagian 1).
6. Klik **Save and Deploy** (atau **Deploy**).
7. Tunggu proses build selesai (biasanya 1-2 menit). Setelah selesai,
   Cloudflare menampilkan URL Worker Anda, formatnya:
   ```
   https://sipekasapa.NAMA-AKUN-ANDA.workers.dev
   ```

> Kalau proses deploy gagal karena binding D1 belum terbaca: buka
> **Settings** Worker Anda → tab **Bindings** (atau **Variables and
> Bindings**) → pastikan ada binding **D1 Database** dengan nama
> variabel `DB` mengarah ke `sipekasapa-db`. Kalau belum ada, klik
> **Add binding** dan isi manual, lalu **Deploy** ulang.

---

## Bagian 6 — Login Pertama Kali & Ganti Password

1. Buka URL Worker Anda dari Bagian 5, tambahkan `/admin-login.html`
   di belakangnya.
2. Login dengan kredensial default: **admin** / **admin123**.
3. Masuk ke menu **Pengaturan** → bagian **Username & Password
   Login** → isi password saat ini (`admin123`), lalu username dan
   password baru pilihan Anda → **Simpan**.
4. Selesai — login berikutnya pakai username/password baru itu.

---

## Update Kode di Kemudian Hari

Setiap kali Anda mengedit file (langsung di GitHub lewat ikon
pensil, atau upload ulang file yang berubah) dan **Commit**,
Cloudflare otomatis mendeteksi perubahan di repo dan men-deploy ulang
Worker-nya sendiri — tidak perlu ulangi Bagian 5.

---

## Troubleshooting Singkat

| Gejala | Kemungkinan Penyebab |
|---|---|
| "Gagal menghubungi server (HTTP 405)" saat login | `wrangler.jsonc` belum ter-commit dengan benar, atau repo yang terhubung ke Cloudflare bukan versi combined ini (masih versi lama yang API_URL-nya kosong/salah) |
| Login gagal terus padahal sudah benar | Pastikan Bagian 3 (schema.sql / migration) sudah dijalankan — kalau tabel `config` belum ada kolom `adminUsername`, sistem otomatis pakai default `admin`/`admin123` |
| Halaman blank / 404 semua | Cek Bagian 5: pastikan `Root directory` deploy mengarah ke tempat `wrangler.jsonc` berada (root repo) |
| Foto/logo gagal tersimpan | Ukuran file kemungkinan kebesaran — kompres dulu (logo ≤30KB, foto galeri ≤100-150KB sebelum diunggah) |

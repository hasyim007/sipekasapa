-- ============================================================
-- MIGRASI: Username & Password Admin bisa diatur dari Pengaturan
-- Jalankan SEKALI SAJA di D1 Console (Cloudflare Dashboard) atau via:
--   npx wrangler d1 execute sipekasapa-db --remote --file=./migration_admin_login.sql
-- kalau database kamu sudah ada isinya sebelum fitur ini ditambahkan.
-- Kalau ini instalasi baru, cukup jalankan schema.sql seperti biasa
-- dan file ini TIDAK perlu dijalankan.
--
-- Sebelum diisi lewat menu Pengaturan, login tetap memakai kredensial
-- lama (Worker Secret ADMIN_USER/ADMIN_PASS, atau default admin/admin123).
-- ============================================================

ALTER TABLE config ADD COLUMN adminUsername TEXT DEFAULT '';
ALTER TABLE config ADD COLUMN adminPasswordHash TEXT DEFAULT '';

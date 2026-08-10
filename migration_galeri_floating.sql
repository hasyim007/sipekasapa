-- ============================================================
-- MIGRASI: Logo Website, Badge Mengambang & Galeri
-- Jalankan SEKALI SAJA di D1 Console (Cloudflare Dashboard) kalau
-- database kamu sudah ada isinya sebelum fitur ini ditambahkan.
-- Kalau ini instalasi baru, cukup jalankan schema.sql seperti biasa
-- dan file ini TIDAK perlu dijalankan.
-- ============================================================

ALTER TABLE config ADD COLUMN logoWebsite TEXT DEFAULT '';
ALTER TABLE config ADD COLUMN floatingItems TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS galeri (
    id         TEXT PRIMARY KEY,
    imageBase64 TEXT NOT NULL,
    caption    TEXT DEFAULT '',
    urutan     INTEGER DEFAULT 0,
    dibuat     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_galeri_urutan ON galeri(urutan);

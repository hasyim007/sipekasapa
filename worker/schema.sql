-- ============================================================
-- SIPEKA SAPA — Skema Database Cloudflare D1
-- Jalankan sekali via: wrangler d1 execute sipekasapa-db --remote --file=./schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS laporan (
    id            TEXT PRIMARY KEY,
    tanggal       TEXT NOT NULL,
    nama          TEXT NOT NULL,
    statusUser    TEXT,
    noWa          TEXT,
    jenis         TEXT NOT NULL CHECK (jenis IN ('Konsultasi', 'Pengaduan')),
    pesan         TEXT,
    statusData    TEXT DEFAULT 'Baru',
    tindakLanjut  TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_laporan_jenis ON laporan(jenis);
CREATE INDEX IF NOT EXISTS idx_laporan_tanggal ON laporan(tanggal);

-- Konfigurasi kop surat / TTD kepala sekolah (1 baris saja, id selalu 1)
CREATE TABLE IF NOT EXISTS config (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    instansi     TEXT DEFAULT '',
    sekolah      TEXT DEFAULT '',
    alamat       TEXT DEFAULT '',
    kepsekNama   TEXT DEFAULT '',
    kepsekNip    TEXT DEFAULT '',
    logoBase64   TEXT DEFAULT ''
);

-- Counter tiket berjalan per jenis (KS-001, PG-001, dst.)
CREATE TABLE IF NOT EXISTS counters (
    jenis TEXT PRIMARY KEY,
    nilai INTEGER NOT NULL DEFAULT 0
);

-- Nilai awal (diabaikan jika sudah ada / INSERT OR IGNORE)
INSERT OR IGNORE INTO config (id, instansi, sekolah, alamat, kepsekNama, kepsekNip, logoBase64) VALUES (
    1,
    'PEMERINTAH KABUPATEN KARANGANYAR' || char(10) || 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    'SEKOLAH DASAR NEGERI 01 PAPAHAN',
    'Ngablak, Papahan, Tasikmadu, Karanganyar, Jawa Tengah 57761' || char(10) || 'Telepon: (0271) 6498034 Fax - Pos-el : sdnpapahan01@gmail.com',
    'Nama Kepala Sekolah',
    '19700101 199001 1 001',
    ''
);

INSERT OR IGNORE INTO counters (jenis, nilai) VALUES ('Konsultasi', 0);
INSERT OR IGNORE INTO counters (jenis, nilai) VALUES ('Pengaduan', 0);

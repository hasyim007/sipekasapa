-- Migration: tambah kolom deskripsi galeri yang bisa diubah dari admin
-- Jalankan sekali saja pada database yang sudah ada (deploy lama).
ALTER TABLE config ADD COLUMN galeriDeskripsi TEXT DEFAULT '';

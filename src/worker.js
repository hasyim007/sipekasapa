/**
 * ============================================================
 * BACKEND + STATIC ASSETS SIPEKA SAPA — Cloudflare Workers + D1
 * ============================================================
 * Satu Worker ini melayani DUA hal sekaligus:
 *   1. Semua request ke /api          → diproses sebagai API JSON
 *   2. Request lainnya (halaman HTML, CSS, JS, gambar, dst.)
 *      → diteruskan ke Static Assets (folder public/)
 *
 * Endpoint API (dipanggil dari assets/js/api.js via path "/api"):
 *
 *   GET  /api?action=listLaporan
 *   GET  /api?action=getLaporan&id=KS-001
 *   GET  /api?action=getConfig
 *   GET  /api?action=listGaleri
 *   GET  /api?action=getAdminUsername
 *   POST /api { action: 'addLaporan', nama, statusUser, noWa, jenis, pesan }
 *   POST /api { action: 'updateTindakLanjut', id, statusData, tindakLanjut }
 *   POST /api { action: 'deleteLaporan', id }
 *   POST /api { action: 'clearAll' }
 *   POST /api { action: 'login', username, password }
 *   POST /api { action: 'updateAdminAuth', currentPassword, newUsername, newPassword }
 *   POST /api { action: 'saveConfig', instansi, sekolah, alamat, kepsekNama, kepsekNip, logoBase64, logoWebsite, floatingItems, galeriDeskripsi }
 *   POST /api { action: 'addGaleri', imageBase64, caption }
 *   POST /api { action: 'updateGaleri', id, caption }
 *   POST /api { action: 'deleteGaleri', id }
 * ============================================================
 */

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
    });
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Semua panggilan API lewat path "/api" — path lain diserahkan
        // ke Static Assets (env.ASSETS) supaya halaman HTML/CSS/JS biasa
        // tetap disajikan seperti file statis (bukan lewat kode di bawah).
        if (url.pathname !== '/api') {
            return env.ASSETS.fetch(request);
        }

        try {
            if (request.method === 'GET') {
                const action = url.searchParams.get('action');
                switch (action) {
                    case 'listLaporan':
                        return json({ success: true, data: await listLaporan(env) });
                    case 'getLaporan':
                        return json(await getLaporanById(env, url.searchParams.get('id')));
                    case 'getConfig':
                        return json({ success: true, data: await getConfig(env) });
                    case 'listGaleri':
                        return json({ success: true, data: await listGaleri(env) });
                    case 'getAdminUsername':
                        return json(await getAdminUsername(env));
                    default:
                        return json({ success: false, message: 'Aksi GET tidak dikenal: ' + action }, 400);
                }
            }

            if (request.method === 'POST') {
                let data;
                try {
                    data = await request.json();
                } catch (e) {
                    return json({ success: false, message: 'Body request tidak valid (harus JSON).' }, 400);
                }
                const action = data.action;
                switch (action) {
                    case 'addLaporan':
                        return json(await addLaporan(env, data));
                    case 'updateTindakLanjut':
                        return json(await updateTindakLanjut(env, data));
                    case 'deleteLaporan':
                        return json(await deleteLaporan(env, data.id));
                    case 'clearAll':
                        return json(await clearAllLaporan(env));
                    case 'login':
                        return json(await login(env, data.username, data.password));
                    case 'updateAdminAuth':
                        return json(await updateAdminAuth(env, data));
                    case 'saveConfig':
                        return json(await saveConfig(env, data));
                    case 'addGaleri':
                        return json(await addGaleri(env, data));
                    case 'updateGaleri':
                        return json(await updateGaleri(env, data));
                    case 'deleteGaleri':
                        return json(await deleteGaleri(env, data.id));
                    default:
                        return json({ success: false, message: 'Aksi POST tidak dikenal: ' + action }, 400);
                }
            }

            return json({ success: false, message: 'Metode tidak didukung.' }, 405);
        } catch (err) {
            return json({ success: false, message: err.message || String(err) }, 500);
        }
    },
};

/* ============================================================
   LAPORAN (Konsultasi & Pengaduan)
   ============================================================ */

async function listLaporan(env) {
    const { results } = await env.DB.prepare(
        'SELECT id, tanggal, nama, statusUser, noWa, jenis, pesan, statusData, tindakLanjut FROM laporan ORDER BY tanggal DESC'
    ).all();
    return results || [];
}

async function getLaporanById(env, id) {
    if (!id) return { success: false, data: null };
    const row = await env.DB.prepare(
        'SELECT id, tanggal, nama, statusUser, noWa, jenis, pesan, statusData, tindakLanjut FROM laporan WHERE id = ?'
    ).bind(id).first();
    return { success: !!row, data: row || null };
}

async function addLaporan(env, data) {
    const jenis = data.jenis === 'Konsultasi' ? 'Konsultasi' : 'Pengaduan';
    const prefix = jenis === 'Konsultasi' ? 'KS-' : 'PG-';

    // Increment counter secara atomik lalu ambil nilainya (RETURNING didukung D1/SQLite 3.35+)
    const counterRow = await env.DB.prepare(
        'UPDATE counters SET nilai = nilai + 1 WHERE jenis = ? RETURNING nilai'
    ).bind(jenis).first();
    const counter = counterRow ? counterRow.nilai : 1;

    const id = prefix + String(counter).padStart(3, '0');
    const tanggal = new Date().toISOString();

    await env.DB.prepare(
        `INSERT INTO laporan (id, tanggal, nama, statusUser, noWa, jenis, pesan, statusData, tindakLanjut)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Baru', '')`
    ).bind(id, tanggal, data.nama || '', data.statusUser || '', data.noWa || '', jenis, data.pesan || '').run();

    return { success: true, id };
}

async function updateTindakLanjut(env, data) {
    const res = await env.DB.prepare(
        'UPDATE laporan SET statusData = ?, tindakLanjut = ? WHERE id = ?'
    ).bind(data.statusData || 'Baru', data.tindakLanjut || '', data.id).run();

    if (!res.meta || res.meta.changes === 0) {
        return { success: false, message: 'Laporan tidak ditemukan: ' + data.id };
    }
    return { success: true };
}

async function deleteLaporan(env, id) {
    const res = await env.DB.prepare('DELETE FROM laporan WHERE id = ?').bind(id).run();
    if (!res.meta || res.meta.changes === 0) {
        return { success: false, message: 'Laporan tidak ditemukan: ' + id };
    }
    return { success: true };
}

async function clearAllLaporan(env) {
    await env.DB.prepare('DELETE FROM laporan').run();
    await env.DB.prepare("UPDATE counters SET nilai = 0 WHERE jenis = 'Konsultasi'").run();
    await env.DB.prepare("UPDATE counters SET nilai = 0 WHERE jenis = 'Pengaduan'").run();
    return { success: true };
}

/* ============================================================
   AUTH — kredensial disimpan di D1 (tabel config), diatur dari
   halaman admin-pengaturan.html. Kalau admin belum pernah mengubah
   kredensial lewat Pengaturan, sistem jatuh ke default lama
   (Worker Secret ADMIN_USER/ADMIN_PASS, atau admin/admin123).
   ============================================================ */

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
    const arr = new Uint8Array(hex.length / 2);
    for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
    return arr;
}

/** Hash password pakai PBKDF2-SHA256. Hasil: "saltHex:hashHex". */
async function hashPassword(password, saltHex) {
    const enc = new TextEncoder();
    const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
    return bytesToHex(salt) + ':' + bytesToHex(new Uint8Array(bits));
}

function timingSafeEqualHex(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

async function verifyPassword(password, stored) {
    const [saltHex, hashHex] = (stored || '').split(':');
    if (!saltHex || !hashHex) return false;
    const check = (await hashPassword(password, saltHex)).split(':')[1];
    return timingSafeEqualHex(check, hashHex);
}

async function getAdminConfig(env) {
    return env.DB.prepare('SELECT adminUsername, adminPasswordHash FROM config WHERE id = 1').first();
}

async function login(env, username, password) {
    const cfg = await getAdminConfig(env);
    if (cfg && cfg.adminUsername && cfg.adminPasswordHash) {
        if (username === cfg.adminUsername && await verifyPassword(password, cfg.adminPasswordHash)) {
            return { success: true };
        }
        return { success: false, message: 'Username atau Password salah!' };
    }
    // Belum pernah diubah lewat Pengaturan → pakai default lama
    const ADMIN_USER = env.ADMIN_USER || 'admin';
    const ADMIN_PASS = env.ADMIN_PASS || 'admin123';
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        return { success: true };
    }
    return { success: false, message: 'Username atau Password salah!' };
}

async function getAdminUsername(env) {
    const cfg = await getAdminConfig(env);
    return { success: true, username: (cfg && cfg.adminUsername) ? cfg.adminUsername : (env.ADMIN_USER || 'admin') };
}

async function updateAdminAuth(env, data) {
    const newUsername = (data.newUsername || '').trim();
    const newPassword = data.newPassword || '';
    const currentPassword = data.currentPassword || '';

    if (!newUsername || newUsername.length < 3) {
        return { success: false, message: 'Username baru minimal 3 karakter.' };
    }
    if (!newPassword || newPassword.length < 6) {
        return { success: false, message: 'Password baru minimal 6 karakter.' };
    }

    const cfg = await getAdminConfig(env);
    let currentValid;
    if (cfg && cfg.adminUsername && cfg.adminPasswordHash) {
        currentValid = await verifyPassword(currentPassword, cfg.adminPasswordHash);
    } else {
        currentValid = currentPassword === (env.ADMIN_PASS || 'admin123');
    }
    if (!currentValid) {
        return { success: false, message: 'Password saat ini salah.' };
    }

    const newHash = await hashPassword(newPassword);
    await env.DB.prepare(
        `INSERT INTO config (id, adminUsername, adminPasswordHash) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET adminUsername = excluded.adminUsername, adminPasswordHash = excluded.adminPasswordHash`
    ).bind(newUsername, newHash).run();

    return { success: true, username: newUsername };
}

/* ============================================================
   CONFIG (Kop surat & TTD)
   ============================================================ */

async function getConfig(env) {
    const row = await env.DB.prepare(
        'SELECT instansi, sekolah, alamat, kepsekNama, kepsekNip, logoBase64, logoWebsite, floatingItems, galeriDeskripsi FROM config WHERE id = 1'
    ).first();
    return row || { instansi: '', sekolah: '', alamat: '', kepsekNama: '', kepsekNip: '', logoBase64: '', logoWebsite: '', floatingItems: '', galeriDeskripsi: '' };
}

async function saveConfig(env, data) {
    const logo = data.logoBase64 || '';
    if (logo.length > 300000) {
        return { success: false, message: 'Ukuran logo kop surat terlalu besar. Gunakan logo yang lebih kecil (maks. ~30KB file asli).' };
    }
    const logoWebsite = data.logoWebsite || '';
    if (logoWebsite.length > 300000) {
        return { success: false, message: 'Ukuran logo website terlalu besar. Gunakan logo yang lebih kecil (maks. ~30KB file asli).' };
    }
    await env.DB.prepare(
        `INSERT INTO config (id, instansi, sekolah, alamat, kepsekNama, kepsekNip, logoBase64, logoWebsite, floatingItems, galeriDeskripsi)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            instansi = excluded.instansi,
            sekolah = excluded.sekolah,
            alamat = excluded.alamat,
            kepsekNama = excluded.kepsekNama,
            kepsekNip = excluded.kepsekNip,
            logoBase64 = excluded.logoBase64,
            logoWebsite = excluded.logoWebsite,
            floatingItems = excluded.floatingItems,
            galeriDeskripsi = excluded.galeriDeskripsi`
    ).bind(
        data.instansi || '', data.sekolah || '', data.alamat || '',
        data.kepsekNama || '', data.kepsekNip || '', logo,
        logoWebsite, data.floatingItems || '', data.galeriDeskripsi || ''
    ).run();
    return { success: true };
}

/* ============================================================
   GALERI (foto publik, ditampilkan sebagai carousel di beranda)
   ============================================================ */

async function listGaleri(env) {
    const { results } = await env.DB.prepare(
        'SELECT id, imageBase64, caption, urutan, dibuat FROM galeri ORDER BY urutan ASC, dibuat DESC'
    ).all();
    return results || [];
}

async function addGaleri(env, data) {
    const image = data.imageBase64 || '';
    if (!image) {
        return { success: false, message: 'Foto tidak boleh kosong.' };
    }
    if (image.length > 400000) {
        return { success: false, message: 'Ukuran foto terlalu besar. Kompres dahulu (maks. ~100-150KB file asli).' };
    }
    const id = 'GL-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000);
    const dibuat = new Date().toISOString();
    await env.DB.prepare(
        `INSERT INTO galeri (id, imageBase64, caption, urutan, dibuat) VALUES (?, ?, ?, ?, ?)`
    ).bind(id, image, data.caption || '', Number.isFinite(data.urutan) ? data.urutan : 0, dibuat).run();
    return { success: true, id };
}

async function updateGaleri(env, data) {
    const id = data.id;
    if (!id) {
        return { success: false, message: 'ID foto tidak boleh kosong.' };
    }
    const res = await env.DB.prepare(
        'UPDATE galeri SET caption = ? WHERE id = ?'
    ).bind(data.caption || '', id).run();
    if (!res.meta || res.meta.changes === 0) {
        return { success: false, message: 'Foto tidak ditemukan: ' + id };
    }
    return { success: true };
}

async function deleteGaleri(env, id) {
    const res = await env.DB.prepare('DELETE FROM galeri WHERE id = ?').bind(id).run();
    if (!res.meta || res.meta.changes === 0) {
        return { success: false, message: 'Foto tidak ditemukan: ' + id };
    }
    return { success: true };
}

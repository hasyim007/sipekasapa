/**
 * ============================================================
 * BACKEND SIPEKA SAPA — Cloudflare Workers + D1
 * ============================================================
 * Pengganti Google Apps Script + Google Sheets versi lama.
 * Struktur tabel D1 dibuat lewat schema.sql (lihat README.md).
 *
 * Endpoint (sama persis kontraknya dengan versi Apps Script,
 * supaya assets/js/api.js di frontend tidak perlu diubah):
 *
 *   GET  ?action=listLaporan
 *   GET  ?action=getLaporan&id=KS-001
 *   GET  ?action=getConfig
 *   GET  ?action=listGaleri
 *   POST { action: 'addLaporan', nama, statusUser, noWa, jenis, pesan }
 *   POST { action: 'updateTindakLanjut', id, statusData, tindakLanjut }
 *   POST { action: 'deleteLaporan', id }
 *   POST { action: 'clearAll' }
 *   POST { action: 'login', username, password }
 *   POST { action: 'saveConfig', instansi, sekolah, alamat, kepsekNama, kepsekNip, logoBase64, logoWebsite, floatingItems }
 *   POST { action: 'addGaleri', imageBase64, caption }
 *   POST { action: 'deleteGaleri', id }
 * ============================================================
 */

function corsHeaders(env, request) {
    const allowed = (env.ALLOWED_ORIGIN || '*').split(',').map(s => s.trim());
    const origin = request.headers.get('Origin') || '';
    const allowOrigin = allowed.includes('*') ? '*' : (allowed.includes(origin) ? origin : allowed[0]);
    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    };
}

function json(obj, env, request, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json;charset=utf-8', ...corsHeaders(env, request) },
    });
}

export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders(env, request) });
        }

        const url = new URL(request.url);

        try {
            if (request.method === 'GET') {
                const action = url.searchParams.get('action');
                switch (action) {
                    case 'listLaporan':
                        return json({ success: true, data: await listLaporan(env) }, env, request);
                    case 'getLaporan':
                        return json(await getLaporanById(env, url.searchParams.get('id')), env, request);
                    case 'getConfig':
                        return json({ success: true, data: await getConfig(env) }, env, request);
                    case 'listGaleri':
                        return json({ success: true, data: await listGaleri(env) }, env, request);
                    default:
                        return json({ success: false, message: 'Aksi GET tidak dikenal: ' + action }, env, request, 400);
                }
            }

            if (request.method === 'POST') {
                let data;
                try {
                    data = await request.json();
                } catch (e) {
                    return json({ success: false, message: 'Body request tidak valid (harus JSON).' }, env, request, 400);
                }
                const action = data.action;
                switch (action) {
                    case 'addLaporan':
                        return json(await addLaporan(env, data), env, request);
                    case 'updateTindakLanjut':
                        return json(await updateTindakLanjut(env, data), env, request);
                    case 'deleteLaporan':
                        return json(await deleteLaporan(env, data.id), env, request);
                    case 'clearAll':
                        return json(await clearAllLaporan(env), env, request);
                    case 'login':
                        return json(login(env, data.username, data.password), env, request);
                    case 'saveConfig':
                        return json(await saveConfig(env, data), env, request);
                    case 'addGaleri':
                        return json(await addGaleri(env, data), env, request);
                    case 'deleteGaleri':
                        return json(await deleteGaleri(env, data.id), env, request);
                    default:
                        return json({ success: false, message: 'Aksi POST tidak dikenal: ' + action }, env, request, 400);
                }
            }

            return json({ success: false, message: 'Metode tidak didukung.' }, env, request, 405);
        } catch (err) {
            return json({ success: false, message: err.message || String(err) }, env, request, 500);
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
   AUTH — kredensial diset via Worker secret (wrangler secret put)
   ============================================================ */

function login(env, username, password) {
    const ADMIN_USER = env.ADMIN_USER || 'admin';
    const ADMIN_PASS = env.ADMIN_PASS || 'admin123';
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        return { success: true };
    }
    return { success: false, message: 'Username atau Password salah!' };
}

/* ============================================================
   CONFIG (Kop surat & TTD)
   ============================================================ */

async function getConfig(env) {
    const row = await env.DB.prepare(
        'SELECT instansi, sekolah, alamat, kepsekNama, kepsekNip, logoBase64, logoWebsite, floatingItems FROM config WHERE id = 1'
    ).first();
    return row || { instansi: '', sekolah: '', alamat: '', kepsekNama: '', kepsekNip: '', logoBase64: '', logoWebsite: '', floatingItems: '' };
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
        `INSERT INTO config (id, instansi, sekolah, alamat, kepsekNama, kepsekNip, logoBase64, logoWebsite, floatingItems)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            instansi = excluded.instansi,
            sekolah = excluded.sekolah,
            alamat = excluded.alamat,
            kepsekNama = excluded.kepsekNama,
            kepsekNip = excluded.kepsekNip,
            logoBase64 = excluded.logoBase64,
            logoWebsite = excluded.logoWebsite,
            floatingItems = excluded.floatingItems`
    ).bind(
        data.instansi || '', data.sekolah || '', data.alamat || '',
        data.kepsekNama || '', data.kepsekNip || '', logo,
        logoWebsite, data.floatingItems || ''
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

async function deleteGaleri(env, id) {
    const res = await env.DB.prepare('DELETE FROM galeri WHERE id = ?').bind(id).run();
    if (!res.meta || res.meta.changes === 0) {
        return { success: false, message: 'Foto tidak ditemukan: ' + id };
    }
    return { success: true };
}

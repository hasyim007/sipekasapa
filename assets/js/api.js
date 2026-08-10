/* ============================================================
   API HELPER — komunikasi dengan Cloudflare Worker + D1
   ============================================================ */

/**
 * Kirim data (create/update/delete) ke backend.
 * Worker sudah menangani CORS preflight (OPTIONS) dengan benar,
 * jadi kita bisa memakai application/json seperti biasa.
 */
async function apiPost(action, payload = {}) {
    if (!API_URL || API_URL.indexOf('PASTE_URL') !== -1) {
        throw new Error('API_URL belum diatur. Buka assets/js/config.js');
    }
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
    });
    if (!res.ok) throw new Error('Gagal menghubungi server (HTTP ' + res.status + ')');
    return res.json();
}

/**
 * Ambil data (read-only) dari backend via query string.
 */
async function apiGet(action, params = {}) {
    if (!API_URL || API_URL.indexOf('PASTE_URL') !== -1) {
        throw new Error('API_URL belum diatur. Buka assets/js/config.js');
    }
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Gagal menghubungi server (HTTP ' + res.status + ')');
    return res.json();
}

/* ---------- Page loading overlay ---------- */
function showPageLoading(msg = 'Memuat data...') {
    let el = document.getElementById('page-loading');
    if (!el) {
        el = document.createElement('div');
        el.id = 'page-loading';
        el.className = 'page-loading';
        el.innerHTML = `<div class="spinner"></div><p class="text-sm font-semibold text-slate-600">${msg}</p>`;
        document.body.appendChild(el);
    } else {
        el.querySelector('p').innerText = msg;
        el.classList.remove('hidden');
    }
}
function hidePageLoading() {
    const el = document.getElementById('page-loading');
    if (el) el.remove();
}

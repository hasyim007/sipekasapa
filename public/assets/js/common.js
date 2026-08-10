/* ============================================================
   COMMON UTILITIES — dipakai di semua halaman — SIPEKA SAPA
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
});

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* Badge warna status: Baru = slate, Diproses = kuning (warning), Selesai = hijau (success) */
function statusBadgeClass(status) {
    if (status === 'Diproses') return 'bg-amber-100 text-amber-700';
    if (status === 'Selesai') return 'bg-green-100 text-green-700';
    return 'bg-slate-100 text-slate-600';
}

function showToast(title, message, isError = false) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.className = `fixed top-4 right-4 z-[200] transform transition-all duration-300 translate-y-[-150%] opacity-0 bg-white border-l-4 shadow-glass rounded-xl p-4 flex items-center gap-3 ${isError ? 'border-danger' : 'border-success'}`;

    const iconName = isError ? 'alert-circle' : 'check-circle';
    const iconColorClass = isError ? 'text-danger' : 'text-success';

    toast.innerHTML = `
        <div class="${iconColorClass}"><i data-lucide="${iconName}" class="w-6 h-6"></i></div>
        <div>
            <h4 class="font-bold text-slate-800 text-sm">${title}</h4>
            <p class="text-xs text-slate-500">${message}</p>
        </div>
    `;
    lucide.createIcons();

    setTimeout(() => {
        toast.classList.remove('translate-y-[-150%]', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);

    setTimeout(() => {
        toast.classList.add('translate-y-[-150%]', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3000);
}

/* ---------- Admin session guard ---------- */
function requireAdminAuth() {
    if (sessionStorage.getItem('sipekasapa_admin_auth') !== 'true') {
        window.location.href = 'admin-login.html';
    }
}

function adminLogout() {
    sessionStorage.removeItem('sipekasapa_admin_auth');
    window.location.href = 'admin-login.html';
}

/* ---------- Shared admin sidebar (Navy solid + aksen Oranye) ----------
   Dipanggil di setiap halaman admin: renderAdminSidebar('dashboard')
   Mobile: sidebar jadi drawer (tersembunyi & bisa dibuka lewat tombol hamburger).
   Desktop (md+): tampil statis seperti biasa. */
function renderAdminSidebar(active) {
    const menus = [
        { key: 'dashboard', href: 'admin-dashboard.html', icon: 'layout-dashboard', label: 'Dashboard', badge: null },
        { key: 'konsultasi', href: 'admin-konsultasi.html', icon: 'message-circle', label: 'Konsultasi Masuk', badge: 'badge-konsultasi' },
        { key: 'pengaduan', href: 'admin-pengaduan.html', icon: 'alert-octagon', label: 'Pengaduan Masuk', badge: 'badge-pengaduan' },
    ];
    const tools = [
        { key: 'galeri', href: 'admin-galeri.html', icon: 'images', label: 'Galeri Foto' },
        { key: 'cetak', href: 'admin-cetak.html', icon: 'printer', label: 'Cetak Laporan' },
        { key: 'pengaturan', href: 'admin-pengaturan.html', icon: 'settings', label: 'Pengaturan' },
    ];

    const menuItem = (m) => `
        <a href="${m.href}" onclick="closeAdminSidebar()" class="admin-menu-item flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium group ${active === m.key ? 'bg-primary text-white font-bold shadow-soft' : 'text-white/70 hover:bg-white/10 hover:text-white'}">
            <div class="flex items-center gap-3">
                <i data-lucide="${m.icon}" class="w-5 h-5 group-hover:scale-110 transition-transform"></i> ${m.label}
            </div>
            ${m.badge ? `<span id="${m.badge}" class="bg-white/15 text-white text-xs font-bold px-2 py-0.5 rounded-full">0</span>` : ''}
        </a>`;

    const html = `
        <button id="admin-sidebar-toggle" onclick="openAdminSidebar()" class="md:hidden fixed top-4 left-4 z-40 w-10 h-10 bg-navy text-white rounded-xl shadow-glass flex items-center justify-center">
            <i data-lucide="menu" class="w-5 h-5"></i>
        </button>
        <div id="admin-sidebar-backdrop" onclick="closeAdminSidebar()" class="hidden md:hidden fixed inset-0 bg-navy-dark/50 backdrop-blur-sm z-40"></div>
        <aside id="admin-sidebar" class="glass-sidebar w-64 flex-shrink-0 h-full flex flex-col shadow-xl z-50 fixed md:relative inset-y-0 left-0 -translate-x-full md:translate-x-0 transition-transform duration-300">
            <div class="p-6 border-b border-white/10 flex items-center gap-3">
                <div class="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white shadow-soft"><i data-lucide="message-square-heart" class="w-5 h-5"></i></div>
                <div class="flex-1 min-w-0">
                    <h2 class="font-bold text-lg text-white tracking-tight leading-tight truncate">SIPEKA SAPA</h2>
                    <p class="text-[11px] text-white/50 font-medium -mt-0.5">Admin Panel</p>
                </div>
                <button onclick="closeAdminSidebar()" class="md:hidden text-white/60 hover:text-white p-1"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <nav class="flex-grow p-4 space-y-1 overflow-y-auto">
                <p class="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 mt-4">Menu Utama</p>
                ${menus.map(menuItem).join('')}
                <p class="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 mt-6">Laporan &amp; Alat</p>
                ${tools.map(menuItem).join('')}
            </nav>
            <div class="p-4 border-t border-white/10">
                <button onclick="adminLogout()" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors font-medium">
                    <i data-lucide="log-out" class="w-4 h-4"></i> Keluar
                </button>
            </div>
        </aside>`;

    document.getElementById('admin-sidebar-container').outerHTML = html;
    lucide.createIcons();
    refreshSidebarBadges();
}

function openAdminSidebar() {
    document.getElementById('admin-sidebar').classList.remove('-translate-x-full');
    document.getElementById('admin-sidebar-backdrop').classList.remove('hidden');
}
function closeAdminSidebar() {
    document.getElementById('admin-sidebar').classList.add('-translate-x-full');
    document.getElementById('admin-sidebar-backdrop').classList.add('hidden');
}

/* Ambil jumlah konsultasi/pengaduan untuk badge sidebar */
async function refreshSidebarBadges() {
    try {
        const result = await apiGet('listLaporan');
        if (result.success) {
            const konsultasi = result.data.filter(d => d.jenis === 'Konsultasi').length;
            const pengaduan = result.data.filter(d => d.jenis === 'Pengaduan').length;
            const bk = document.getElementById('badge-konsultasi');
            const bp = document.getElementById('badge-pengaduan');
            if (bk) bk.innerText = konsultasi;
            if (bp) bp.innerText = pengaduan;
        }
    } catch (e) { /* silent */ }
}

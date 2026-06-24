// init.js — dijalankan terakhir setelah semua modul fungsi termuat

// ── Init ───────────────────────────────────────────────────────────────────
// Baca token dari URL jika dikirim oleh master service setelah login
// Contoh redirect dari master: http://<host>:8000/?token=<jwt>
const urlParams = new URLSearchParams(window.location.search);
const urlToken  = urlParams.get('token');
if (urlToken) {
    token = urlToken;
    localStorage.setItem('jwt_token', token);
    // Bersihkan token dari URL agar tidak terlihat di address bar
    window.history.replaceState({}, document.title, window.location.pathname);
    toast('Login berhasil via Master Service ✓', 'success');
}

_applyTokenUI(token);
loadRuang();
if (token) {
    loadMasterData();
} else {
    openLoginModal();
}

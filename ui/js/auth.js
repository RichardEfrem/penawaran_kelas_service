// auth.js — login/logout & status token

// ── Token ──────────────────────────────────────────────────────────────────
function _applyTokenUI(t) {
    const st = document.getElementById('tokenStatus');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin  = document.getElementById('btnLogin');
    if (t) {
        st.textContent = 'Token aktif ✓';
        st.className   = 'small text-success ms-2';
        btnLogout.classList.remove('d-none');
        btnLogin.classList.add('d-none');
    } else {
        st.textContent = 'Belum login';
        st.className   = 'small text-muted ms-2';
        btnLogout.classList.add('d-none');
        btnLogin.classList.remove('d-none');
    }
}

function openLoginModal() {
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    mLogin.show();
    setTimeout(() => document.getElementById('login-username').focus(), 300);
}

async function doLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    if (!username || !password) {
        toast('Username dan password wajib diisi', 'error');
        return;
    }

    const btn = document.getElementById('btnDoLogin');
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    let res;
    try {
        // Tidak lewat api(): saat login belum ada token untuk header Authorization.
        const r = await fetch('/penawaran/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        res = await r.json();
    } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Masuk';
        toast('Gagal terhubung ke server: ' + e.message, 'error');
        return;
    }

    btn.disabled = false;
    btn.textContent = 'Masuk';

    // Master service bisa mengembalikan token dalam beberapa bentuk — cek semuanya.
    const t = res.token || res.access_token || res.jwt ||
              (res.data && (res.data.token || res.data.access_token));
    if (!t) {
        toast(res.message || res.error || 'Login gagal — periksa username/password', 'error');
        return;
    }

    token = t;
    localStorage.setItem('jwt_token', token);
    _applyTokenUI(token);
    mLogin.hide();
    toast('Login berhasil ✓', 'success');
    loadMasterData();
    loadRuang();
}

function doLogout() {
    token = '';
    localStorage.removeItem('jwt_token');
    _applyTokenUI('');
    toast('Logout berhasil', 'secondary');
    openLoginModal();
}

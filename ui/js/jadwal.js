// jadwal.js — jadwal per kelas, tab jadwal (tabel), kalender mingguan

// ── Jadwal ──────────────────────────────────────────────────────────────────

async function loadJadwalByKelas(kelasId) {
    const data = await api('GET', `/penawaran/kelas/${kelasId}/jadwal`);
    const tbody = document.getElementById('jadwal-tbody');
    if (!Array.isArray(data) || !data.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">Belum ada jadwal</td></tr>`;
        return;
    }
    const tipeCls = { kuliah: 'bg-primary', uts: 'bg-warning text-dark', uas: 'bg-danger' };
    tbody.innerHTML = data.map(j => `
        <tr class="${j.is_outdated ? 'outdated-row' : ''}">
            <td><span class="badge ${tipeCls[j.tipe] || 'bg-secondary'}">${j.tipe.toUpperCase()}</span></td>
            <td>${esc(j.hari || j.tanggal || '—')}</td>
            <td class="text-nowrap">${j.jam_mulai?.slice(0,5)} – ${j.jam_selesai?.slice(0,5)}</td>
            <td class="small">${j.ruang_id ? esc(ruangLabel(j.ruang_id)) : '—'}</td>
            <td>
                ${j.is_outdated
                    ? '<span class="badge badge-nonaktif">Nonaktif</span>'
                    : '<span class="badge badge-tersedia">Aktif</span>'}
            </td>
            <td>
                ${!j.is_outdated ? `
                <button class="btn btn-sm btn-outline-danger btn-icon" onclick="hapusJadwal(${j.jadwal_id})">
                    <i class="bi bi-dash-circle"></i>
                </button>` : ''}
            </td>
        </tr>
    `).join('');
}

function openJadwalModal() {
    populateSelect('j-ruang-id', allRuang, 'ruang_id',
        r => `${r.kode_ruang} — ${r.nama_ruang || r.kode_ruang}${r.gedung ? ' (' + r.gedung + ')' : ''}`,
        '— pilih ruang (opsional) —');
    document.getElementById('j-tipe').value        = 'kuliah';
    document.getElementById('j-hari').value        = '';
    document.getElementById('j-tanggal').value     = '';
    document.getElementById('j-jam-mulai').value   = '';
    document.getElementById('j-jam-selesai').value = '';
    document.getElementById('j-ruang-id').value    = '';
    toggleJadwalFields();
    mJadwal.show();
}

function toggleJadwalFields() {
    const isKuliah = document.getElementById('j-tipe').value === 'kuliah';
    document.getElementById('j-hari-group').style.display    = isKuliah ? '' : 'none';
    document.getElementById('j-tanggal-group').style.display = isKuliah ? 'none' : '';
}

async function saveJadwal() {
    const tipe = document.getElementById('j-tipe').value;
    const jamMulai   = document.getElementById('j-jam-mulai').value;
    const jamSelesai = document.getElementById('j-jam-selesai').value;
    if (!jamMulai || !jamSelesai) { toast('Jam mulai dan selesai wajib diisi', 'error'); return; }

    const body = { tipe, jam_mulai: jamMulai, jam_selesai: jamSelesai };

    if (tipe === 'kuliah') {
        const hari = document.getElementById('j-hari').value;
        if (!hari) { toast('Hari wajib dipilih untuk jadwal kuliah', 'error'); return; }
        body.hari = hari;
    } else {
        const tanggal = document.getElementById('j-tanggal').value;
        if (!tanggal) { toast('Tanggal wajib diisi untuk UTS/UAS', 'error'); return; }
        body.tanggal = tanggal;
    }
    const ruangId = parseInt(document.getElementById('j-ruang-id').value);
    if (ruangId) body.ruang_id = ruangId;

    const res = await api('POST', `/penawaran/kelas/${currentKelasId}/jadwal`, body);
    if (res?.status === 'error') { toast(res.message, 'error'); return; }
    mJadwal.hide();
    toast('Jadwal ditambahkan');
    loadJadwalByKelas(currentKelasId);
}

async function hapusJadwal(jadwal_id) {
    if (!confirm('Nonaktifkan jadwal ini?')) return;
    const res = await api('DELETE', `/penawaran/jadwal/${jadwal_id}`);
    if (res?.status === 'error') { toast(res.message, 'error'); return; }
    toast('Jadwal dinonaktifkan');
    loadJadwalByKelas(currentKelasId);
}

// ══════════════════════════════════════════════════════════════════════════
// JADWAL TAB (semua jadwal)
// ══════════════════════════════════════════════════════════════════════════

async function loadJadwal(reset = false) {
    const tbody = document.getElementById('jadwal-all-tbody');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Memuat...</td></tr>`;

    const kelasId  = reset ? '' : document.getElementById('f-jadwal-kelas').value.trim();
    const tipe     = reset ? '' : document.getElementById('f-jadwal-tipe').value;
    const status   = reset ? '' : document.getElementById('f-jadwal-status').value;

    if (reset) {
        document.getElementById('f-jadwal-kelas').value  = '';
        document.getElementById('f-jadwal-tipe').value   = '';
        document.getElementById('f-jadwal-status').value = '';
    }

    let path = '/penawaran/jadwal?';
    if (kelasId) path += `kelas_id=${encodeURIComponent(kelasId)}&`;
    if (tipe)    path += `tipe=${encodeURIComponent(tipe)}&`;
    if (status !== '') path += `is_outdated=${encodeURIComponent(status)}&`;

    const data = await api('GET', path);

    if (!Array.isArray(data)) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">${data?.message || 'Gagal memuat'}</td></tr>`;
        document.getElementById('jadwal-count').textContent = '';
        return;
    }

    document.getElementById('jadwal-count').textContent = data.length ? `${data.length} jadwal ditemukan` : '';

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Tidak ada jadwal ditemukan</td></tr>`;
        return;
    }

    const tipeCls = { kuliah: 'bg-primary', uts: 'bg-warning text-dark', uas: 'bg-danger' };
    tbody.innerHTML = data.map(j => `
        <tr class="${j.is_outdated ? 'outdated-row' : ''}">
            <td class="text-muted small">#${j.jadwal_id}</td>
            <td>
                <a href="#" onclick="goToKelasDetail(${j.kelas_id}); return false;"
                   class="text-decoration-none fw-semibold small">
                    ${esc(allKelas.find(k=>k.kelas_id===j.kelas_id)?.kode_kelas || String(j.kelas_id))}
                </a>
            </td>
            <td><span class="badge ${tipeCls[j.tipe] || 'bg-secondary'}">${j.tipe.toUpperCase()}</span></td>
            <td>${esc(j.hari || j.tanggal || '—')}</td>
            <td class="text-nowrap">${j.jam_mulai?.slice(0,5)} – ${j.jam_selesai?.slice(0,5)}</td>
            <td class="small">${j.ruang_id ? esc(ruangLabel(j.ruang_id)) : '—'}</td>
            <td>
                ${j.is_outdated
                    ? '<span class="badge badge-nonaktif">Nonaktif</span>'
                    : '<span class="badge badge-tersedia">Aktif</span>'}
            </td>
            <td>
                ${!j.is_outdated ? `
                <button class="btn btn-sm btn-outline-danger btn-icon" title="Nonaktifkan"
                        onclick="hapusJadwalFromTab(${j.jadwal_id})">
                    <i class="bi bi-dash-circle"></i>
                </button>` : '—'}
            </td>
        </tr>
    `).join('');
}

// ── Kalender Mingguan ────────────────────────────────────────────────────────
const HARI_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
// Date.getDay(): 0=Minggu ... 6=Sabtu
const JS_DAY_TO_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function switchJadwalView(view) {
    document.getElementById('jadwal-view-tabel').style.display = view === 'tabel' ? '' : 'none';
    document.getElementById('jadwal-view-grid').style.display  = view === 'grid'  ? '' : 'none';
    document.getElementById('jadwal-subtab-tabel').classList.toggle('active', view === 'tabel');
    document.getElementById('jadwal-subtab-grid').classList.toggle('active', view === 'grid');
    if (view === 'grid') loadJadwalGrid();
}

// kuliah/praktikum pakai field 'hari'; uts/uas pakai 'tanggal' → turunkan harinya
function hariFromJadwal(j) {
    if (j.hari) return j.hari;
    if (j.tanggal) {
        const d = new Date(j.tanggal + 'T00:00:00');
        if (!isNaN(d.getTime())) return JS_DAY_TO_HARI[d.getDay()];
    }
    return null;
}

async function loadJadwalGrid() {
    const body = document.getElementById('jadwal-grid-body');
    body.innerHTML = `<div class="text-center text-muted py-4">Memuat...</div>`;

    const kelasId = document.getElementById('g-jadwal-kelas').value.trim();
    let path = '/penawaran/jadwal?is_outdated=false&';
    if (kelasId) path += `kelas_id=${encodeURIComponent(kelasId)}&`;

    const data = await api('GET', path);
    if (!Array.isArray(data)) {
        body.innerHTML = `<div class="text-center text-danger py-4">${data?.message || 'Gagal memuat'}</div>`;
        document.getElementById('jadwal-grid-count').textContent = '';
        return;
    }

    const byDay = {};
    HARI_ORDER.forEach(h => byDay[h] = []);
    let placed = 0;
    data.forEach(j => {
        const h = hariFromJadwal(j);
        if (h && byDay[h]) { byDay[h].push(j); placed++; }
    });
    HARI_ORDER.forEach(h => byDay[h].sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || '')));

    document.getElementById('jadwal-grid-count').textContent = `${placed} jadwal`;

    body.innerHTML = '<div class="jadwal-grid">' + HARI_ORDER.map(h => `
        <div class="jadwal-day">
            <h6>${h}</h6>
            ${byDay[h].length ? byDay[h].map(j => {
                const kode = allKelas.find(k => k.kelas_id === j.kelas_id)?.kode_kelas || ('Kelas ' + j.kelas_id);
                return `<div class="jadwal-card tipe-${j.tipe}">
                    <div class="jc-time">${(j.jam_mulai || '').slice(0,5)}–${(j.jam_selesai || '').slice(0,5)}</div>
                    <div>${esc(kode)} <span style="opacity:.85">(${j.tipe.toUpperCase()})</span></div>
                    ${j.ruang_id ? `<div style="opacity:.85">${esc(ruangLabel(j.ruang_id))}</div>` : ''}
                </div>`;
            }).join('') : '<div class="jadwal-day-empty">—</div>'}
        </div>
    `).join('') + '</div>';
}

async function hapusJadwalFromTab(jadwal_id) {
    if (!confirm('Nonaktifkan jadwal ini?')) return;
    const res = await api('DELETE', `/penawaran/jadwal/${jadwal_id}`);
    if (res?.status === 'error') { toast(res.message, 'danger'); return; }
    toast('Jadwal dinonaktifkan');
    loadJadwal();
}

function goToKelasDetail(kelasId) {
    switchTab('kelas');
    openKelasDetail(kelasId);
}

// core.js — state global, modal, helper API/toast, master data, navigasi tab, util

// ── State ──────────────────────────────────────────────────────────────────
let token         = localStorage.getItem('jwt_token') || '';
let currentKelasId   = null;
let currentKelasData = null;
let editingRuangId   = null;
let editingKelasId   = null;

// Master data cache
let masterSemesters  = [];
let masterUnits      = [];
let masterCourses    = [];
let masterLecturers  = [];
let masterCurriculums = [];
let allRuang         = [];
let allKelas         = [];

// Bootstrap modals
const mLogin  = new bootstrap.Modal('#modalLogin');
const mRuang  = new bootstrap.Modal('#modalRuang');
const mKelas  = new bootstrap.Modal('#modalKelas');
const mDosen  = new bootstrap.Modal('#modalDosen');
const mJadwal = new bootstrap.Modal('#modalJadwal');


// ── Master Data ────────────────────────────────────────────────────────────

function populateSelect(id, items, valueKey, labelFn, emptyLabel = '— pilih —') {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">${emptyLabel}</option>` +
        items.map(item => `<option value="${item[valueKey]}">${esc(labelFn(item))}</option>`).join('');
    if (cur) sel.value = cur;
}

async function loadMasterData() {
    if (!token) return;
    const [sems, units, courses, lecturers, curriculums, ruangList] = await Promise.all([
        api('GET', '/penawaran/master/semesters'),
        api('GET', '/penawaran/master/units'),
        api('GET', '/penawaran/master/courses'),
        api('GET', '/penawaran/master/lecturers'),
        api('GET', '/penawaran/master/curriculums'),
        api('GET', '/penawaran/ruang?status=tersedia'),
    ]);
    masterSemesters   = Array.isArray(sems)        ? sems        : [];
    masterUnits       = Array.isArray(units)        ? units       : [];
    masterCourses     = Array.isArray(courses)      ? courses     : [];
    masterLecturers   = Array.isArray(lecturers)    ? lecturers   : [];
    masterCurriculums = Array.isArray(curriculums)  ? curriculums : [];
    allRuang          = Array.isArray(ruangList)    ? ruangList   : [];

    // Populate filter selects
    // NOTE: Master service mengembalikan key generik "id" (bukan semester_id/unit_id/dst)
    populateSelect('f-kelas-semester', masterSemesters, 'id',
        s => `${s.name || s.id}${s.year ? ' ' + s.year : ''}`, 'Semua Semester');
    populateSelect('f-kelas-unit', masterUnits, 'id',
        u => u.name || u.id, 'Semua Unit');
}

async function refreshAllKelas() {
    const data = await api('GET', '/penawaran/kelas');
    allKelas = Array.isArray(data) ? data : [];
    populateSelect('f-jadwal-kelas', allKelas, 'kelas_id',
        k => `${k.kode_kelas} (ID ${k.kelas_id})`, 'Semua Kelas');
    populateSelect('g-jadwal-kelas', allKelas, 'kelas_id',
        k => `${k.kode_kelas} (ID ${k.kelas_id})`, 'Semua Kelas');
}

// Lookup helpers — return nama jika ada di cache, fallback ke ID
// NOTE: data master memakai key "id", jadi cocokkan dengan x.id
function semesterLabel(id) {
    const s = masterSemesters.find(x => String(x.id) === String(id));
    return s ? `${s.name || ''}${s.year ? ' ' + s.year : ''}`.trim() || id : id;
}
function courseLabel(id) {
    const c = masterCourses.find(x => String(x.id) === String(id));
    return c ? `${c.code ? c.code + ' — ' : ''}${c.name || id}` : id;
}
function unitLabel(id) {
    const u = masterUnits.find(x => String(x.id) === String(id));
    return u ? u.name || id : id;
}
function lecturerLabel(id) {
    const l = masterLecturers.find(x => String(x.id) === String(id));
    return l ? `${l.name || ''}${l.nip ? ' (NIP: ' + l.nip + ')' : ''}`.trim() || id : id;
}
function ruangLabel(id) {
    const r = allRuang.find(x => String(x.ruang_id) === String(id));
    return r ? `${r.kode_ruang} — ${r.nama_ruang || r.kode_ruang}` : id;
}


// ── API ────────────────────────────────────────────────────────────────────
async function api(method, path, body = null) {
    try {
        const opts = {
            method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(path, opts);
        return await res.json();
    } catch (e) {
        return { status: 'error', message: e.message };
    }
}

// ── Toast ──────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
    const id  = 'toast-' + Date.now();
    const cls = type === 'success' ? 'text-bg-success' : 'text-bg-danger';
    document.getElementById('toastContainer').insertAdjacentHTML('beforeend', `
        <div id="${id}" class="toast align-items-center ${cls} border-0 show">
            <div class="d-flex">
                <div class="toast-body">${msg}</div>
                <button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `);
    setTimeout(() => document.getElementById(id)?.remove(), 3500);
}

// ── Tab navigation ─────────────────────────────────────────────────────────
function switchTab(tab) {
    document.getElementById('tab-ruang').style.display   = tab === 'ruang'   ? '' : 'none';
    document.getElementById('tab-kelas').style.display   = tab === 'kelas'   ? '' : 'none';
    document.getElementById('tab-jadwal').style.display  = tab === 'jadwal'  ? '' : 'none';
    const tabs = ['ruang', 'kelas', 'jadwal'];
    document.querySelectorAll('#mainTabs .nav-link').forEach((el, i) => {
        el.classList.toggle('active', tabs[i] === tab);
    });
    if (tab === 'ruang')  loadRuang();
    if (tab === 'jadwal') refreshAllKelas();
}


// ── Utility ────────────────────────────────────────────────────────────────
function esc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

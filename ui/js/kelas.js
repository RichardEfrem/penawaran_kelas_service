// kelas.js — manajemen kelas, detail kelas, dosen per kelas

// ══════════════════════════════════════════════════════════════════════════
// KELAS
// ══════════════════════════════════════════════════════════════════════════

async function loadKelas(reset = false) {
    if (reset) {
        document.getElementById('f-kelas-semester').value = '';
        document.getElementById('f-kelas-unit').value = '';
    }
    const semId  = document.getElementById('f-kelas-semester').value;
    const unitId = document.getElementById('f-kelas-unit').value;
    let path = '/penawaran/kelas?';
    if (semId)  path += `semester_id=${semId}&`;
    if (unitId) path += `unit_id=${unitId}&`;

    const data = await api('GET', path);
    const tbody = document.getElementById('kelas-tbody');

    if (!Array.isArray(data)) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">${data?.message || 'Gagal memuat'}</td></tr>`;
        return;
    }
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Tidak ada kelas ditemukan</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(k => `
        <tr>
            <td><strong>${esc(k.kode_kelas)}</strong></td>
            <td class="small">${esc(courseLabel(k.course_id))}</td>
            <td class="small">${esc(semesterLabel(k.semester_id))}</td>
            <td>${k.kuota}</td>
            <td>${k.jumlah_terisi}</td>
            <td>${k.kuota - k.jumlah_terisi}</td>
            <td class="small">${k.ruang_ujian_id ? esc(ruangLabel(k.ruang_ujian_id)) : '—'}</td>
            <td><span class="badge ${k.status === 'aktif' ? 'badge-aktif' : 'badge-nonaktif'}">${k.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary btn-icon me-1" title="Lihat Detail"
                        onclick="openKelasDetail(${k.kelas_id})">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary btn-icon me-1" title="Edit"
                        onclick='openKelasModal(${JSON.stringify(k)})'>
                    <i class="bi bi-pencil"></i>
                </button>
                ${k.status === 'aktif' ? `
                <button class="btn btn-sm btn-outline-danger btn-icon" title="Nonaktifkan"
                        onclick="nonaktifkanKelas(${k.kelas_id})">
                    <i class="bi bi-dash-circle"></i>
                </button>` : ''}
            </td>
        </tr>
    `).join('');
}

function openKelasModal(kelas = null) {
    editingKelasId = kelas?.kelas_id || null;
    document.getElementById('modalKelasTitle').textContent = kelas ? 'Edit Kelas' : 'Tambah Kelas';
    document.getElementById('k-kode').value  = kelas?.kode_kelas || '';
    document.getElementById('k-kuota').value = kelas?.kuota ?? 30;
    document.getElementById('k-status').value = kelas?.status || 'aktif';
    document.getElementById('k-kode').disabled = !!kelas;

    // Populate selects dari master data (key generik "id" dari master service)
    populateSelect('k-course', masterCourses, 'id',
        c => `${c.code ? c.code + ' — ' : ''}${c.name || c.id}`, '— pilih mata kuliah —');
    populateSelect('k-semester', masterSemesters, 'id',
        s => `${s.name || s.id}${s.year ? ' ' + s.year : ''}`, '— pilih semester —');
    populateSelect('k-unit', masterUnits, 'id',
        u => u.name || u.id, '— pilih unit —');
    populateSelect('k-curriculum', masterCurriculums, 'id',
        c => `${c.name || c.id}${c.year ? ' (' + c.year + ')' : ''}`, '— pilih kurikulum (opsional) —');
    populateSelect('k-ruang-ujian', allRuang, 'ruang_id',
        r => `${r.kode_ruang} — ${r.nama_ruang || ''}`, '— tidak ada —');

    // Set nilai select setelah populate
    document.getElementById('k-course').value      = kelas?.course_id      || '';
    document.getElementById('k-semester').value    = kelas?.semester_id    || '';
    document.getElementById('k-unit').value        = kelas?.unit_id        || '';
    document.getElementById('k-curriculum').value  = kelas?.curriculum_id  || '';
    document.getElementById('k-ruang-ujian').value = kelas?.ruang_ujian_id || '';

    // Sembunyikan field yang tidak bisa diubah saat edit
    ['k-course-group', 'k-semester-group', 'k-unit-group', 'k-curriculum-group'].forEach(id => {
        document.getElementById(id).style.display = kelas ? 'none' : '';
    });
    mKelas.show();
}

function openKelasModalFromDetail() {
    openKelasModal(currentKelasData);
}

async function saveKelas() {
    const isEdit = !!editingKelasId;
    const ruangUjianVal  = document.getElementById('k-ruang-ujian').value;
    const curriculumVal  = document.getElementById('k-curriculum')?.value;
    const body = isEdit ? {
        kuota:          parseInt(document.getElementById('k-kuota').value) || 0,
        ruang_ujian_id: ruangUjianVal ? parseInt(ruangUjianVal) : null,
        status:         document.getElementById('k-status').value,
    } : {
        kode_kelas:     document.getElementById('k-kode').value.trim(),
        course_id:      parseInt(document.getElementById('k-course').value),
        semester_id:    parseInt(document.getElementById('k-semester').value),
        unit_id:        parseInt(document.getElementById('k-unit').value),
        curriculum_id:  curriculumVal ? parseInt(curriculumVal) : null,
        kuota:          parseInt(document.getElementById('k-kuota').value) || 0,
        ruang_ujian_id: ruangUjianVal ? parseInt(ruangUjianVal) : null,
    };

    if (!isEdit && (!body.kode_kelas || !body.course_id || !body.semester_id || !body.unit_id)) {
        toast('Kode kelas, mata kuliah, semester, dan unit wajib dipilih', 'error');
        return;
    }

    const res = isEdit
        ? await api('PUT',  `/penawaran/kelas/${editingKelasId}`, body)
        : await api('POST', '/penawaran/kelas', body);

    if (res?.status === 'error') { toast(res.message, 'error'); return; }
    mKelas.hide();
    toast(isEdit ? 'Kelas berhasil diupdate' : 'Kelas berhasil ditambahkan');

    if (isEdit && currentKelasId === editingKelasId) {
        openKelasDetail(currentKelasId); // refresh detail
    } else {
        loadKelas();
    }
}

async function nonaktifkanKelas(id) {
    if (!confirm('Nonaktifkan kelas ini?')) return;
    const res = await api('DELETE', `/penawaran/kelas/${id}`);
    if (res?.status === 'error') { toast(res.message, 'error'); return; }
    toast('Kelas dinonaktifkan');
    loadKelas();
}

// ── Kelas Detail ────────────────────────────────────────────────────────────

async function openKelasDetail(kelasId) {
    currentKelasId = kelasId;
    document.getElementById('kelas-list').style.display   = 'none';
    document.getElementById('kelas-detail').style.display = '';

    const kelas = await api('GET', `/penawaran/kelas/${kelasId}`);
    currentKelasData = kelas;
    document.getElementById('detail-kode').textContent = kelas.kode_kelas || '—';
    document.getElementById('detail-info').textContent =
        `${courseLabel(kelas.course_id)}  |  ${semesterLabel(kelas.semester_id)}  |  ` +
        `Unit: ${unitLabel(kelas.unit_id)}  |  ` +
        `Kuota: ${kelas.kuota}  |  Terisi: ${kelas.jumlah_terisi}  |  ` +
        `Ruang Ujian: ${kelas.ruang_ujian_id ? ruangLabel(kelas.ruang_ujian_id) : '—'}  |  Status: ${kelas.status}`;

    await Promise.all([
        loadDosenByKelas(kelasId),
        loadJadwalByKelas(kelasId),
    ]);
}

function backToKelas() {
    currentKelasId   = null;
    currentKelasData = null;
    document.getElementById('kelas-list').style.display   = '';
    document.getElementById('kelas-detail').style.display = 'none';
}

// ── Dosen ───────────────────────────────────────────────────────────────────

async function loadDosenByKelas(kelasId) {
    const data = await api('GET', `/penawaran/kelas/${kelasId}/dosen`);
    const tbody = document.getElementById('dosen-tbody');
    if (!Array.isArray(data) || !data.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">Belum ada dosen</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(d => `
        <tr>
            <td>${esc(lecturerLabel(d.lecturer_id))}</td>
            <td><span class="badge bg-secondary">${d.peran}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-danger btn-icon" onclick="removeDosen(${d.kelas_dosen_id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openDosenModal() {
    populateSelect('d-lecturer-id', masterLecturers, 'id',
        l => `${l.name || l.id}${l.nip ? ' — NIP: ' + l.nip : ''}`, '— pilih dosen —');
    document.getElementById('d-lecturer-id').value = '';
    document.getElementById('d-peran').value = 'pengampu';
    mDosen.show();
}

async function saveDosen() {
    const lid = parseInt(document.getElementById('d-lecturer-id').value);
    if (!lid) { toast('Pilih dosen terlebih dahulu', 'error'); return; }
    const res = await api('POST', `/penawaran/kelas/${currentKelasId}/dosen`, {
        lecturer_id: lid,
        peran: document.getElementById('d-peran').value,
    });
    if (res?.status === 'error') { toast(res.message, 'error'); return; }
    mDosen.hide();
    toast('Dosen ditambahkan');
    loadDosenByKelas(currentKelasId);
}

async function removeDosen(kelas_dosen_id) {
    if (!confirm('Hapus dosen dari kelas ini?')) return;
    const res = await api('DELETE', `/penawaran/kelas/dosen/${kelas_dosen_id}`);
    if (res?.status === 'error') { toast(res.message, 'error'); return; }
    toast('Dosen dihapus');
    loadDosenByKelas(currentKelasId);
}

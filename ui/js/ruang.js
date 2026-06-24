// ruang.js — manajemen ruang

// ══════════════════════════════════════════════════════════════════════════
// RUANG
// ══════════════════════════════════════════════════════════════════════════

async function loadRuang() {
    const tipe   = document.getElementById('f-ruang-tipe').value;
    const gedung = document.getElementById('f-ruang-gedung').value;
    const status = document.getElementById('f-ruang-status').value;
    let path = '/penawaran/ruang?';
    if (tipe)   path += `tipe=${encodeURIComponent(tipe)}&`;
    if (gedung) path += `gedung=${encodeURIComponent(gedung)}&`;
    if (status) path += `status=${encodeURIComponent(status)}&`;

    const data = await api('GET', path);
    const tbody = document.getElementById('ruang-tbody');

    if (!Array.isArray(data)) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${data?.message || 'Gagal memuat'}</td></tr>`;
        return;
    }
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Tidak ada ruang ditemukan</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(r => `
        <tr>
            <td><strong>${esc(r.kode_ruang)}</strong></td>
            <td>${esc(r.nama_ruang || '—')}</td>
            <td><span class="badge bg-secondary">${r.tipe}</span></td>
            <td>${r.kapasitas}</td>
            <td>${esc(r.gedung || '—')}</td>
            <td><span class="badge ${r.status === 'tersedia' ? 'badge-tersedia' : 'badge-nonaktif'}">${r.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary btn-icon me-1" title="Edit"
                        onclick='openRuangModal(${JSON.stringify(r)})'>
                    <i class="bi bi-pencil"></i>
                </button>
                ${r.status === 'tersedia' ? `
                <button class="btn btn-sm btn-outline-danger btn-icon" title="Nonaktifkan"
                        onclick="hapusRuang(${r.ruang_id})">
                    <i class="bi bi-dash-circle"></i>
                </button>` : ''}
            </td>
        </tr>
    `).join('');
}

function openRuangModal(ruang = null) {
    editingRuangId = ruang?.ruang_id || null;
    document.getElementById('modalRuangTitle').textContent = ruang ? 'Edit Ruang' : 'Tambah Ruang';
    document.getElementById('r-kode').value      = ruang?.kode_ruang  || '';
    document.getElementById('r-nama').value      = ruang?.nama_ruang  || '';
    document.getElementById('r-tipe').value      = ruang?.tipe        || 'kelas';
    document.getElementById('r-kapasitas').value = ruang?.kapasitas   ?? 40;
    document.getElementById('r-gedung').value    = ruang?.gedung      || '';
    document.getElementById('r-status').value    = ruang?.status      || 'tersedia';
    document.getElementById('r-kode').disabled   = !!ruang;
    mRuang.show();
}

async function saveRuang() {
    const body = {
        kode_ruang: document.getElementById('r-kode').value.trim(),
        nama_ruang: document.getElementById('r-nama').value.trim(),
        tipe:       document.getElementById('r-tipe').value,
        kapasitas:  parseInt(document.getElementById('r-kapasitas').value) || 0,
        gedung:     document.getElementById('r-gedung').value.trim(),
        status:     document.getElementById('r-status').value,
    };
    if (!editingRuangId && !body.kode_ruang) { toast('Kode ruang wajib diisi', 'error'); return; }

    const res = editingRuangId
        ? await api('PUT',  `/penawaran/ruang/${editingRuangId}`, body)
        : await api('POST', '/penawaran/ruang', body);

    if (res?.status === 'error') { toast(res.message, 'error'); return; }
    mRuang.hide();
    toast(editingRuangId ? 'Ruang berhasil diupdate' : 'Ruang berhasil ditambahkan');
    loadRuang();
}

async function hapusRuang(id) {
    if (!confirm('Nonaktifkan ruang ini?')) return;
    const res = await api('DELETE', `/penawaran/ruang/${id}`);
    if (res?.status === 'error') { toast(res.message, 'error'); return; }
    toast('Ruang dinonaktifkan');
    loadRuang();
}

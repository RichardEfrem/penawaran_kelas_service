# Penawaran Kelas Service

Microservice untuk mengelola penawaran kelas, ruang, penugasan dosen, dan jadwal dalam sistem SOA Final Project.

Dibangun menggunakan **Nameko** (RPC over RabbitMQ) dengan **HTTP Gateway** di port **8000**.

---

## Daftar Isi

- [Ketergantungan ke Master Service](#ketergantungan-ke-master-service)
- [Menjalankan dengan Docker](#menjalankan-dengan-docker)
- [Environment Variables](#environment-variables)
- [Autentikasi (JWT)](#autentikasi-jwt)
- [Admin UI](#admin-ui)
- [Referensi HTTP API](#referensi-http-api)
  - [Login](#login-1)
  - [Master Data Proxy](#master-data-proxy)
  - [Ruang](#ruang)
  - [Kelas](#kelas)
  - [Dosen per Kelas](#dosen-per-kelas)
  - [Jadwal](#jadwal)
- [Integrasi via RPC (Antar Service)](#integrasi-via-rpc-antar-service)
- [Model Data](#model-data)
- [Format Error](#format-error)

---

## Ketergantungan ke Master Service

Service ini memanggil `master_service` via RPC untuk dua keperluan:

**Validasi data saat menyimpan:**

| Endpoint | RPC yang dipanggil | Yang divalidasi |
|----------|--------------------|-----------------|
| `POST /penawaran/kelas` | `get_course_by_id`, `get_semester_by_id`, `get_unit_by_id` | course, semester, dan unit harus ada di master |
| `POST /penawaran/kelas/<id>/dosen` | `get_lecturer_by_id` | dosen harus terdaftar di master |

**Mengambil data master untuk UI dropdown:**

| Endpoint | RPC yang dipanggil |
|----------|--------------------|
| `GET /penawaran/master/semesters` | `get_all_semesters` |
| `GET /penawaran/master/units` | `get_all_units` |
| `GET /penawaran/master/courses` | `get_all_courses` |
| `GET /penawaran/master/lecturers` | `get_all_lecturers` |
| `GET /penawaran/master/curriculums` | `get_all_curriculums` |

> Jika `master_service` sedang tidak berjalan, endpoint validasi dan dropdown master akan **timeout**. Endpoint Ruang, Jadwal, dan semua operasi baca lainnya berjalan secara independen.

---

## Menjalankan dengan Docker

**Prasyarat:** Docker dan Docker Compose sudah terinstall.

### 1. Clone repository

```bash
git clone <repo-url>
cd penawaran_kelas
```

### 2. Buat file `.env`

```env
RABBIT_USER=appuser
RABBIT_PASS=appuser123
DB_USER=penawaran
DB_PASS=penawarankelas123
DB_NAME=penawaran_kelas
JWT_SECRET_KEY=abl_soa_finalProject
```

> Jangan pernah commit file `.env` ke repository.

### 3. Jalankan semua container

```bash
docker compose up -d --build
```

### 4. Verifikasi container berjalan

```bash
docker compose ps
```

Keempat container harus berstatus `Up`:

| Container | Fungsi |
|-----------|--------|
| `rabbitmq` | Message broker (AMQP) |
| `db` | Database PostgreSQL |
| `penawaran_kelas` | Nameko RPC service |
| `gateway` | HTTP gateway port 8000 |

### 5. Lihat log

```bash
docker compose logs -f gateway
docker compose logs -f penawaran_kelas
```

### Menghentikan service

```bash
docker compose down       # hentikan container, data DB tetap ada
docker compose down -v    # hentikan container + hapus data DB
```


---

## Environment Variables

| Variable | Keterangan |
|----------|------------|
| `RABBIT_USER` | Username RabbitMQ |
| `RABBIT_PASS` | Password RabbitMQ |
| `DB_USER` | Username PostgreSQL |
| `DB_PASS` | Password PostgreSQL |
| `DB_NAME` | Nama database PostgreSQL |
| `JWT_SECRET_KEY` | Secret key JWT (harus sama dengan master service) |

> `RABBIT_HOST` dan `DB_HOST` di-set otomatis oleh Docker Compose menggunakan nama service container.

---

## Autentikasi (JWT)

Sistem autentikasi menggunakan JWT yang di-sign dengan secret key yang sama antara master service dan service ini. Token yang dikeluarkan oleh master service **langsung valid** di service ini tanpa perlu panggilan tambahan ke master — JWT bersifat stateless.

### Alur autentikasi

```
1. User login di Master Service (gateway utama)
   → Master Service mengeluarkan token JWT
   → Redirect ke http://<host>:8000/penawaran/ui?token=<jwt>

2. Admin UI menangkap token dari URL, menyimpannya di localStorage,
   lalu membersihkan URL agar token tidak terlihat di address bar.

3. Semua request berikutnya kirim token di header:
   Authorization: Bearer <token>

4. Gateway memverifikasi signature token menggunakan JWT_SECRET_KEY
   → jika valid, request dilanjutkan ke service
   → jika tidak valid, request ditolak dengan HTTP 401
```

> JWT_SECRET_KEY **harus sama persis** antara master service dan service ini (diset di `.env`). Selama key sama, token dari master otomatis diterima tanpa integrasi tambahan.

**Struktur payload token:**
```json
{
  "user_id": 1,
  "type": "dosen",
  "roles": ["admin"],
  "exp": 1234567890
}
```

**Membuat token untuk testing** (jika master service belum tersedia):

```bash
source venv/bin/activate
python3 -c "
import jwt, datetime
token = jwt.encode(
    {
        'user_id': 1,
        'type': 'dosen',
        'roles': ['admin'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    },
    'abl_soa_finalProject',
    algorithm='HS256'
)
print(token)
"
```

**Respons error autentikasi:**

| Status | Pesan | Penyebab |
|--------|-------|----------|
| 401 | `Tiket tidak ditemukan! Silakan login.` | Header Authorization tidak dikirim |
| 401 | `Format token tidak valid.` | Format bukan `Bearer <token>` |
| 401 | `Tiket sudah kadaluwarsa, login lagi.` | Token sudah expired |
| 401 | `Tiket palsu!` | Signature token tidak valid |

---

## Admin UI

Service ini menyertakan antarmuka admin berbasis web untuk mengelola Ruang, Kelas, Dosen, dan Jadwal.

**Akses:** `http://<host>:8000/penawaran/ui`

| Tab | Fitur |
|-----|-------|
| **Ruang** | Daftar dengan filter tipe/gedung/status, tambah, edit, nonaktifkan |
| **Kelas** | Daftar dengan filter semester/unit (dropdown), tambah, edit, nonaktifkan |
| **Detail Kelas** | Klik ikon 👁 — kelola dosen dan jadwal per kelas |
| **Jadwal** | Lihat semua jadwal lintas kelas, filter tipe/status/kelas, nonaktifkan |

**Semua field ID (mata kuliah, semester, unit, dosen, ruang) tampil sebagai dropdown** — data diambil otomatis dari master service saat login. Tidak perlu input angka ID secara manual.

### Login

Login dilakukan **hanya melalui Master Service**. Setelah berhasil login di Master Service, browser akan diarahkan ke UI ini dengan token disisipkan di URL (`?token=<jwt>`). Token ditangkap otomatis, disimpan ke `localStorage`, lalu URL dibersihkan.

Token tetap aktif selama tab tidak ditutup. Klik **Logout** untuk keluar.

---

## Referensi HTTP API

**Base URL:** `http://<host>:8000`

Semua request membutuhkan header `Authorization: Bearer <token>`.  
Semua response bertipe `Content-Type: application/json`.

---

## Login

### `POST /penawaran/login` — Login via Master Service

Endpoint proxy yang meneruskan kredensial ke `master_service.login()` dan mengembalikan token JWT. Tersedia untuk penggunaan programatik (misalnya testing via curl/Postman).

> Admin UI **tidak menggunakan endpoint ini** — login UI dilakukan melalui redirect dari Master Service.

> Endpoint ini **tidak membutuhkan token** — digunakan justru untuk mendapatkan token.

**Request body:**
```json
{
  "username": "nip_atau_email_dosen",
  "password": "password123"
}
```

**Respons `200`** (format sesuai yang dikembalikan master service):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Catatan:** Endpoint ini hanya tersedia saat service ini berjalan secara **standalone** (gateway sendiri). Saat berjalan dalam instance gabungan bersama project leader, gunakan endpoint login milik gateway utama (`POST /login`).

---

## Master Data Proxy

Endpoint ini meneruskan permintaan ke `master_service` via RPC dan mengembalikan hasilnya. Digunakan oleh Admin UI untuk mengisi dropdown — **tidak perlu dipanggil secara manual** dalam integrasi normal antar service.

Semua endpoint membutuhkan token JWT.

| Endpoint | Keterangan |
|----------|------------|
| `GET /penawaran/master/semesters` | Daftar semua semester |
| `GET /penawaran/master/units` | Daftar semua unit / prodi |
| `GET /penawaran/master/courses` | Daftar semua mata kuliah |
| `GET /penawaran/master/lecturers` | Daftar semua dosen |
| `GET /penawaran/master/curriculums` | Daftar semua kurikulum |

Format respons mengikuti format yang dikembalikan `master_service` secara langsung.

---

## Ruang

Modul ini mengelola data ruang (kelas, lab, aula) yang dapat digunakan untuk penjadwalan. Ruang perlu dibuat terlebih dahulu sebelum dapat dipakai di jadwal.

---

### `POST /penawaran/ruang` — Buat Ruang Baru

Menambahkan ruang baru ke dalam sistem. `kode_ruang` harus unik. Ruang yang baru dibuat otomatis berstatus `tersedia`.

**Request body:**
```json
{
  "kode_ruang": "A101",
  "nama_ruang": "Ruang Kuliah A101",
  "tipe": "kelas",
  "kapasitas": 40,
  "gedung": "Gedung A",
  "status": "tersedia"
}
```

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `kode_ruang` | string | ya | Kode unik ruang |
| `nama_ruang` | string | tidak | Nama tampilan ruang |
| `tipe` | string | tidak | `kelas` (default), `lab`, atau `aula` |
| `kapasitas` | integer | tidak | Kapasitas tempat duduk (default: 0) |
| `gedung` | string | tidak | Nama gedung |
| `status` | string | tidak | `tersedia` (default) atau `nonaktif` |

**Respons `200`:**
```json
{
  "status": "success",
  "ruang_id": 1
}
```

**Respons `400`:** `{"status": "error", "message": "kode_ruang sudah digunakan"}`

---

### `GET /penawaran/ruang` — Daftar Semua Ruang

Mengambil seluruh data ruang. Dapat difilter berdasarkan tipe atau status. Berguna untuk menampilkan pilihan ruang saat membuat jadwal.

**Query parameter (opsional):** `tipe`, `status`, `gedung`

Contoh: `GET /penawaran/ruang?tipe=kelas&status=tersedia&gedung=Gedung P`

**Respons `200`:**
```json
[
  {
    "ruang_id": 1,
    "kode_ruang": "A101",
    "nama_ruang": "Ruang Kuliah A101",
    "tipe": "kelas",
    "kapasitas": 40,
    "gedung": "Gedung A",
    "status": "tersedia"
  }
]
```

---

### `GET /penawaran/ruang/<ruang_id>` — Detail Ruang

Mengambil data satu ruang berdasarkan ID-nya.

**Respons `200`:** objek ruang (sama seperti di atas)  
**Respons `404`:** `{"status": "error", "message": "ruang tidak ditemukan"}`

---

### `PUT /penawaran/ruang/<ruang_id>` — Update Ruang

Mengubah data ruang yang sudah ada. Hanya field yang dikirim yang akan diupdate, field lain tidak berubah.

**Request body** (kirim hanya field yang ingin diubah):
```json
{
  "kapasitas": 50,
  "status": "tersedia"
}
```

Field yang bisa diubah: `nama_ruang`, `tipe`, `kapasitas`, `gedung`, `status`

**Respons `200`:** `{"status": "success", "message": "Ruang berhasil diupdate"}`  
**Respons `404`:** `{"status": "error", "message": "ruang tidak ditemukan"}`

---

### `DELETE /penawaran/ruang/<ruang_id>` — Nonaktifkan Ruang

Melakukan soft delete dengan mengubah status ruang menjadi `nonaktif`. Data ruang tidak dihapus dari database.

**Respons `200`:** `{"status": "success", "message": "Ruang berhasil dinonaktifkan"}`  
**Respons `404`:** `{"status": "error", "message": "ruang tidak ditemukan"}`

---

## Kelas

Modul ini mengelola data kelas yang ditawarkan. Kelas merupakan entitas utama yang menghubungkan mata kuliah, semester, dan unit organisasi.

---

### `POST /penawaran/kelas` — Buat Kelas Baru

Membuat penawaran kelas baru. Sebelum menyimpan, service ini memanggil `master_service` untuk memvalidasi bahwa `course_id`, `semester_id`, dan `unit_id` benar-benar ada. Jika salah satu tidak ditemukan di master, kelas tidak akan dibuat.

> ⚠️ Endpoint ini membutuhkan `master_service` aktif. Pastikan master service sudah berjalan sebelum memanggil endpoint ini.

**Request body:**
```json
{
  "kode_kelas": "MK001-A",
  "course_id": 1,
  "semester_id": 1,
  "unit_id": 1,
  "curriculum_id": 1,
  "kuota": 30,
  "ruang_ujian_id": 2
}
```

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `kode_kelas` | string | ya | Kode unik kelas |
| `course_id` | integer | ya | ID mata kuliah dari master service |
| `semester_id` | integer | ya | ID semester dari master service |
| `unit_id` | integer | ya | ID unit/prodi dari master service |
| `curriculum_id` | integer | tidak | ID kurikulum dari master service |
| `kuota` | integer | tidak | Batas maksimal peserta (default: 0) |
| `ruang_ujian_id` | integer | tidak | ID ruang yang dipakai untuk UTS dan UAS (jika diset, tidak perlu kirim `ruang_id` saat buat jadwal ujian) |

**Respons `200`:** `{"status": "success", "kelas_id": 1}`  
**Respons `400`:** `{"status": "error", "message": "mata kuliah tidak ditemukan"}`  
**Respons `400`:** `{"status": "error", "message": "semester tidak ditemukan"}`  
**Respons `400`:** `{"status": "error", "message": "unit tidak ditemukan"}`

---

### `GET /penawaran/kelas` — Daftar Semua Kelas

Mengambil semua data kelas. Bisa difilter berdasarkan semester atau unit. Berguna untuk menampilkan daftar kelas yang tersedia di suatu semester tertentu.

**Query parameter (opsional):** `semester_id`, `unit_id`

Contoh: `GET /penawaran/kelas?semester_id=1&unit_id=2`

**Respons `200`:**
```json
[
  {
    "kelas_id": 1,
    "kode_kelas": "MK001-A",
    "course_id": 1,
    "semester_id": 1,
    "unit_id": 1,
    "kuota": 30,
    "jumlah_terisi": 5,
    "ruang_ujian_id": 2,
    "status": "aktif"
  }
]
```

---

### `GET /penawaran/kelas/tersedia?semester_id=<id>` — Kelas Tersedia untuk PRS

Mengambil daftar kelas yang berstatus `aktif` dan masih memiliki sisa kuota (`sisa > 0`) pada semester tertentu. Endpoint ini dirancang khusus untuk digunakan oleh **service PRS (Pengisian Rencana Studi)** agar mahasiswa hanya bisa memilih kelas yang benar-benar tersedia.

Kelas yang sudah penuh (`jumlah_terisi >= kuota`) **tidak akan muncul** di hasil ini. Field `sisa` menunjukkan berapa slot yang masih bisa diisi (`kuota - jumlah_terisi`).

**Respons `200`:**
```json
[
  {
    "kelas_id": 1,
    "kode_kelas": "MK001-A",
    "course_id": 1,
    "kuota": 30,
    "sisa": 25,
    "ruang_ujian_id": 2
  }
]
```

---

### `GET /penawaran/kelas/<kelas_id>` — Detail Kelas

Mengambil data lengkap satu kelas berdasarkan ID, termasuk jumlah peserta yang sudah terdaftar.

**Respons `200`:**
```json
{
  "kelas_id": 1,
  "kode_kelas": "MK001-A",
  "course_id": 1,
  "semester_id": 1,
  "unit_id": 1,
  "curriculum_id": null,
  "kuota": 30,
  "jumlah_terisi": 5,
  "ruang_ujian_id": 2,
  "status": "aktif"
}
```

**Respons `404`:** `{"status": "error", "message": "kelas tidak ditemukan"}`

---

### `PUT /penawaran/kelas/<kelas_id>` — Update Kelas

Mengubah data kelas. Hanya field yang dikirim yang akan diupdate.

Field yang bisa diubah: `kode_kelas`, `kuota`, `ruang_ujian_id`, `status`

**Request body:**
```json
{
  "kuota": 40,
  "ruang_ujian_id": 3
}
```

**Respons `200`:** `{"status": "success", "message": "Kelas berhasil diupdate"}`  
**Respons `404`:** `{"status": "error", "message": "kelas tidak ditemukan"}`

---

### `DELETE /penawaran/kelas/<kelas_id>` — Nonaktifkan Kelas

Melakukan soft delete dengan mengubah status kelas menjadi `nonaktif`. Kelas yang nonaktif tidak akan muncul di hasil `get_kelas_tersedia`, sehingga mahasiswa tidak bisa memilihnya di PRS.

**Respons `200`:** `{"status": "success", "message": "Kelas berhasil dinonaktifkan"}`  
**Respons `404`:** `{"status": "error", "message": "kelas tidak ditemukan"}`

---

## Dosen per Kelas

Modul ini mengelola penugasan dosen ke kelas. Satu kelas bisa memiliki lebih dari satu dosen dengan peran yang berbeda (pengampu utama atau asisten).

---

### `POST /penawaran/kelas/<kelas_id>/dosen` — Tugaskan Dosen ke Kelas

Menambahkan dosen ke sebuah kelas. Service ini akan memanggil `master_service` untuk memverifikasi bahwa dosen dengan `lecturer_id` tersebut benar-benar terdaftar.

> ⚠️ Endpoint ini membutuhkan `master_service` aktif.

**Request body:**
```json
{
  "lecturer_id": 5,
  "peran": "pengampu"
}
```

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `lecturer_id` | integer | ya | ID dosen dari master service |
| `peran` | string | tidak | `pengampu` (default) atau `asisten` |

**Respons `200`:** `{"status": "success", "kelas_dosen_id": 1}`  
**Respons `400`:** `{"status": "error", "message": "dosen tidak ditemukan"}`  
**Respons `400`:** `{"status": "error", "message": "kelas tidak ditemukan"}`  
**Respons `400`:** `{"status": "error", "message": "dosen sudah terdaftar di kelas ini"}`

---

### `GET /penawaran/kelas/<kelas_id>/dosen` — Daftar Dosen di Kelas

Mengambil semua dosen yang ditugaskan ke sebuah kelas beserta perannya.

**Respons `200`:**
```json
[
  {
    "kelas_dosen_id": 1,
    "lecturer_id": 5,
    "peran": "pengampu"
  },
  {
    "kelas_dosen_id": 2,
    "lecturer_id": 7,
    "peran": "asisten"
  }
]
```

---

### `DELETE /penawaran/kelas/dosen/<kelas_dosen_id>` — Hapus Dosen dari Kelas

Menghapus penugasan dosen dari kelas berdasarkan `kelas_dosen_id` (bukan `lecturer_id`). `kelas_dosen_id` didapat dari respons saat menambahkan dosen atau dari endpoint GET dosen di atas.

**Respons `200`:** `{"status": "success", "message": "Dosen berhasil dihapus dari kelas"}`  
**Respons `404`:** `{"status": "error", "message": "data dosen kelas tidak ditemukan"}`

---

## Jadwal

Modul ini mengelola jadwal kelas. Terdapat tiga tipe jadwal:
- **Kuliah** — jadwal mingguan berulang, menggunakan field `hari`
- **UTS** — jadwal Ujian Tengah Semester pada tanggal tertentu
- **UAS** — jadwal Ujian Akhir Semester pada tanggal tertentu

Sistem secara otomatis mengecek **tabrakan ruang** sebelum menyimpan jadwal baru.

---

### `POST /penawaran/kelas/<kelas_id>/jadwal` — Buat Jadwal

Membuat jadwal untuk sebuah kelas. Terdapat tiga tipe jadwal:

| Tipe | Digunakan untuk | Field yang dipakai |
|------|-----------------|-------------------|
| `kuliah` | Pertemuan mingguan rutin | `hari`, `ruang_id` |
| `uts` | Ujian Tengah Semester | `tanggal`, `ruang_id` auto dari kelas |
| `uas` | Ujian Akhir Semester | `tanggal`, `ruang_id` auto dari kelas |

**Auto-fill ruang untuk UTS/UAS:** jika kelas memiliki `ruang_ujian_id`, maka jadwal bertipe `uts` atau `uas` tidak perlu menyertakan `ruang_id` — sistem otomatis menggunakan ruang ujian yang sudah didaftarkan di kelas.

**Cek tabrakan ruang** aktif jika `ruang_id` tersedia (baik dari input maupun auto-fill):
- Jadwal kuliah (`hari`): cek tabrakan jam di hari yang sama dalam ruang yang sama
- Jadwal ujian (`tanggal`): cek tabrakan jam di tanggal yang sama dalam ruang yang sama

Cek tabrakan terjadi jika: `jam_mulai request < jam_selesai existing` **dan** `jam_selesai request > jam_mulai existing`.

> Jadwal yang sudah dinonaktifkan (`is_outdated = true`) **tidak ikut diperiksa** dalam cek tabrakan, sehingga slot yang sudah dibebaskan bisa digunakan kembali.

**Request body — jadwal kuliah mingguan:**
```json
{
  "tipe": "kuliah",
  "hari": "Senin",
  "jam_mulai": "08:00",
  "jam_selesai": "10:00",
  "ruang_id": 1
}
```

**Request body — jadwal UTS (ruang auto dari kelas):**
```json
{
  "tipe": "uts",
  "tanggal": "2026-07-15",
  "jam_mulai": "08:00",
  "jam_selesai": "10:00"
}
```

**Request body — jadwal UAS (ruang auto dari kelas):**
```json
{
  "tipe": "uas",
  "tanggal": "2026-08-20",
  "jam_mulai": "08:00",
  "jam_selesai": "10:00"
}
```

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `tipe` | string | tidak | `kuliah` (default), `uts`, atau `uas` |
| `hari` | string | tidak | Nama hari untuk jadwal kuliah, e.g. `Senin`, `Selasa` |
| `tanggal` | string | tidak | Tanggal spesifik format `YYYY-MM-DD` untuk UTS/UAS |
| `jam_mulai` | string | ya | Jam mulai format `HH:MM` |
| `jam_selesai` | string | ya | Jam selesai format `HH:MM` |
| `ruang_id` | integer | tidak | ID ruang. Untuk `uts`/`uas` otomatis diambil dari `ruang_ujian_id` kelas jika tidak diisi |

**Respons `200`:** `{"status": "success", "jadwal_id": 1}`  
**Respons `400`:** `{"status": "error", "message": "ruang bentrok pada jam tersebut"}` — tabrakan jadwal mingguan  
**Respons `400`:** `{"status": "error", "message": "ruang sudah dipakai pada tanggal dan jam tersebut"}` — tabrakan jadwal ujian

---

### `GET /penawaran/kelas/<kelas_id>/jadwal` — Daftar Jadwal Kelas

Mengambil semua jadwal yang dimiliki sebuah kelas, baik jadwal kuliah mingguan maupun jadwal ujian. Field `is_outdated` menandai jadwal yang sudah tidak berlaku lagi.

**Respons `200`:**
```json
[
  {
    "jadwal_id": 1,
    "tipe": "kuliah",
    "hari": "Senin",
    "tanggal": null,
    "jam_mulai": "08:00:00",
    "jam_selesai": "10:00:00",
    "ruang_id": 1,
    "is_outdated": false
  },
  {
    "jadwal_id": 2,
    "tipe": "uts",
    "hari": null,
    "tanggal": "2026-07-15",
    "jam_mulai": "08:00:00",
    "jam_selesai": "10:00:00",
    "ruang_id": 1,
    "is_outdated": false
  }
]
```

---

### `DELETE /penawaran/jadwal/<jadwal_id>` — Nonaktifkan Jadwal

Melakukan soft delete dengan menandai jadwal sebagai tidak berlaku lagi (`is_outdated = true`). Jadwal tidak dihapus dari database sehingga histori tetap tersimpan. `jadwal_id` didapat dari respons `buat_jadwal` atau dari endpoint GET jadwal di atas.

**Respons `200`:** `{"status": "success", "message": "Jadwal berhasil dinonaktifkan"}`  
**Respons `404`:** `{"status": "error", "message": "jadwal tidak ditemukan"}`

---

## Integrasi via RPC (Antar Service)

Service Nameko lain dapat memanggil `penawaran_kelas` langsung via RPC tanpa melewati HTTP gateway dan tanpa membutuhkan JWT. Ini adalah cara yang disarankan untuk komunikasi antar service.

**Nama service:** `penawaran_kelas`

**Contoh penggunaan:**
```python
from nameko.rpc import RpcProxy

class ServiceLain:
    penawaran_kelas = RpcProxy("penawaran_kelas")

    def contoh(self):
        # Ambil kelas yang tersedia untuk PRS
        kelas_list = self.penawaran_kelas.get_kelas_tersedia(semester_id=1)

        # Ambil detail kelas
        kelas = self.penawaran_kelas.get_kelas(kelas_id=1)

        # Ambil jadwal kelas
        jadwal = self.penawaran_kelas.get_jadwal(kelas_id=1)
```

**Daftar method RPC yang tersedia:**

| Method | Parameter | Return |
|--------|-----------|--------|
| `create_kelas(data)` | dict | `kelas_id` (int) atau `{"error": ...}` |
| `get_kelas(kelas_id)` | int | dict kelas atau `{"error": ...}` |
| `list_kelas(semester_id, unit_id)` | int opsional | list dict kelas |
| `update_kelas(kelas_id, data)` | int, dict | `{"ok": True}` atau `{"error": ...}` |
| `nonaktifkan_kelas(kelas_id)` | int | `{"ok": True}` atau `{"error": ...}` |
| `get_kelas_tersedia(semester_id)` | int | list kelas aktif dengan field `sisa` |
| `create_ruang(data)` | dict | `ruang_id` (int) atau `{"error": ...}` |
| `get_ruang(ruang_id)` | int | dict ruang atau `{"error": ...}` |
| `list_ruang(tipe, status, gedung)` | string opsional | list dict ruang |
| `update_ruang(ruang_id, data)` | int, dict | `{"ok": True}` atau `{"error": ...}` |
| `hapus_ruang(ruang_id)` | int | `{"ok": True}` atau `{"error": ...}` |
| `tambah_dosen(kelas_id, lecturer_id, peran)` | int, int, str | `kelas_dosen_id` (int) atau `{"error": ...}` |
| `get_dosen_by_kelas(kelas_id)` | int | list dict kelas_dosen |
| `remove_dosen(kelas_dosen_id)` | int | `{"ok": True}` atau `{"error": ...}` |
| `buat_jadwal(kelas_id, data)` | int, dict | `jadwal_id` (int) atau `{"error": ...}` |
| `get_jadwal(kelas_id)` | int | list dict jadwal milik kelas |
| `list_jadwal(kelas_id, tipe, is_outdated)` | semua opsional | list dict jadwal dengan filter |
| `hapus_jadwal(jadwal_id)` | int | `{"ok": True}` |

---

## Model Data

### Kelas

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `kelas_id` | BigInteger PK | Auto-increment |
| `kode_kelas` | String | Kode unik kelas |
| `course_id` | BigInteger | Referensi ke mata kuliah di master service |
| `semester_id` | BigInteger | Referensi ke semester di master service |
| `unit_id` | BigInteger | Referensi ke unit/prodi di master service |
| `curriculum_id` | BigInteger | Referensi ke kurikulum di master service (nullable) |
| `kuota` | Integer | Batas maksimal peserta |
| `jumlah_terisi` | Integer | Jumlah peserta yang sudah terdaftar (default 0) |
| `ruang_ujian_id` | BigInteger FK | Referensi ke Ruang yang dipakai untuk UTS dan UAS (nullable) |
| `status` | String | `aktif` atau `nonaktif` |

### KelasDosen

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `kelas_dosen_id` | BigInteger PK | Auto-increment |
| `kelas_id` | BigInteger FK | Referensi ke Kelas |
| `lecturer_id` | BigInteger | Referensi ke dosen di master service |
| `peran` | String | `pengampu` atau `asisten` |

### Ruang

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `ruang_id` | BigInteger PK | Auto-increment |
| `kode_ruang` | String | Kode unik ruang |
| `nama_ruang` | String | Nama tampilan ruang (nullable) |
| `tipe` | String | `kelas`, `lab`, atau `aula` |
| `kapasitas` | Integer | Kapasitas tempat duduk |
| `gedung` | String | Nama gedung (nullable) |
| `status` | String | `tersedia` atau `nonaktif` |

### Jadwal

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `jadwal_id` | BigInteger PK | Auto-increment |
| `kelas_id` | BigInteger FK | Referensi ke Kelas |
| `ruang_id` | BigInteger FK | Referensi ke Ruang (nullable) |
| `tipe` | String | `kuliah`, `uts`, atau `uas` |
| `hari` | String | Nama hari untuk jadwal mingguan (nullable) |
| `tanggal` | Date | Tanggal spesifik untuk ujian (nullable) |
| `jam_mulai` | Time | Jam mulai |
| `jam_selesai` | Time | Jam selesai |
| `is_outdated` | Boolean | Menandai jadwal yang sudah tidak berlaku (default false) |

---

## Format Error

Semua respons error menggunakan format yang konsisten:

```json
{
  "status": "error",
  "message": "<deskripsi error>"
}
```

| HTTP Status | Arti |
|-------------|------|
| 400 | Request tidak valid atau validasi gagal |
| 401 | Token JWT tidak ada atau tidak valid |
| 404 | Data tidak ditemukan |

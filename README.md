# Penawaran Kelas Service

Microservice for managing class offerings (kelas), rooms (ruang), lecturer assignments, and schedules (jadwal) in the SOA Final Project system.

Built with **Nameko** (RPC over RabbitMQ) + **HTTP Gateway** (port 8000).

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Dependencies on Master Service](#dependencies-on-master-service)
- [Running with Docker](#running-with-docker)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [HTTP API Reference](#http-api-reference)
  - [Ruang (Room)](#ruang-room)
  - [Kelas (Class)](#kelas-class)
  - [Dosen per Kelas](#dosen-per-kelas)
  - [Jadwal (Schedule)](#jadwal-schedule)
- [RPC Interface](#rpc-interface)
- [Data Models](#data-models)
- [Error Responses](#error-responses)

---

## Architecture

```
[HTTP Client / Postman]
        │
        ▼ :8000
[penawaran_gateway]  ──RPC──▶  [penawaran_kelas]  ──RPC──▶  [master_service]
                                       │
                                       ▼
                                  [PostgreSQL]
        All services communicate via RabbitMQ (AMQP)
```

- **RPC service name:** `penawaran_kelas`
- **Gateway service name:** `penawaran_gateway`
- **HTTP port:** `8000`

---

## Tech Stack

| Component | Version |
|-----------|---------|
| Python | 3.11 |
| Nameko | 2.14.1 |
| nameko-sqlalchemy | 1.5.0 |
| SQLAlchemy | < 2.0 |
| PostgreSQL driver | pg8000 |
| RabbitMQ | 3 (management) |
| PostgreSQL | 15 |
| PyJWT | 2.8.0 |

---

## Dependencies on Master Service

Two endpoints internally call `master_service` via RPC to validate foreign keys:

| Endpoint | Master RPC called | What it validates |
|----------|-------------------|-------------------|
| `POST /penawaran/kelas` | `get_course_by_id`, `get_semester_by_id`, `get_unit_by_id` | course, semester, unit must exist |
| `POST /penawaran/kelas/<id>/dosen` | `get_lecturer_by_id` | lecturer must exist |

> If `master_service` is not running, these two endpoints will **timeout**. All other endpoints work independently.

---

## Running with Docker

**Prerequisites:** Docker + Docker Compose installed on the host.

### 1. Clone the repository

```bash
git clone <repo-url>
cd penawaran_kelas
```

### 2. Create `.env` file

```bash
cp .env.example .env
# then edit .env with your values
```

### 3. Start all services

```bash
docker compose up -d --build
```

### 4. Verify containers are running

```bash
docker compose ps
```

All four containers should show `Up`:

| Container | Role |
|-----------|------|
| `rabbitmq` | Message broker (AMQP) |
| `db` | PostgreSQL database |
| `penawaran_kelas` | Nameko RPC service |
| `gateway` | HTTP gateway on port 8000 |

### 5. View logs

```bash
docker compose logs -f gateway
docker compose logs -f penawaran_kelas
```

### Stopping

```bash
docker compose down          # stop containers, keep DB volume
docker compose down -v       # stop containers AND delete DB data
```

---

## Environment Variables

Create a `.env` file in the project root (never commit this file):

```env
RABBIT_USER=appuser
RABBIT_PASS=appuser123
DB_USER=penawaran
DB_PASS=penawarankelas123
DB_NAME=penawaran_kelas
JWT_SECRET_KEY=abl_soa_finalProject
```

| Variable | Description |
|----------|-------------|
| `RABBIT_USER` | RabbitMQ username |
| `RABBIT_PASS` | RabbitMQ password |
| `DB_USER` | PostgreSQL username |
| `DB_PASS` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database name |
| `JWT_SECRET_KEY` | Shared JWT secret (must match master service) |

> `RABBIT_HOST` and `DB_HOST` are set automatically by Docker Compose (container service names).

---

## Authentication

Every HTTP endpoint requires a JWT token issued by the master service login.

**Header format:**
```
Authorization: Bearer <token>
```

**Token payload structure:**
```json
{
  "user_id": 1,
  "type": "dosen",
  "roles": ["admin"],
  "exp": 1234567890
}
```

**Generating a test token** (when master service is not available):

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

**Auth error responses:**

| Status | Message |
|--------|---------|
| 401 | `Tiket tidak ditemukan! Silakan login.` — header missing |
| 401 | `Format token tidak valid.` — not Bearer format |
| 401 | `Tiket sudah kadaluwarsa, login lagi.` — token expired |
| 401 | `Tiket palsu!` — invalid signature |

---

## HTTP API Reference

Base URL: `http://<host>:8000`

All requests require `Authorization: Bearer <token>` header.  
All responses are `Content-Type: application/json`.

---

### Ruang (Room)

#### Create Room
```
POST /penawaran/ruang
```

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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kode_ruang` | string | yes | Unique room code |
| `nama_ruang` | string | no | Display name |
| `tipe` | string | no | `kelas` (default) or `lab` or `aula` |
| `kapasitas` | integer | no | Seat capacity (default: 0) |
| `gedung` | string | no | Building name |
| `status` | string | no | `tersedia` (default) or `nonaktif` |

**Response `200`:**
```json
{
  "status": "success",
  "ruang_id": 1
}
```

---

#### List Rooms
```
GET /penawaran/ruang
GET /penawaran/ruang?tipe=kelas
GET /penawaran/ruang?status=tersedia
```

**Query params (optional):** `tipe`, `status`

**Response `200`:**
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

#### Get Room by ID
```
GET /penawaran/ruang/<ruang_id>
```

**Response `200`:** same object as above  
**Response `404`:** `{"status": "error", "message": "ruang tidak ditemukan"}`

---

#### Update Room
```
PUT /penawaran/ruang/<ruang_id>
```

**Request body** (any subset of fields):
```json
{
  "kapasitas": 50,
  "status": "tersedia"
}
```

**Response `200`:** `{"status": "success", "message": "Ruang berhasil diupdate"}`  
**Response `404`:** `{"status": "error", "message": "ruang tidak ditemukan"}`

---

#### Deactivate Room
```
DELETE /penawaran/ruang/<ruang_id>
```

Sets room status to `nonaktif` (soft delete).

**Response `200`:** `{"status": "success", "message": "Ruang berhasil dinonaktifkan"}`  
**Response `404`:** `{"status": "error", "message": "ruang tidak ditemukan"}`

---

### Kelas (Class)

#### Create Class
```
POST /penawaran/kelas
```

> Requires `master_service` to be running (validates course, semester, unit).

**Request body:**
```json
{
  "kode_kelas": "MK001-A",
  "course_id": 1,
  "semester_id": 1,
  "unit_id": 1,
  "curriculum_id": 1,
  "kuota": 30,
  "metode": "luring"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kode_kelas` | string | yes | Unique class code |
| `course_id` | integer | yes | Must exist in master service |
| `semester_id` | integer | yes | Must exist in master service |
| `unit_id` | integer | yes | Must exist in master service |
| `curriculum_id` | integer | no | Optional curriculum reference |
| `kuota` | integer | no | Max enrollment (default: 0) |
| `metode` | string | no | `luring` (default), `daring`, or `hybrid` |

**Response `200`:** `{"status": "success", "kelas_id": 1}`  
**Response `400`:** `{"status": "error", "message": "mata kuliah tidak ditemukan"}` (or semester/unit)

---

#### List Classes
```
GET /penawaran/kelas
GET /penawaran/kelas?semester_id=1
GET /penawaran/kelas?unit_id=2
GET /penawaran/kelas?semester_id=1&unit_id=2
```

**Response `200`:**
```json
[
  {
    "kelas_id": 1,
    "kode_kelas": "MK001-A",
    "course_id": 1,
    "semester_id": 1,
    "unit_id": 1,
    "kuota": 30,
    "jumlah_terisi": 0,
    "metode": "luring",
    "status": "aktif"
  }
]
```

---

#### Get Available Classes (for PRS)
```
GET /penawaran/kelas/tersedia?semester_id=1
```

Returns only active classes with remaining quota for a given semester. Intended for use by the PRS (pengisian rencana studi) service.

**Response `200`:**
```json
[
  {
    "kelas_id": 1,
    "kode_kelas": "MK001-A",
    "course_id": 1,
    "kuota": 30,
    "sisa": 28,
    "metode": "luring"
  }
]
```

---

#### Get Class by ID
```
GET /penawaran/kelas/<kelas_id>
```

**Response `200`:**
```json
{
  "kelas_id": 1,
  "kode_kelas": "MK001-A",
  "course_id": 1,
  "semester_id": 1,
  "unit_id": 1,
  "curriculum_id": null,
  "kuota": 30,
  "jumlah_terisi": 0,
  "metode": "luring",
  "status": "aktif"
}
```

**Response `404`:** `{"status": "error", "message": "kelas tidak ditemukan"}`

---

#### Update Class
```
PUT /penawaran/kelas/<kelas_id>
```

**Updatable fields:** `kode_kelas`, `kuota`, `metode`, `status`

```json
{
  "kuota": 40,
  "metode": "hybrid"
}
```

**Response `200`:** `{"status": "success", "message": "Kelas berhasil diupdate"}`  
**Response `404`:** `{"status": "error", "message": "kelas tidak ditemukan"}`

---

#### Deactivate Class
```
DELETE /penawaran/kelas/<kelas_id>
```

Sets class status to `nonaktif` (soft delete).

**Response `200`:** `{"status": "success", "message": "Kelas berhasil dinonaktifkan"}`  
**Response `404`:** `{"status": "error", "message": "kelas tidak ditemukan"}`

---

### Dosen per Kelas

#### Assign Lecturer to Class
```
POST /penawaran/kelas/<kelas_id>/dosen
```

> Requires `master_service` to be running (validates lecturer_id).

**Request body:**
```json
{
  "lecturer_id": 5,
  "peran": "pengampu"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lecturer_id` | integer | yes | Must exist in master service |
| `peran` | string | no | `pengampu` (default) or `asisten` |

**Response `200`:** `{"status": "success", "kelas_dosen_id": 1}`  
**Response `400`:** `{"status": "error", "message": "dosen tidak ditemukan"}`  
**Response `400`:** `{"status": "error", "message": "kelas tidak ditemukan"}`

---

#### Get Lecturers of a Class
```
GET /penawaran/kelas/<kelas_id>/dosen
```

**Response `200`:**
```json
[
  {
    "kelas_dosen_id": 1,
    "lecturer_id": 5,
    "peran": "pengampu"
  }
]
```

---

#### Remove Lecturer from Class
```
DELETE /penawaran/kelas/dosen/<kelas_dosen_id>
```

**Response `200`:** `{"status": "success", "message": "Dosen berhasil dihapus dari kelas"}`  
**Response `404`:** `{"status": "error", "message": "data dosen kelas tidak ditemukan"}`

---

### Jadwal (Schedule)

#### Create Schedule
```
POST /penawaran/kelas/<kelas_id>/jadwal
```

Supports two schedule types: **regular weekly** (use `hari`) and **one-time exam** (use `tanggal`).

**Request body — regular class schedule:**
```json
{
  "tipe": "kuliah",
  "hari": "Senin",
  "jam_mulai": "08:00",
  "jam_selesai": "10:00",
  "ruang_id": 1
}
```

**Request body — exam schedule:**
```json
{
  "tipe": "ujian",
  "tanggal": "2026-07-15",
  "jam_mulai": "08:00",
  "jam_selesai": "10:00",
  "ruang_id": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tipe` | string | no | `kuliah` (default) or `ujian` |
| `hari` | string | no | Day name e.g. `Senin`, `Selasa` (for weekly schedule) |
| `tanggal` | string | no | Date in `YYYY-MM-DD` format (for exam/one-time) |
| `jam_mulai` | string | yes | Start time `HH:MM` |
| `jam_selesai` | string | yes | End time `HH:MM` |
| `ruang_id` | integer | no | Room ID (enables collision check) |

**Collision check behavior:**
- If `ruang_id` + `hari` provided: checks for weekly time overlap in the same room
- If `ruang_id` + `tanggal` provided: checks for date+time overlap in the same room

**Response `200`:** `{"status": "success", "jadwal_id": 1}`  
**Response `400`:** `{"status": "error", "message": "ruang bentrok pada jam tersebut"}`  
**Response `400`:** `{"status": "error", "message": "ruang sudah dipakai pada tanggal dan jam tersebut"}`

---

#### Get Schedules of a Class
```
GET /penawaran/kelas/<kelas_id>/jadwal
```

**Response `200`:**
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
    "tipe": "ujian",
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

#### Delete Schedule
```
DELETE /penawaran/jadwal/<jadwal_id>
```

**Response `200`:** `{"status": "success", "message": "Jadwal berhasil dihapus"}`

---

## RPC Interface

Other Nameko services can call this service directly via RPC (no HTTP, no JWT needed).

**Service name:** `penawaran_kelas`

```python
from nameko.rpc import RpcProxy

class YourService:
    penawaran_kelas = RpcProxy("penawaran_kelas")

    def some_method(self):
        # Get all available classes for a semester
        kelas_list = self.penawaran_kelas.get_kelas_tersedia(semester_id=1)

        # Get a single class
        kelas = self.penawaran_kelas.get_kelas(kelas_id=1)

        # Get schedules
        jadwal = self.penawaran_kelas.get_jadwal(kelas_id=1)
```

**Available RPC methods:**

| Method | Parameters | Returns |
|--------|------------|---------|
| `create_kelas(data)` | dict with kode_kelas, course_id, semester_id, unit_id | `kelas_id` (int) or `{"error": ...}` |
| `get_kelas(kelas_id)` | int | kelas dict or `{"error": ...}` |
| `list_kelas(semester_id, unit_id)` | optional ints | list of kelas dicts |
| `update_kelas(kelas_id, data)` | int, dict | `{"ok": True}` or `{"error": ...}` |
| `nonaktifkan_kelas(kelas_id)` | int | `{"ok": True}` or `{"error": ...}` |
| `get_kelas_tersedia(semester_id)` | int | list of available kelas with `sisa` quota |
| `create_ruang(data)` | dict | `ruang_id` (int) |
| `get_ruang(ruang_id)` | int | ruang dict or `{"error": ...}` |
| `list_ruang(tipe, status)` | optional strings | list of ruang dicts |
| `update_ruang(ruang_id, data)` | int, dict | `{"ok": True}` or `{"error": ...}` |
| `hapus_ruang(ruang_id)` | int | `{"ok": True}` or `{"error": ...}` |
| `tambah_dosen(kelas_id, lecturer_id, peran)` | int, int, str | `kelas_dosen_id` (int) or `{"error": ...}` |
| `get_dosen_by_kelas(kelas_id)` | int | list of kelas_dosen dicts |
| `remove_dosen(kelas_dosen_id)` | int | `{"ok": True}` or `{"error": ...}` |
| `buat_jadwal(kelas_id, data)` | int, dict | `jadwal_id` (int) or `{"error": ...}` |
| `get_jadwal(kelas_id)` | int | list of jadwal dicts |
| `hapus_jadwal(jadwal_id)` | int | `{"ok": True}` |

---

## Data Models

### Kelas

| Column | Type | Description |
|--------|------|-------------|
| `kelas_id` | BigInteger PK | Auto-increment |
| `kode_kelas` | String | Unique class code |
| `course_id` | BigInteger | FK to master service course |
| `semester_id` | BigInteger | FK to master service semester |
| `unit_id` | BigInteger | FK to master service unit |
| `curriculum_id` | BigInteger | FK to master service curriculum (nullable) |
| `kuota` | Integer | Maximum enrollment |
| `jumlah_terisi` | Integer | Current enrollment count (default 0) |
| `metode` | String | `luring`, `daring`, or `hybrid` |
| `status` | String | `aktif` or `nonaktif` |

### KelasDosen

| Column | Type | Description |
|--------|------|-------------|
| `kelas_dosen_id` | BigInteger PK | Auto-increment |
| `kelas_id` | BigInteger FK | References Kelas |
| `lecturer_id` | BigInteger | FK to master service lecturer |
| `peran` | String | `pengampu` or `asisten` |

### Ruang

| Column | Type | Description |
|--------|------|-------------|
| `ruang_id` | BigInteger PK | Auto-increment |
| `kode_ruang` | String | Unique room code |
| `nama_ruang` | String | Display name (nullable) |
| `tipe` | String | `kelas`, `lab`, or `aula` |
| `kapasitas` | Integer | Seat capacity |
| `gedung` | String | Building name (nullable) |
| `status` | String | `tersedia` or `nonaktif` |

### Jadwal

| Column | Type | Description |
|--------|------|-------------|
| `jadwal_id` | BigInteger PK | Auto-increment |
| `kelas_id` | BigInteger FK | References Kelas |
| `ruang_id` | BigInteger FK | References Ruang (nullable) |
| `tipe` | String | `kuliah` or `ujian` |
| `hari` | String | Day name for weekly schedule (nullable) |
| `tanggal` | Date | Specific date for exam (nullable) |
| `jam_mulai` | Time | Start time |
| `jam_selesai` | Time | End time |
| `is_outdated` | Boolean | Marked true when schedule is no longer valid (default false) |

---

## Error Responses

All error responses follow this format:

```json
{
  "status": "error",
  "message": "<description>"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad request / validation failed |
| 401 | Missing or invalid JWT token |
| 404 | Resource not found |

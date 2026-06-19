from nameko.rpc import rpc, RpcProxy
from nameko_sqlalchemy import DatabaseSession

from .models import Base, Kelas, KelasDosen, Ruang, Jadwal


class PenawaranKelasService:
    name = "penawaran_kelas"

    db = DatabaseSession(Base)
    master_rpc = RpcProxy("master_service")

    # ---------- A. Manajemen Kelas ----------
    @rpc
    def create_kelas(self, data):
        # Uncomment once Master service is deployed:
        course   = self.master_rpc.get_course_by_id(data["course_id"])
        semester = self.master_rpc.get_semester_by_id(data["semester_id"])
        unit     = self.master_rpc.get_unit_by_id(data["unit_id"])
        if not course or course.get("status") == "error":   return {"error": "mata kuliah tidak ditemukan"}
        if not semester or semester.get("status") == "error": return {"error": "semester tidak ditemukan"}
        if not unit or unit.get("status") == "error":       return {"error": "unit tidak ditemukan"}
        kelas = Kelas(
            kode_kelas=data["kode_kelas"],
            course_id=data["course_id"],
            semester_id=data["semester_id"],
            unit_id=data["unit_id"],
            curriculum_id=data.get("curriculum_id"),
            kuota=data.get("kuota", 0),
            ruang_ujian_id=data.get("ruang_ujian_id"),
            status="aktif",
        )
        self.db.add(kelas)
        self.db.commit()
        return kelas.kelas_id

    @rpc
    def get_kelas(self, kelas_id):
        k = self.db.query(Kelas).get(kelas_id)
        if not k:
            return {"error": "kelas tidak ditemukan"}
        return {
            "kelas_id": k.kelas_id,
            "kode_kelas": k.kode_kelas,
            "course_id": k.course_id,
            "semester_id": k.semester_id,
            "unit_id": k.unit_id,
            "curriculum_id": k.curriculum_id,
            "kuota": k.kuota,
            "jumlah_terisi": k.jumlah_terisi,
            "ruang_ujian_id": k.ruang_ujian_id,
            "status": k.status,
        }

    @rpc
    def list_kelas(self, semester_id=None, unit_id=None):
        q = self.db.query(Kelas)
        if semester_id:
            q = q.filter_by(semester_id=semester_id)
        if unit_id:
            q = q.filter_by(unit_id=unit_id)
        rows = q.all()
        return [
            {
                "kelas_id": k.kelas_id,
                "kode_kelas": k.kode_kelas,
                "course_id": k.course_id,
                "semester_id": k.semester_id,
                "unit_id": k.unit_id,
                "kuota": k.kuota,
                "jumlah_terisi": k.jumlah_terisi,
                "ruang_ujian_id": k.ruang_ujian_id,
                "status": k.status,
            }
            for k in rows
        ]

    @rpc
    def update_kelas(self, kelas_id, data):
        kelas = self.db.query(Kelas).get(kelas_id)
        if not kelas:
            return {"error": "kelas tidak ditemukan"}
        for field in ("kode_kelas", "kuota", "ruang_ujian_id", "status"):
            if field in data:
                setattr(kelas, field, data[field])
        self.db.commit()
        return {"ok": True}

    @rpc
    def nonaktifkan_kelas(self, kelas_id):
        kelas = self.db.query(Kelas).get(kelas_id)
        if not kelas:
            return {"error": "kelas tidak ditemukan"}
        kelas.status = "nonaktif"
        self.db.commit()
        return {"ok": True}

    # ---------- B. Dosen ----------
    @rpc
    def tambah_dosen(self, kelas_id, lecturer_id, peran="pengampu"):
        # Uncomment once Master service is deployed:
        lecturer = self.master_rpc.get_lecturer_by_id(lecturer_id)
        if not lecturer or lecturer.get("status") == "error": return {"error": "dosen tidak ditemukan"}
        kelas = self.db.query(Kelas).get(kelas_id)
        if not kelas:
            return {"error": "kelas tidak ditemukan"}
        kd = KelasDosen(kelas_id=kelas_id, lecturer_id=lecturer_id, peran=peran)
        self.db.add(kd)
        self.db.commit()
        return kd.kelas_dosen_id

    @rpc
    def get_dosen_by_kelas(self, kelas_id):
        rows = self.db.query(KelasDosen).filter_by(kelas_id=kelas_id).all()
        return [
            {"kelas_dosen_id": r.kelas_dosen_id, "lecturer_id": r.lecturer_id, "peran": r.peran}
            for r in rows
        ]

    @rpc
    def remove_dosen(self, kelas_dosen_id):
        kd = self.db.query(KelasDosen).get(kelas_dosen_id)
        if not kd:
            return {"error": "data dosen kelas tidak ditemukan"}
        self.db.delete(kd)
        self.db.commit()
        return {"ok": True}

    # ---------- C. Ruang ----------
    @rpc
    def create_ruang(self, data):
        r = Ruang(
            kode_ruang=data["kode_ruang"],
            nama_ruang=data.get("nama_ruang"),
            tipe=data.get("tipe", "kelas"),
            kapasitas=data.get("kapasitas", 0),
            gedung=data.get("gedung"),
            status=data.get("status", "tersedia"),
        )
        self.db.add(r)
        self.db.commit()
        return r.ruang_id

    @rpc
    def get_ruang(self, ruang_id):
        r = self.db.query(Ruang).get(ruang_id)
        if not r:
            return {"error": "ruang tidak ditemukan"}
        return {
            "ruang_id": r.ruang_id,
            "kode_ruang": r.kode_ruang,
            "nama_ruang": r.nama_ruang,
            "tipe": r.tipe,
            "kapasitas": r.kapasitas,
            "gedung": r.gedung,
            "status": r.status,
        }

    @rpc
    def list_ruang(self, tipe=None, status=None, gedung=None):
        q = self.db.query(Ruang)
        if tipe:
            q = q.filter_by(tipe=tipe)
        if status:
            q = q.filter_by(status=status)
        if gedung:
            q = q.filter_by(gedung=gedung)
        rows = q.all()
        return [
            {
                "ruang_id": r.ruang_id,
                "kode_ruang": r.kode_ruang,
                "nama_ruang": r.nama_ruang,
                "tipe": r.tipe,
                "kapasitas": r.kapasitas,
                "gedung": r.gedung,
                "status": r.status,
            }
            for r in rows
        ]

    @rpc
    def update_ruang(self, ruang_id, data):
        r = self.db.query(Ruang).get(ruang_id)
        if not r:
            return {"error": "ruang tidak ditemukan"}
        for field in ("nama_ruang", "tipe", "kapasitas", "gedung", "status"):
            if field in data:
                setattr(r, field, data[field])
        self.db.commit()
        return {"ok": True}

    @rpc
    def hapus_ruang(self, ruang_id):
        r = self.db.query(Ruang).get(ruang_id)
        if not r:
            return {"error": "ruang tidak ditemukan"}
        r.status = "nonaktif"
        self.db.commit()
        return {"ok": True}

    # ---------- D. Jadwal ----------
    @rpc
    def buat_jadwal(self, kelas_id, data):
        if data.get("tipe") in ("uts", "uas") and not data.get("ruang_id"):
            kelas = self.db.query(Kelas).get(kelas_id)
            if kelas and kelas.ruang_ujian_id:
                data["ruang_id"] = kelas.ruang_ujian_id
        if data.get("ruang_id"):
            if data.get("hari"):
                bentrok = (
                    self.db.query(Jadwal)
                    .filter(
                        Jadwal.ruang_id == data["ruang_id"],
                        Jadwal.hari == data["hari"],
                        Jadwal.jam_mulai < data["jam_selesai"],
                        Jadwal.jam_selesai > data["jam_mulai"],
                    )
                    .first()
                )
                if bentrok:
                    return {"error": "ruang bentrok pada jam tersebut"}
            if data.get("tanggal"):
                bentrok = (
                    self.db.query(Jadwal)
                    .filter(
                        Jadwal.ruang_id == data["ruang_id"],
                        Jadwal.tanggal == data["tanggal"],
                        Jadwal.jam_mulai < data["jam_selesai"],
                        Jadwal.jam_selesai > data["jam_mulai"],
                    )
                    .first()
                )
                if bentrok:
                    return {"error": "ruang sudah dipakai pada tanggal dan jam tersebut"}
        j = Jadwal(
            kelas_id=kelas_id,
            ruang_id=data.get("ruang_id"),
            tipe=data.get("tipe", "kuliah"),
            hari=data.get("hari"),
            tanggal=data.get("tanggal"),
            jam_mulai=data["jam_mulai"],
            jam_selesai=data["jam_selesai"],
        )
        self.db.add(j)
        self.db.commit()
        return j.jadwal_id

    @rpc
    def get_jadwal(self, kelas_id):
        rows = self.db.query(Jadwal).filter_by(kelas_id=kelas_id).all()
        return [
            {
                "jadwal_id": r.jadwal_id,
                "tipe": r.tipe,
                "hari": r.hari,
                "tanggal": str(r.tanggal) if r.tanggal else None,
                "jam_mulai": str(r.jam_mulai),
                "jam_selesai": str(r.jam_selesai),
                "ruang_id": r.ruang_id,
                "is_outdated": r.is_outdated,
            }
            for r in rows
        ]

    @rpc
    def hapus_jadwal(self, jadwal_id):
        j = self.db.query(Jadwal).get(jadwal_id)
        if not j:
            return {"error": "jadwal tidak ditemukan"}
        j.is_outdated = True
        self.db.commit()
        return {"ok": True}

    # ---------- E. Untuk PRS ----------
    @rpc
    def get_kelas_tersedia(self, semester_id):
        rows = (
            self.db.query(Kelas)
            .filter_by(semester_id=semester_id, status="aktif")
            .all()
        )
        return [
            {
                "kelas_id": k.kelas_id,
                "kode_kelas": k.kode_kelas,
                "course_id": k.course_id,
                "kuota": k.kuota,
                "sisa": k.kuota - k.jumlah_terisi,
                "ruang_ujian_id": k.ruang_ujian_id,
            }
            for k in rows
        ]

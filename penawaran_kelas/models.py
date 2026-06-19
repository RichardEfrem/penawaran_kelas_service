from sqlalchemy import (
    Column, BigInteger, String, Integer, Numeric, Date, Time, DateTime,
    ForeignKey, Boolean, func,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()   # nama kelas "Base" dipakai sebagai kunci DB_URIS


class Kelas(Base):
    __tablename__ = "kelas"
    kelas_id = Column(BigInteger, primary_key=True, autoincrement=True)
    kode_kelas = Column(String(20), nullable=False)
    course_id = Column(BigInteger, nullable=False)        # ref Master
    semester_id = Column(BigInteger, nullable=False)      # ref Master
    unit_id = Column(BigInteger, nullable=False)          # ref Master
    curriculum_id = Column(BigInteger, nullable=True)     # ref Master (opsional)
    kuota = Column(Integer, nullable=False, default=0)
    jumlah_terisi = Column(Integer, nullable=False, default=0)
    metode = Column(String(10), default="luring")
    status = Column(String(15), default="draft")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    dosen = relationship("KelasDosen", backref="kelas")
    jadwal = relationship("Jadwal", backref="kelas")
    peserta = relationship("KelasMahasiswa", backref="kelas")


class KelasDosen(Base):
    __tablename__ = "kelas_dosen"
    kelas_dosen_id = Column(BigInteger, primary_key=True, autoincrement=True)
    kelas_id = Column(BigInteger, ForeignKey("kelas.kelas_id"), nullable=False)
    lecturer_id = Column(BigInteger, nullable=False)      # ref Master
    peran = Column(String(15), default="pengampu")


class Ruang(Base):
    __tablename__ = "ruang"
    ruang_id = Column(BigInteger, primary_key=True, autoincrement=True)
    kode_ruang = Column(String(20), unique=True, nullable=False)
    nama_ruang = Column(String(100))
    tipe = Column(String(10), default="kelas")            # kelas | lab
    kapasitas = Column(Integer, default=0)
    gedung = Column(String(50))
    status = Column(String(15), default="tersedia")


class Jadwal(Base):
    __tablename__ = "jadwal"
    jadwal_id = Column(BigInteger, primary_key=True, autoincrement=True)
    kelas_id = Column(BigInteger, ForeignKey("kelas.kelas_id"), nullable=False)
    ruang_id = Column(BigInteger, ForeignKey("ruang.ruang_id"), nullable=True)
    tipe = Column(String(10), default="kuliah")           # kuliah|praktikum|uts|uas
    hari = Column(String(10), nullable=True)              # untuk kuliah rutin
    tanggal = Column(Date, nullable=True)                 # untuk ujian
    jam_mulai = Column(Time, nullable=False)
    jam_selesai = Column(Time, nullable=False)
    is_outdated = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class KelasMahasiswa(Base):
    __tablename__ = "kelas_mahasiswa"
    kelas_mahasiswa_id = Column(BigInteger, primary_key=True, autoincrement=True)
    kelas_id = Column(BigInteger, ForeignKey("kelas.kelas_id"), nullable=False)
    student_id = Column(BigInteger, nullable=False)       # ref Master
    status = Column(String(10), default="aktif")
    nilai_akhir = Column(Numeric(5, 2), nullable=True)
    nilai_huruf = Column(String(2), nullable=True)
    bobot = Column(Numeric(3, 2), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
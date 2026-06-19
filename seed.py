import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from penawaran_kelas.models import Ruang

db_uri = "postgresql+pg8000://{}:{}@{}:5432/{}".format(
    os.environ["DB_USER"],
    os.environ["DB_PASS"],
    os.environ.get("DB_HOST", "localhost"),
    os.environ["DB_NAME"],
)

engine = create_engine(db_uri)
db = sessionmaker(bind=engine)()

print("Seeding ruang...")

ruang_list = [
    # ── LAB ──────────────────────────────────────
    Ruang(kode_ruang="LAB-MD",  nama_ruang="Lab Mobile Device",       tipe="lab", kapasitas=30, gedung="Gedung P"),
    Ruang(kode_ruang="LAB-SI",  nama_ruang="Lab Sistem Informasi",    tipe="lab", kapasitas=30, gedung="Gedung P"),
    Ruang(kode_ruang="LAB-PRG", nama_ruang="Lab Pemograman",          tipe="lab", kapasitas=30, gedung="Gedung P"),
    Ruang(kode_ruang="LAB-STD", nama_ruang="Lab Studio",              tipe="lab", kapasitas=30, gedung="Gedung P"),
    Ruang(kode_ruang="LAB-SC",  nama_ruang="Lab Sistem Cerdas",       tipe="lab", kapasitas=30, gedung="Gedung P"),
    Ruang(kode_ruang="LAB-JK",  nama_ruang="Lab Jaringan Komputer",   tipe="lab", kapasitas=30, gedung="Gedung P"),

    # ── KELAS LANTAI 2 ───────────────────────────
    Ruang(kode_ruang="P-203", nama_ruang="Ruang Kelas P203", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-204", nama_ruang="Ruang Kelas P204", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-205", nama_ruang="Ruang Kelas P205", tipe="kelas", kapasitas=40, gedung="Gedung P"),

    # ── KELAS LANTAI 5 ───────────────────────────
    Ruang(kode_ruang="P-503", nama_ruang="Ruang Kelas P503", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-504", nama_ruang="Ruang Kelas P504", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-505", nama_ruang="Ruang Kelas P505", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-506", nama_ruang="Ruang Kelas P506", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-507", nama_ruang="Ruang Kelas P507", tipe="kelas", kapasitas=40, gedung="Gedung P"),

    # ── KELAS LANTAI 6 ───────────────────────────
    Ruang(kode_ruang="P-612", nama_ruang="Ruang Kelas P612", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-613", nama_ruang="Ruang Kelas P613", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-614", nama_ruang="Ruang Kelas P614", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-615", nama_ruang="Ruang Kelas P615", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-617", nama_ruang="Ruang Kelas P617", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-618", nama_ruang="Ruang Kelas P618", tipe="kelas", kapasitas=40, gedung="Gedung P"),

    # ── KELAS LANTAI 7 ───────────────────────────
    Ruang(kode_ruang="P-706", nama_ruang="Ruang Kelas P706", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-707", nama_ruang="Ruang Kelas P707", tipe="kelas", kapasitas=40, gedung="Gedung P"),
    Ruang(kode_ruang="P-708", nama_ruang="Ruang Kelas P708", tipe="kelas", kapasitas=40, gedung="Gedung P"),
]

for r in ruang_list:
    existing = db.query(Ruang).filter_by(kode_ruang=r.kode_ruang).first()
    if not existing:
        db.add(r)
        db.flush()
        print(f"  + {r.kode_ruang} — {r.nama_ruang} (id={r.ruang_id})")
    else:
        print(f"  ~ {r.kode_ruang} sudah ada (id={existing.ruang_id})")

db.commit()
db.close()
print(f"\nSelesai. Total {len(ruang_list)} ruang diproses.")

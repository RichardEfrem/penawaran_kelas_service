import os
from sqlalchemy import create_engine
from penawaran_kelas.models import Base

uri = (
    f"postgresql+pg8000://{os.environ.get('DB_USER', 'postgres')}:"
    f"{os.environ.get('DB_PASS', 'postgres')}@"
    f"{os.environ.get('DB_HOST', 'localhost')}:5432/"
    f"{os.environ.get('DB_NAME', 'penawaran_kelas')}"
)
engine = create_engine(uri)
Base.metadata.create_all(engine)
print("Tabel berhasil dibuat.")
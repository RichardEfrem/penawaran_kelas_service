import json
import os
import jwt
from nameko.web.handlers import http
from nameko.rpc import RpcProxy
from werkzeug.wrappers import Response


class GatewayService:
    name = "penawaran_gateway"

    penawaran_kelas = RpcProxy("penawaran_kelas")

    def check_jwt(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None, {"status": "error", "message": "Tiket tidak ditemukan! Silakan login."}

        parts = auth_header.split(" ")
        if len(parts) != 2 or parts[0] != "Bearer":
            return None, {"status": "error", "message": "Format token tidak valid."}

        token = parts[1]
        try:
            SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "fallback_secret")
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            return payload, None
        except jwt.ExpiredSignatureError:
            return None, {"status": "error", "message": "Tiket sudah kadaluwarsa, login lagi."}
        except jwt.InvalidTokenError:
            return None, {"status": "error", "message": "Tiket palsu!"}

    def _ok(self, data, status=200):
        return Response(json.dumps(data), status=status, mimetype='application/json')

    def _err(self, message, status=400):
        return Response(json.dumps({"status": "error", "message": message}),
                        status=status, mimetype='application/json')

    # ────────────────────────────────────────────
    # RUANG
    # ────────────────────────────────────────────

    @http('POST', '/penawaran/ruang')
    def create_ruang(self, request):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        body = json.loads(request.get_data(as_text=True))
        result = self.penawaran_kelas.create_ruang(body)
        if isinstance(result, dict) and result.get("error"):
            return self._ok({"status": "error", "message": result["error"]}, status=400)
        return self._ok({"status": "success", "ruang_id": result})

    @http('GET', '/penawaran/ruang')
    def list_ruang(self, request):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        tipe   = request.args.get('tipe')
        status = request.args.get('status')
        gedung = request.args.get('gedung')
        result = self.penawaran_kelas.list_ruang(tipe=tipe, status=status, gedung=gedung)
        return self._ok(result)

    @http('GET', '/penawaran/ruang/<int:ruang_id>')
    def get_ruang(self, request, ruang_id):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        result = self.penawaran_kelas.get_ruang(ruang_id)
        if isinstance(result, dict) and result.get("error"):
            return self._ok({"status": "error", "message": result["error"]}, status=404)
        return self._ok(result)

    @http('PUT', '/penawaran/ruang/<int:ruang_id>')
    def update_ruang(self, request, ruang_id):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        body = json.loads(request.get_data(as_text=True))
        result = self.penawaran_kelas.update_ruang(ruang_id, body)
        if isinstance(result, dict) and result.get("error"):
            return self._ok({"status": "error", "message": result["error"]}, status=404)
        return self._ok({"status": "success", "message": "Ruang berhasil diupdate"})

    @http('DELETE', '/penawaran/ruang/<int:ruang_id>')
    def hapus_ruang(self, request, ruang_id):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        result = self.penawaran_kelas.hapus_ruang(ruang_id)
        if isinstance(result, dict) and result.get("error"):
            return self._ok({"status": "error", "message": result["error"]}, status=404)
        return self._ok({"status": "success", "message": "Ruang berhasil dinonaktifkan"})

    # ────────────────────────────────────────────
    # KELAS
    # ────────────────────────────────────────────

    @http('POST', '/penawaran/kelas')
    def create_kelas(self, request):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        body = json.loads(request.get_data(as_text=True))
        result = self.penawaran_kelas.create_kelas(body)
        if isinstance(result, dict) and result.get("error"):
            return self._ok({"status": "error", "message": result["error"]}, status=400)
        return self._ok({"status": "success", "kelas_id": result})

    @http('GET', '/penawaran/kelas/tersedia')
    def get_kelas_tersedia(self, request):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        semester_id = request.args.get('semester_id')
        if not semester_id:
            return self._err("semester_id diperlukan", status=400)
        result = self.penawaran_kelas.get_kelas_tersedia(int(semester_id))
        return self._ok(result)

    @http('GET', '/penawaran/kelas')
    def list_kelas(self, request):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        semester_id = request.args.get('semester_id')
        unit_id     = request.args.get('unit_id')
        result = self.penawaran_kelas.list_kelas(
            semester_id=int(semester_id) if semester_id else None,
            unit_id=int(unit_id) if unit_id else None,
        )
        return self._ok(result)

    @http('GET', '/penawaran/kelas/<int:kelas_id>')
    def get_kelas(self, request, kelas_id):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        result = self.penawaran_kelas.get_kelas(kelas_id)
        if isinstance(result, dict) and result.get("error"):
            return self._ok({"status": "error", "message": result["error"]}, status=404)
        return self._ok(result)

    @http('PUT', '/penawaran/kelas/<int:kelas_id>')
    def update_kelas(self, request, kelas_id):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        body = json.loads(request.get_data(as_text=True))
        result = self.penawaran_kelas.update_kelas(kelas_id, body)
        if isinstance(result, dict) and result.get("error"):
            return self._ok({"status": "error", "message": result["error"]}, status=404)
        return self._ok({"status": "success", "message": "Kelas berhasil diupdate"})

    @http('DELETE', '/penawaran/kelas/<int:kelas_id>')
    def nonaktifkan_kelas(self, request, kelas_id):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        result = self.penawaran_kelas.nonaktifkan_kelas(kelas_id)
        if isinstance(result, dict) and result.get("error"):
            return self._ok({"status": "error", "message": result["error"]}, status=404)
        return self._ok({"status": "success", "message": "Kelas berhasil dinonaktifkan"})

    # ────────────────────────────────────────────
    # DOSEN PER KELAS
    # ────────────────────────────────────────────

    @http('POST', '/penawaran/kelas/<int:kelas_id>/dosen')
    def tambah_dosen(self, request, kelas_id):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        body = json.loads(request.get_data(as_text=True))
        result = self.penawaran_kelas.tambah_dosen(
            kelas_id=kelas_id,
            lecturer_id=body.get('lecturer_id'),
            peran=body.get('peran', 'pengampu'),
        )
        if isinstance(result, dict) and result.get("error"):
            return self._ok({"status": "error", "message": result["error"]}, status=400)
        return self._ok({"status": "success", "kelas_dosen_id": result})

    @http('GET', '/penawaran/kelas/<int:kelas_id>/dosen')
    def get_dosen_by_kelas(self, request, kelas_id):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        result = self.penawaran_kelas.get_dosen_by_kelas(kelas_id)
        return self._ok(result)

    @http('DELETE', '/penawaran/kelas/dosen/<int:kelas_dosen_id>')
    def remove_dosen(self, request, kelas_dosen_id):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        result = self.penawaran_kelas.remove_dosen(kelas_dosen_id)
        if isinstance(result, dict) and result.get("error"):
            return self._ok({"status": "error", "message": result["error"]}, status=404)
        return self._ok({"status": "success", "message": "Dosen berhasil dihapus dari kelas"})

    # ────────────────────────────────────────────
    # JADWAL
    # ────────────────────────────────────────────

    @http('POST', '/penawaran/kelas/<int:kelas_id>/jadwal')
    def buat_jadwal(self, request, kelas_id):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        body = json.loads(request.get_data(as_text=True))
        result = self.penawaran_kelas.buat_jadwal(kelas_id, body)
        if isinstance(result, dict) and result.get("error"):
            return self._ok({"status": "error", "message": result["error"]}, status=400)
        return self._ok({"status": "success", "jadwal_id": result})

    @http('GET', '/penawaran/kelas/<int:kelas_id>/jadwal')
    def get_jadwal(self, request, kelas_id):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        result = self.penawaran_kelas.get_jadwal(kelas_id)
        return self._ok(result)

    @http('DELETE', '/penawaran/jadwal/<int:jadwal_id>')
    def hapus_jadwal(self, request, jadwal_id):
        jwt_payload, error = self.check_jwt(request)
        if error:
            return self._ok(error, status=401)

        result = self.penawaran_kelas.hapus_jadwal(jadwal_id)
        if isinstance(result, dict) and result.get("error"):
            return self._ok({"status": "error", "message": result["error"]}, status=404)
        return self._ok({"status": "success", "message": "Jadwal berhasil dinonaktifkan"})


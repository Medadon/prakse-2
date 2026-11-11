# Библиотеки сервера
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import re
from datetime import datetime, timezone

# Папка и файл заявок
ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "requests.json"


# Обработчик запросов
class MoscowHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Файлы сайта
        super().__init__(*args, directory=str(ROOT), **kwargs)

    # Приём заявки
    def do_POST(self):
        if self.path != "/api/requests":
            return self.send_json(404, {"error": "Lapa nav atrasta."})

        # Проверка JSON
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 20_000:
                return self.send_json(400, {"error": "Veidlapas datu apjoms nav derīgs."})
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(data, dict):
                return self.send_json(400, {"error": "Veidlapas dati nav derīgi."})
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
            return self.send_json(400, {"error": "Veidlapas dati nav derīgi."})

        # Проверка контактов
        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip()
        if len(name) < 2 or len(name) > 100 or len(email) > 200 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            return self.send_json(400, {"error": "Pārbaudi vārdu un e-pasta adresi."})

        # Запись заявки
        entry = {
            "id": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"),
            "name": name,
            "email": email,
            "period": str(data.get("period", ""))[:100],
            "interests": str(data.get("interests", "")).strip()[:1000],
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        # Сохранение заявки
        try:
            requests = json.loads(DATA_FILE.read_text(encoding="utf-8")) if DATA_FILE.exists() else []
            if not isinstance(requests, list):
                requests = []
            requests.append(entry)
            DATA_FILE.write_text(json.dumps(requests, ensure_ascii=False, indent=2), encoding="utf-8")
        except (OSError, json.JSONDecodeError):
            return self.send_json(500, {"error": "Pieteikumu neizdevās saglabāt."})

        self.send_json(201, {"ok": True, "id": entry["id"]})

    # Ответ в JSON
    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


# Запуск сервера
if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 3000), MoscowHandler)
    print("prakse 11.11.2026 darbojas: http://localhost:3000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServeris ir apturēts.")
        server.server_close()
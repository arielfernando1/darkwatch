from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class Handler(BaseHTTPRequestHandler):
    def _headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._headers(200)

    def do_POST(self):
        if self.path != "/analyze":
            self._headers(404)
            self.wfile.write(json.dumps({"error": "Ruta no encontrada"}).encode("utf-8"))
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length else "{}"

        try:
            data = json.loads(body)
        except Exception:
            data = {}

        heuristic = data.get("heuristicFindings", [])

        findings = []
        for item in heuristic:
            findings.append({
                "id": item.get("id", "unknown"),
                "name": item.get("name", "Hallazgo"),
                "category": item.get("category", "Sin categoría"),
                "severity": item.get("severity", "Media"),
                "evidence": item.get("evidence", "Sin evidencia"),
                "selector": item.get("selector", "body"),
                "confidence": "Alta",
                "source": "Endpoint remoto simulado"
            })

        response = {
            "model": "LLM remoto simulado",
            "warning": "",
            "findings": findings
        }

        self._headers(200)
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode("utf-8"))

server = HTTPServer(("localhost", 8787), Handler)
print("Servidor mock escuchando en http://localhost:8787/analyze")
server.serve_forever()
"""Tiny static file server with no-cache headers.

Python's default http.server hands out files with browser-friendly caching,
which makes iterating on CSS/JS painful. This server sets Cache-Control:
no-store so every reload picks up the current file.

Run:
    python devserver.py 5173
"""

import http.server
import os
import socketserver
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", port), NoCacheHandler) as httpd:
        print(f"Bidesiya dev server on http://localhost:{port}/  (no-cache)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()

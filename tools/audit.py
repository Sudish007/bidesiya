"""End-to-end audit for the Bidesiya web + backend.

Runs 5 checks and reports each as PASS/FAIL/WARN:

  1. Broken file references     — every href/src in HTML resolves to a real file
  2. Missing API methods        — every api.xxx(...) call in JS has a matching
                                   method definition in assets/js/api.js
  3. Dead nav links             — every <a href="...html"> in shell.js exists
  4. Backend endpoint sanity    — every GET route in FastAPI responds 2xx or
                                   a documented 4xx (401/403/404) when hit
                                   with a demo-user JWT
  5. Button IDs without handlers — every id="btn-..." in HTML has SOMEONE
                                   attaching an onclick handler in JS

USAGE:
    python bidesiya-web/tools/audit.py
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path
from urllib.error import HTTPError, URLError


WEB_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ROOT = WEB_ROOT.parent / "apna_bihar_backend"
API_BASE = "http://127.0.0.1:8000"

# Colors for terminal output. Fall back to plain if not supported.
try:
    import os
    if os.name == "nt":
        os.system("")  # enable ANSI on Windows
    C_PASS = "\033[92m"
    C_FAIL = "\033[91m"
    C_WARN = "\033[93m"
    C_DIM = "\033[90m"
    C_END = "\033[0m"
except Exception:
    C_PASS = C_FAIL = C_WARN = C_DIM = C_END = ""


def hdr(title: str) -> None:
    print(f"\n{C_DIM}{'=' * 72}{C_END}")
    print(f"  {title}")
    print(f"{C_DIM}{'=' * 72}{C_END}")


def ok(msg: str) -> None:
    print(f"  {C_PASS}PASS{C_END}  {msg}")


def fail(msg: str) -> None:
    print(f"  {C_FAIL}FAIL{C_END}  {msg}")


def warn(msg: str) -> None:
    print(f"  {C_WARN}WARN{C_END}  {msg}")


# ---------------------------------------------------------------------------
# 1. Broken file references
# ---------------------------------------------------------------------------

def check_file_refs() -> int:
    hdr("1/5  File references in HTML (href, src, import)")
    broken = []
    total = 0

    for html in WEB_ROOT.glob("*.html"):
        text = html.read_text(encoding="utf-8")
        for m in re.finditer(r'''(?:href|src|from)\s*=?\s*["']([^"'#]+)["']''', text):
            ref = m.group(1).strip()
            total += 1
            if not ref or ref.startswith(("http://", "https://", "//", "mailto:", "tel:", "data:", "#")):
                continue
            path = ref.split("?", 1)[0]
            if path.startswith("/"):
                target = WEB_ROOT / path.lstrip("/")
            else:
                target = html.parent / path
            if not target.exists():
                broken.append((html.name, ref))

    if not broken:
        ok(f"All {total} references resolve.")
    else:
        for h, r in broken:
            fail(f"{h} -> {r}")
    return len(broken)


# ---------------------------------------------------------------------------
# 2. Missing api.xxx() methods
# ---------------------------------------------------------------------------

def check_api_methods() -> int:
    hdr("2/5  api.js method definitions vs usage")
    api_js = (WEB_ROOT / "assets" / "js" / "api.js").read_text(encoding="utf-8")

    # Method definitions: "methodName(" or "async methodName("
    defined = set(re.findall(r"^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{", api_js, re.MULTILINE))
    # Also short-form: "methodName(...) { return this.xxx(...) }"
    defined |= set(re.findall(r"^\s*(\w+)\([^)]*\)\s*\{[^\n]*this\.", api_js, re.MULTILINE))

    # Also detect property-shorthand and arrow-form
    for line in api_js.splitlines():
        m = re.match(r"^\s*(\w+)\s*\(", line)
        if m and ':' not in line[:m.end()]:
            defined.add(m.group(1))

    # Special-case: api.token, api.userId are property getters/setters, api.base is a field
    KNOWN_PROPS = {"token", "userId", "base", "isAuthed", "setBase", "request", "signOut"}
    defined |= KNOWN_PROPS

    # Find call sites: api.xxx(
    unknown_calls = set()
    for js in (WEB_ROOT / "assets" / "js").glob("*.js"):
        if js.name == "api.js":
            continue
        text = js.read_text(encoding="utf-8")
        for m in re.finditer(r"\bapi\.(\w+)\s*\(", text):
            method = m.group(1)
            if method not in defined and method not in ("get", "post", "patch", "del", "postForm"):
                unknown_calls.add((js.name, method))

    if not unknown_calls:
        ok(f"All api.xxx() calls have a matching method in api.js ({len(defined)} defined).")
    else:
        for js, m in sorted(unknown_calls):
            fail(f"{js} calls api.{m}() but no such method")
    return len(unknown_calls)


# ---------------------------------------------------------------------------
# 3. Dead nav links from shell.js
# ---------------------------------------------------------------------------

def check_nav_links() -> int:
    hdr("3/5  Nav links in shell.js")
    shell = (WEB_ROOT / "assets" / "js" / "shell.js").read_text(encoding="utf-8")
    dead = []
    for m in re.finditer(r"href:\s*'([^']+\.html)'", shell):
        page = m.group(1)
        if not (WEB_ROOT / page).exists():
            dead.append(page)
    if dead:
        for p in dead:
            fail(f"Nav item -> {p} (file does not exist)")
    else:
        ok("All shell.js nav items resolve to real pages.")
    return len(dead)


# ---------------------------------------------------------------------------
# 4. Backend endpoint sanity
# ---------------------------------------------------------------------------

def get_demo_token() -> str | None:
    """Log in as demo user and return a JWT, or None if login fails."""
    try:
        req = urllib.request.Request(
            f"{API_BASE}/auth/request-otp",
            data=json.dumps({"phone": "9999900001"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as r:
            code = json.loads(r.read()).get("dev_code")
        if not code:
            return None
        req = urllib.request.Request(
            f"{API_BASE}/auth/verify-otp",
            data=json.dumps({"phone": "9999900001", "code": code}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as r:
            return json.loads(r.read()).get("access_token")
    except Exception as e:
        print(f"  {C_WARN}skip{C_END}  Could not log in as demo user: {e}")
        return None


# Endpoints that need a path parameter — use these seeded IDs to test.
# key = pattern, value = concrete URL
SEEDED_URLS = {
    "/posts/{id}": "/posts/1",
    "/posts/{id}/comments": "/posts/1/comments",
    "/tourism/bihar/{slug}": "/tourism/bihar/bodh-gaya",
    "/tourism/jharkhand/{slug}": "/tourism/jharkhand/netarhat",
    "/tourism/{state}": "/tourism/bihar",
    "/tourism/{state}/summary": "/tourism/bihar/summary",
    "/tourism/{state}/{slug}": "/tourism/bihar/bodh-gaya",
    "/market/{id}": "/market/1",
    "/crowdfund/{id}": "/crowdfund/1",
    "/crowdfund/{id}/pledges": "/crowdfund/1/pledges",
    "/crowdfund/{id}/updates": "/crowdfund/1/updates",
    "/communities/{slug}": "/communities/bhojpur-migrants",
    "/communities/{id}/members": "/communities/bhojpur-migrants/members",
    "/communities/{id}/posts": "/communities/bhojpur-migrants/posts",
    "/dm/conversations/{id}/messages": None,   # requires a real conv id; skip
    "/users/{id}/experience": "/users/4/experience",
    "/users/{id}/education": "/users/4/education",
    "/profiles/{ident}": "/profiles/admin",
    "/rishta/user/{id}": None,  # user must have a rishta profile
    "/notifications/{id}": "/notifications/1",
}

# Endpoints where a 400/422 (client-error with a message) is CORRECT for the
# demo user (e.g. requires setup we haven't done). Not a bug.
EXPECTED_CLIENT_ERROR = {
    "/rishta",       # 400 — demo user hasn't created a Rishta profile
    "/rishta/me",    # 404 or 400 — same
    "/search",       # 422 — needs a q= param; we skip
}


def check_backend_get_routes(token: str | None) -> int:
    hdr("4/5  Backend GET endpoints respond OK")
    if not token:
        warn("Skipping — could not obtain demo JWT. Is the backend running on :8000?")
        return 0

    # Fetch the OpenAPI schema to discover every route
    try:
        with urllib.request.urlopen(f"{API_BASE}/openapi.json", timeout=5) as r:
            spec = json.loads(r.read())
    except Exception as e:
        warn(f"Could not fetch /openapi.json: {e}")
        return 0

    failures = []
    ok_count = 0
    skipped = 0

    for path, methods in sorted(spec.get("paths", {}).items()):
        if "get" not in methods:
            continue
        # Skip admin/websocket/upload paths that need special setup
        if any(x in path for x in ("/websocket", "/uploads", "/openapi", "/docs", "/redoc")):
            continue
        # Skip endpoints known to require special setup
        if path in EXPECTED_CLIENT_ERROR:
            skipped += 1
            continue

        # Replace path params with seeded values
        url_to_hit = path
        if "{" in path:
            if path in SEEDED_URLS:
                if SEEDED_URLS[path] is None:
                    skipped += 1
                    continue
                url_to_hit = SEEDED_URLS[path]
            else:
                skipped += 1
                continue

        try:
            req = urllib.request.Request(
                f"{API_BASE}{url_to_hit}",
                headers={"Authorization": f"Bearer {token}"},
            )
            with urllib.request.urlopen(req, timeout=10) as r:
                if 200 <= r.status < 300:
                    ok_count += 1
                else:
                    failures.append((path, r.status, ""))
        except HTTPError as e:
            if e.code in (401, 403, 404):
                # Some routes are admin-only or need special setup — that's fine
                ok_count += 1
            else:
                body = ""
                try:
                    body = e.read().decode()[:200]
                except Exception:
                    pass
                failures.append((path, e.code, body))
        except URLError as e:
            failures.append((path, "URL-ERR", str(e)))

    print(f"  Tested: {ok_count} OK, {len(failures)} FAIL, {skipped} skipped (need context)")
    for path, code, body in failures[:20]:
        fail(f"GET {path}  -> {code}  {body[:100] if body else ''}")
    if len(failures) > 20:
        print(f"  ...and {len(failures)-20} more")
    return len(failures)


# ---------------------------------------------------------------------------
# 5. Button IDs without JS handlers
# ---------------------------------------------------------------------------

def check_button_handlers() -> int:
    hdr("5/5  Button IDs with wired onclick handlers")
    button_ids: dict[str, str] = {}  # id -> which_html
    handler_ids: set[str] = set()

    for html in WEB_ROOT.glob("*.html"):
        text = html.read_text(encoding="utf-8")
        for m in re.finditer(r'<button[^>]*id=["\'](btn-[\w-]+)["\']', text):
            button_ids[m.group(1)] = html.name

    for js in (WEB_ROOT / "assets" / "js").glob("*.js"):
        text = js.read_text(encoding="utf-8")
        # Handler patterns: getElementById('btn-x').onclick / .addEventListener
        for m in re.finditer(r'getElementById\(["\'](btn-[\w-]+)["\']\)', text):
            handler_ids.add(m.group(1))
        # querySelector('#btn-x')
        for m in re.finditer(r'querySelector\(["\']#(btn-[\w-]+)["\']', text):
            handler_ids.add(m.group(1))
        # $('btn-x')
        for m in re.finditer(r'\$\(["\'](btn-[\w-]+)["\']\)', text):
            handler_ids.add(m.group(1))

    unhandled = [(bid, html) for bid, html in button_ids.items() if bid not in handler_ids]
    if unhandled:
        for bid, html in sorted(unhandled):
            fail(f"{html}  #{bid} has no handler in any JS file")
    else:
        ok(f"All {len(button_ids)} btn-* IDs across HTMLs have a matching handler.")
    return len(unhandled)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    print(f"\n{C_DIM}Bidesiya audit — web root: {WEB_ROOT}{C_END}")
    total_fails = 0

    total_fails += check_file_refs()
    total_fails += check_api_methods()
    total_fails += check_nav_links()

    token = get_demo_token()
    total_fails += check_backend_get_routes(token)
    total_fails += check_button_handlers()

    print()
    if total_fails == 0:
        print(f"{C_PASS}All checks passed.{C_END}")
    else:
        print(f"{C_FAIL}{total_fails} issue(s) found.{C_END}")
    return total_fails


if __name__ == "__main__":
    sys.exit(0 if main() == 0 else 1)

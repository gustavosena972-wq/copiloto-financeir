import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
HTML = ROOT / "android-app/app/src/main/assets/mobile.html"
ASSET = ROOT / "android-app/app/src/main/assets/supabase.js"

html = HTML.read_text(encoding="utf-8")
assert 'src="supabase.js"' in html
assert 'cdn.jsdelivr.net/npm/@supabase/supabase-js' not in html
assert ASSET.is_file()
assert "createClient" in ASSET.read_text(encoding="utf-8")
assert ASSET.stat().st_size > 10000

print("PASS: Android WebView uses a bundled Supabase runtime asset.")

assert '<div id="app" class="wrap"><div class="cf-mobile-startup"' in html
assert 'mobile.html?v=1.0.45' in (ROOT / "android-app/app/src/main/java/br/com/copiloto/financeiro/MainActivity.kt").read_text(encoding="utf-8")
print("PASS: Android startup has visible fallback and cache-busted app entry.")


# Regression: the startup script must not contain duplicate function declarations that
# leave the WebView on the static startup screen because the main script cannot parse.
assert html.count("function mostrarErroInicial(e)") == 1
print("PASS: Android startup JavaScript parses past the initial error handler declaration.")

# Release contract: the tested Android package is 1.0.45/versionCode 45.
gradle = (ROOT / "android-app/app/build.gradle.kts").read_text(encoding="utf-8")
assert "versionCode = 45" in gradle
assert 'versionName = "1.0.45"' in gradle
print("PASS: Android release is pinned to 1.0.45/versionCode 45.")

# CI release trigger marker: 1.0.45

# Parse every classic inline script, rather than checking only one handler name.
# Node parses syntax without executing application code or making network requests.
import subprocess
from html.parser import HTMLParser

class InlineScripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.parts = None

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            attrs = dict(attrs)
            if "src" not in attrs and attrs.get("type", "") in ("", "text/javascript"):
                self.parts = []

    def handle_data(self, data):
        if self.parts is not None:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.parts is not None:
            self.scripts.append("".join(self.parts))
            self.parts = None

parser = InlineScripts()
parser.feed(html)
assert parser.scripts, "No application scripts found"
for number, script in enumerate(parser.scripts, 1):
    result = subprocess.run(["node", "--check"], input=script, text=True,
                            encoding="utf-8", capture_output=True)
    assert result.returncode == 0, f"Inline script {number}: {result.stderr}"
print(f"PASS: {len(parser.scripts)} Android inline scripts parse successfully.")

for asset in ("tamandua-task-core.js", "tamandua-actions.js", "reminder-plan.js", "tamandua-preferences.js", "navigation-drawer.js", "presentation-rebuild.js", "tamandua-presence.js", "sheet-workspace.js", "tamandua-workspace.js", "presentation-art.js", "file-export.js", "tamandua-session.js", "tamandua-enhancements.js", "mobile-polish.js", "mobile-motion.js", "tamandua-3d.js", "finance-core.js"):
    subprocess.run(["node", "--check", str(HTML.parent / asset)], check=True)
print("PASS: injected Android scripts parse successfully.")

# High-density artwork and bounded optional 3D assets are packaged locally.
import struct
portrait = (HTML.parent / "tamandua-planos-3d.png").read_bytes()
assert portrait[:8] == b"\x89PNG\r\n\x1a\n"
width, height = struct.unpack(">II", portrait[16:24])
assert width >= 2000 and height >= 700
face = (HTML.parent / "tamandua-face-v4.png").read_bytes()
assert face[:8] == b"\x89PNG\r\n\x1a\n"
face_width, face_height = struct.unpack(">II", face[16:24])
assert face_width >= 1024 and face_height >= 1024
model = (HTML.parent / "tamandua-authored-3d.glb").read_bytes()
assert model[:4] == b"glTF"
version, declared_size = struct.unpack("<II", model[4:12])
assert version == 2 and declared_size == len(model) and len(model) < 12_000_000
assert 'tamandua-session.js' in html and 'tamandua-enhancements.js' in html
print("PASS: high-density PNG and valid local GLB are packaged within the asset budget.")

module = (HTML.parent / "financial-world.js").read_text(encoding="utf-8")
subprocess.run(["node", "--input-type=module", "--check"], input=module, text=True, check=True)

module = (HTML.parent / "presentation-world.js").read_text(encoding="utf-8")
subprocess.run(["node", "--input-type=module", "--check"], input=module, text=True, check=True)

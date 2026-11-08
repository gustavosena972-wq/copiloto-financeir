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
assert 'mobile.html?v=1.0.40' in (ROOT / "android-app/app/src/main/java/br/com/copiloto/financeiro/MainActivity.kt").read_text(encoding="utf-8")
print("PASS: Android startup has visible fallback and cache-busted app entry.")


# Regression: the startup script must not contain duplicate function declarations that
# leave the WebView on the static startup screen because the main script cannot parse.
assert html.count("function mostrarErroInicial(e)") == 1
print("PASS: Android startup JavaScript parses past the initial error handler declaration.")

# Release contract: the tested Android package is 1.0.40/versionCode 40.
gradle = (ROOT / "android-app/app/build.gradle.kts").read_text(encoding="utf-8")
assert "versionCode = 40" in gradle
assert 'versionName = "1.0.40"' in gradle
print("PASS: Android release is pinned to 1.0.40/versionCode 40.")

# CI release trigger marker: 1.0.40

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

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
assert 'mobile.html?v=1.0.38' in (ROOT / "android-app/app/src/main/java/br/com/copiloto/financeiro/MainActivity.kt").read_text(encoding="utf-8")
print("PASS: Android startup has visible fallback and cache-busted app entry.")


# Regression: the startup script must not contain duplicate function declarations that
# leave the WebView on the static startup screen because the main script cannot parse.
assert html.count("function mostrarErroInicial(e)") == 1
print("PASS: Android startup JavaScript parses past the initial error handler declaration.")

# Release contract: the tested Android package is 1.0.39/versionCode 39.
gradle = (ROOT / "android-app/app/build.gradle.kts").read_text(encoding="utf-8")
assert "versionCode = 39" in gradle
assert 'versionName = "1.0.39"' in gradle
print("PASS: Android release is pinned to 1.0.39/versionCode 39.")

# CI release trigger marker: 1.0.39

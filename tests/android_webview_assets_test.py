import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
HTML = ROOT / "android-app/app/src/main/assets/mobile.html"
ASSET = ROOT / "android-app/app/src/main/assets/supabase.js"

html = HTML.read_text(encoding="utf-8")
assert 'src="supabase.js"' in html
assert 'cdn.jsdelivr.net/npm/@supabase/supabase-js' not in html
assert ASSET.is_file()
assert ASSET.stat().st_size > 50

print("PASS: Android WebView uses a bundled Supabase runtime asset.")

assert '<div id="app" class="wrap"><div class="cf-mobile-startup"' in html
assert 'mobile.html?v=1.0.38' in (ROOT / "android-app/app/src/main/java/br/com/copiloto/financeiro/MainActivity.kt").read_text(encoding="utf-8")
print("PASS: Android startup has visible fallback and cache-busted app entry.")

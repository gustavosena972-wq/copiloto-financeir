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

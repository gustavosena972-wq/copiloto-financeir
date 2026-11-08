import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
HTML = ROOT / "android-app/app/src/main/assets/mobile.html"
WORKFLOW = ROOT / ".github/workflows/android-release.yml"

html = HTML.read_text(encoding="utf-8")
workflow = WORKFLOW.read_text(encoding="utf-8")

assert 'src="supabase.js"' in html, "Android shell must load Supabase from bundled asset"
assert 'cdn.jsdelivr.net/npm/@supabase/supabase-js' not in html, "Android shell must not depend on remote Supabase CDN at startup"
assert "npm install @supabase/supabase-js@2.45.4" in workflow, "Release workflow must install the pinned Supabase runtime"
assert "supabase.js" in workflow and "android-app/app/src/main/assets" in workflow, "Release workflow must copy Supabase runtime into Android assets"
assert re.search(r"cp .*supabase\.js .*android-app/app/src/main/assets/supabase\.js", workflow), "Release workflow must copy the runtime into the packaged assets"

print("PASS: Android WebView Supabase runtime is locally packaged.")

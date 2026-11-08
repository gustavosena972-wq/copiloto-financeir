import pathlib
import runpy
import shutil
import tempfile
import unittest
from html.parser import HTMLParser
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
PUBLIC = {"index.html", "privacidade.html", "termos.html", "excluir-conta.html"}

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links, self.ids, self.forbidden = [], set(), []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"form", "input", "script", "iframe"} or any(k.startswith("on") for k in attrs):
            self.forbidden.append(tag)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "a":
            self.links.append(attrs.get("href", ""))

class ShowcaseTest(unittest.TestCase):
    def test_package_excludes_application_and_stale_files(self):
        build = runpy.run_path(str(ROOT / "scripts/build_web_showcase.py"))["build"]
        with tempfile.TemporaryDirectory() as tmp:
            source = pathlib.Path(tmp)
            for name in PUBLIC:
                shutil.copyfile(ROOT / name, source / name)
            output = source / "_site"
            output.mkdir()
            (output / "admin.html").write_text("stale login")
            build(source)
            self.assertEqual({p.name for p in output.iterdir()}, PUBLIC)
    def test_public_navigation_and_no_web_account_flow(self):
        for name in PUBLIC:
            page = Page()
            page.feed((ROOT / name).read_text(encoding="utf-8"))
            self.assertFalse(page.forbidden, name)
            for link in page.links:
                url = urlsplit(link)
                if not url.scheme and not url.netloc:
                    self.assertIn(url.path or name, PUBLIC, (name, link))
                    if not url.path and url.fragment:
                        self.assertIn(url.fragment, page.ids)
                else:
                    self.assertIn(url.scheme, {"https", "mailto"})
                    if url.scheme == "https":
                        self.assertEqual(link, "https://play.google.com/store/apps/details?id=br.com.copiloto.financeiro")
        home = Page()
        home.feed((ROOT / "index.html").read_text(encoding="utf-8"))
        self.assertTrue({"recursos", "planos", "sobre"} <= home.ids)
        self.assertIn("https://play.google.com/store/apps/details?id=br.com.copiloto.financeiro", home.links)

if __name__ == "__main__":
    unittest.main()

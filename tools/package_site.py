"""Build the static Cloudflare Pages artifact using only the Python standard library."""
from pathlib import Path
from urllib.parse import urlparse, urljoin
import os
from html import escape
import shutil

root = Path(__file__).resolve().parents[1]
out = root / "_site"
# Use the stable production domain rather than a deployment-specific preview URL.
site_url = (os.environ.get("SITE_URL") or "https://rpgezgame.pages.dev/").strip()
if site_url:
    parsed = urlparse(site_url)
    if (parsed.scheme not in {"http", "https"} or not parsed.hostname
            or parsed.username or parsed.password or parsed.query or parsed.fragment):
        raise ValueError("SITE_URL must be a public HTTP(S) site URL without credentials, query or fragment")
    site_url = site_url.rstrip("/") + "/"
if out.is_symlink():
    raise RuntimeError("Refusing to replace a symlink at _site")
if out.exists():
    shutil.rmtree(out)
out.mkdir()
for name in ("index.html", "favicon.ico", "assets", "data", "_headers"):
    source = root / name
    if source.is_dir():
        shutil.copytree(source, out / name)
    else:
        shutil.copy2(source, out / name)
if site_url:
    html = (out / "index.html").read_text()
    html = html.replace('property="og:url" content="./"', 'property="og:url" content="' + escape(site_url, quote=True) + '"')
    image = urljoin(site_url, "assets/images/branding/share-dungeon-v256.png")
    for attr in ('property="og:image"', 'property="og:image:secure_url"', 'name="twitter:image"'):
        html = html.replace(attr + ' content="assets/images/branding/share-dungeon-v256.png"', attr + ' content="' + escape(image, quote=True) + '"')
    html = html.replace('href="./" target="_blank" rel="noopener">開啟正式站', 'href="' + escape(site_url, quote=True) + '" target="_blank" rel="noopener">開啟正式站')
    (out / "index.html").write_text(html)
files = [p for p in out.rglob("*") if p.is_file()]
for file in files:
    if file.stat().st_size > 25 * 1024 * 1024:
        raise RuntimeError("Cloudflare Pages file exceeds 25 MiB: " + str(file.relative_to(out)))
print(f"Packaged {len(files)} public files for Cloudflare Pages")

"""Package only public game files for GitHub Pages, without third-party builds."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[2]
out = root / "_site"
if out.is_symlink():
    raise RuntimeError("Refusing to replace a symlink at _site")
if out.exists():
    shutil.rmtree(out)
out.mkdir()
for name in ("index.html", "favicon.ico", "assets", "data"):
    source = root / name
    if source.is_dir():
        shutil.copytree(source, out / name)
    else:
        shutil.copy2(source, out / name)
(out / ".nojekyll").touch()
print(f"Packaged {sum(p.is_file() for p in out.rglob('*'))} public files")

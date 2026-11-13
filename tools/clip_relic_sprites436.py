"""Clip atlas neighbours without recompressing the original WebP pixels.

Outputs standalone SVG image assets. The embedded WebP bytes remain unchanged;
only reviewed transparent cutouts are applied, preserving the 128px canvas and
therefore the shared battle foot anchors. These are art assets, not UI templates.
"""
import base64
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CUTOUTS = {
    'countdown': [(108, 25, 5, 24)],   # neighbouring dark staff fragments
    'dragon': [(112, 98, 6, 11)],     # purple fragment next to treasure pile
    'growth': [(0, 109, 128, 19)],    # next atlas row below both feet
    'puppet': [(0, 64, 26, 45), (81, 104, 16, 12)],  # slime / blue sprite below
    'reflect': [(39, 7, 18, 3)],      # unrelated top-row dots
    'thief': [(0, 50, 19, 50)],       # ghost glow to the left; keep falling coins
    'vampire': [(0, 0, 19, 128)],     # neighbouring gold fragments
    'warden': [(0, 0, 24, 128)],      # neighbour's sword; keep own staff and runes
}

def generate():
    folder = ROOT / 'assets/images/relics'
    html_path = ROOT / 'index.html'
    html = html_path.read_text()
    for name, rects in CUTOUTS.items():
        source, = folder.glob(f'relic_{name}-*.webp')
        cutouts = ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="black"/>' for x,y,w,h in rects)
        raw = base64.b64encode(source.read_bytes()).decode('ascii')
        svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">'
               '<defs><mask id="keep" maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128">'
               '<rect width="128" height="128" fill="white"/>'+cutouts+'</mask></defs>'
               '<image width="128" height="128" mask="url(#keep)" href="data:image/webp;base64,'+raw+'"/></svg>')
        target = folder / f'relic_{name}-crop436-{hashlib.sha256(svg.encode()).hexdigest()[:10]}.svg'
        target.write_text(svg)
        html = html.replace('"'+source.relative_to(ROOT).as_posix()+'"', '"'+target.relative_to(ROOT).as_posix()+'"')
    html_path.write_text(html)

if __name__ == '__main__':
    generate()

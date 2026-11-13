"""Check public assets and compatibility aliases without deleting candidates.

A missing literal reference is not proof of disuse: gameplay constructs paths and
Excel supplies pet portraits. Review candidates against runtime maps and planning.
"""
import argparse
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def audit():
    html = (ROOT / 'index.html').read_text()
    start = html.index('const assetRegistry393_=') + len('const assetRegistry393_=')
    registry, length = json.JSONDecoder().raw_decode(html[start:])
    runtime = html[:start] + html[start + length:]
    # Late registrations contain embedded mode NPC sheets.
    inline = set(registry['data']) | set(re.findall(r"assetRegistry393_\.data\[['\"]([^'\"]+)['\"]\]", runtime))
    for key, value in re.findall(r"assetRegistry393_\.paths\[['\"]([^'\"]+)['\"]\]\s*=\s*['\"]([^'\"]+)['\"]", runtime):
        registry['paths'][key] = value

    def resolve(path):
        for before, after in registry['prefixes'].items():
            if path.startswith(before):
                path = after + path[len(before):]
                break
        return registry['paths'].get(path, path)

    files = {p.relative_to(ROOT).as_posix(): p for p in (ROOT / 'assets').rglob('*') if p.is_file()}
    missing = defaultdict(list)
    for key, target in registry['paths'].items():
        if target not in inline and target not in files:
            missing[target].append(key)
    literal = set(re.findall(r'''(?:["'(\s])((?:assets/)[A-Za-z0-9_./-]+\.(?:png|webp|svg|jpg|jpeg|gif|mp3|wav|ogg|ico))''', runtime))
    for path in literal:
        target = resolve(path)
        if target not in inline and target not in files:
            missing[target].append('index.html: ' + path)
    redirects = {}
    redirect_file = ROOT / '_redirects'
    if redirect_file.exists():
        for line in redirect_file.read_text().splitlines():
            if not line.strip() or line.lstrip().startswith('#'):
                continue
            parts = line.split()
            if len(parts) != 3 or parts[2] != '301':
                missing['_redirects'].append('Invalid image redirect: ' + line)
                continue
            source, target, _ = parts
            if source in redirects or not source.startswith('/assets/') or target.lstrip('/') not in files:
                missing[source].append('Invalid or duplicate redirect target: ' + target)
            redirects[source] = target
        for source, target in redirects.items():
            if target in redirects:
                missing[source].append('Redirect chain or cycle: ' + target)
    for path, file in files.items():
        if file.suffix != '.svg':
            continue
        for href in re.findall(r'''(?:href|src)=["']([^"']+)["']''', file.read_text()):
            if href.startswith(('data:', '#', 'http:', 'https:')):
                continue
            destination = ROOT / href if href.startswith('assets/') else file.parent / href
            if not destination.is_file():
                missing[href].append(path)
    referenced = {resolve(path) for path in literal}
    hashes = defaultdict(list)
    for path, file in files.items():
        hashes[hashlib.sha256(file.read_bytes()).hexdigest()].append(path)
    return {
        'public_asset_count': len(files),
        'public_asset_bytes': sum(p.stat().st_size for p in files.values()),
        'legacy_image_redirect_count': len(redirects),
        'missing_targets': dict(missing),
        'identical_file_groups': [v for v in hashes.values() if len(v) > 1],
        'no_literal_reference_candidates': sorted(set(files) - referenced),
        'candidate_warning': 'Includes dynamic scene paths, weapons and Excel pet portraits; do not auto-delete.',
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    report = audit()
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f"Assets: {report['public_asset_count']}; bytes: {report['public_asset_bytes']}; "
          f"missing targets: {len(report['missing_targets'])}; "
          f"identical groups: {len(report['identical_file_groups'])}; "
          f"review-only candidates: {len(report['no_literal_reference_candidates'])}")
    if report['missing_targets']:
        print(json.dumps(report['missing_targets'], ensure_ascii=False, indent=2))
        raise SystemExit(1)

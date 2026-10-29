"""Build a byte-reproducible, code-only Windows bundle using the stdlib.

Explicit allowlists exclude character art, private configuration and logs.
No downloads, npm lifecycle scripts, git changes or publication occur here.
"""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import tarfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PLUGIN_FILES = ["package.json", "index.js", "animations.js", "overlay.js",
                "cordis.patch.yml", "LICENSE", "THIRD_PARTY_NOTICES.md",
                "native/index.html", "native/neutralino.js", "native/tray.png",
                "native/LICENSE-neutralinojs.txt"]
BUNDLE_FILES = ["LICENSE", "THIRD_PARTY_NOTICES.md", "dependencies.lock.json",
                "scripts/install-windows.ps1", "scripts/pet-control.mjs",
                "scripts/sample-pet-performance.ps1", "scripts/summarize-pet-performance.py", "docs/WINDOWS-INSTALL.md",
                "docs/ASSETS_AND_LICENSE.md"]

def sha(data):
    return hashlib.sha256(data).hexdigest()

def build(output):
    package = json.loads((ROOT / "plugin/package.json").read_text("utf-8"))
    for name in ["LICENSE", "THIRD_PARTY_NOTICES.md"]:
        if (ROOT / name).read_bytes() != (ROOT / "plugin" / name).read_bytes():
            raise ValueError(f"plugin/{name} differs from root notice")
    lock = json.loads((ROOT / "dependencies.lock.json").read_text("utf-8"))
    for entry in lock["shippedComponents"]:
        for filename, expected in entry["sha256"].items():
            if sha((ROOT / filename).read_bytes()) != expected:
                raise ValueError(f"Pinned component changed: {filename}")
    tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode="w", format=tarfile.USTAR_FORMAT) as tar:
        for name in sorted(PLUGIN_FILES):
            path = ROOT / "plugin" / name
            if path.is_symlink():
                raise ValueError("Symlinks are not allowed in release input")
            data = path.read_bytes()
            info = tarfile.TarInfo("package/" + name)
            info.size, info.mode, info.mtime = len(data), 0o644, 0
            tar.addfile(info, io.BytesIO(data))
    compressed = io.BytesIO()
    with gzip.GzipFile(fileobj=compressed, mode="wb", filename="", mtime=0) as gz:
        gz.write(tar_buffer.getvalue())
    tgz_name = f"dsh-kurowhale-pet-{package['version']}.tgz"
    files = {name: (ROOT / name).read_bytes() for name in BUNDLE_FILES}
    files[tgz_name] = compressed.getvalue()
    files["README.txt"] = (
        "DSH KuroWhale Pet: code-only Windows installation bundle.\n"
        "Read docs/WINDOWS-INSTALL.md first. Run Check before Install.\n"
        "Character artwork and executables are NOT included.\n"
        "For the full release and artwork provenance see the project README.\n"
    ).encode("utf-8")
    manifest = {"schemaVersion": 1, "name": package["name"],
                "version": package["version"], "dshVersion": "0.2.1-rc.3",
                "package": tgz_name, "artworkIncluded": False,
                "pluginFiles": {name: sha((ROOT / "plugin" / name).read_bytes()) for name in sorted(PLUGIN_FILES)},
                "files": {name: sha(data) for name, data in sorted(files.items())}}
    files["bundle-manifest.json"] = (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    output.mkdir(parents=True, exist_ok=True)
    (output / tgz_name).write_bytes(files[tgz_name])
    zip_path = output / f"DSH-KuroWhale-{package['version']}-Windows-code.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    digest = sha(zip_path.read_bytes())
    zip_path.with_suffix(".zip.sha256").write_text(f"{digest}  {zip_path.name}\n", encoding="utf-8")
    print(json.dumps({"zip": str(zip_path), "sha256": digest,
                      "packageSha256": sha(files[tgz_name]),
                      "artworkIncluded": False}, ensure_ascii=False))
    return zip_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    build(parser.parse_args().output.resolve())

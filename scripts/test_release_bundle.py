"""Packaging/security regression tests; not Windows Desktop acceptance."""
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import shutil
import zipfile

spec = importlib.util.spec_from_file_location("bundle", Path(__file__).with_name("build-windows-bundle.py"))
bundle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bundle)

class ReleaseBundleTests(unittest.TestCase):
    def test_modified_vendored_code_is_rejected_before_build(self):
        with tempfile.TemporaryDirectory(prefix="kurowhale-pin-") as directory:
            root = Path(directory)
            shutil.copytree(bundle.ROOT / "plugin", root / "plugin")
            for name in ["LICENSE", "THIRD_PARTY_NOTICES.md", "dependencies.lock.json"]:
                shutil.copyfile(bundle.ROOT / name, root / name)
            with (root / "plugin/native/neutralino.js").open("ab") as changed:
                changed.write(b"\n// unexpected modification")
            with patch.object(bundle, "ROOT", root):
                with self.assertRaisesRegex(ValueError, "Pinned component changed"):
                    bundle.build(root / "output")
            self.assertFalse((root / "output").exists())

    def test_reproducible_and_code_only_with_complete_notices(self):
        with tempfile.TemporaryDirectory(prefix="kurowhale-bundle-") as directory:
            a = bundle.build(Path(directory) / "a")
            b = bundle.build(Path(directory) / "b")
            self.assertEqual(a.read_bytes(), b.read_bytes())
            with zipfile.ZipFile(a) as archive:
                self.assertIsNone(archive.testzip())
                manifest = json.loads(archive.read("bundle-manifest.json"))
                self.assertFalse(manifest["artworkIncluded"])
                for name, expected in manifest["files"].items():
                    self.assertEqual(bundle.sha(archive.read(name)), expected)
                    self.assertFalse(name.startswith((".acceptance/", "KuroWhale-Pet/", "windows-test/")))
                    self.assertNotIn("..", Path(name).parts)
                with tarfile.open(fileobj=io.BytesIO(archive.read(manifest["package"]))) as tar:
                    self.assertEqual({m.name.removeprefix("package/") for m in tar}, set(bundle.PLUGIN_FILES))
                    for name, expected in manifest["pluginFiles"].items():
                        self.assertEqual(bundle.sha(tar.extractfile("package/" + name).read()), expected)
                    self.assertIn(b"MIT License", tar.extractfile("package/LICENSE").read())
                    self.assertIn(b"2021 Neutralinojs", tar.extractfile("package/native/LICENSE-neutralinojs.txt").read())
                    self.assertNotIn(b"DSH KuroWhale Pet contributors", tar.extractfile("package/native/LICENSE-neutralinojs.txt").read())

if __name__ == "__main__":
    unittest.main()

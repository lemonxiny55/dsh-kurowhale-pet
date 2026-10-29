# DSH KuroWhale Pet 🐳

[中文](README.md) | English

<p align="center"><img src="docs/images/kurowhale-preview.png" alt="KuroWhale whale-girl desktop pet" width="220"></p>

**A whale-girl desktop pet inspired by the official DeepSeek Harness icon.** KuroWhale keeps you company on Windows and reacts to DSH Agent activity.

[Download Windows v0.1.0](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/download/v0.1.0/DSH-KuroWhale-0.1.0-Windows.zip) · [npm package](https://www.npmjs.com/package/dsh-kurowhale-pet) · [Installation guide](docs/WINDOWS-FULL-INSTALL.md) · [Acceptance record](docs/TECHNICAL-ACCEPTANCE-0.1.0.md)

This is a free, unofficial community project. It is not affiliated with or endorsed by DeepSeek or the related creators.

## Installation and first launch

### ① Add plugin through DSH Desktop (GUI)

1. Open **DSH Desktop → Plugin management → Add plugin**.
2. Enter **`dsh-kurowhale-pet@0.1.1`** in the package-name field, using an available npm source.
3. Click **Install** and restart DSH Desktop as directed.

> “This plugin is already installed” means a same-name plugin was detected; it **does not confirm that you have 0.1.1**. Avoid blind reinstalls or overwrites; check the installed version and back up settings before upgrading. See [installation and recovery](docs/WINDOWS-INSTALL.md).

**Plugin installed ≠ pet visible.** On first use, prepare a persistent character-asset directory and the official **Neutralino 6.9.0 x64** runtime, then set `rendererEnabled`, `assetDirectory` and `runtimePath` in `%USERPROFILE%\.dsh\kurowhale-pet\local.json`. Follow the [**first-launch guide with paths and examples**](docs/NPM-INSTALL.md), restart Desktop, and check that KuroWhale actually appears.

### ② Full Windows ZIP (previously tested on Windows)

For the complete preflight, backup, upgrade and recovery flow, download the **[Windows v0.1.0 ZIP](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/download/v0.1.0/DSH-KuroWhale-0.1.0-Windows.zip)** and extract it to a permanent directory. Follow the [full-package instructions](docs/WINDOWS-FULL-INSTALL.md): run the check, finish active tasks, exit Desktop, then install. The ZIP and npm 0.1.1 are different release channels; **do not layer both methods over an existing installation without checking its state first**.

**Requirements:** Windows x64, DSH Desktop 0.2.1-rc.3, Node.js 22.18.0+, WebView2; the ZIP installer also requires PowerShell 7. Obtain the official Neutralino runtime separately.

[Release and SHA-256 checksum](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/tag/v0.1.0) · [npm package `dsh-kurowhale-pet@0.1.1`](https://www.npmjs.com/package/dsh-kurowhale-pet)

## Features

- **Nine animations** respond to Agent activity, approval requests, completion, and failure.
- **Desktop overlay** provides a transparent window with dragging, scaling, hiding, always-on-top, and position persistence.
- **Menu and tray** let you manage the pet with a right-click and restore it from the system tray.

## Verified scope

Installation and desktop interaction were verified on Windows x64 with DSH Desktop 0.2.1-rc.3. Other DSH versions, mixed-DPI setups, and long-running use have not been fully validated. See the [acceptance record](docs/TECHNICAL-ACCEPTANCE-0.1.0.md) for evidence and limitations.

## Artwork and licensing

The character was created with **AI assistance** and developed into animated assets. Its references include a whale-girl image found through Google Images. That image closely resembles the character in [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet), but its direct creator, original source, and permission scope are not fully confirmed. The reference image itself is not included in the release.

Thanks to [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) and the community creators, including [上善无形](https://space.bilibili.com/4456176), the creator of the prototype “溟月”, and [ZipZipPipe](https://space.bilibili.com/4168597), credited by dsh-pet for the community whale-maid redesign. See the [artwork notice](NOTICE-ARTWORK.md) for provenance and changes.

Code is licensed under [MIT](LICENSE). New artwork contributions that the project has the right to license are offered under [CC BY-NC-SA 4.0](LICENSE-ARTWORK): attribution, indication of changes, noncommercial use, and share-alike are required. This does not relicense independent third-party works. Please report provenance or licensing concerns via an [Issue](https://github.com/lemonxiny55/dsh-kurowhale-pet/issues).

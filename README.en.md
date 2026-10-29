# DSH KuroWhale Pet 🐳

[中文](README.md) | English

<p align="center"><img src="docs/images/kurowhale-preview.png" alt="KuroWhale whale-girl desktop pet" width="220"></p>

**A whale-girl desktop pet inspired by the official DeepSeek Harness icon.** KuroWhale keeps you company on Windows and reacts to DSH Agent activity.

[Download Windows v0.1.0](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/download/v0.1.0/DSH-KuroWhale-0.1.0-Windows.zip) · [npm package](https://www.npmjs.com/package/dsh-kurowhale-pet) · [Installation guide](docs/WINDOWS-FULL-INSTALL.md) · [Acceptance record](docs/TECHNICAL-ACCEPTANCE-0.1.0.md)

This is a free, unofficial community project. It is not affiliated with or endorsed by DeepSeek or the related creators.

## Quick start

The full Windows ZIP includes the character assets, plugin, and installation tools. You need **Windows x64, DSH Desktop 0.2.1-rc.3**, PowerShell 7, Node.js 22.18.0 or later, WebView2, and the separately obtained official Neutralino 6.9.0 x64 runtime.

1. [Download and extract the full package](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/download/v0.1.0/DSH-KuroWhale-0.1.0-Windows.zip) to a directory you intend to keep.
2. Follow the [installation guide](docs/WINDOWS-FULL-INSTALL.md) to supply the paths to DSH and Neutralino, then run the installation check.
3. Finish active tasks and exit DSH Desktop before installing. Restart Desktop afterward.

The [Release page](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/tag/v0.1.0) also provides a SHA-256 checksum file. The installation guide and acceptance record are currently in Chinese.

### Get it from npm

The [npm package](https://www.npmjs.com/package/dsh-kurowhale-pet) `dsh-kurowhale-pet@0.1.1` includes the plugin and character assets:

```powershell
npm install dsh-kurowhale-pet@0.1.1
```

Installing from npm does not automatically enable the pet. Install the plugin in DSH and configure `~/.dsh/kurowhale-pet/local.json` to enable rendering and point to the package's `character` directory and the official Neutralino runtime; see the [npm and DSH Desktop installation guide](docs/NPM-INSTALL.md). Choose the Windows ZIP for the complete installation tools.

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

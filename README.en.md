# KuroWhale 黑色系鲸鱼娘桌宠 🐳

[中文](README.md) | English

<p align="center"><img src="docs/images/kurowhale-preview.png" alt="KuroWhale 黑色系鲸鱼娘桌宠 — whale-girl desktop pet" width="220"></p>

**A whale-girl desktop pet inspired by the official DeepSeek Harness icon.** KuroWhale keeps you company on Windows and reacts to DSH Agent activity.

[GitHub repository](https://github.com/lemonxiny55/dsh-kurowhale-pet) · **DSH Desktop → Add plugin: `dsh-kurowhale-pet@0.1.3`** · [DSH Market](https://awesome-dsh-plugin.com/p/lemonxiny55/dsh-kurowhale-pet/)

This is a free, unofficial community project. It is not affiliated with or endorsed by DeepSeek or the related creators.

## Installation

Requires **Windows x64, WebView2, and DSH Desktop 0.2.1-rc.3 or rc.5**.

1. Open **Plugin management → Add plugin** in DSH Desktop.
2. Enter `dsh-kurowhale-pet@0.1.3`, select the **official npm registry**, and click **Install**.
3. Click **Enable now** when installation finishes, then restart DSH.

The first launch prefers bundled artwork. Missing artwork and the official Neutralino 6.9.0 runtime are downloaded from pinned sources and verified with SHA-256. Existing custom paths, visibility preferences, and position are retained. Download or verification failures are logged while DSH remains usable. Desktop requires uninstalling a same-name plugin before reinstalling it; back up your configuration first.

**v0.1.3 is published:** [npm](https://www.npmjs.com/package/dsh-kurowhale-pet/v/0.1.3) · [GitHub Release](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/tag/v0.1.3) · [Bilingual release notes](docs/RELEASE-NOTES-0.1.3.md)

| Installation entry | Action | Verification |
| --- | --- | --- |
| GitHub repository | Enter `https://github.com/lemonxiny55/dsh-kurowhale-pet` in Add plugin, enable, and restart | Previously verified via CLI and visible after rc.5 restart; GitHub URL installation through the add-plugin UI remains unverified. |
| DSH Desktop (recommended) | Add `dsh-kurowhale-pet@0.1.3`, enable, and restart | The final 0.1.3 artifact previously passed isolated rc.5 installation and native display. This round passed official-registry UI installation, enabling, and renderer readiness; native display was not visually rechecked. |
| DSH Market | Open Plugins → Discover and search for KuroWhale | **Installation remains blocked.** PR #10554 is merged, but on 2026-10-31 the live index still offers 0.1.1, the old description, and a generic icon. rc.5 marks it incompatible and disables Install. Use the pinned npm entry above for now. |

See the [post-release acceptance record](docs/POST-RELEASE-0.1.3.md) for index setup, synchronization diagnosis, and the boundaries of this round. The historical [Windows v0.1.0 ZIP](docs/WINDOWS-FULL-INSTALL.md) remains an alternative requiring manual configuration.

## Features and preview

- **Nine animations:** idle, movement in both directions, waving, jumping, failure, awaiting approval, working, and completion review.
- **Desktop overlay:** a transparent window with dragging, scaling, hiding, always-on-top, and position persistence.
- **Menu and tray:** manage the pet with a right-click and restore it from the system tray.

<details>
<summary>View all nine states (static frames from the existing animation atlas)</summary>

<p align="center"><img src="docs/images/kurowhale-nine-states.png" alt="KuroWhale states: idle, running-right, running-left, waving, jumping, failed, waiting, running, review" width="720"></p>

Extracted and arranged from the existing `spritesheet.webp` referenced by `pet.json`. The character and animations are unchanged. See [artwork version maintenance](docs/ARTWORK-VERSIONS.md) for reproduction details.

</details>

## Verified scope

Installation and desktop interaction were verified on Windows x64 with DSH Desktop 0.2.1-rc.3; installation and targeted stability regression were also checked on rc.5. Other DSH versions, mixed-DPI setups, and long-running use have not been fully validated. See the [technical acceptance record](docs/TECHNICAL-ACCEPTANCE-0.1.0.md) and [this round's record](docs/POST-RELEASE-0.1.3.md) for evidence and limitations.

## Artwork and licensing

The character was created with **AI assistance** and developed into animated assets. Its references include a whale-girl image found through Google Images. That image closely resembles the character in [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet), but its direct creator, original source, and permission scope are not fully confirmed. The reference image itself is not included in the release.

Thanks to [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) and the community creators, including [上善无形](https://space.bilibili.com/4456176), the creator of the prototype “溟月”, and [ZipZipPipe](https://space.bilibili.com/4168597), credited by dsh-pet for the community whale-maid redesign. See the [artwork notice](NOTICE-ARTWORK.md) for provenance and changes.

Code is licensed under [MIT](LICENSE). New artwork contributions that the project has the right to license are offered under [CC BY-NC-SA 4.0](LICENSE-ARTWORK): attribution, indication of changes, noncommercial use, and share-alike are required. This does not relicense independent third-party works. Please report provenance or licensing concerns via an [Issue](https://github.com/lemonxiny55/dsh-kurowhale-pet/issues).

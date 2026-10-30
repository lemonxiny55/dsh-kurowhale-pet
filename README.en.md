# DSH KuroWhale Pet 🐳

[中文](README.md) | English

<p align="center"><img src="docs/images/kurowhale-preview.png" alt="KuroWhale whale-girl desktop pet" width="220"></p>

**A whale-girl desktop pet inspired by the official DeepSeek Harness icon.** KuroWhale keeps you company on Windows and reacts to DSH Agent activity.

[GitHub repository](https://github.com/lemonxiny55/dsh-kurowhale-pet) · [npm package](https://www.npmjs.com/package/dsh-kurowhale-pet) · [Windows ZIP alternative](docs/WINDOWS-FULL-INSTALL.md) · [Acceptance record](docs/TECHNICAL-ACCEPTANCE-0.1.0.md)

This is a free, unofficial community project. It is not affiliated with or endorsed by DeepSeek or the related creators.

## Installation status

The v0.1.2 goal is to install from the GitHub URL, the `dsh-kurowhale-pet` name in DSH Desktop, or a marketplace listing, then restart DSH and see the pet without manual paths. **The 0.1.2 npm package is not yet published, and validation of all three paths is not complete.**

The public GitHub URL was installed with Desktop's CLI at commit `67c6712` and the pet was visually confirmed in Desktop rc.3 with existing paths retained. An earlier asset-free local Git candidate verified automatic resource acquisition and display. After extending the declared compatibility to rc.5, a local candidate was installed and the pet visually confirmed in the user's rc.5 Desktop; the public GitHub path on rc.5 remains unverified. Separately, a candidate was installed by package name using a local test registry and visually confirmed in isolated Desktop. The Desktop add-plugin UI and public npm package name have not yet been verified; npm 0.1.2 is not yet published.

The listing was merged in [awesome-dsh-plugin PR #10379](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/10379). The public index currently lists 0.1.1 with outdated manual instructions; 0.1.2 synchronization, search in the market UI, and installation remain unverified. The [staging script](scripts/stage-npm.mjs) prepares an npm candidate with verified artwork and its license notices, without publishing it.

The published npm version is still 0.1.1 and requires manual configuration; see the [current npm installation guide](docs/NPM-INSTALL.md). The [Windows v0.1.0 ZIP](docs/WINDOWS-FULL-INSTALL.md) remains an alternative with its existing manual setup.

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

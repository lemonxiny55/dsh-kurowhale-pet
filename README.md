# DSH KuroWhale Pet 🐳

> **技术定版 / Technical readiness:** Windows `0.1.0` 面向 DSH Desktop 0.2.1-rc.3，在已记录的本机范围内技术正式版准备就绪。现有美术的再分发权利尚未确认，完整包仅保留本地，尚未公开发行。详见 [最终技术验收](docs/TECHNICAL-ACCEPTANCE-0.1.0.md)、[完整包安装说明](docs/WINDOWS-FULL-INSTALL.md) 和 [授权审查](docs/ASSETS_AND_LICENSE.md)。
>
> Windows 0.1.0 is technically ready within the documented local scope. Artwork redistribution rights remain unresolved; the complete pack is private and has not been released.

**黑白 Q 版鲸鱼娘桌宠 / Black-and-white chibi whale desktop pet**

> 🚧 **开发中 / Work in progress** — 当前仓库含可本地安装的功能候选；正式发行仍受美术授权与后续验证限制。
>
> 🚧 The Windows MVP candidate passed local functional tests; public distribution and broader qualification remain pending.

**DSH KuroWhale Pet** 是一个面向 **DeepSeek Harness (DSH)** 的免费、非官方社区桌宠：一只黑白配色的 Q 版鲸鱼女仆，在桌面陪伴用户，并根据 Agent 的运行状态做出反馈。

DSH KuroWhale Pet is an experimental unofficial desktop companion for DeepSeek Harness: a black-and-white chibi whale maid that reacts to agent activity.

## ✨ 功能范围 / Scope

- 🐳 **Q 版角色 / Chibi character** — 黑白鲸鱼女仆；上游参考图权利尚未核清，暂不公开分发。
- 🖥️ **桌面悬浮 / Desktop overlay** — 透明窗口、拖动、缩放、隐藏及位置记忆（首发优先 Windows）。
- 🎞️ **状态动画 / State animations** — 待机、工作、等待审批、完成和失败。
- 🔔 **DSH 状态联动 / Agent status integration** — 根据可靠的宿主事件切换动画与提醒。
- 📦 **独立角色包 / Separate character pack** — 尽量让美术资源与插件引擎解耦。

> Windows rc3 上已验证的功能与未覆盖项目，以最新 MVP 实测报告为准。角色资源仍只在本机保存。
>
> Qualification is limited to the exact Windows rc3 environment described in the MVP report. Character assets remain local.

## 🗺️ 路线图 / Roadmap

| 阶段 / Phase | 目标 / Goal | 状态 / Status |
| --- | --- | --- |
| 0 | 仓库初始化、项目文档 / Repository and documentation | ✅ Local candidate |
| 1 | 角色定稿、透明素材、动态角色包 / Character assets and animated pet pack | ✅ Local; license pending |
| 2 | 确认 DSH 插件 API、选定 MIT 兼容底座 / Verify plugin APIs and select a suitable open-source base | ✅ rc3 / Neutralino |
| 3 | Windows 桌面悬浮和 Agent 状态联动 / Windows overlay and agent integration | ✅ Local functional tests |
| 4 | 安装、卸载、性能与兼容性测试 / Install, uninstall, performance, compatibility tests | ✅ Local scope; broader tests pending |
| 5 | v0.1.0 公开预览 / Public preview release | ⏳ Planned |

详见 [开发路线图 / Detailed roadmap](docs/ROADMAP.md)。

## 🧩 开发与安装 / Development and installation

推荐从代码安装包按 [Windows 安装教程](docs/WINDOWS-INSTALL.md) 操作；先 Check、结束任务并退出 Desktop，再 Install。包内无角色美术和运行时 exe。构建脚本固定文件清单与时间，可重复生成相同字节。新用户仍须自行提供有权使用的角色包和官方运行时。

See the plugin instructions for local packaging and recovery. Rendering requires explicit local opt-in; provide character assets and the official runtime separately.

## 🎨 角色来源与许可 / Artwork and licensing

KuroWhale 的蓝白 Q 版参考图最初来自 Google 图片搜索；我们使用 ChatGPT 辅助生成黑白角色，并继续制作动画和桌宠。它并非完全从零原创。参考图与 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 的待机呼吸和漂浮踏步动画形象高度相似，KuroWhale 的设计可能受到该项目及相关社区素材影响，但尚不能确认图片直接出自该项目。感谢该项目和社区创作者的贡献；直接图片作者及原始发布页仍待核实。完整来源与改动见 [美术署名](NOTICE-ARTWORK.md)。

代码采用 [MIT](LICENSE)；角色美术拟采用 [CC BY-NC-SA 4.0 草案](LICENSE-ARTWORK)，要求署名、非商业使用及相同方式共享，但草案尚未生效。公开署名不等于取得许可：参考来源和完整再分发权利仍有不确定性，现有角色美术暂不公开。详见 [素材与授权规范](docs/ASSETS_AND_LICENSE.md) 和 [第三方通知](THIRD_PARTY_NOTICES.md)。

如果原作者发现来源、署名或授权有误，欢迎通过 [GitHub Issue](https://github.com/lemonxiny55/dsh-kurowhale-pet/issues) 联系我们，我们愿意核实并更正。

The reference was found via Google Images and the character was created with ChatGPT assistance. It closely resembles the dsh-pet character, but its direct source and author remain unconfirmed. Code is MIT; the proposed CC BY-NC-SA 4.0 artwork license is not yet effective and does not establish redistribution rights.

## ⚠️ 非官方声明 / Unofficial project

本项目为社区独立开发的非官方作品，未获得 DeepSeek 官方或相关作者的关联、赞助或背书。DeepSeek 和 DeepSeek Harness 名称仅用于说明目标兼容环境。请勿使用官方 Logo 作为本项目品牌标识。

This is an independent community project and is **not affiliated with, sponsored by, or endorsed by DeepSeek or the related creators**. The names DeepSeek and DeepSeek Harness are mentioned only to describe the intended compatibility target.

---

**Repository:** [lemonxiny55/dsh-kurowhale-pet](https://github.com/lemonxiny55/dsh-kurowhale-pet)

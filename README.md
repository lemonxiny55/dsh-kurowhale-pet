# DSH KuroWhale Pet 🐳

Windows `v0.1.0` 面向 DSH Desktop 0.2.1-rc.3；已验证范围与限制见 [技术验收](docs/TECHNICAL-ACCEPTANCE-0.1.0.md)。完整 Windows 包的安装方法见 [安装说明](docs/WINDOWS-FULL-INSTALL.md)。

**黑白 Q 版鲸鱼娘桌宠 / Black-and-white chibi whale desktop pet**

**DSH KuroWhale Pet** 是一个面向 **DeepSeek Harness (DSH)** 的免费、非官方社区桌宠：一只黑白配色的 Q 版鲸鱼女仆，在桌面陪伴用户，并根据 Agent 的运行状态做出反馈。

DSH KuroWhale Pet is an experimental unofficial desktop companion for DeepSeek Harness: a black-and-white chibi whale maid that reacts to agent activity.

## ✨ 功能范围 / Scope

- 🐳 **Q 版角色 / Chibi character** — 黑白鲸鱼女仆；参考来源和权利不确定性见下文。
- 🖥️ **桌面悬浮 / Desktop overlay** — 透明窗口、拖动、缩放、隐藏及位置记忆（首发优先 Windows）。
- 🎞️ **状态动画 / State animations** — 待机、工作、等待审批、完成和失败。
- 🔔 **DSH 状态联动 / Agent status integration** — 根据可靠的宿主事件切换动画与提醒。
- 📦 **独立角色包 / Separate character pack** — 尽量让美术资源与插件引擎解耦。

> 已验证环境为 Windows x64、DSH Desktop 0.2.1-rc.3；混合 DPI、其他宿主版本和长期运行尚未充分验证。

## 🧩 开发与安装 / Development and installation

完整 Windows ZIP 包含角色图集、插件和安装工具；请阅读 [完整包安装说明](docs/WINDOWS-FULL-INSTALL.md)。需要预装 DSH Desktop、PowerShell 7、Node.js、WebView2 和单独取得的官方 Neutralino 运行时。先 Check，结束任务并退出 Desktop 后再 Install。

## 🎨 角色来源与许可 / Artwork and licensing

KuroWhale 的蓝白 Q 版参考图最初来自 Google 图片搜索；我们使用 ChatGPT 辅助生成黑白角色，并继续制作动画和桌宠。它并非完全从零原创。参考图与 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 的待机呼吸和漂浮踏步动画形象高度相似，KuroWhale 的设计可能受到该项目及相关社区素材影响，但尚不能确认图片直接出自该项目。感谢该项目和社区创作者的贡献；直接图片作者及原始发布页仍待核实。完整来源与改动见 [美术署名](NOTICE-ARTWORK.md)。

感谢原型「溟月」的 [上善无形](https://space.bilibili.com/4456176)、dsh-pet 所述女仆鲸鱼娘二次设计者 [ZipZipPipe](https://space.bilibili.com/4168597) 和其他社区创作者。KuroWhale 自身的黑白配色、细节调整、图集与动画是 AI 辅助和后续加工的改编贡献；参考原图不包含在发行包中。

代码采用 [MIT](LICENSE)；项目有权授权的新增角色美术贡献采用 [CC BY-NC-SA 4.0](LICENSE-ARTWORK)，要求署名、注明修改、非商业使用及相同方式共享。此许可不重新授权第三方独立作品；参考图的原作者及授权范围尚未完全确认。详见 [素材与授权规范](docs/ASSETS_AND_LICENSE.md) 和 [第三方通知](THIRD_PARTY_NOTICES.md)。

如果原作者发现来源、署名或授权有误，欢迎通过 [GitHub Issue](https://github.com/lemonxiny55/dsh-kurowhale-pet/issues) 联系我们，我们愿意核实并更正。

The reference was found via Google Images and the character was created with ChatGPT assistance. It closely resembles the dsh-pet character, but its direct source and author remain unconfirmed. Code is MIT; the project licenses its own authorized artwork contributions under CC BY-NC-SA 4.0 without granting rights in third-party works. The reference image and its authorization remain unconfirmed.

## ⚠️ 非官方声明 / Unofficial project

本项目为社区独立开发的非官方作品，未获得 DeepSeek 官方或相关作者的关联、赞助或背书。DeepSeek 和 DeepSeek Harness 名称仅用于说明目标兼容环境。请勿使用官方 Logo 作为本项目品牌标识。

This is an independent community project and is **not affiliated with, sponsored by, or endorsed by DeepSeek or the related creators**. The names DeepSeek and DeepSeek Harness are mentioned only to describe the intended compatibility target.

---

**Repository:** [lemonxiny55/dsh-kurowhale-pet](https://github.com/lemonxiny55/dsh-kurowhale-pet)

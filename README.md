# DSH KuroWhale Pet 🐳

> **2026-10-28 MVP 验收：** 开发分支提供 Windows `0.1.0-rc.1` 功能候选。九动画、交互、真实工具/审批与并发优先级已在当前 DSH Desktop 0.2.1-rc.3 验证；详情见 [MVP 实测报告](docs/WINDOWS-MVP-ACCEPTANCE-2026-10-28.md) 和 [本地使用说明](plugin/README.md)。美术授权及长期稳定性验收仍待完成，未公开发布角色包。
>
> Windows functional candidate for Desktop rc3. See the direct test report and local instructions; this is not a published release. Artwork remains private and separately licensed.

**黑白 Q 版鲸鱼娘桌宠 / Black-and-white chibi whale desktop pet**

> 🚧 **开发中 / Work in progress** — 当前仓库含可本地安装的功能候选；正式发行仍受美术授权与后续验证限制。
>
> 🚧 The Windows MVP candidate passed local functional tests; public distribution and broader qualification remain pending.

**DSH KuroWhale Pet** 是一个面向 **DeepSeek Harness (DSH)** 的非官方桌宠：一只黑白配色的 Q 版鲸鱼女仆，在桌面陪伴用户，并根据 Agent 的运行状态做出反馈。

DSH KuroWhale Pet is an experimental unofficial desktop companion for DeepSeek Harness: a black-and-white chibi whale maid that reacts to agent activity.

## ✨ 功能范围 / Scope

- 🐳 **Q 版原创角色 / Chibi character** — 黑白鲸鱼女仆形象，独立的卡通鲸鱼徽章。
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

本地功能候选与安装/恢复步骤见 [插件说明](plugin/README.md)。渲染需要自己的配置显式启用，角色资源和官方运行时单独准备。

See the plugin instructions for local packaging and recovery. Rendering requires explicit local opt-in; provide character assets and the official runtime separately.

## 🎨 角色素材与许可 / Artwork and licensing

角色插画、动作帧、第三方素材和程序代码应分别核对并声明许可。**请勿假设代码的开源许可自动适用于美术素材。**

The code and character artwork may have different licenses. Do **not** assume an open-source code license covers images, animations, logos, or third-party assets.

在定稿与权利核对完成前，不上传未授权的第三方角色素材。详见 [素材与授权规范 / Asset policy](docs/ASSETS_AND_LICENSE.md)。

The final license for this repository's code has **not been selected yet**. This README is not a license grant.

## ⚠️ 非官方声明 / Unofficial project

本项目为社区独立开发的非官方作品，与 DeepSeek 没有关联、赞助或背书关系。DeepSeek 和 DeepSeek Harness 名称仅用于说明目标兼容环境。请勿使用官方 Logo 作为本项目品牌标识。

This is an independent community project and is **not affiliated with, sponsored by, or endorsed by DeepSeek**. The names DeepSeek and DeepSeek Harness are mentioned only to describe the intended compatibility target.

---

**Repository:** [lemonxiny55/dsh-kurowhale-pet](https://github.com/lemonxiny55/dsh-kurowhale-pet)

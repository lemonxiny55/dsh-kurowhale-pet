# DSH KuroWhale Pet 🐳

> **2026-10-28 实测更新：** 最小宿主插件已在用户当前 Windows DSH Desktop 0.2.1-rc.3 中通过加载、冷启动和卸载恢复。窗口实验版未通过桌面可见性验收，已经回滚；当前开发分支默认关闭渲染，不是可用桌宠发行版。详见 [真实测试报告](docs/WINDOWS-TEST-REPORT-2026-10-28.md)。
>
> The host-only probe passed direct Desktop tests. Experimental overlay visibility failed; it was removed. Renderer is opt-in and off by default. No artwork is included or published. See the linked report for exact version and evidence boundaries.

**黑白 Q 版鲸鱼娘桌宠 / Black-and-white chibi whale desktop pet**

> 🚧 **开发中 / Work in progress** — 当前仓库含已实测的最小宿主骨架与未通过可见性验收的窗口实验代码，尚无可发布的完整桌宠。
>
> 🚧 This project is in early development. A host-only probe has been tested; no release-ready desktop pet is available.

**DSH KuroWhale Pet** 计划成为一款面向 **DeepSeek Harness (DSH)** 的非官方桌宠：一只黑白配色的 Q 版鲸鱼女仆，在桌面陪伴用户，并根据 Agent 的运行状态做出反馈。

DSH KuroWhale Pet is a planned unofficial desktop companion for DeepSeek Harness: a black-and-white chibi whale maid that reacts to agent activity.

## ✨ 计划功能 / Planned features

- 🐳 **Q 版原创角色 / Chibi character** — 黑白鲸鱼女仆形象，独立的卡通鲸鱼徽章。
- 🖥️ **桌面悬浮 / Desktop overlay** — 透明窗口、拖动、缩放、隐藏及位置记忆（首发优先 Windows）。
- 🎞️ **状态动画 / State animations** — 待机、工作、等待审批、完成和失败。
- 🔔 **DSH 状态联动 / Agent status integration** — 根据可靠的宿主事件切换动画与提醒。
- 📦 **独立角色包 / Separate character pack** — 尽量让美术资源与插件引擎解耦。

> 以上均为**计划功能**，不是已完成或已验证的能力。实际支持范围以发行说明和测试结果为准。
>
> These are **planned features**, not claims of implemented or tested functionality.

## 🗺️ 路线图 / Roadmap

| 阶段 / Phase | 目标 / Goal | 状态 / Status |
| --- | --- | --- |
| 0 | 仓库初始化、项目文档 / Repository and documentation | 🚧 In progress |
| 1 | 角色定稿、透明素材、动态角色包 / Character assets and animated pet pack | ⏳ Planned |
| 2 | 确认 DSH 插件 API、选定 MIT 兼容底座 / Verify plugin APIs and select a suitable open-source base | ⏳ Planned |
| 3 | Windows 桌面悬浮和 Agent 状态联动 / Windows overlay and agent integration | ⏳ Planned |
| 4 | 安装、卸载、性能与兼容性测试 / Install, uninstall, performance, compatibility tests | ⏳ Planned |
| 5 | v0.1.0 公开预览 / Public preview release | ⏳ Planned |

详见 [开发路线图 / Detailed roadmap](docs/ROADMAP.md)。

## 🧩 开发与安装 / Development and installation

已有开发骨架及本地测试代码，尚未提供可发布的完整桌宠。当前开发版默认关闭渲染，请先阅读实际测试报告。

Development probe code exists, but no production release is available. Rendering stays off by default until native visibility qualification passes.

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

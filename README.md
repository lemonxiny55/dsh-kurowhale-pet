# DSH KuroWhale Pet 🐳

中文 | [English](README.en.md)

<p align="center"><img src="docs/images/kurowhale-preview.png" alt="KuroWhale 鲸鱼娘桌宠" width="220"></p>

**参考 DeepSeek Harness 官方图标设计的鲸鱼娘桌宠。** 在 Windows 桌面上陪伴你，并响应 DSH Agent 的工作状态。

[GitHub 仓库](https://github.com/lemonxiny55/dsh-kurowhale-pet) · [npm 包](https://www.npmjs.com/package/dsh-kurowhale-pet) · [备用 Windows ZIP](docs/WINDOWS-FULL-INSTALL.md) · [验收记录](docs/TECHNICAL-ACCEPTANCE-0.1.0.md)

免费、非官方社区项目，与 DeepSeek 官方及相关创作者无关联，也未获得其背书。

## 安装方向与当前状态

需要 Windows x64、DSH Desktop 0.2.1-rc.3 或 0.2.1-rc.5 和 WebView2。安装 v0.1.2 后重启 DSH；首次运行会联网获取缺少的素材和官方 Neutralino 6.9.0，并校验 SHA-256。已有自定义路径、关闭设置和位置予以保留。**npm 0.1.2 已发布，三入口验收尚未全部完成。**

| 入口 | 目标操作 | 目前的验证结果 |
| --- | --- | --- |
| GitHub | 在 DSH 添加插件时输入 `https://github.com/lemonxiny55/dsh-kurowhale-pet`，安装后重启 | 公开地址经 Desktop 自带 CLI 安装提交 `0e911a3`，在实际 rc.5 Desktop 重启后目视看到角色；该升级沿用了已有路径。此前无素材的本地 Git 快照测试验证了自动获取、校验及显示。添加插件界面尚未单独验证。 |
| DSH Desktop | 添加插件，输入 `dsh-kurowhale-pet@0.1.2`，安装后点击“立即启用”，再重启 | 已在实际 rc.5 Desktop 的官方添加插件界面从 npm 官方源安装，点击“立即启用”并重启后目视看到角色；锁文件的完整性值与 npm 注册表一致。该次验证沿用了已有用户路径，配置和位置未变。 |
| 插件市场 | 搜索 KuroWhale 并安装，重启 DSH | [awesome-dsh-plugin PR #10379](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/10379) 已合并；市场索引目前仍为 0.1.1 和旧的手动步骤，rc.5 会将该旧版本作为不兼容项隐藏。说明更新见 [PR #10554](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/10554)，0.1.2 的同步和市场入口安装尚未验证。 |

本机空目录实测了资源准备：从固定 npm 包取得素材、从官方发行版取得 Neutralino，均完成 SHA-256 校验。离线、下载失败或校验失败时启动会记录错误；DSH 仍可使用。Desktop 的第三方插件安装窗口提供“立即启用”，安装后需先点击此按钮；已有同名插件时，界面要求先卸载再安装，建议保留配置备份。

npm 包通过 [准备脚本](scripts/stage-npm.mjs) 从已校验的发行素材构建，包含图集与美术许可文件；Git 源码不含图集。受限环境中的原生窗口启动曾失败；允许原生桌面进程后，上述 DSH 安装测试完成目视检查。市场入口验证等待索引同步。

Windows ZIP 是备用安装方式；现有 [v0.1.0 ZIP](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/tag/v0.1.0) 的人工配置和历史验收见[安装指南](docs/WINDOWS-FULL-INSTALL.md)。

## 功能

- **九种动画**：响应 Agent 工作、审批、完成和失败等事件。
- **桌面悬浮**：透明窗口支持拖动、缩放、隐藏、置顶和位置记忆。
- **菜单与托盘**：右键管理桌宠，通过系统托盘恢复显示。

## 已验证范围

已在 Windows x64、DSH Desktop 0.2.1-rc.3 环境验证安装及桌宠交互。其他 DSH 版本、混合 DPI 和长期运行尚未充分验证，具体证据与限制见[技术验收](docs/TECHNICAL-ACCEPTANCE-0.1.0.md)。

## 角色来源与许可

角色通过 **AI 辅助创作**并加工为动画。创作参考包括通过 Google 图片搜索找到的鲸鱼娘图片；该图片与 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 的角色高度相似，但其具体作者、原始发布页和授权范围尚未完全确认。参考原图不包含在发行包内。

感谢 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 及社区创作者，包括原型「溟月」的[上善无形](https://space.bilibili.com/4456176)、dsh-pet 所述女仆鲸鱼娘二次设计者 [ZipZipPipe](https://space.bilibili.com/4168597)。详细来源与改动见[美术署名](NOTICE-ARTWORK.md)。

代码采用 [MIT](LICENSE)；项目有权授权的新增美术贡献采用 [CC BY-NC-SA 4.0](LICENSE-ARTWORK)，要求署名、注明修改、非商业使用及相同方式共享，不重新授权第三方独立作品。来源或授权问题欢迎通过 [Issue](https://github.com/lemonxiny55/dsh-kurowhale-pet/issues) 联系。

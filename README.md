# DSH KuroWhale Pet 🐳

中文 | [English](README.en.md)

<p align="center"><img src="docs/images/kurowhale-preview.png" alt="KuroWhale 鲸鱼娘桌宠" width="220"></p>

**参考 DeepSeek Harness 官方图标设计的鲸鱼娘桌宠。** 在 Windows 桌面上陪伴你，并响应 DSH Agent 的工作状态。

[下载 Windows v0.1.0 完整版](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/download/v0.1.0/DSH-KuroWhale-0.1.0-Windows.zip) · [npm 包](https://www.npmjs.com/package/dsh-kurowhale-pet) · [安装指南](docs/WINDOWS-FULL-INSTALL.md) · [验收记录](docs/TECHNICAL-ACCEPTANCE-0.1.0.md)

免费、非官方社区项目，与 DeepSeek 官方及相关创作者无关联，也未获得其背书。

## 安装与首次启动

### ① DSH Desktop 官方添加插件（图形界面）

1. 打开 **DSH Desktop → 插件管理 → 添加插件**。
2. 在包名输入框粘贴 **`dsh-kurowhale-pet@0.1.1`**，选择可用的 npm 安装源。
3. 点击 **安装**，安装完成后按提示重启 DSH Desktop。

> 若提示“该插件已安装”，代表检测到了同名插件，**不代表确认装的是 0.1.1**。不要反复安装或直接覆盖；先核对现有版本，需要升级时请先备份，参阅[安装与恢复说明](docs/WINDOWS-INSTALL.md)。

**注意：插件安装成功 ≠ 鲸鱼娘立即显示。** 首次使用还需要准备角色素材目录和官方 **Neutralino 6.9.0 x64** 运行时，在 `%USERPROFILE%\.dsh\kurowhale-pet\local.json` 中配置 `rendererEnabled`、`assetDirectory`、`runtimePath`。按照[**首次启用教程（含路径示例）**](docs/NPM-INSTALL.md)操作，重启后确认角色显示。

### ② Windows 完整版 ZIP（已有实机验收）

如果想使用带检查、备份、升级与恢复工具的安装流程，下载 **[Windows v0.1.0 完整版 ZIP](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/download/v0.1.0/DSH-KuroWhale-0.1.0-Windows.zip)**，解压到长期保留的目录，按[完整包安装教程](docs/WINDOWS-FULL-INSTALL.md)先检查，再在结束任务并退出 Desktop 后安装。Windows ZIP 与 npm 0.1.1 是不同发行渠道，**不要不经确认就在已有安装上叠加两套方法**。

**环境要求：** Windows x64、DSH Desktop 0.2.1-rc.3、Node.js 22.18.0+、WebView2；完整包安装器还需 PowerShell 7。官方 Neutralino 运行时单独获取。

[正式 Release 与 SHA-256 校验](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/tag/v0.1.0) · [npm 包 `dsh-kurowhale-pet@0.1.1`](https://www.npmjs.com/package/dsh-kurowhale-pet)

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

# DSH KuroWhale Pet 🐳

中文 | [English](README.en.md)

<p align="center"><img src="docs/images/kurowhale-preview.png" alt="KuroWhale 鲸鱼娘桌宠" width="220"></p>

**参考 DeepSeek Harness 官方图标设计的鲸鱼娘桌宠。** 在 Windows 桌面上陪伴你，并响应 DSH Agent 的工作状态。

[下载 Windows v0.1.0 完整版](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/download/v0.1.0/DSH-KuroWhale-0.1.0-Windows.zip) · [npm 包](https://www.npmjs.com/package/dsh-kurowhale-pet) · [安装指南](docs/WINDOWS-FULL-INSTALL.md) · [验收记录](docs/TECHNICAL-ACCEPTANCE-0.1.0.md)

免费、非官方社区项目，与 DeepSeek 官方及相关创作者无关联，也未获得其背书。

## 快速开始

完整 Windows ZIP 包含角色素材、插件与安装工具。需要 **Windows x64、DSH Desktop 0.2.1-rc.3**、PowerShell 7、Node.js 22.18.0 或以上、WebView2，以及单独取得的官方 Neutralino 6.9.0 x64。

1. [下载并解压完整包](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/download/v0.1.0/DSH-KuroWhale-0.1.0-Windows.zip)，将文件保留在长期使用的目录。
2. 按[安装指南](docs/WINDOWS-FULL-INSTALL.md)填写 DSH 和 Neutralino 路径，先运行安装检查。
3. 结束任务并退出 DSH Desktop，再执行安装并重新启动 Desktop。

[Release 页面](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/tag/v0.1.0)提供安装包和 SHA-256 校验文件。

### 从 npm 获取

[npm 包](https://www.npmjs.com/package/dsh-kurowhale-pet) `dsh-kurowhale-pet@0.1.0` 包含插件与角色素材：

```powershell
npm install dsh-kurowhale-pet@0.1.0
```

npm 安装不会自动启用桌宠。需要在 DSH 中安装插件，并在 `~/.dsh/kurowhale-pet/local.json` 中启用渲染、指定包内 `character` 目录和官方 Neutralino 路径；详见 [npm 与 DSH Desktop 安装步骤](docs/NPM-INSTALL.md)。希望使用完整安装工具的用户请优先选择 Windows ZIP。

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

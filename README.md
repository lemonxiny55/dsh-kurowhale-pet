# DSH KuroWhale Pet 🐳

<p align="center"><img src="docs/images/kurowhale-preview.png" alt="KuroWhale 鲸鱼娘桌宠" width="220"></p>

**参考 DeepSeek Harness 官方图标设计的鲸鱼娘桌宠**，让 DSH Agent 的运行状态在 Windows 桌面上生动呈现。

[下载 Windows v0.1.0 完整版](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/download/v0.1.0/DSH-KuroWhale-0.1.0-Windows.zip) · [npm 包](https://www.npmjs.com/package/dsh-kurowhale-pet) · [安装指南](docs/WINDOWS-FULL-INSTALL.md)

> 免费、非官方社区项目，与 DeepSeek 官方及相关创作者无关联，也未获得其背书。

## 功能

- 九种动画状态，响应 Agent 工作、审批、完成和失败等事件。
- 透明桌面悬浮窗口，支持拖动、缩放、隐藏、置顶和位置记忆。
- 右键菜单与系统托盘，方便管理和恢复桌宠。

## 下载与安装

**Windows 完整版**包含角色素材、插件与安装工具。[下载 ZIP](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/download/v0.1.0/DSH-KuroWhale-0.1.0-Windows.zip)，解压后按[完整安装指南](docs/WINDOWS-FULL-INSTALL.md)操作；也可在 [Release 页面](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases/tag/v0.1.0)获取 SHA-256 校验文件。

需要 Windows x64、DSH Desktop 0.2.1-rc.3、PowerShell 7、Node.js 22.18.0 或以上、WebView2，以及单独取得的官方 Neutralino 6.9.0 x64。先执行安装检查，结束任务并退出 DSH 后再安装。其他 DSH 版本、混合 DPI 和长期运行尚未充分验证，详见[技术验收](docs/TECHNICAL-ACCEPTANCE-0.1.0.md)。

**npm 包** `dsh-kurowhale-pet@0.1.0` 包含插件与角色素材：

```powershell
npm install dsh-kurowhale-pet@0.1.0
```

npm 安装不会自动启用桌宠。需要在 DSH 中安装插件，并在 `~/.dsh/kurowhale-pet/local.json` 中启用渲染、指定包内 `character` 目录和官方 Neutralino 路径；参见 [npm 包说明](https://www.npmjs.com/package/dsh-kurowhale-pet)。希望使用完整安装工具的用户请优先选择 Windows ZIP。

## 角色来源与许可

角色通过 **AI 辅助创作**并加工为动画。创作参考包括通过 Google 图片搜索找到的鲸鱼娘图片；该图片与 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 的角色高度相似，但其具体作者、原始发布页和授权范围尚未完全确认。参考原图不包含在发行包内。

感谢 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 及社区创作者，包括原型「溟月」的[上善无形](https://space.bilibili.com/4456176)、dsh-pet 所述女仆鲸鱼娘二次设计者 [ZipZipPipe](https://space.bilibili.com/4168597)。详细来源与改动见[美术署名](NOTICE-ARTWORK.md)。

代码采用 [MIT](LICENSE)；项目有权授权的新增美术贡献采用 [CC BY-NC-SA 4.0](LICENSE-ARTWORK)，要求署名、注明修改、非商业使用及相同方式共享，不重新授权第三方独立作品。来源或授权问题欢迎通过 [Issue](https://github.com/lemonxiny55/dsh-kurowhale-pet/issues) 联系。

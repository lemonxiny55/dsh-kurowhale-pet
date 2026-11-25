# KuroWhale 黑色系鲸鱼娘桌宠 🐳

中文 | [English](README.en.md)

<p align="center"><img src="docs/images/kurowhale-preview.png" alt="KuroWhale 黑色系鲸鱼娘桌宠" width="220"></p>

**参考 DeepSeek Harness 官方图标设计的鲸鱼娘桌宠。** 在 Windows 桌面上陪伴你，并响应 DSH Agent 的工作状态。

[GitHub 仓库](https://github.com/lemonxiny55/dsh-kurowhale-pet) · **DSH Desktop 添加插件：`dsh-kurowhale-pet@0.3.0`** · [DSH Market](https://awesome-dsh-plugin.com/p/lemonxiny55/dsh-kurowhale-pet/)

免费、非官方社区项目，与 DeepSeek 官方及相关创作者无关联，也未获得其背书。

## 安装

需要 **Windows x64、WebView2 和 DSH Desktop（`>=0.2.1-rc.3`，不设人为上限，兼容 `0.2.3-alpha.2` 及后续更新）**。

1. 打开 DSH Desktop 的 **插件管理 → 添加插件**。
2. 输入 `dsh-kurowhale-pet@0.3.0`（或历史版本 `0.2.0`），选择 **npm 官方源**，点击 **安装**。
3. 安装完成后点击 **立即启用**，再重启 DSH。

首次启动会优先使用包内素材；缺失的素材和官方 Neutralino 6.9.0 运行时会从固定来源及镜像回退联网获取并逐文件校验 SHA-256。已有自定义路径、显示偏好和位置予以保留。下载或校验失败会记录错误，DSH 仍可使用。同名插件已安装时，Desktop 要求先卸载再安装，请先备份配置。

**v0.3.0 发布资料：**[GitHub Release](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases) · [双语发布说明](docs/RELEASE-NOTES-0.3.0.md) · [npm](https://www.npmjs.com/package/dsh-kurowhale-pet)

| 安装入口 | 操作 | 验证情况 |
| --- | --- | --- |
| DSH Desktop（npm） | 添加 `dsh-kurowhale-pet@0.3.0`，立即启用后重启 | 0.3.0 通过 39 项 Node 单元测试、2 项发行包测试、1 项升级回滚测试、独立 Neutralino 6.9.0 桌面交互目视验收与上游市场索引校验；完成 npm 发布后即可经官方源直接安装。 |
| GitHub 仓库 | 在“添加插件”中输入 `https://github.com/lemonxiny55/dsh-kurowhale-pet`，启用后重启 | 历史 CLI 安装和 rc.5 重启显示已验证；GitHub 地址的添加插件界面未单独验收。 |
| DSH Market | 插件 → 发现，搜索 KuroWhale | 0.3.0 元数据已通过上游 `buildMarketIndex` 校验（声明 `>=0.2.1-rc.3`，覆盖 `0.2.1-rc.3` 至 `0.2.3-alpha.2` 及后续更新）；线上市场目录随 npm 发布后上游扫描同步更新。 |

市场索引设置与历史验证见[发布后验收记录](docs/POST-RELEASE-0.1.3.md)。[Windows 纯代码包](docs/WINDOWS-INSTALL.md) 保留为人工配置备用方式。

## 功能与展示

- **十二组动作、高频自主生活循环与分区互动**：覆盖待机、左右侧身转身行走、挥手、跳跃、失败、等待审批、工作中（细分思考/编辑代码/执行命令/检索/协作）、完成回顾，以及 `v0.3.0` 新增的 **摸头眯眼（petted）、打盹睡觉（dozing）、吃小鱼干（eating）**。启动后 6–10 秒、后续空闲每 9–15 秒自动防重复轮换侧身散步、自掏小鱼干、犯困打盹、开心眯眼摇尾与小跳；同时支持头顶轻抚搓动、点头顶、戳身体俏皮闪避、连点 4 次晕眩晃动及轻量爱心/星光/`zZz` 粒子反馈（兼容旧版 9 行自定义皮肤降级渲染）。
- **侧开式极简霜白多会话与审批浮卡**：点击等待审批胶囊（或右键菜单/托盘/`/kurowhale panel`）在角色旁展开不遮挡立绘的霜白浮卡，实时查看各会话状态、工具名与审批 `reason`；通过进程内 `approval/request` 瀑布流竞速（零新增 HTTP 端口，保持 `0` 安全红线）直接**允许一次**、**拒绝**、**中断当前轮次**（`agent.cancel`）或**唤起 DSH**。
- **纯本地今日陪伴微统计与温和关怀**：本地按日汇总陪伴时长、完成轮次、工具调用、审批数与只读 Token 用量（`~/.dsh/kurowhale-pet/stats.json`，`/kurowhale stats`）；空闲间隙提供 50 分钟专注歇息与每晚一次深夜休息轻提醒（可开关）。
- **丝滑交互、侧开紧凑菜单与斜杠命令**：无重启平滑缩放、空闲自主散步/打盹与专注隐藏、意外退出有限次自动恢复；右键菜单采用侧开双列紧凑布局与 4px 细滚动条，内置「摸头 / 喂鱼 / 打盹 / 欢呼」快捷条，支持系统托盘与 `/kurowhale` 命令（`pet`、`feed`、`doze`、`cheer`、`panel`、`stats`、`approve`、`reject`、`stop`、`care` 等）。
- **镜像加速与严格校验**：Neutralino 与素材自动下载支持多源镜像回退，所有源均严格执行 SHA-256 校验。

<details>
<summary>查看九种状态（v0.2.0 动画图集的静态帧）</summary>

<p align="center"><img src="docs/images/kurowhale-nine-states.png" alt="KuroWhale 九状态：待机、向右移动、向左移动、挥手、跳跃、失败、等待审批、工作中、完成回顾" width="720"></p>

使用 `v0.2.0` 图集 `spritesheet.webp` 提取并排版；制作与校验方式见[素材版本维护](docs/ARTWORK-VERSIONS.md)。

</details>

## 已验证范围

已在 Windows x64 的 DSH Desktop 0.2.1-rc.3 验证安装及桌宠交互，并在 rc.5 验证安装和针对性稳定性回归。其他 DSH 版本、混合 DPI 和长期运行尚未充分验证，具体证据与限制见[技术验收](docs/TECHNICAL-ACCEPTANCE-0.1.0.md)和[本轮记录](docs/POST-RELEASE-0.1.3.md)。

## 角色来源与许可

角色通过 **AI 辅助创作**并加工为动画。创作参考包括通过 Google 图片搜索找到的鲸鱼娘图片；该图片与 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 的角色高度相似，但其具体作者、原始发布页和授权范围尚未完全确认。参考原图不包含在发行包内。

感谢 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 及社区创作者，包括原型「溟月」的[上善无形](https://space.bilibili.com/4456176)、dsh-pet 所述女仆鲸鱼娘二次设计者 [ZipZipPipe](https://space.bilibili.com/4168597)。详细来源与改动见[美术署名](NOTICE-ARTWORK.md)。

代码采用 [MIT](LICENSE)；项目有权授权的新增美术贡献采用 [CC BY-NC-SA 4.0](LICENSE-ARTWORK)，要求署名、注明修改、非商业使用及相同方式共享，不重新授权第三方独立作品。来源或授权问题欢迎通过 [Issue](https://github.com/lemonxiny55/dsh-kurowhale-pet/issues) 联系。

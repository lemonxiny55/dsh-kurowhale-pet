# KuroWhale 黑色系鲸鱼娘桌宠：发布后验收 / Post-release acceptance

日期：2026-10-31，Asia/Shanghai。环境：Windows x64、现有 DSH Desktop **0.2.1-rc.5**（构建 `d4db512a969fccf0c5cc7ec8fe38e9c1d27af916`）。本轮只整理安装入口与展示，没有重新发布 npm、创建 Release 或修改运行时。

**结论：固定 npm 0.1.3 入口可用；市场索引尚未同步，市场安装未通过。**

**Result: the pinned npm 0.1.3 entry works; marketplace installation remains blocked by the stale catalog.** The isolated rc.5 local client installed and enabled the published package through the official npm registry UI. Resource hashes and renderer readiness were verified. This round did not visually recheck the native pet or repeat the restart cycle. Earlier 0.1.3 native-window visual acceptance remains historical evidence, not a new result.

历史证据：公开 GitHub 提交 `0e911a3` 曾经由 Desktop 自带 CLI 安装并在实际 rc.5 重启后目视显示，沿用已有用户路径；0.1.3 最终 tarball 曾在 rc.5 隔离 CLI 安装、启用、加载并目视显示，正式 npm 包已核对与该验收产物一致。这些是本轮开始前的记录；本轮没有重新验收 GitHub 地址的添加插件界面。

## 隔离方式与验收边界

- 使用现有 Desktop 可执行文件，`DSH_HOME` 和 `--user-data-dir` 均指定到项目内新建的 `.acceptance/market-final-20261031/` 子目录。profile 初始没有第三方插件和自定义桌宠路径。
- 干净 Electron 原生壳显示首次登录页。没有登录、复制或更改现有 DSH 认证 Cookie；改用该 Desktop 实际启动的本地客户端访问同一 rc.5 Host 和插件页。因此本轮不是已登录原生壳内的完整安装验收。
- 在隔离 profile 的“插件 → 实验性插件 → 更多”启用内置的“自定义插件市场”，再到“发现 → 添加索引源”，添加[市场官网](https://awesome-dsh-plugin.com/)提供的 `https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json`。干净 rc.5 默认未启用此功能，也没有索引源。
- 市场检验后，改用同一客户端的“添加插件”，指定 `dsh-kurowhale-pet@0.1.3`、**npm 官方源**，完成安装并点击“立即启用”。没有卸载或更改用户原有插件。
- 启用后自动取得官方 Neutralino；`status.json` 报告 `version: 0.1.3`、`rendererReady: true`、`trayReady: true`、`lastError: null`，并记录六个 idle 帧。原生窗口报告 visible，但 `visibilityVerified: false`；不能把这些机器状态等同于目视验收。
- 电脑操作被 Escape 中止后停止了界面自动化。本轮没有目视复验桌宠，也未重复重启流程；不把市场受阻后的 npm 安装称作市场安装成功。
- 本地截图、下载的索引、安装锁文件及状态保存在被 Git 忽略的 `.acceptance/market-final-20261031/`，不公开会话令牌、认证资料或个人配置。

## 市场信息核对

约 11:00（Asia/Shanghai）抓取公开索引，并在 rc.5 界面搜索和打开详情页：

| 项目 | 已合并的源数据 / npm | rc.5 实际读取的公开索引与界面 |
| --- | --- | --- |
| 名称 | YAML `name` 为 `lemonxiny55/dsh-kurowhale-pet`；项目展示名为“KuroWhale 黑色系鲸鱼娘桌宠” | 显示仓库标识 `lemonxiny55/dsh-kurowhale-pet`，软件包标识为 `dsh-kurowhale-pet` |
| 双语简介 | [PR #10554](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/10554) 已合并；[当前 YAML](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/lemonxiny55__dsh-kurowhale-pet.yml) 已描述鲸鱼娘、九种动画、WebView2 和自动资源校验 | 仍为旧的手工配置步骤；不是最新双语简介 |
| 图标 | YAML 指向仓库中保留的 `docs/images/kurowhale-preview.png` | 索引没有 `icon` 字段；界面使用通用拼图图标 |
| 版本 | [npm 0.1.3](https://www.npmjs.com/package/dsh-kurowhale-pet/v/0.1.3) 已发布 | 只有 0.1.1 |
| 兼容性 | 0.1.3 声明 `0.2.1-rc.3 || 0.2.1-rc.5` | 0.1.1 只声明 `0.2.1-rc.3`；rc.5 明确提示不兼容，安装按钮禁用 |

同步链定位：

1. PR #10554 于 **2026-10-31 01:04** 合并；npm 0.1.3 于 **2026-10-30 21:39** 发布。
2. npm 注册表的 `dsh-plugin-catalog` latest 为 **2026.1030.12510**，发布时间 **2026-10-30 12:31**，早于上述两项变化。
3. 下载该版本的 npm tarball，比较其中 `index.json` 与 jsDelivr 在线索引中的 KuroWhale 条目：**完全一致**，都只有 0.1.1、旧简介且无图标。因此不是只清理 Desktop 十分钟内存缓存就能解决的问题。
4. [市场网页](https://awesome-dsh-plugin.com/p/lemonxiny55/dsh-kurowhale-pet/)的简介已更新，但网页部署与供 Desktop 使用的 npm 目录包属于不同交付环节，网页更新不代表目录包同步。

本次索引 SHA-256：`f9a69d20f3d9a108f88a28b6cfa1c2f558ca99cac405ba69d9c5f315019cb66c`。

**下一步实际问题：**市场目录需要重新生成并发布包含 0.1.3、正确兼容范围、最新双语简介和角色图标的索引；展示标题也应与项目名称一致。之后在 rc.5 刷新索引，再验收市场安装、启用、重启和原生显示。此项受上游目录发布影响，本轮没有通过改动插件来绕过兼容检查，也没有用自制索引冒充公开市场结果。

## 已发布包和素材核对

隔离 profile 的依赖和 pnpm 锁文件均为 `dsh-kurowhale-pet@0.1.3`，完整性值与 npm 注册表一致。包内素材和新下载运行时的 SHA-256 与源码固定值一致：

| 文件 | SHA-256 |
| --- | --- |
| `character/pet.json` | `d4ef8ca3d5ac180c6a98f783f7676391d2a5199c2b71f6e0260d322b18844100` |
| `character/spritesheet.webp` | `7ae1e467778139d7da381fd860af6ebff3a3bd0385b69f9f0c278fbeb4d89298` |
| `neutralino-win_x64.exe` | `0eecd0c7f6c955b441e586def6e89c27c295f144d6d9061dd358c3f3907ff3b3` |

保留 `docs/images/kurowhale-preview.png`；新增 `kurowhale-nine-states.png` 只裁取既有图集每种状态的一帧并排版。九行、57 个有效帧及动画时序未改动，没有 AI 重绘或新增 GIF。详见[复现方法](ARTWORK-VERSIONS.md#readme-九状态展示--readme-state-preview)。原素材内部的历史 `displayName` 也未修改，以保留已发布资产的哈希；公开 README 展示名统一。

代码、美术许可、署名和第三方声明保留原文。历史技术验收与局限仍见[技术验收记录](TECHNICAL-ACCEPTANCE-0.1.0.md)。

## 本轮验证 / Validation

- `node --test plugin/test/*.test.mjs`：16 项通过，0 失败。
- `python scripts/test_release_bundle.py`：2 项通过，包含可复现构建与第三方固定文件校验。
- `python scripts/test_install_upgrade.py`：1 项通过。
- 首轮测试遇到 Windows 沙箱默认临时目录的写入权限错误；仅将测试进程的 `TEMP`、`TMP` 指向项目内独立目录后重跑通过，没有修改测试或运行时代码来规避失败。
- 两份 README 许可段落、原预览图、许可证、署名与第三方声明均与提交前内容一致。
- 九状态选帧顺序及有效帧范围与 `plugin/animations.js` 一致；从正式 npm 包的 `character` 目录重新制作，所得 PNG 与提交图片字节一致。图片经本地查看确认文字完整、角色不裁切。
- 修改文档的相对链接与图片路径均存在；`git diff --check` 无空白错误。
- 原 Desktop profile 的五个 manifest/patch/锁文件、桌宠 `local.json` 与 `position.json`，以及原 Electron 的两个 Cookie 文件，共九个基线文件哈希未变化。没有修改认证 Cookie、其他插件或现有用户配置。

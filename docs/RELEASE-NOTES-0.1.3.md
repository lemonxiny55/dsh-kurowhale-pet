# KuroWhale 黑色系鲸鱼娘桌宠 v0.1.3 / Release notes

**已发布：[npm 0.1.3](https://www.npmjs.com/package/dsh-kurowhale-pet/v/0.1.3)。** 在 DSH Desktop 添加 `dsh-kurowhale-pet@0.1.3`，启用后重启。

- 原生窗口异常退出不再将用户的显示偏好写为隐藏；主动隐藏仍会持久化。
- 自动获取素材及 Neutralino 时限制尝试次数，使用退避并记录错误；继续校验固定来源的 SHA-256。
- 限制生命周期日志增长，减少状态无变化时的文件写入，并修正隐藏启动时原生窗口状态报告。
- 保留已有用户的素材路径、运行时路径、位置及隐藏设置。素材本身、九种动画和 Agent 联动未更改。
- 兼容范围保持 DSH Desktop 0.2.1-rc.3 和 rc.5，Windows x64。

**Published: [npm 0.1.3](https://www.npmjs.com/package/dsh-kurowhale-pet/v/0.1.3).** Add `dsh-kurowhale-pet@0.1.3` in DSH Desktop, enable it and restart.

- Unexpected native-window exit no longer persists a hidden preference; intentional hiding remains persistent.
- Automatic artwork and Neutralino downloads use bounded attempts, backoff, error logging and pinned SHA-256 verification.
- Lifecycle log growth is bounded, unchanged status is not rewritten, and native visibility reporting after hidden startup is corrected.
- Existing artwork and runtime paths, position, and visibility preferences are retained. Artwork, the nine animations and Agent integration are unchanged.
- Compatibility remains Windows x64 with DSH Desktop 0.2.1-rc.3 and rc.5.

Source / 源码: `7195fd60837d91a337ca614ecd9df85812dacf54`

Tarball SHA-256: `8e638d1aa264c4c28ebbfea11d9ec0ff806e0629a01a254edad7de2cfc2862ef`

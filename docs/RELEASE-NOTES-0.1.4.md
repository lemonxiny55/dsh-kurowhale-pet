# KuroWhale 黑色系鲸鱼娘桌宠 v0.1.4 / Release notes

## 中文

**npm 0.1.4 已发布。** 在 DSH Desktop 的“添加插件”中输入 `dsh-kurowhale-pet@0.1.4`，选择 npm 官方源，安装、启用后重启。

- 修复 DSH Market 的 npm 仓库关联：补齐 `repository`、`homepage` 和 `bugs`，使上游扫描器能够把软件包关联到正确的 GitHub 仓库。
- 打包流程新增仓库元数据和两个 manifest 一致性检查，并加入回归测试。
- Windows x64，DSH Desktop 兼容范围保持 `0.2.1-rc.3 || 0.2.1-rc.5`。运行时代码、已有素材、九种动画、许可证及用户配置行为均未改动。
- **市场恢复待上游同步确认。** npm 发布不等于市场目录更新；需要上游重新扫描、生成并发布 `dsh-plugin-catalog`。当前请使用固定 npm 版本入口。

## English

**npm 0.1.4 is published.** In DSH Desktop → Add plugin, enter `dsh-kurowhale-pet@0.1.4`, select the official npm registry, install, enable and restart.

- Fix npm repository linkage for DSH Market by adding `repository`, `homepage` and `bugs`, allowing the upstream probe to associate the package with the correct GitHub repository.
- Add staging checks for repository metadata and manifest consistency, with regression coverage.
- Compatibility remains Windows x64 with DSH Desktop `0.2.1-rc.3 || 0.2.1-rc.5`. Runtime code, existing artwork, all nine animations, licenses and configuration behavior are unchanged.
- **Market recovery awaits upstream synchronization and verification.** npm publication alone does not refresh the catalog. Upstream must re-probe and publish `dsh-plugin-catalog`; use the pinned npm version for now.

## Artifact / 发行产物

- Source / 源码：`5e52b617d1763702399c0476efdf6632963adf46`
- Tarball: `dsh-kurowhale-pet-0.1.4.tgz`
- SHA-256: `071c39e5cc9a362045c6dc4d5cd8c54a42f302ac61569d1829e59e2f82773f5e`
- npm integrity: `sha512-4F5fr3vy/Q81n9TyK5lw+xhWfQiPVB0Uff6Gom4sJ3Sh9UDBt91LMJSURiUhXvZm/CBdf1rCU5bQwba8HnAcQw==`
- [npm](https://www.npmjs.com/package/dsh-kurowhale-pet/v/0.1.4) · [GitHub Releases](https://github.com/lemonxiny55/dsh-kurowhale-pet/releases) · [DSH Market](https://awesome-dsh-plugin.com/p/lemonxiny55/dsh-kurowhale-pet/)

The exact accepted tarball was published without repacking; the registry download is byte-identical. Source CI passed 18 Node tests and 2 release-bundle tests; the local installation rollback test and upstream index generation check also passed. Upstream candidate validation used explicitly simulated publication metadata and does not establish live market recovery. No Desktop login, Cookie or existing plugin configuration changes were made.

原始验收 tarball 未重新打包即发布，注册表下载包与其字节一致。源码 CI 的 18 项 Node 测试、2 项发行包测试通过，本地安装回滚及上游索引生成检查通过。候选阶段上游验证使用明确的模拟发布数据，不能代替线上市场恢复确认。本次未操作 Desktop 登录、Cookie 或已有插件配置。

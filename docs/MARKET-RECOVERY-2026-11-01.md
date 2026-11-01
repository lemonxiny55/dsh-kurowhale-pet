# KuroWhale 市场条目消失调查与 0.1.4 候选

调查日期：2026-11-01（Asia/Shanghai）。结论：**缺少 npm repository 元数据导致扫描关联失败，随后被安装索引排除。源码及候选包已修复；公开市场尚未恢复，需要批准发布新版本后重新探测和发布目录。**

## 证据与原因

- [npm 官方注册表](https://registry.npmjs.org/dsh-kurowhale-pet)：`dist-tags.latest = 0.1.3`，该版本 `name = dsh-kurowhale-pet`、`version = 0.1.3`、`engines.dsh = 0.2.1-rc.3 || 0.2.1-rc.5`。版本 manifest 与注册表顶层均无 `repository`；也无 `homepage`、`bugs`。发布时间为 2026-10-30 21:39:34（北京时间）。
- [PR #10554](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/10554) 已于 2026-10-31 01:04:02（北京时间）合并；[当前 YAML](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/lemonxiny55__dsh-kurowhale-pet.yml) 仍存在，没有撤销收录。
- [公开 plugins.json](https://awesome-dsh-plugin.com/plugins.json) 仍有该仓库，描述及图标也存在，但 `npm: null`、`version: null`，安装建议退回 GitHub。
- [probe-npm.mjs](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/scripts/probe-npm.mjs) 读取仓库根 package.json 的名称，再读取 npm packument。它优先检查 latest manifest 的 repository，缺失时回退到顶层；不能关联同一 GitHub owner/repo 时，明确返回 `{npm: null, version: null}`。网络异常则保留原记录，两种路径不同。
- [market-index.mjs](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/scripts/lib/market-index.mjs) 对无 npm 映射的条目执行 `skipped.noNpm`。GitHub-only 条目不进入格式 1 的安装索引。因此 [网站 index.json](https://awesome-dsh-plugin.com/index.json) 和 [jsDelivr 目录](https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json) 都找不到 KuroWhale。
- 直接下载 npm `dsh-plugin-catalog@2026.1031.13045` tarball，其 `index.json` 同样没有该条目，排除仅 CDN 陈旧缓存的解释。目录发布于 2026-10-31 12:30:55（北京时间），索引 SHA-256：`4a1c1043dac2440dfdc5f88555d5f853cda9cdf675738f20ac2041176102c12e`。
- [最新已检查的网站构建](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/actions/runs/41252456606) 的 Build 和 Pages 部署均成功，目录 npm 发布步骤因事件为 workflow_run 而跳过。未发现需要修复整个目录构建的证据。

这完整解释当前消失状态。先前的 0.1.1 属于历史目录快照；重新探测会按当前 latest 元数据重新裁定。未取得过去 Actions 私有探测缓存，不能声称已定位首次写入 null 的具体任务或时间。上游 `data/npm-map.json` 是缓存文件，公开 main 路径返回 404，不等于 YAML 被删除。

## 最小修复

根及 plugin/package.json 补齐同一 GitHub 仓库的 `repository`、`homepage` 和 `bugs`，源码候选版本改为 **0.1.4**。保留 private 防止从源码目录误发布；只有显式 staging 去掉 private。打包脚本检查 repository 链接及两个 manifest 的关键字段一致，防止再次产出无法关联的包。

正式 npm 0.1.3 未修改。没有 npm publish、GitHub Release、DSH 登录、Cookie 或现有配置操作，没有重复窗口和动画验收。没有修改任何上游市场条目。

## 验证

- `node --test plugin/test/*.test.mjs`：18/18 通过，含元数据与实际 staging 成功/拒绝路径回归测试。
- `python scripts/test_release_bundle.py`：2/2 通过。
- `python scripts/test_install_upgrade.py`：1/1 通过。
- `git diff --check`：通过。
- 通过现有 staging 脚本生成完整素材候选，再执行 `npm pack --ignore-scripts`，得到 452606 字节的 `dsh-kurowhale-pet-0.1.4.tgz`。
- 候选 SHA-256：`071c39e5cc9a362045c6dc4d5cd8c54a42f302ac61569d1829e59e2f82773f5e`。
- 对比正式 npm 0.1.3：22 个文件字节完全一致；没有删除文件。仅两个 manifest、三个在既有提交中已更新的 README 不同，新增一份回归测试。所有运行时、素材、动画和许可文件字节一致。
- 使用下载的原始上游 probe-npm.mjs、market-index.mjs、terms.mjs、locales.mjs，依赖 `semver@7.8.5` 和官方 `@deepseek-ai/dsh-plugin-market-index@0.2.1-alpha.4`。真实 0.1.3 packument 得到 npm null、noNpm=1、0 条插件；把实际候选 tarball 中的 manifest 作为假设发布的 latest 输入后，得到 npm 名称、0.1.4、兼容范围，生成器收录 1 条，全部 skipped/refused 为 0，官方 parser 通过，semver 判断 rc.5 满足范围。
- 以上候选验证拦截网络输入，仅针对 KuroWhale，并为未发布版本提供明确的模拟发布时间；没有更改上游扫描器规则，也没有冒充线上发布或恢复结果。

本地证据及候选均在 `.acceptance/market-investigation-20261101/`：`npm.json`、`site-plugins.json`、`site-index.json`、`cdn-index.json`、`catalog-tarball-verification.json`、`package-comparison.json`、`upstream-verification.json`、`pack-result.json` 和候选 tgz。复验命令：`node .acceptance/market-investigation-20261101/verify-upstream.mjs`。此目录被 Git 忽略。默认 npm 缓存不可写时仅为当前进程指定项目内 npm_config_cache，测试 TEMP/TMP 同理。

## 恢复操作与责任

1. 用户决定是否批准发布 **0.1.4**。必须新发版本：0.1.3 已发布且缺少扫描所需的 manifest 字段，单改 GitHub 源码不会修正 npm 里的历史包。
2. 获准后由有 npm 发布权限的人发布核验过的候选，使官方注册表 latest 指向 0.1.4。本次不执行。
3. 等待上游 nightly 全量扫描、目录生成和 npm `dsh-plugin-catalog` 发布；若需要加速，由上游维护者手动触发 Build site，`probe_all=true`、`skip_probes=false`。现有工作流支持，无须修改源码或手工编辑生成缓存。定时计划为每日 02:23 UTC / 北京时间 10:23，实际启动和完成可能延迟。
4. 核对网站和目录包/jsDelivr 中已出现 0.1.4 与 rc.5 兼容范围，再刷新 Desktop 索引。只有这一步完成后，才能称公开市场安装入口恢复。

没有必要放宽上游仓库关联校验，也无需再提交 YAML。若发布后完整探测仍未更新，再凭新注册表和任务日志向上游提交定向问题；当前不创建推测性 Issue。

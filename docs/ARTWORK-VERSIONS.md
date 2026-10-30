# 素材版本维护 / Artwork version maintenance

自动素材的唯一版本固定项位于 `plugin/resources.js`：`artworkVersion`、npm 归档 URL 和 SHA-256，以及 `pet.json`、`spritesheet.webp` 的 SHA-256。当前素材版本为 0.1.0，与插件版本独立；该归档是固定的素材来源，并非要求安装旧插件。GitHub 安装会下载并校验归档及两个文件；npm 构建脚本从同一来源校验后打包，运行时也校验包内文件。用户显式设置的路径继续由用户管理，不会被替换或按固定哈希拒绝。

升级时先确认素材许可和来源，生成新的不可变发行归档，独立计算归档及两个文件的 SHA-256，同时更新上述全部固定项和素材版本。保留旧缓存目录，运行自动测试，使用 `scripts/stage-npm.mjs` 构建候选包并比较包内文件哈希，再进行 Windows Desktop 验收。不要覆盖已有 npm 版本。

The artwork release pin lives in `plugin/resources.js`: `artworkVersion`, archive URL and SHA-256, and both file SHA-256 values. Artwork version 0.1.0 is independent of the plugin version. GitHub installs verify the archive and extracted files; npm staging obtains the same verified files, which are verified again at runtime. Explicit user paths remain user-managed.

For an upgrade, verify provenance and licensing, publish an immutable artwork archive, independently calculate all three SHA-256 values, and update the pin and artwork version together. Keep old caches, run tests, stage and compare the npm package, then perform Windows Desktop acceptance. Never overwrite an existing npm version.

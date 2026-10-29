# npm 与 DSH Desktop 安装 / npm and DSH Desktop

`dsh-kurowhale-pet@0.1.1` 在 npm 上包含插件和 `character/pet.json`、`character/spritesheet.webp`；它不包含 Neutralino 可执行文件，也不会自动启用渲染。`npm install` 仅安装到指定目录，不会把插件加入 Desktop profile。以下是基于官方 CLI 和已发布包结构的手动操作；npm 下载已验证，使用 npm 在全新 Desktop profile 安装并显示角色尚未实机验收。完整安装器的已验证路径见 [Windows 完整包](WINDOWS-FULL-INSTALL.md)。

## 前提与角色素材 / Prerequisites and assets

需要 Windows x64、已初始化的 DSH Desktop **0.2.1-rc.3** 默认 desktop profile、Node >=22.18.0、WebView2 和单独取得的官方 [Neutralino 6.9.0 x64](https://github.com/neutralinojs/neutralinojs/releases/tag/v6.9.0)。运行时校验值见 [dependencies.lock.json](../dependencies.lock.json)。先结束 DSH 任务、退出 Desktop，并备份 profile 和已有 `~/.dsh/kurowhale-pet/local.json`。

选择一个长期保留的目录，将示例路径替换成自己的路径：

```powershell
npm install --prefix 'D:\KuroWhaleAssets' --no-save --ignore-scripts dsh-kurowhale-pet@0.1.1
```

确认 `D:\KuroWhaleAssets\node_modules\dsh-kurowhale-pet\character` 包含 `pet.json` 和 `spritesheet.webp`。保留此目录，以免桌宠失去素材。

## 安装到 Desktop / Install in Desktop

确保 Desktop 已退出；使用 **Desktop 自带** CLI 的实际路径，不要依赖 PATH 中可能不匹配的 DSH：

```powershell
& 'E:\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add dsh-kurowhale-pet@0.1.1 --ignore-scripts
```

上面的 `E:\DeepSeek Harness` 仅是示例，替换为实际安装目录。此命令由 CLI 转发给 profile 的包管理器；如有现存版本，先阅读完整安装器的升级与回滚说明。插件安装并不表示渲染已启用。

## 启用并启动 / Enable and start

创建或编辑 `%USERPROFILE%\.dsh\kurowhale-pet\local.json`，将以下字段**合并**到原有 JSON 中，不要覆盖已有设置；改为实际绝对路径（JSON 使用正斜杠）：

```json
{
  "rendererEnabled": true,
  "assetDirectory": "D:/KuroWhaleAssets/node_modules/dsh-kurowhale-pet/character",
  "runtimePath": "D:/Tools/neutralino-win_x64.exe",
  "scale": 1.25
}
```

重新启动 DSH Desktop。检查桌面是否实际显示角色；`~/.dsh/kurowhale-pet/status.json` 的 `rendererReady` 只反映通信及资源状态，并非目视显示证明。失败时先退出 Desktop，再参照[安装与恢复](WINDOWS-INSTALL.md)回滚。

## 卸载 / Remove

结束任务并退出 Desktop，使用同一 CLI 仅卸载该插件：

```powershell
& 'E:\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop remove dsh-kurowhale-pet
```

重启 Desktop 并检查其他插件。角色素材、配置与备份不会由此命令自动删除。

## English

Use an initialized Desktop 0.2.1-rc.3 profile, finish tasks and exit Desktop. The first command above installs the npm package into a persistent asset directory; the second uses Desktop's bundled CLI to add the package to the `desktop` profile. Merge the example JSON fields into your existing `local.json` using your real absolute paths, then restart Desktop and visually check the pet. npm installation alone does not activate it. The npm download was verified, but this specific npm-to-Desktop flow has not been tested on a fresh Desktop profile. See the [full Windows package](WINDOWS-FULL-INSTALL.md) for the previously tested installer.

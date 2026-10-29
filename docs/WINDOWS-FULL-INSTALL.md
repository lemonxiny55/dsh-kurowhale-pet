# 完整包安装说明（v0.1.0）

本包含角色 `character/pet.json` 和原样图集，包含代码子包与完整包安装入口。完整包清单明确标记含美术；代码子包的清单仅描述代码子包。代码 MIT；项目有权授权的新增美术贡献采用 CC BY-NC-SA 4.0。直接参考图作者与授权范围尚未完全确认，见 NOTICE-ARTWORK.md 和 LICENSE-ARTWORK。

需要 Windows x64、已初始化默认 desktop profile 的 DSH Desktop 0.2.1-rc.3、PowerShell 7、Node 22.18.0 或以上、WebView2，以及单独取得的官方 Neutralino 6.9.0 x64 可执行文件。自定义 DSH_HOME、其他 DSH 版本、其他平台未支持。运行时哈希见 code/dependencies.lock.json。

将整个 ZIP 解压到长期保留的目录，角色和插件包从该目录引用；不要安装后删除。使用 PowerShell 7 在此目录运行：

```powershell
pwsh -File .\install-full-windows.ps1 -Action Check -DshInstall 'E:\DeepSeek Harness' -RuntimePath 'D:\Tools\neutralino-win_x64.exe'
```

先结束所有任务并退出 DSH，再用相同路径执行：

```powershell
pwsh -File .\install-full-windows.ps1 -Action Install -TasksEnded -DshInstall 'E:\DeepSeek Harness' -RuntimePath 'D:\Tools\neutralino-win_x64.exe'
```

重新启动 Desktop 并确认角色显示。卸载前结束任务并退出 DSH，运行 `pwsh -File .\install-full-windows.ps1 -Action Uninstall -TasksEnded -DshInstall 'E:\DeepSeek Harness'`。备份、手动回滚和故障处理见 code/docs/WINDOWS-INSTALL.md；备份可能包含私有配置，不要上传。

升级时安装器备份当前插件和相关配置；若已安装文件与目标哈希完全一致，则跳过插件替换并核验配置。否则通过 DSH 官方 CLI 先移除本插件，再安装目标包，逐文件核验；失败时尝试恢复并逐文件核验旧插件。备份及回滚日志仅留本机。不要在升级过程中修改其他插件或模型设置。

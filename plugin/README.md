# KuroWhale host-only compatibility skeleton

**Status: pre-alpha / NOT a desktop pet.** This directory is a small test bundle to probe whether a backend-only Cordis plugin can boot under the **target DSH Desktop 0.2.1-rc.3** without relying on legacy web frontend modules.

目前不创建透明窗口、不读取角色包、不订阅 Agent 事件，也不接触模型凭据。不得以此声称完成 Windows/DSH 兼容性验收。

No real overlay, agent subscriptions, character assets, or credentials are involved.

## Local structural tests

Run with Node.js 22+:

```bash
cd plugin
npm test
```

This checks metadata, the host-only patch, and the minimal JS export. It **does not** execute DSH or prove Windows Desktop compatibility.

## Next isolated acceptance gate

1. Use a disposable DSH test environment/profile; **do not change the restored production Desktop profile**.
2. Confirm the target Desktop version exactly matches `0.2.1-rc.3`.
3. Snapshot the test profile; first verify the unmodified app boots.
4. Install/activate this local bundle only in the disposable profile according to the official Desktop-bundled CLI/SDK instructions.
5. Restart the isolated app and verify the log includes `[dsh-kurowhale-pet] backend-only development smoke plugin started`.
6. Disable/remove the plugin and verify the disposable profile still boots. Capture logs if any step fails.
7. Only after that, implement renderer and state integration with verified current APIs.

The `private: true` setting prevents accidental npm publication. This is a development probe, **not** an installable release artifact.

Sources: [DSH plugin packaging](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md) and [DSH Desktop runtime](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.md).

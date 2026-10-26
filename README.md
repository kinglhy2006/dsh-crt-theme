# dsh-crt-theme

A CRT terminal skin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): phosphor-green palette on near-black, scanlines, monospace type.

The skin overrides the host's design tokens from a client plugin. It does not patch components or replace any host module.

## Features

- Dark green/black palette with scanlines, applied to the conversation and the sidebar.
- Status light in the conversation header: CPU load, memory use, current output speed (tokens/s) and cumulative tokens for the session.
- Optional DeepSeek account balance in the same status area. The API key is read by the host half and never reaches the browser; the route only returns the balance numbers.
- Local diagnostics: the client reports which stage failed if the skin cannot mount, so a broken install is visible without opening the console.

## Install

```sh
dsh plugin --profile <your-profile> add github:kinglhy2006/dsh-crt-theme
```

Then restart the profile (or reload the page). Replace `<your-profile>` with the profile you run, for example `desktop`.

To remove it:

```sh
dsh plugin --profile <your-profile> remove dsh-crt-theme
```

## Balance readout (optional)

The balance panel stays empty until a key file exists. Create `~/.dsh/deepseek-balance.json`:

```json
{ "api_key": "sk-..." }
```

Or point `DSH_BALANCE_CONFIG` at a JSON file with the same shape. The key is sent only to `https://api.deepseek.com/user/balance` and is not written anywhere else. The file is plain text — protect it with normal file permissions.

## Tests

```sh
node test/smoke.mjs
```

The smoke test loads `client.js` with stubbed `window`/`document`/React and checks that the plugin mounts, registers its status light and cleans up on unmount.

## 中文

给 DeepSeek Harness 用的 CRT 终端皮肤：近黑底配磷光绿、扫描线、等宽字体，只覆盖设计令牌，不改组件结构。会话顶部有状态灯（CPU、内存、当前 tok/s、会话累计 token），可选显示 DeepSeek 账户余额。余额需要 `~/.dsh/deepseek-balance.json` 里放 `api_key`，只发往 DeepSeek 官方余额接口。

## License

MIT

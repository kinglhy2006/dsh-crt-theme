# dsh-crt-theme

A CRT terminal skin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): phosphor green on near-black, scanlines, monospace type.

![The skin applied to the conversation and sidebar](docs/preview.png)

*Preview rendered from the skin's own CSS tokens, not a hand-drawn mock.*

## Install

```sh
dsh plugin --profile <your-profile> add github:kinglhy2006/dsh-crt-theme
```

Restart the profile or reload the page. Remove it with `dsh plugin --profile <your-profile> remove dsh-crt-theme`.

## What it does

- Repaints the conversation and sidebar by overriding the host's design tokens. No component is patched or replaced.
- Adds a status line: CPU load, memory use, output speed (tokens/s), session tokens.
- Optional DeepSeek account balance. The key is read in the host process and never reaches the browser.

## Balance readout (optional)

Create `~/.dsh/deepseek-balance.json`:

```json
{ "api_key": "sk-..." }
```

Or set `DSH_BALANCE_CONFIG` to a JSON file with the same shape. The key is sent only to `https://api.deepseek.com/user/balance`. The file is plain text — keep normal file permissions on it.

## Tests

```sh
node test/smoke.mjs
```

## 中文

给 DeepSeek Harness 用的 CRT 终端皮肤：近黑底磷光绿、扫描线、等宽字体，只覆盖设计令牌，不改组件结构。装完重启即可；会话顶部多一行状态（CPU、内存、当前 tok/s、会话 token），可选显示 DeepSeek 余额。

## License

MIT

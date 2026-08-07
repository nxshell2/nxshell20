<p align="center">
  <img src="https://img.shields.io/badge/NxShell-2.0.0-6366f1?style=for-the-badge&logo=terminal" alt="NxShell" width="220" />
</p>

<h1 align="center">NxShell</h1>

<p align="center"><strong>A cross-platform desktop terminal client.</strong></p>
<p align="center"><sub>跨平台桌面终端客户端 —— 一套工具管理 SSH / VNC / Telnet / FTP / SFTP / Serial。</sub></p>

<p align="center">
  <a href="https://github.com/nxshell/nxshell/releases">
    <img src="https://img.shields.io/github/v/release/nxshell/nxshell?style=flat-square&color=6366f1" alt="Release" />
  </a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/built%20with-Electron%20%2B%20Vue-47848f?style=flat-square" alt="Electron + Vue" />
  <img src="https://img.shields.io/github/license/nxshell/nxshell?style=flat-square" alt="ISC License" />
</p>

<p align="center">
  <a href="https://github.com/nxshell/nxshell/releases/latest">Download</a> ·
  <a href="https://github.com/nxshell/nxshell/issues">Issues</a> ·
  <a href="README.md">🌐 中文</a>
</p>

> **Note** —— This repository is the source and issue-tracking channel for NxShell. For release packages, visit [Releases](https://github.com/nxshell/nxshell/releases).

---

## What is NxShell?

NxShell is a feature-rich, cross-platform desktop client that unifies **SSH, VNC, Telnet, FTP/SFTP, Serial** and **SOCKS5** into a single window — so you can manage remote hosts as neatly as flipping through a notebook.

---

## Highlights

- 🔌 **Multi-protocol** — One client for SSH, VNC, Telnet, FTP/SFTP, Serial and SOCKS5 proxy.
- 📑 **Tabbed terminal** — Manage multiple sessions in a single window; drag to group, switch in a flash.
- 🌳 **Session tree** — Organize connections with folders and bookmarks; hundreds of hosts stay tidy.
- 📂 **File manager** — Built-in SFTP browser with visual upload/download and ZMODEM transfer.
- ✏️ **Code editor** — CodeMirror 6 with syntax highlighting for 10+ languages (edit remote configs in place).
- 🌍 **i18n** — Switch between Chinese / English UI on the fly.
- 🖥️ **Cross-platform** — Windows (NSIS / APPX), macOS (DMG), Linux (AppImage / deb).
- ⚡ **Native performance** — Protocols run on Node.js native addons (`ptservices`) for stable, fast connections.

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Runtime** | Electron 43.2.0 |
| **UI Framework** | Vue 3.5 · Vue Router 4 · Pinia · Vue I18n |
| **UI Components** | Element Plus 2.14 · Element Plus Icons |
| **Terminal** | xterm.js 6.0 (fit / search / web-links / WebGL addons) |
| **Editor** | CodeMirror 6 (C++, CSS, HTML, Java, JS, JSON, Markdown, PHP, Python, XML) |
| **Toolchain** | TypeScript 5.9 · Babel · Webpack · Vue CLI Service |
| **Protocol Addons** | `nxshell-ssh2` · `nxshell-vnc` · `nxshell-ftp` · `nxshell-socksv5` · `nxshell-zmodem.js` |
| **Serial** | `serialport` 13.x |
| **PTY** | `node-pty` 1.1 (patched) |
| **Networking** | `axios` · `telnet-client` · `webdav` |
| **Package Manager** | pnpm (Workspace + patched deps) |
| **Packaging** | electron-builder |
| **Linting** | ESLint 10 (@antfu/eslint-config) |
| **China Mirror** | npmmirror |

---

## Install

### Download a package

Grab the latest asset from [Releases](https://github.com/nxshell/nxshell/releases):

| Platform | Asset |
|:---|:---|
| Windows | `NxShell-x64-win-nsis-setup.exe` / `NxShell-x64-win.appx` |
| macOS | `NxShell-arm64-mac.dmg` |
| Linux | `NxShell-x64-linux.AppImage` / `NxShell-x64-linux.deb` |

### Or build from source

Requires **Node.js ≥ 20** and **pnpm ≥ 9**.

```sh
git clone https://github.com/nxshell/nxshell.git
cd nxshell
make install
make dev
```

---

## Usage

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Git

### Install dependencies

```sh
make install
# or: pnpm install
```

### Development

```sh
make dev
# or: npm run dev
```

Starts the Electron app with hot-reload for both the main process and the Vue renderer.

### Lint

```sh
make lint
npm run lint:fix   # auto-fix
```

### Build & package

```sh
make all       # build main + renderer
make dist      # package for distribution
make dist_cn   # package via China mirror (GFW-friendly)
```

Artifacts are output to `dist/apppackage/`.

### Clean

```sh
make clean      # remove build artifacts
make clean-all  # remove artifacts and node_modules
```

### Typical workflow

1. Open NxShell and create an **SSH session** in the **session tree** (host / port / credentials).
2. Double-click the session to connect in a **tabbed terminal**; group multiple hosts by dragging tabs.
3. Switch to the **file manager** to drag-drop upload files, or use ZMODEM inside the terminal.
4. Edit a remote config file in-place with the built-in **code editor** — saving writes it back.

---

## Configuration

NxShell keeps connection and UI config in two places — no need to hand-edit low-level files.

- **Sessions** — All SSH / VNC / Telnet / FTP / Serial connections are managed by the session tree, with folder grouping and bookmarks. See `docs/design/` for the design spec.
- **UI & Language** — Switch Chinese / English UI, theme, and terminal appearance (font, color scheme, cursor) in Settings.
- **Proxy** — Configure a SOCKS5 jump host per session via the SOCKS5 addon.
- **Native addons** — Protocols are served by `shell/ptservices/`; `node-pty@1.1.0` is already patched via pnpm — no manual steps.
- **China environment** — `.npmrc` pre-sets the npmmirror registry; use `make dist_cn` to package via China mirrors.

> 💡 Configure once, use everywhere: the same host can be reused across SSH / SFTP / Serial protocols.

---

## Project Structure

```
nxshell20/
├── .github/            # GitHub CI / Workflows
├── .node-version       # Node.js version pinning
├── .npmrc              # pnpm config (npmmirror registry)
├── .nvmrc              # NVM config
├── package.json        # Monorepo root manifest
├── pnpm-workspace.yaml # Workspace: core + shell
├── pnpm-lock.yaml
├── Makefile            # Build orchestration
├── electron-builder.yml
├── patches/            # pnpm patch (node-pty@1.1.0)
├── scripts/            # Dev scripts (dev.js, write-version.js, etc.)
├── docs/
│   └── design/         # Design docs (session-config-refactor, etc.)
├── core/               # Electron main process
│   ├── package.json
│   ├── README.md
│   ├── src/            # Main process TypeScript source
│   ├── index.ts        # Entry point
│   ├── webpack.conf.js
│   ├── tsconfig.json
│   └── LICENSE
└── shell/              # Electron renderer (Vue) + native service extensions
    ├── package.json
    ├── README.md
    ├── src/            # Vue 3 application source
    ├── common/         # Shared utilities between renderer and ptservices
    ├── devtools/       # Dev-time tooling (rundev.js, webpack config)
    ├── public/         # Static assets
    └── ptservices/     # Node.js native addons (SSH, VNC, FTP, SOCKS, ZMODEM, Serial)
        └── package.json
```

### Architecture

This is a pnpm monorepo with two core packages:

- **`powertools-core`** — The Electron main process. Handles app lifecycle, IPC, session management, and packaging.
- **`powertools-shell`** — The Electron renderer (Vue 3 SPA). Provides the UI: tabbed terminal, session tree, file manager, settings. Also bundles native Node.js addons under `ptservices/` for protocol support.

```
┌──────────────────────────────────────────────┐
│                powertools-shell               │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Vue 3 UI  │  │ xterm.js │  │ CodeMirror │  │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       └──────────────┼──────────────┘          │
│               ┌──────┴──────┐                  │
│               │   IPC Layer  │                  │
│               └──────┬──────┘                  │
└──────────────────────┼────────────────────────┘
                       │ IPC
┌──────────────────────┼────────────────────────┐
│               powertools-core                  │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  │
│  │ App Lifecycle│  │ Session  │  │ Electron │  │
│  │  Manager     │  │ Manager  │  │  Main    │  │
│  └─────────────┘  └──────────┘  └──────────┘  │
│                                               │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │ ptservices │  │ ptservices│  │ ptservices │  │
│  │   (SSH)    │  │  (VNC)    │  │  (FTP)     │  │
│  └───────────┘  └───────────┘  └───────────┘  │
└───────────────────────────────────────────────┘
```

---

## Contributing

Contributions are welcome!

1. **Fork** the repo and create a feature branch: `git checkout -b feat/your-feature`.
2. Commit your changes: `git commit -m "feat: your feature"`.
3. Push and open a **Pull Request**.
4. Report bugs or suggest features in [Issues](https://github.com/nxshell/nxshell/issues).

> Run `make lint` (or `npm run lint:fix`) before submitting to keep the code style consistent.

---

## License

Code is licensed under the [ISC License](./LICENSE).

---

<p align="center">
  Made with 💚 by NxShell Team<br>
  <sub>⭐ <a href="https://github.com/nxshell/nxshell">Star on GitHub</a> · <a href="README.md">🌐 中文</a></sub>
</p>

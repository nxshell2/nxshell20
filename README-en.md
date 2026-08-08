# NxShell 2.0

<div align="center">

![NxShell Logo](https://img.shields.io/badge/NxShell-2.0.0-6366f1?style=for-the-badge&logo=terminal)

[![GitHub Stars](https://img.shields.io/github/stars/nxshell/nxshell?style=for-the-badge&color=ffcb36)](https://github.com/nxshell/nxshell)
[![GitHub Forks](https://img.shields.io/github/forks/nxshell/nxshell?style=for-the-badge&color=388bfd)](https://github.com/nxshell/nxshell/forks)
[![GitHub Issues](https://img.shields.io/github/issues/nxshell/nxshell?style=for-the-badge&color=ff7471)](https://github.com/nxshell/nxshell/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/nxshell/nxshell?style=for-the-badge&color=58a6ff)](https://github.com/nxshell/nxshell/pulls)

[![Views](https://custom-icon-badges.demolab.com/badge/README_views-58a6ff?style=for-the-badge&logo=eye&logoColor=white)](README.md)
[![Downloads](https://img.shields.io/github/downloads/nxshell/nxshell/total?style=for-the-badge&color=fa8216&logo=download)](https://github.com/nxshell/nxshell/releases)

[![License](https://img.shields.io/badge/license-ISC-blue?style=for-the-badge)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%E2%89%A59-orange?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![Electron](https://img.shields.io/badge/Electron-43.2.0-47848f?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![Vue](https://img.shields.io/badge/Vue.js-3.5-42d392?style=for-the-badge&logo=vue.js)](https://vuejs.org/)

**A cross-platform desktop terminal client** for SSH, VNC, Telnet, FTP/SFTP, Serial, and SOCKS5 connections

[Features](#features) · [Tech Stack](#tech-stack) · [Project Structure](#project-structure) · [Getting Started](#getting-started) · [Architecture](#architecture) · [Language / 语言选择](#-language)

</div>

---

## Features

| Feature | Description |
|:---|:---|
| 🔌 **Multi-protocol** | SSH, VNC, Telnet, FTP/SFTP, Serial, SOCKS5 |
| 📑 **Tabbed Terminal** | Manage multiple sessions in one window with drag-to-group |
| 🌳 **Session Tree** | Organize connections with folders and bookmarks |
| 📂 **File Manager** | Built-in SFTP file browser with upload/download |
| ✏️ **Code Editor** | Syntax highlighting for 10+ languages via CodeMirror 6 |
| 🌍 **i18n** | Built-in Chinese/English switching, expanding |
| 🖥️ **Cross-platform** | Windows (NSIS/APPX), macOS (DMG), Linux (AppImage/deb) |

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Runtime** | Electron 43.2.0 |
| **UI Framework** | Vue 3.5 · Vue Router 4 · Pinia · Vue I18n |
| **UI Components** | Element Plus 2.14 · Element Plus Icons |
| **Terminal Emulator** | xterm.js 6.0 (fit / search / web-links / WebGL addons) |
| **Code Editor** | CodeMirror 6 (C++, CSS, HTML, Java, JS, JSON, Markdown, PHP, Python, XML) |
| **Language Toolchain** | TypeScript 5.9 · Babel · Webpack · Vue CLI Service |
| **Protocol Addons** | `nxshell-ssh2` · `nxshell-vnc` · `nxshell-ftp` · `nxshell-socksv5` · `nxshell-zmodem.js` |
| **Serial Port** | `serialport` 13.x |
| **PTY** | `node-pty` 1.1 (patched) |
| **Networking** | `axios` · `telnet-client` · `webdav` |
| **Package Manager** | pnpm (Workspace + shamefully-hoist + patched deps) |
| **Packaging** | electron-builder |
| **Linting** | ESLint 10 (@antfu/eslint-config) |
| **China Mirror** | npmmirror |

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

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Git

### Install

```bash
make install
# or: pnpm install
```

### Development

```bash
make dev
# or: npm run dev
```

Starts the Electron app with hot-reload for both the main process and the Vue renderer.

### Linting

```bash
make lint
npm run lint:fix   # auto-fix where possible
```

### Build & Package

```bash
# Build main process and renderer
make all

# Package for distribution
make dist

# Package using China mirrors (for users behind GFW)
make dist_cn
```

Build artifacts are output to `dist/apppackage/`.

### Clean

```bash
make clean      # remove build artifacts
make clean-all  # remove artifacts and node_modules
```

---

## Architecture

This project is a pnpm monorepo with two core packages:

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

## 🌐 Language

| Language | Doc |
|:---:|:---:|
| 🇨🇳 中文 | [README.md](README.md) |
| 🇬🇧 English | [README-en.md](README-en.md)（当前） |

---

## License

[ISC](./LICENSE)

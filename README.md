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

**跨平台桌面终端客户端** — 一个功能丰富的 SSH / VNC / Telnet / FTP / SFTP / Serial 多协议客户端

[功能特性](#功能特性) · [技术栈](#技术栈) · [项目结构](#项目结构) · [快速开始](#快速开始) · [架构设计](#架构设计) · [语言 / Language](#-语言选择)

</div>

---

## 功能特性

| 特性 | 说明 |
|:---|:---|
| 🔌 **多协议支持** | SSH、VNC、Telnet、FTP/SFTP、Serial、SOCKS5 |
| 📑 **标签页终端** | 单窗口管理多个会话，支持拖拽分组 |
| 🌳 **会话树** | 文件夹分组 + 收藏夹，连接管理井井有条 |
| 📂 **文件管理器** | 内置 SFTP 文件浏览器，直接上传下载 |
| ✏️ **代码编辑器** | 基于 CodeMirror 6，支持 C++、Python、JS、JSON 等 10+ 种语言高亮 |
| 🌍 **多语言国际化** | 内置中英文切换，持续扩展中 |
| 🖥️ **跨平台分发** | Windows (NSIS/APPX)、macOS (DMG)、Linux (AppImage/deb) |

---

## 技术栈

| 层级 | 技术 |
|:---|:---|
| **运行时** | Electron 43.2.0 |
| **前端框架** | Vue 3.5 · Vue Router 4 · Pinia · Vue I18n |
| **UI 组件库** | Element Plus 2.14 · Element Plus Icons |
| **终端模拟器** | xterm.js 6.0（fit / search / web-links / WebGL 插件） |
| **代码编辑器** | CodeMirror 6（C++、CSS、HTML、Java、JS、JSON、Markdown、PHP、Python、XML） |
| **语言工具链** | TypeScript 5.9 · Babel · Webpack · Vue CLI Service |
| **协议插件** | `nxshell-ssh2` · `nxshell-vnc` · `nxshell-ftp` · `nxshell-socksv5` · `nxshell-zmodem.js` |
| **串口支持** | `serialport` 13.x |
| **伪终端** | `node-pty` 1.1（已打补丁） |
| **网络工具** | `axios` · `telnet-client` · `webdav` |
| **包管理器** | pnpm（Workspace + shamefully-hoist + patched deps） |
| **打包工具** | electron-builder |
| **代码检查** | ESLint 10（@antfu/eslint-config） |
| **国内镜像** | npmmirror |

---

## 项目结构

```
nxshell20/
├── .github/            # GitHub CI / Workflows
├── .node-version       # Node.js 版本锁定
├── .npmrc              # pnpm 配置（npmmirror 源）
├── .nvmrc              # NVM 配置
├── package.json        # Monorepo 根清单
├── pnpm-workspace.yaml # 工作区配置：core + shell
├── pnpm-lock.yaml
├── Makefile            # 构建编排
├── electron-builder.yml
├── patches/            # pnpm patch（node-pty@1.1.0）
├── scripts/            # 开发脚本（dev.js、write-version.js 等）
├── docs/
│   └── design/         # 设计文档（session-config-refactor 等）
├── core/               # Electron 主进程
│   ├── package.json
│   ├── README.md
│   ├── src/            # 主进程 TypeScript 源码
│   ├── index.ts        # 入口文件
│   ├── webpack.conf.js
│   ├── tsconfig.json
│   └── LICENSE
└── shell/              # Electron 渲染进程（Vue）+ 原生服务扩展
    ├── package.json
    ├── README.md
    ├── src/            # Vue 3 应用源码
    ├── common/         # 渲染进程与 ptservices 共享工具
    ├── devtools/       # 开发期工具（rundev.js、webpack 配置）
    ├── public/         # 静态资源
    └── ptservices/     # Node.js 原生插件（SSH、VNC、FTP、SOCKS、ZMODEM、Serial）
        └── package.json
```

---

## 快速开始

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 9
- Git

### 安装依赖

```bash
make install
# 或：pnpm install
```

### 开发模式

```bash
make dev
# 或：npm run dev
```

启动 Electron 应用，支持主进程和 Vue 渲染进程的热重载。

### 代码检查

```bash
make lint
npm run lint:fix   # 自动修复
```

### 构建 & 打包

```bash
# 构建主进程和渲染进程
make all

# 打包分发版本
make dist

# 使用国内镜像打包（适合墙内用户）
make dist_cn
```

构建产物输出至 `dist/apppackage/`。

### 清理

```bash
make clean      # 清除构建产物
make clean-all  # 清除构建产物和 node_modules
```

---

## 架构设计

本项目为 pnpm Monorepo，包含两个核心包：

- **`powertools-core`** — Electron 主进程，负责应用生命周期管理、IPC 通信、会话管理和打包分发。
- **`powertools-shell`** — Electron 渲染进程（Vue 3 SPA），提供标签页终端、会话树、文件管理器、设置等界面。同时打包 `ptservices/` 下的 Node.js 原生插件以支持各类协议。

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

## 🌐 语言选择

| 语言 | 文档 |
|:---:|:---:|
| 🇨🇳 中文 | [README.md](README.md)（当前） |
| 🇬🇧 English | [README-en.md](README-en.md) |

---

## License

[ISC](./LICENSE)

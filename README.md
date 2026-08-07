<p align="center">
  <img src="https://img.shields.io/badge/NxShell-2.0.0-6366f1?style=for-the-badge&logo=terminal" alt="NxShell" width="220" />
</p>

<h1 align="center">NxShell</h1>

<p align="center"><strong>跨平台桌面终端客户端</strong></p>
<p align="center"><sub>一套工具管理 SSH / VNC / Telnet / FTP / SFTP / Serial 等多种远程协议</sub></p>

<p align="center">
  <a href="https://github.com/nxshell/nxshell/releases">
    <img src="https://img.shields.io/github/v/release/nxshell/nxshell?style=flat-square&color=6366f1" alt="Release" />
  </a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/built%20with-Electron%20%2B%20Vue-47848f?style=flat-square" alt="Electron + Vue" />
  <img src="https://img.shields.io/github/license/nxshell/nxshell?style=flat-square" alt="ISC License" />
</p>

<p align="center">
  <a href="https://github.com/nxshell/nxshell/releases/latest">下载</a> ·
  <a href="https://github.com/nxshell/nxshell/issues">问题反馈</a> ·
  <a href="README-en.md">🌐 English</a>
</p>

> **说明** —— 本仓库是 NxShell 的源码与问题追踪渠道。产品发布包请前往 [Releases](https://github.com/nxshell/nxshell/releases) 页面获取。

---

## NxShell 是什么？

NxShell 是一个功能丰富的跨平台桌面客户端，将 **SSH、VNC、Telnet、FTP/SFTP、Serial 串口** 与 **SOCKS5 代理** 等常用远程协议统一收拢到同一个窗口中——让你管理远程主机就像翻看一本笔记本一样井然有序，无需在多个工具之间反复切换。

---

## 功能亮点

> NxShell 把日常使用的远程运维与开发协议集中到一处，配合标签页、会话树与内置文件管理器，开箱即用。

- 🔌 **多协议支持** —— 一套客户端即可覆盖 SSH、VNC、Telnet、FTP/SFTP、Serial 串口与 SOCKS5 代理。
- 📑 **标签页终端** —— 在单个窗口中管理多个会话，支持拖拽分组，切换如闪电般迅速。
- 🌳 **会话树** —— 用文件夹分组 + 收藏夹整理连接，即便有成百上千台主机也一目了然。
- 📂 **文件管理器** —— 内置 SFTP 文件浏览器，可视化上传 / 下载，并支持 ZMODEM 文件传输。
- ✏️ **代码编辑器** —— 基于 CodeMirror 6，支持 C++、Python、JS、JSON 等 10+ 种语言高亮，可直接在远端修改配置。
- 🌍 **多语言国际化** —— 界面中 / 英随时切换，语言随心而变。
- 🖥️ **跨平台分发** —— Windows（NSIS / APPX）、macOS（DMG）、Linux（AppImage / deb），一次构建、处处运行。
- ⚡ **原生性能** —— 协议能力由 Node.js 原生插件（`ptservices`）承载，连接稳定、响应迅速。

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
| **包管理器** | pnpm（Workspace + 补丁依赖） |
| **打包工具** | electron-builder |
| **代码检查** | ESLint 10（@antfu/eslint-config） |
| **国内镜像** | npmmirror |

---

## 安装说明

### 下载安装包

前往 [Releases](https://github.com/nxshell/nxshell/releases) 页面，按平台选择对应资产：

| 平台 | 资产 |
|:---|:---|
| Windows | `NxShell-x64-win-nsis-setup.exe` / `NxShell-x64-win.appx` |
| macOS | `NxShell-arm64-mac.dmg` |
| Linux | `NxShell-x64-linux.AppImage` / `NxShell-x64-linux.deb` |

### 或从源码构建

需要 **Node.js ≥ 20** 与 **pnpm ≥ 9**。

```sh
git clone https://github.com/nxshell/nxshell.git
cd nxshell
make install
make dev
```

---

## 使用示例

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 9
- Git

### 安装依赖

```sh
make install
# 或：pnpm install
```

### 开发模式

```sh
make dev
# 或：npm run dev
```

启动 Electron 应用，支持主进程与 Vue 渲染进程的热重载。

### 代码检查

```sh
make lint
npm run lint:fix   # 自动修复
```

### 构建与打包

```sh
make all       # 构建主进程与渲染进程
make dist      # 打包分发版本
make dist_cn   # 使用国内镜像打包（适合墙内用户）
```

构建产物输出至 `dist/apppackage/`。

### 清理

```sh
make clean      # 清除构建产物
make clean-all  # 清除构建产物与 node_modules
```

### 典型工作流

1. 打开 NxShell，在 **会话树** 中新建一个 SSH 会话并填写主机 / 端口 / 凭据。
2. 双击会话即可在 **标签页终端** 中连接，多台主机可在同一窗口拖拽分组。
3. 切换至 **文件管理器**，直接拖拽本地文件到远端完成上传；或在终端内使用 ZMODEM 收发文件。
4. 需要临时改配置时，用内置 **代码编辑器** 打开远端文件，保存即写回。

---

## 配置指南

NxShell 的连接与界面配置集中在两处，无需手改底层配置文件：

- **会话配置** —— 所有 SSH / VNC / Telnet / FTP / Serial 连接信息由会话树统一管理，支持文件夹分组与收藏夹。详细设计见 `docs/design/`。
- **界面与语言** —— 在设置面板中切换中 / 英界面、主题与终端外观（字体、配色、光标样式）。
- **代理** —— 通过 SOCKS5 插件为会话配置跳板代理。
- **原生插件** —— 协议能力由 `shell/ptservices/` 下的 Node.js 原生插件提供，已通过 pnpm 补丁适配 `node-pty@1.1.0`，无需手动干预。
- **国内环境** —— `.npmrc` 已预置 npmmirror 源；打包时可使用 `make dist_cn` 走国内镜像。

> 💡 配置一次，全局生效：同一台主机可在 SSH / SFTP / Serial 等不同协议间复用。

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
├── patches/            # pnpm 补丁（node-pty@1.1.0）
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

### 架构设计

本项目为 pnpm Monorepo，包含两个核心包：

- **`powertools-core`** —— Electron 主进程，负责应用生命周期管理、IPC 通信、会话管理和打包分发。
- **`powertools-shell`** —— Electron 渲染进程（Vue 3 SPA），提供标签页终端、会话树、文件管理器、设置等界面，并打包 `ptservices/` 下的 Node.js 原生插件以支持各类协议。

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

## 贡献方式

欢迎参与 NxShell 的开发！

1. **Fork** 本仓库并创建特性分支：`git checkout -b feat/your-feature`。
2. 提交改动：`git commit -m "feat: your feature"`。
3. 推送分支并发起 **Pull Request**。
4. 在 [Issues](https://github.com/nxshell/nxshell/issues) 中报告缺陷或提出需求建议。

> 提交前请运行 `make lint`（或 `npm run lint:fix`）以确保代码风格一致。

---

## 许可证

代码基于 [ISC 许可证](./LICENSE) 开源。

---

<p align="center">
  Made with 💚 by NxShell Team<br>
  <sub>⭐ <a href="https://github.com/nxshell/nxshell">在 GitHub 上点星</a> · <a href="README-en.md">🌐 English</a></sub>
</p>

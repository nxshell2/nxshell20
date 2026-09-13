# NxShell

A modern, cross-platform terminal emulator and remote session manager built with Electron + Vue 3.

## Features

- **SSH** — Remote shell sessions with SFTP file transfer support
- **SFTP** — Full-featured SFTP file browser
- **Telnet** — Telnet protocol support
- **Serial Port** — Serial device communication
- **VNC** — Remote desktop via VNC protocol
- **Local Shell** — Local terminal (PowerShell, bash, etc.)
- **WebDAV** — Mount remote WebDAV storage as session source
- **Multi-mount** — Manage multiple storage backends (local, SFTP, WebDAV) with mount points
- **Tab Management** — Drag-and-drop tabs, split layouts (normal / row / column / grid)
- **Session Tree** — Hierarchical folder/session organization with drag-and-drop reordering
- **Theme System** — Light, Dark, and Pink themes
- **i18n** — Chinese / English language switching
- **Code Editor** — Built-in editor with syntax highlighting (CodeMirror 6)
- **Import / Export** — Session configuration import and export

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Core (Main Process) | Electron 43, TypeScript, Webpack |
| Shell (Renderer) | Vue 3, Element Plus, Pinia, Vue Router |
| Terminal | @xterm/xterm 6 (WebGL renderer) |
| Editor | CodeMirror 6 |
| Native Modules | node-pty, serialport |
| Build / Pack | electron-builder, Makefile |

## Prerequisites

- **Node.js** >= 20.0.0 (see `.nvmrc`)
- **npm** (comes with Node.js)

## Getting Started

### Install Dependencies

```bash
make install
```

This installs dependencies for `core/`, `shell/`, and the root project.

### Development

```bash
make dev
```

Starts the Electron app in development mode with hot reload.

### Build

```bash
make all        # Full build: core + shell + native + package
make dist       # Alias for `make all`
```

### Lint

```bash
make lint       # ESLint for shell/src
make lint-fix   # ESLint with --fix
```

### Clean

```bash
make clean         # Remove build outputs
make clean-all     # Remove build outputs + node_modules
```

## Project Structure

```
nxshell2/
├── core/               # Electron main process (TypeScript)
│   └── src/
│       ├── core/       # Core application logic (IPC, RPC, services)
│       └── index.ts    # Entry point
├── shell/              # Vue 3 renderer process
│   ├── src/
│   │   ├── layout/     # Layout components (navbar, toolbar, tabbar, menu)
│   │   ├── services/   # Session management, storage, event bus
│   │   ├── store/      # Pinia state management
│   │   ├── views/      # View components
│   │   └── components/ # Shared UI components
│   ├── ptservices/     # PTY and file system services
│   └── common/         # Shared modules (eventbus, types)
├── build/              # Build resources (icons, configs)
├── scripts/            # Dev/build helper scripts
├── Makefile            # Top-level build orchestration
└── electron-builder.yml
```

## Packaging Targets

| Command | Target |
|---------|--------|
| `make dist` | Default (zip) |
| `make dist_dmg` | macOS DMG |
| `make dist_mas` | Mac App Store |
| `make dist_mas_dev` | MAS development build |
| `make dist_cn` | `make dist` with China mirrors |
| `make dist_mas_cn` | `make dist_mas` with China mirrors |

Supported platforms: **Windows** (NSIS, APPX), **macOS** (DMG, MAS), **Linux** (AppImage, DEB).

## License

ISC

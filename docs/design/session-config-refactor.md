# NxShell 会话配置重构设计文档

## 1. 背景与痛点

当前配置体系把整棵会话树保存在一个 JSON 文件（`__PT_LOCAL_STORAGE__SESSIONS`）中，存在以下问题：

- 全局设置和会话配置混在一起，文件体积大、难维护
- 新增/修改一个会话要重写整个会话树文件，并发和版本控制不友好
- 用户无法直接在 Finder/文件管理器里查看、编辑单个会话
- `SessionConfig` 运行时对象与持久化对象耦合，`_id`、`mountId`、`subSessions` 等字段同时出现在运行时和持久化逻辑中

## 2. 设计目标

- **一个 folder 对应一个本地文件夹**：左侧树中的分组/文件夹就是文件系统里的一个目录
- **一个 session 对应一个文件**：每个会话独立保存为一个 JSON 文件
- **全局配置与会话配置分离**：`settings.json` 只放用户偏好，`sessions/` 只放会话
- **向下兼容**：首次启动自动迁移旧版单 JSON 配置
- **保持现有 UI/UX**：左侧树、右键菜单、拖拽排序等行为不变

## 3. 磁盘目录结构

```
<NxShell 数据目录>/
├── settings.json            # 全局偏好：主题、字体、语言、快捷键等
├── mounts.json              # 挂载点配置（本地 + 远程 WebDAV/SFTP/S3）
├── sessions/                # 本地会话根目录
│   ├── .root.json           # 根节点元数据（排序、挂载信息，可选）
│   ├── Development/         # folder = 目录
│   │   ├── .folder.json     # 文件夹元数据（id、图标、排序权重）
│   │   ├── LocalShell.json  # session = 文件
│   │   └── SSH-Prod.json
│   └── Personal/
│       └── SSH-Home.json
└── remote-sessions/         # 远程挂载的会话根目录（按 mountId 隔离）
    ├── <mountId-1>/         # 每个远程挂载一个子目录
    │   └── ...              # 目录结构与 sessions/ 一致
    └── <mountId-2>/
        └── ...
```

> 远程挂载的会话也可以直接存储在远程端（由 provider 的 `config.basePath` 决定根路径），
> 而不是本地缓存。具体策略见 4.4 节。

- 目录名即为 folder 显示名；`.folder.json` 保存 `id`、`icon`、`order` 等额外元数据
- 每个 session 是独立的 `.json` 文件，文件名使用 `name.json`；同目录下出现重名时，自动追加 `-<short-uuid>`
- 文件内容里的 `id`（uuid）才是唯一标识，文件名只用于展示
- `.root.json`（可选）：保存根级别的元数据，如全局排序权重、挂载点信息；无特殊需求时可省略
- 远程挂载（WebDAV/SFTP）的会话目录结构由各 provider 的 `config.basePath` 决定，与本地 `sessions/` 结构一致

## 4. 配置文件格式

### 4.1 Session 文件

采用第 9 节的推荐改造方案，按语义分层：

```json
{
  "version": 1,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "SSH-Prod",
  "type": "node",
  "protocol": "ssh",
  "description": "",
  "order": 1,
  "connection": {
    "host": "192.168.1.10",
    "port": 22,
    "proxy": {
      "type": "none",
      "host": "",
      "port": 1080
    }
  },
  "authentication": {
    "type": "password",
    "username": "root",
    "password": "",
    "cert": "",
    "passphrase": ""
  },
  "sshOptions": {
    "keepAliveInterval": 60,
    "keepAliveCountMax": 3,
    "readyTimeout": 20000,
    "forwardX11": false,
    "sftpDir": "/",
    "portForwards": []
  },
  "terminal": {
    "fontFamily": "...",
    "fontSize": 14,
    "xtermTheme": "Night_3024",
    "cursorBlink": false,
    "cursorStyle": "block"
  }
}
```

- `version`：用于未来 schema 迁移
- `id`：uuid，持久化主键，运行时保持不变
- `type`：`node` 或 `folder`
- `protocol`：`ssh` / `localshell` / `sftp` / `telnet` 等
- `order`：同目录下排序权重
- `connection`：连接信息（`host`、`port`、代理等）
- `authentication`：认证信息（用户名、密码、证书等）
- `sshOptions`：SSH 专有选项（保活、X11、端口转发、SFTP 目录等）
- `terminal`：终端主题和字体配置（**per-session 覆盖**，未设置时回退到 `settings.json` 中的全局终端配置）
- `system`：系统/图标类型（放在顶层，用于 UI 图标展示）
- 其他协议（telnet、ftp、serial、vnc）按同样模式放入 `connection` 和各自的专有分组

#### 其他协议示例

**Telnet**

```json
{
  "version": 1,
  "id": "uuid",
  "name": "Telnet-Router",
  "type": "node",
  "protocol": "telnet",
  "order": 1,
  "system": "telnet",
  "connection": {
    "host": "192.168.1.1",
    "port": 23
  },
  "terminal": {
    "fontSize": 14,
    "xtermTheme": "Night_3024"
  }
}
```

**Serial**

```json
{
  "version": 1,
  "id": "uuid",
  "name": "Serial-Console",
  "type": "node",
  "protocol": "serialport",
  "order": 1,
  "system": "serial",
  "serialOptions": {
    "baudRate": 115200,
    "dataBits": 8,
    "stopBits": 1,
    "parity": "none",
    "flowControl": "none",
    "port": "COM1"
  },
  "terminal": {
    "fontSize": 14,
    "xtermTheme": "Night_3024"
  }
}
```

**LocalShell**

```json
{
  "version": 1,
  "id": "uuid",
  "name": "Local-PowerShell",
  "type": "node",
  "protocol": "localshell",
  "order": 1,
  "system": "powershell",
  "terminal": {
    "fontSize": 14,
    "xtermTheme": "Night_3024"
  }
}
```

### 4.2 Folder 文件

```json
{
  "version": 1,
  "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "name": "Development",
  "icon": "folder",
  "order": 0
}
```

- `name` 与目录名保持一致；以目录名为准，发现不一致时自动修正
- `id` 用于运行时映射、拖拽移动和父目录排序

### 4.3 Mounts 文件

挂载点配置独立为 `mounts.json`，替代旧 `Storage.save("MOUNTS", data)` 的 key-value 存储：

```json
{
  "version": 1,
  "mounts": [
    {
      "id": "local",
      "name": "本地会话",
      "type": "local",
      "icon": "folder",
      "readonly": false,
      "order": 0
    },
    {
      "id": "a1b2c3d4",
      "name": "公司 WebDAV",
      "type": "webdav",
      "icon": "cloud",
      "readonly": false,
      "order": 1,
      "config": {
        "url": "https://dav.example.com/",
        "username": "user",
        "password": "",
        "basePath": "/nxshell-sessions"
      }
    },
    {
      "id": "e5f6g7h8",
      "name": "SFTP 服务器",
      "type": "sftp",
      "icon": "server",
      "readonly": false,
      "order": 2,
      "config": {
        "host": "sftp.example.com",
        "port": 22,
        "username": "user",
        "password": "",
        "basePath": "/home/user/nxshell-sessions"
      }
    }
  ]
}
```

- `id`：挂载点唯一标识，本地固定为 `local`，远程用 uuid
- `type`：`local` / `webdav` / `sftp` / `s3`
- `config.basePath`：远程会话目录的根路径，provider 在此路径下按 `sessions/` 同样的目录结构读写
- `config` 中的凭据字段（`password` 等）后续可接入安全存储（如 keychain），当前先明文
- `mounts.json` 由 `MountManager` 加载和保存，启动时读取，增删改时回写

### 4.4 远程挂载会话存储策略

远程挂载的会话有两种存储策略：

- **策略 A：远程存储（推荐）**——会话文件直接存在远程端 `config.basePath` 路径下，本地不缓存。优点是多设备共享，缺点是离线不可用。
- **策略 B：本地缓存**——会话文件存在本地 `remote-sessions/<mountId>/` 下，定期同步到远程。优点是离线可用，缺点是需要同步逻辑。

> 初期实现采用 **策略 A**，后续按需增加策略 B。

### 4.5 Settings 文件

全局终端配置，作为各 session `terminal` 字段的默认值（session 中的 `terminal` 字段优先级更高）：

```json
{
  "version": 1,
  "terminal": {
    "fontFamily": "...",
    "fontSize": 14,
    "fontWeight": "normal",
    "xtermTheme": "Night_3024",
    "cursorBlink": false,
    "cursorStyle": "block",
    "lineHeight": 1.0,
    "letterSpacing": 0,
    "charset": "utf-8"
  },
  "locale": "zh-CN",
  "keymap": { }
}
```

## 5. 架构改造

### 5.1 新增 `SessionConfigRepository`

替代 `SessionManager` 里直接调用 `Storage.save("SESSIONS", tree)` 的逻辑，职责包括：

- `load(rootPath)`：递归读取目录，构建 `SessionConfig` 树
- `save(sessionConfig)`：写单个 session 文件
- `move(node, targetFolder)`：移动文件/目录并更新父指针
- `delete(node)`：删除文件/目录
- `migrateFromLegacy(jsonTree)`：把旧 JSON 树写到新目录结构

### 5.2 `StorageProviderInterface` 扩展

现有 `save(name, object)` / `read(name)` 是 key-value 模型，不适应目录。建议增加：

```ts
interface StorageProviderInterface {
  // 兼容旧的 key-value 接口
  save(name: string, object: any): Promise<void>;
  read(name: string): Promise<any>;

  // 新增文件接口
  listDir(path: string): Promise<DirItem[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  createDir(path: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
}
```

- `LocalFileStorage` 基于 `powertools` 文件服务实现
- 远程挂载（WebDAV/SFTP/S3）由各自 provider 实现同样的目录/文件接口，统一按这套结构管理配置
- 不启用文件系统监听，配置的读取和写入全部由应用内部控制

### 5.3 `SessionConfig` 模型简化

```ts
class SessionConfig {
  id: string;                 // uuid
  name: string;
  type: "node" | "folder";
  protocol?: string;          // ssh / localshell / telnet / ...
  description?: string;
  order: number;
  system?: string;            // 图标/系统类型

  // 分层配置（推荐方案）
  connection?: ConnectionConfig;
  authentication?: AuthConfig;
  sshOptions?: SSHOptions;
  serialOptions?: SerialOptions;
  terminal?: TerminalConfig;

  // 运行时树结构
  parent?: SessionConfig;
  subSessions: SessionConfig[]; // folder 才有

  // runtime only，不持久化
  _id?: number;               // UI 用自增 id
  mountId?: string;           // 运行时由 repository 注入
}
```

持久化时只写入：
- session 文件：`id/name/type/protocol/order/system/description` + 各分层配置（`connection`/`authentication`/`sshOptions`/`serialOptions`/`terminal`）
- folder 文件：`id/name/icon/order`
- 不再持久化 `subSessions`、`parent`、`mountId`、`_id` 等运行时字段

### 5.4 `SessionManager` 职责调整

- 继续负责运行时 `sessionInstance` 的创建/销毁
- 配置加载/保存/CRUD 交给 `SessionConfigRepository`
- `SessionManager` 持有 `repository` 实例，通过事件订阅配置变更

## 6. 迁移策略

1. 启动时先尝试读取 `sessions/` 目录
2. 若目录不存在，再尝试读取旧 `__PT_LOCAL_STORAGE__SESSIONS`
3. 旧 JSON 存在且新目录不存在时，调用 `SessionConfigRepository.migrateFromLegacy`
4. 迁移成功后，旧文件重命名为 `__PT_LOCAL_STORAGE__SESSIONS.bak`，不回写旧格式
5. 后续所有保存操作只写新目录结构

## 7. 已确认决策

- **远程挂载**：WebDAV/SFTP/S3 等远程挂载统一采用这套目录/文件结构管理配置
- **外部监听**：不启用 chokidar 等文件系统监听，读写全部由应用内部控制
- **排序字段**：`order` 放在每个 session/folder 文件自身中，自包含，移动时无需修改父目录
- **文件命名**：session 文件使用 `name.json`；同目录下出现重名时，自动在文件名后追加 `-<short-uuid>`，文件内容里的 `id`（uuid）仍是唯一标识

## 8. 现有 Session 类型及 config 字段梳理

以下字段来自各会话表单 `defaultForm`，属于旧 schema。重构后按第 9 节推荐方案分层放入 session 文件的 `connection`/`authentication`/`sshOptions`/`serialOptions`/`terminal` 等分组中。

### 8.1 公共字段（所有类型通用）

- `sessType`：会话类型标识，如 `ssh`、`telnet`、`localshell`、`ftp`、`serialport`、`vnc`
- `protocal`：同 `sessType`（保留兼容）
- `hostName`：显示名称
- `system`：系统/图标类型
- `group`：所属分组名称
- 主题配置（来自 `initDefaultThemeOptions`）：
  - `fontFamily`
  - `xterm`
  - `fontSize`
  - `fontWeight`
  - `charset`
  - `lineHeight`
  - `letterSpacing`
  - `cursorBlink`
  - `cursorStyle`
  - `xtermTheme`

### 8.2 SSH

- `proxy`：`none` / `socksv5`
- `hostAddress`：主机地址
- `hostPort`：端口（默认 `22`）
- `authType`：`password` / `cert` / `keyboard-interactive`
- `username`：用户名
- `password`：密码
- `cert`：证书路径
- `passphrase`：证书口令
- `proxyHost`：Socks5 代理主机
- `proxyPort`：Socks5 代理端口（默认 `1080`）
- `forward`：X11 转发，`none` / `x11`
- `sftpDirt`：SFTP 默认目录（默认 `/`）
- `keepAliveInterval`：保活间隔（默认 `60`）
- `keepAliveCountMax`：保活最大次数（默认 `3`）
- `readyTimeout`：连接超时（默认 `20000`）
- `forwardIn`：端口转发列表

### 8.3 LocalShell

- `system`：shell 类型，如 `powershell`

### 8.4 Telnet

- `hostAddress`：主机地址
- `hostTelnetPort`：端口（默认 `23`）

### 8.5 FTP

- `secure`：`true` / `false`
- `hostAddress`：主机地址
- `hostFtpPort`：端口（默认 `21`）

### 8.6 Serial

- `baudRate`：波特率（默认 `115200`）
- `dataBits`：数据位（默认 `8`）
- `stopBits`：停止位（默认 `1`）
- `parity`：校验位，`none` / `even` / `mark` / `odd` / `space`
- `flowControl`：流控，`none` / `rtscts` / `xon/xoff`
- `port`：串口号（默认 `COM1`）

### 8.7 VNC

- `hostAddress`：主机地址
- `hostVncPort`：端口（默认 `5800`）

## 9. config 字段优化方案（已采用 9.3 推荐改造方案）

> 已确认：采用 **9.3 推荐改造方案** 作为最终 schema。

当前各会话表单的 `defaultForm` 字段比较扁平，命名和结构还有优化空间。

### 9.1 主要问题

- `sessType` 与 `protocal` 重复，且 `protocal` 是拼写错误
- `hostName` 实际是会话显示名称，和 `hostAddress`（主机地址）语义容易混淆
- `group` 在 folder = 目录的新结构下可由文件路径推导，不必冗余保存
- 各协议端口字段命名不统一：`hostPort`、`hostTelnetPort`、`hostFtpPort`、`hostVncPort`
- 终端主题配置（`fontSize`、`xtermTheme` 等）和连接配置混在一起
- `sftpDirt` 拼写错误，应为 `sftpDir` 或 `sftpDirectory`
- SSH 的认证信息、代理、保活、端口转发都平铺在根级，层次不清

### 9.2 最小改造方案（未采用）

仅做命名清理，保持扁平结构：

- 删除 `protocal`，只保留 `sessType`（或统一为 `protocol`）
- `hostName` -> `name`（显示名）
- `hostAddress` -> `host`
- 统一端口字段为 `port`
- `sftpDirt` -> `sftpDir`
- 删除 `group`
- 终端主题字段统一放到 `terminal` 子对象中

### 9.3 推荐改造方案（已采用）

按语义分层，将每个 session 的 `config` 分成稳定元数据和分组：

```json
{
  "version": 1,
  "id": "uuid",
  "name": "SSH-Prod",
  "type": "node",
  "protocol": "ssh",
  "description": "",
  "order": 1,
  "connection": {
    "host": "192.168.1.10",
    "port": 22,
    "proxy": {
      "type": "none",
      "host": "",
      "port": 1080
    }
  },
  "authentication": {
    "type": "password",
    "username": "root",
    "password": "",
    "cert": "",
    "passphrase": ""
  },
  "sshOptions": {
    "keepAliveInterval": 60,
    "keepAliveCountMax": 3,
    "readyTimeout": 20000,
    "forwardX11": false,
    "sftpDir": "/",
    "portForwards": []
  },
  "terminal": {
    "fontFamily": "...",
    "fontSize": 14,
    "xtermTheme": "Night_3024",
    "cursorBlink": false,
    "cursorStyle": "block"
  }
}
```

这样调整后：
- 公共元数据只保留 `id/name/type/protocol/description/order`
- 连接、认证、SSH 专有、终端配置各自分组
- 其他协议（telnet、ftp、serial、vnc）按同样模式放入 `connection` 和各自的专有分组

### 9.4 兼容性

重构初期可以保留旧字段读取，保存时按新 schema 写入；后续大版本再完全废弃旧字段。

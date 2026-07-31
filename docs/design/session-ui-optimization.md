# NxShell 会话配置 UI 优化设计文档

## 1. 概述

本文档针对现有会话配置表单 UI 的痛点提出优化方案，与 [session-config-refactor.md](./session-config-refactor.md) 配套使用。

## 2. 现有问题

### 2.1 大量重复代码

6 个会话表单组件（`ssh/index.vue`、`localShell/index.vue`、`ftp/index.vue`、`telnet/index.vue`、`serial/index.vue`、`vnc/index.vue`）结构几乎一致：

- 左侧：名称 + 系统图标 + 分组下拉
- 右侧：Tabs（通用 / 端口转发 / 主题 / 高级）
- 底部：取消 / 确定 / 保存并连接

但各自独立实现，样式代码（`.n-session-ssh-container`）完全复制，`saveOrUpdateSession` / `handleOk` / `handleSaveAndConnect` / `handlerClose` 逻辑重复。

### 2.2 Label 错误

`system` 字段的 label 误用了 `t('home.profile.base.host-name.title')`（即"主机名称"），应为"系统/图标"。所有组件均有此问题。

### 2.3 `group` 字段已无意义

folder = 目录后，分组由文件路径决定。左侧的 group 下拉框应移除。

### 2.4 硬编码标题

- `localShell/index.vue`：`title="LocalShell 会话"` 未走 i18n
- `ftp/index.vue`：`title="FTP 会话"` 未走 i18n

### 2.5 描述错误

`localShell/index.vue` 创建 session 时 description 写的是 `'telnet session'`（复制粘贴遗留）。`ftp/index.vue` 同样写的是 `'telnet session'`。

### 2.6 终端配置 Tab 不统一

只有 SSH 和 LocalShell 有主题配置 Tab，FTP / Telnet / VNC / Serial 无法 per-session 调整终端。

### 2.7 async 缺失

`ftp/index.vue`、`telnet/index.vue`、`vnc/index.vue`、`serial/index.vue` 的 `saveOrUpdateSession` 和 `createSessionInstance` 调用未 `await`，可能导致保存未完成就创建实例。

### 2.8 弹窗宽度

SSH 弹窗 `width="80%"`，在小屏幕下表单元素间距过大。其他协议 `width="70%"` 也不够紧凑。

### 2.9 Tab 显示不明确

端口转发 Tab 只在 SSH 中存在，但 Tab 的显示/隐藏靠组件差异隐式控制，不够声明式。

### 2.10 主题配置与全局配置重复

每个 session 都展示完整的主题配置项（字体、字号、行高、间距、光标样式等），大多数用户不会 per-session 调整，视觉噪音大。

## 3. 优化方案

### 3.1 抽取通用 `SessionFormLayout` 组件

将公共布局抽取为可复用组件：

```vue
<SessionFormLayout
  :title="title"
  :protocol="protocol"
  :show-terminal-tab="true"
  :show-advanced-tab="protocol === 'ssh'"
  :show-port-forward-tab="protocol === 'ssh'"
  @save="handleSave"
  @save-and-connect="handleSaveAndConnect"
  @cancel="handleCancel"
>
  <template #base>
    <!-- 协议特定的连接/认证字段 -->
  </template>
  <template #advanced>
    <!-- 协议特定的高级选项 -->
  </template>
</SessionFormLayout>
```

**好处**：
- 消除 6 个组件间的重复代码（布局、样式、按钮组、i18n 标题）
- Tab 的显示/隐藏通过 props 声明式控制
- 统一弹窗宽度、按钮行为、async 处理

### 3.2 左侧基础信息精简

移除 `group` 下拉框，保留：

- **名称**（`name`）——必填
- **图标/系统**（`system`）——修正 label 为"系统/图标"

### 3.3 终端配置 Tab 优化

改为"终端覆盖"语义：

- 默认显示"使用全局配置"开关
- 开启后展开 per-session 覆盖字段
- 只展示与全局配置不同的字段，减少视觉噪音
- **所有协议统一支持**终端配置 Tab

```
┌─────────────────────────────────┐
│  ☐ 使用自定义终端配置            │
│  ┌───────────────────────────┐  │
│  │ 字体:    [默认           ] │  │
│  │ 字号:    [14            ]  │  │
│  │ 主题:    [Night_3024  ▼  ]  │  │
│  │ 光标:    [block        ▼  ]  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 3.4 统一弹窗宽度

建议统一为 `600px` 或 `650px`，固定宽度避免响应式百分比在不同屏幕下表现不一。

### 3.5 修复 i18n 和描述问题

- 所有弹窗标题走 i18n：`t('components.session.modal-title-add', { protocol })` / `t('components.session.modal-title-edit', { protocol })`
- 修复 `localShell` 和 `ftp` 的 description 错误

### 3.6 统一 async 处理

在 `SessionFormLayout` 中统一处理 `save` 和 `save-and-connect` 事件的 async 逻辑，避免各组件遗漏 `await`。

### 3.7 右键菜单统一

当前 `folder` 和 `empty` 的右键菜单中"新建会话"子菜单列表不一致：

- `folder` 菜单缺少 `localShell` 选项
- `mount` 菜单也缺少 `localShell`

应统一为完整的协议列表，从配置中动态生成。

## 4. 重构后组件结构

```
src/views/components/session/
├── SessionFormLayout.vue       # 通用布局组件
├── BaseInfoPanel.vue           # 左侧基础信息面板
├── TerminalConfigTab.vue       # 终端配置 Tab（覆盖语义）
├── ssh/
│   └── index.vue               # SSH 专有字段（连接、认证、端口转发、高级）
├── localShell/
│   └── index.vue               # LocalShell 专有字段（仅 shell 类型）
├── telnet/
│   └── index.vue               # Telnet 专有字段（连接）
├── ftp/
│   └── index.vue               # FTP 专有字段（连接、认证）
├── serial/
│   └── index.vue               # Serial 专有字段（串口参数）
└── vnc/
    └── index.vue               # VNC 专有字段（连接）
```

各协议组件只负责定义自己的表单字段和验证规则，布局、Tab、按钮、保存逻辑由 `SessionFormLayout` 统一处理。

## 5. 与配置重构的关系

- UI 优化与 [session-config-refactor.md](./session-config-refactor.md) 的 config 字段分层方案对齐
- 表单字段按 `connection` / `authentication` / `sshOptions` / `serialOptions` / `terminal` 分组，与 session 文件 schema 一致
- `group` 字段移除后，目录结构即分组，无需 UI 选择
- 终端配置 Tab 的"覆盖"语义对应 `terminal` 字段可选、回退到 `settings.json` 的设计

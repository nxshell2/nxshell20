/**
 * 会话连接配置
 * 所有协议（SSH/SFTP/Telnet/VNC/FTP/WebDAV 等）都基于这个类型，
 * 用可选字段表达各协议差异，额外字段通过 index signature 保留。
 */
export interface ShellConfig {
  /** 会话类型标识，如 "ssh" / "sftp" / "telnet" */
  sessType?: string
  /** 旧版协议字段别名 */
  protocal?: string
  protocol?: string
  /** 操作系统/系统类型 */
  system?: string

  /** 主机地址 */
  host?: string
  /** 主机地址（别名） */
  hostAddress?: string
  /** 端口 */
  port?: number
  /** SSH 端口（别名） */
  hostPort?: number
  /** Telnet 端口 */
  hostTelnetPort?: number
  /** 用户名 */
  username?: string
  /** 密码 */
  password?: string
  /** 私钥/证书路径 */
  privateKey?: string
  cert?: string
  /** 私钥/证书密码 */
  passphrase?: string
  /** 认证类型：password | publickey */
  authType?: string

  /** 代理类型 */
  proxy?: string
  /** 代理主机 */
  proxyHost?: string
  /** 代理端口 */
  proxyPort?: number

  /** WebDAV 等 URL */
  url?: string
  /** SFTP/WebDAV 存储基础路径 */
  basePath?: string

  /** SSH 保活间隔 */
  keepAliveInterval?: number
  /** SSH 保活重试次数 */
  keepAliveCountMax?: number
  /** SSH 连接超时 */
  readyTimeout?: number
  /** 端口转发类型，如 "x11" */
  forward?: string
  /** SFTP 目录 */
  sftpDir?: string
  sftpDirt?: string
  /** 远程端口转发 */
  forwardIn?: unknown[]

  /** 终端字符集 */
  charset?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: string
  lineHeight?: number
  letterSpacing?: number
  cursorBlink?: boolean
  cursorStyle?: string
  xtermTheme?: string
  xterm?: Record<string, unknown>

  /** 命令/路径等扩展字段 */
  [key: string]: unknown
}

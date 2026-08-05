<script>
import { Refresh } from '@element-plus/icons-vue'
import { markRaw } from 'vue'
import {
  formatBytes,
  parseCpuInfo,
  parseDf,
  parseIpAddr,
  parseMemInfo,
  parseNetDev,
  parseOsRelease,
  parseProcesses,
  parseServices,
  parseUname,
  parseUptime
} from '../utils/sysParser'

export default {
  name: 'SysMonitor',
  props: {
    sessionInstance: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      visible: false,
      loading: false,
      activeTab: 'system',
      lastRefreshTime: '',
      error: '',
      sysInfo: null,
      diskInfo: [],
      netInfo: [],
      processInfo: [],
      processKeyword: '',
      serviceInfo: [],
      serviceFilter: 'all',
      Refresh: markRaw(Refresh)
    }
  },
  computed: {
    filteredProcesses() {
      const keyword = this.processKeyword.trim().toLowerCase()
      if (!keyword) {
        return this.processInfo
      }
      return this.processInfo.filter(p =>
        p.comm.toLowerCase().includes(keyword)
        || p.args.toLowerCase().includes(keyword)
        || p.user.toLowerCase().includes(keyword)
        || p.pid.toString().includes(keyword)
      )
    },
    filteredServices() {
      if (this.serviceFilter === 'all') {
        return this.serviceInfo
      }
      return this.serviceInfo.filter(s =>
        s.state.toLowerCase() === this.serviceFilter
      )
    }
  },
  methods: {
    show() {
      this.visible = true
      this.refresh()
    },
    async execCmd(cmd) {
      try {
        const result = await this.sessionInstance.exec(cmd)
        return result?.stdout || ''
      } catch(e) {
        console.warn('exec failed:', cmd, e)
        return ''
      }
    },
    async refresh() {
      if (!this.sessionInstance) {
        this.error = 'No session'
        return
      }
      this.loading = true
      this.error = ''
      try {
        const osRelease = await this.execCmd('cat /etc/os-release 2>/dev/null')
        const uname = await this.execCmd('uname -a 2>/dev/null')
        const uptime = await this.execCmd('uptime 2>/dev/null')
        const cpuinfo = await this.execCmd('cat /proc/cpuinfo 2>/dev/null')
        const meminfo = await this.execCmd('cat /proc/meminfo 2>/dev/null')
        const dfOutput = await this.execCmd('df -hT 2>/dev/null || df -h 2>/dev/null')
        const ipAddr = await this.execCmd('ip -o link show 2>/dev/null; ip -o addr show 2>/dev/null || ifconfig -a 2>/dev/null')
        const netDev = await this.execCmd('cat /proc/net/dev 2>/dev/null')
        const processes = await this.execCmd('ps -eo pid,ppid,user,pcpu,pmem,etime,comm,args --sort=-pcpu 2>/dev/null | head -51')
        const services = await this.execCmd('systemctl list-units --type=service --no-pager --no-legend 2>/dev/null | head -51 || service --status-all 2>/dev/null | head -51')

        const os = parseOsRelease(osRelease)
        const un = parseUname(uname)
        const up = parseUptime(uptime)
        const cpu = parseCpuInfo(cpuinfo)
        const mem = parseMemInfo(meminfo)

        this.sysInfo = {
          os: os.os,
          version: os.version,
          kernel: un.kernel,
          kernelRelease: un.kernelRelease,
          arch: un.arch,
          hostname: un.hostname,
          uptime: up.uptime,
          cpuModel: cpu.modelName,
          cpuCores: cpu.cores,
          cpuSockets: cpu.sockets,
          cpuMhz: cpu.mhz,
          loadAvg1: up.loadAvg1,
          loadAvg5: up.loadAvg5,
          loadAvg15: up.loadAvg15,
          memTotal: mem.total,
          memUsed: mem.used,
          memAvailable: mem.available,
          memUsagePercent: mem.usagePercent,
          swapTotal: mem.swapTotal,
          swapFree: mem.swapFree
        }

        this.diskInfo = parseDf(dfOutput)

        const ipInterfaces = parseIpAddr(ipAddr)
        const devInterfaces = parseNetDev(netDev)
        this.netInfo = ipInterfaces.map((iface) => {
          const dev = devInterfaces.find(d => d.name === iface.name)
          return { ...iface, ...dev }
        })

        this.processInfo = parseProcesses(processes)
        this.serviceInfo = parseServices(services)

        this.lastRefreshTime = new Date().toLocaleTimeString()
      } catch(e) {
        this.error = e.message || String(e)
      } finally {
        this.loading = false
      }
    },
    formatBytes,
    progressColor(percent) {
      if (percent >= 90) {
        return '#f56c6c'
      }
      if (percent >= 70) {
        return '#e6a23c'
      }
      return '#67c23a'
    }
  }
}
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="$t('home.session-instance.sys-monitor.title')"
    direction="rtl"
    size="420px"
    :append-to-body="true"
  >
    <div class="sys-monitor">
      <div class="sys-monitor__header">
        <el-button size="small" :icon="Refresh" :loading="loading" @click="refresh">
          {{ $t('home.session-instance.sys-monitor.refresh') }}
        </el-button>
        <span v-if="lastRefreshTime" class="sys-monitor__time">
          {{ lastRefreshTime }}
        </span>
      </div>

      <el-tabs v-model="activeTab" class="sys-monitor__tabs">
        <el-tab-pane
          :label="$t('home.session-instance.sys-monitor.system')"
          name="system"
        >
          <div v-loading="loading" class="sys-monitor__content">
            <template v-if="sysInfo">
              <div class="info-row">
                <span class="info-label">OS</span>
                <span class="info-value">{{ sysInfo.os || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Version</span>
                <span class="info-value">{{ sysInfo.version || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Kernel</span>
                <span class="info-value">{{ sysInfo.kernelRelease || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Arch</span>
                <span class="info-value">{{ sysInfo.arch || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Hostname</span>
                <span class="info-value">{{ sysInfo.hostname || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Uptime</span>
                <span class="info-value">{{ sysInfo.uptime || '-' }}</span>
              </div>

              <div class="info-section">
                CPU
              </div>
              <div class="info-row">
                <span class="info-label">Model</span>
                <span class="info-value">{{ sysInfo.cpuModel || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Cores</span>
                <span class="info-value">{{ sysInfo.cpuCores || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Sockets</span>
                <span class="info-value">{{ sysInfo.cpuSockets || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Frequency</span>
                <span class="info-value">{{ sysInfo.cpuMhz ? `${sysInfo.cpuMhz} MHz` : '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Load Avg</span>
                <span class="info-value">
                  {{ sysInfo.loadAvg1 || 0 }} / {{ sysInfo.loadAvg5 || 0 }} / {{ sysInfo.loadAvg15 || 0 }}
                </span>
              </div>

              <div class="info-section">
                Memory
              </div>
              <div class="info-row">
                <span class="info-label">Total</span>
                <span class="info-value">{{ formatBytes(sysInfo.memTotal) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Used</span>
                <span class="info-value">
                  {{ formatBytes(sysInfo.memUsed) }}
                  ({{ sysInfo.memUsagePercent || 0 }}%)
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">Available</span>
                <span class="info-value">{{ formatBytes(sysInfo.memAvailable) }}</span>
              </div>
              <el-progress
                :percentage="sysInfo.memUsagePercent || 0"
                :color="progressColor(sysInfo.memUsagePercent)"
                :show-text="false"
                :stroke-width="6"
                style="margin-top: 4px"
              />
              <div v-if="sysInfo.swapTotal > 0" class="info-row" style="margin-top: 8px">
                <span class="info-label">Swap</span>
                <span class="info-value">
                  {{ formatBytes(sysInfo.swapTotal - sysInfo.swapFree) }} /
                  {{ formatBytes(sysInfo.swapTotal) }}
                </span>
              </div>
            </template>
            <el-empty v-else-if="!loading" :description="error || $t('home.session-instance.sys-monitor.no-data')" />
          </div>
        </el-tab-pane>

        <el-tab-pane
          :label="$t('home.session-instance.sys-monitor.disk')"
          name="disk"
        >
          <div v-loading="loading" class="sys-monitor__content">
            <template v-if="diskInfo.length">
              <div v-for="(disk, idx) in diskInfo" :key="idx" class="disk-item">
                <div class="disk-item__header">
                  <span class="disk-item__mount">{{ disk.mountedOn }}</span>
                  <span class="disk-item__type">{{ disk.type }}</span>
                </div>
                <div class="disk-item__detail">
                  {{ disk.used }} / {{ disk.total }} ({{ disk.usagePercent }})
                </div>
                <el-progress
                  :percentage="parseInt(disk.usagePercent) || 0"
                  :color="progressColor(parseInt(disk.usagePercent))"
                  :show-text="false"
                  :stroke-width="6"
                />
                <div class="disk-item__fs">
                  {{ disk.filesystem }}
                </div>
              </div>
            </template>
            <el-empty v-else-if="!loading" :description="error || $t('home.session-instance.sys-monitor.no-data')" />
          </div>
        </el-tab-pane>

        <el-tab-pane
          :label="$t('home.session-instance.sys-monitor.network')"
          name="network"
        >
          <div v-loading="loading" class="sys-monitor__content">
            <template v-if="netInfo.length">
              <div v-for="(iface, idx) in netInfo" :key="idx" class="net-item">
                <div class="net-item__header">
                  <span class="net-item__name">{{ iface.name }}</span>
                  <el-tag
                    size="small"
                    :type="iface.state === 'UP' ? 'success' : 'info'"
                  >
                    {{ iface.state || 'UNKNOWN' }}
                  </el-tag>
                </div>
                <div v-if="iface.ipv4.length" class="net-item__addr">
                  <span class="net-item__label">IPv4:</span>
                  <span v-for="ip in iface.ipv4" :key="ip" class="net-item__ip">{{ ip }}</span>
                </div>
                <div v-if="iface.ipv6.length" class="net-item__addr">
                  <span class="net-item__label">IPv6:</span>
                  <span v-for="ip in iface.ipv6" :key="ip" class="net-item__ip">{{ ip }}</span>
                </div>
                <div v-if="iface.rxBytes !== undefined" class="net-item__traffic">
                  <span>RX: {{ formatBytes(iface.rxBytes) }}</span>
                  <span>TX: {{ formatBytes(iface.txBytes) }}</span>
                </div>
              </div>
            </template>
            <el-empty v-else-if="!loading" :description="error || $t('home.session-instance.sys-monitor.no-data')" />
          </div>
        </el-tab-pane>

        <el-tab-pane
          :label="$t('home.session-instance.sys-monitor.process')"
          name="process"
        >
          <div v-loading="loading" class="sys-monitor__content">
            <el-input
              v-model="processKeyword"
              size="small"
              :placeholder="$t('home.session-instance.sys-monitor.search-process')"
              clearable
              style="margin-bottom: 8px"
            />
            <el-table
              v-if="filteredProcesses.length"
              :data="filteredProcesses"
              size="small"
              height="calc(100vh - 260px)"
              :header-cell-style="{ background: 'var(--n-tabs-bg-color, #f5f5f5)' }"
            >
              <el-table-column prop="pid" label="PID" width="70" sortable />
              <el-table-column prop="user" label="User" width="80" show-overflow-tooltip />
              <el-table-column prop="cpu" label="CPU%" width="80" sortable />
              <el-table-column prop="mem" label="Mem%" width="80" sortable />
              <el-table-column prop="comm" label="Command" show-overflow-tooltip />
            </el-table>
            <el-empty v-else-if="!loading" :description="error || $t('home.session-instance.sys-monitor.no-data')" />
          </div>
        </el-tab-pane>

        <el-tab-pane
          :label="$t('home.session-instance.sys-monitor.service')"
          name="service"
        >
          <div v-loading="loading" class="sys-monitor__content">
            <el-radio-group v-model="serviceFilter" size="small" style="margin-bottom: 8px">
              <el-radio-button value="all">
                {{ $t('home.session-instance.sys-monitor.all') }}
              </el-radio-button>
              <el-radio-button value="running">
                {{ $t('home.session-instance.sys-monitor.running') }}
              </el-radio-button>
              <el-radio-button value="failed">
                {{ $t('home.session-instance.sys-monitor.failed') }}
              </el-radio-button>
            </el-radio-group>
            <el-table
              v-if="filteredServices.length"
              :data="filteredServices"
              size="small"
              height="calc(100vh - 260px)"
              :header-cell-style="{ background: 'var(--n-tabs-bg-color, #f5f5f5)' }"
            >
              <el-table-column prop="name" label="Service" show-overflow-tooltip />
              <el-table-column prop="state" label="State" width="90" />
              <el-table-column prop="description" label="Description" show-overflow-tooltip />
            </el-table>
            <el-empty v-else-if="!loading" :description="error || $t('home.session-instance.sys-monitor.no-data')" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>

<style lang="scss" scoped>
.sys-monitor {
  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__time {
    font-size: 12px;
    color: var(--n-text-color-light, #999);
  }

  &__content {
    min-height: 200px;
  }

  &__tabs {
    :deep(.el-tabs__content) {
      overflow-y: auto;
      max-height: calc(100vh - 200px);
    }
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 4px 0;
  font-size: 13px;
}

.info-label {
  color: var(--n-text-color-light, #999);
  flex-shrink: 0;
  width: 90px;
}

.info-value {
  color: var(--n-text-color-base, #333);
  text-align: right;
  word-break: break-all;
}

.info-section {
  margin-top: 16px;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--n-text-color-base, #333);
  border-bottom: 1px solid var(--n-border-color, #eee);
  padding-bottom: 4px;
}

.disk-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--n-border-color, #eee);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  &__mount {
    font-weight: 600;
    font-size: 13px;
  }

  &__type {
    font-size: 11px;
    color: var(--n-text-color-light, #999);
  }

  &__detail {
    font-size: 12px;
    color: var(--n-text-color-base, #333);
    margin-bottom: 4px;
  }

  &__fs {
    font-size: 11px;
    color: var(--n-text-color-light, #999);
    margin-top: 2px;
  }
}

.net-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--n-border-color, #eee);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  &__name {
    font-weight: 600;
    font-size: 13px;
  }

  &__addr {
    font-size: 12px;
    margin: 2px 0;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__label {
    color: var(--n-text-color-light, #999);
    flex-shrink: 0;
  }

  &__ip {
    color: var(--n-text-color-base, #333);
  }

  &__traffic {
    display: flex;
    gap: 16px;
    font-size: 11px;
    color: var(--n-text-color-light, #999);
    margin-top: 4px;
  }
}
</style>

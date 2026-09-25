<template>
    <el-drawer
        v-model="visible"
        :title="$t('home.session-instance.sys-monitor.title')"
        direction="rtl"
        size="440px"
        :append-to-body="true"
        class="sys-monitor-drawer"
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
                <!-- System Tab -->
                <el-tab-pane
                    :label="$t('home.session-instance.sys-monitor.system')"
                    name="system"
                >
                    <div v-loading="loading" class="sys-monitor__content">
                        <template v-if="sysInfo">
                            <!-- System Info Cards -->
                            <div class="info-cards">
                                <div class="info-card">
                                    <div class="info-card__icon">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="4" width="18" height="12" rx="2"/>
                                            <line x1="3" y1="20" x2="21" y2="20"/>
                                        </svg>
                                    </div>
                                    <div class="info-card__body">
                                        <div class="info-card__title">{{ sysInfo.os || '-' }}</div>
                                        <div class="info-card__sub">{{ sysInfo.version || '-' }}</div>
                                        <div class="info-card__sub">{{ sysInfo.hostname || '-' }}</div>
                                    </div>
                                </div>
                                <div class="info-card">
                                    <div class="info-card__icon">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="4" y="4" width="16" height="16" rx="2"/>
                                            <rect x="9" y="9" width="6" height="6"/>
                                            <line x1="9" y1="1" x2="9" y2="4"/>
                                            <line x1="15" y1="1" x2="15" y2="4"/>
                                            <line x1="9" y1="20" x2="9" y2="23"/>
                                            <line x1="15" y1="20" x2="15" y2="23"/>
                                            <line x1="20" y1="9" x2="23" y2="9"/>
                                            <line x1="20" y1="14" x2="23" y2="14"/>
                                            <line x1="1" y1="9" x2="4" y2="9"/>
                                            <line x1="1" y1="14" x2="4" y2="14"/>
                                        </svg>
                                    </div>
                                    <div class="info-card__body">
                                        <div class="info-card__title">{{ sysInfo.cpuModel || '-' }}</div>
                                        <div class="info-card__sub">{{ sysInfo.cpuCores || '-' }} cores · {{ sysInfo.cpuMhz ? sysInfo.cpuMhz + ' MHz' : '-' }}</div>
                                        <div class="info-card__sub">{{ sysInfo.arch || '-' }} · {{ sysInfo.kernelRelease || '-' }}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- CPU Load Gauge -->
                            <div class="gauge-section">
                                <div class="gauge-section__title">{{ $t('home.session-instance.sys-monitor.cpu-usage') }}</div>
                                <div class="gauge-row">
                                    <el-progress
                                        type="circle"
                                        :percentage="cpuLoadPercent"
                                        :color="progressColor(cpuLoadPercent)"
                                        :width="80"
                                        :stroke-width="6"
                                    >
                                        <template #default>
                                            <div class="gauge-center">
                                                <div class="gauge-center__value">{{ sysInfo.loadAvg1 || 0 }}</div>
                                                <div class="gauge-center__label">{{ $t('home.session-instance.sys-monitor.load-avg') }}</div>
                                            </div>
                                        </template>
                                    </el-progress>
                                    <div class="gauge-stats">
                                        <div class="gauge-stat">
                                            <span class="gauge-stat__label">1 min</span>
                                            <span class="gauge-stat__value">{{ sysInfo.loadAvg1 || 0 }}</span>
                                        </div>
                                        <div class="gauge-stat">
                                            <span class="gauge-stat__label">5 min</span>
                                            <span class="gauge-stat__value">{{ sysInfo.loadAvg5 || 0 }}</span>
                                        </div>
                                        <div class="gauge-stat">
                                            <span class="gauge-stat__label">15 min</span>
                                            <span class="gauge-stat__value">{{ sysInfo.loadAvg15 || 0 }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Memory Gauge -->
                            <div class="gauge-section">
                                <div class="gauge-section__title">{{ $t('home.session-instance.sys-monitor.memory-usage') }}</div>
                                <div class="gauge-row">
                                    <el-progress
                                        type="circle"
                                        :percentage="sysInfo.memUsagePercent || 0"
                                        :color="progressColor(sysInfo.memUsagePercent)"
                                        :width="80"
                                        :stroke-width="6"
                                    >
                                        <template #default>
                                            <div class="gauge-center">
                                                <div class="gauge-center__value">{{ sysInfo.memUsagePercent || 0 }}%</div>
                                                <div class="gauge-center__label">{{ $t('home.session-instance.sys-monitor.used') }}</div>
                                            </div>
                                        </template>
                                    </el-progress>
                                    <div class="gauge-stats">
                                        <div class="gauge-stat">
                                            <span class="gauge-stat__label">{{ $t('home.session-instance.sys-monitor.total') }}</span>
                                            <span class="gauge-stat__value">{{ formatBytes(sysInfo.memTotal) }}</span>
                                        </div>
                                        <div class="gauge-stat">
                                            <span class="gauge-stat__label">{{ $t('home.session-instance.sys-monitor.used') }}</span>
                                            <span class="gauge-stat__value">{{ formatBytes(sysInfo.memUsed) }}</span>
                                        </div>
                                        <div class="gauge-stat">
                                            <span class="gauge-stat__label">{{ $t('home.session-instance.sys-monitor.available') }}</span>
                                            <span class="gauge-stat__value">{{ formatBytes(sysInfo.memAvailable) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Swap -->
                            <div v-if="sysInfo.swapTotal > 0" class="gauge-section">
                                <div class="gauge-section__title">{{ $t('home.session-instance.sys-monitor.swap-usage') }}</div>
                                <div class="gauge-row">
                                    <el-progress
                                        type="circle"
                                        :percentage="swapPercent"
                                        :color="progressColor(swapPercent)"
                                        :width="80"
                                        :stroke-width="6"
                                    >
                                        <template #default>
                                            <div class="gauge-center">
                                                <div class="gauge-center__value">{{ swapPercent }}%</div>
                                                <div class="gauge-center__label">{{ $t('home.session-instance.sys-monitor.used') }}</div>
                                            </div>
                                        </template>
                                    </el-progress>
                                    <div class="gauge-stats">
                                        <div class="gauge-stat">
                                            <span class="gauge-stat__label">{{ $t('home.session-instance.sys-monitor.total') }}</span>
                                            <span class="gauge-stat__value">{{ formatBytes(sysInfo.swapTotal) }}</span>
                                        </div>
                                        <div class="gauge-stat">
                                            <span class="gauge-stat__label">{{ $t('home.session-instance.sys-monitor.used') }}</span>
                                            <span class="gauge-stat__value">{{ formatBytes(sysInfo.swapTotal - sysInfo.swapFree) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Uptime -->
                            <div class="uptime-bar">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                <span>{{ $t('home.session-instance.sys-monitor.uptime') }}: {{ sysInfo.uptime || '-' }}</span>
                            </div>
                        </template>
                        <el-empty v-else-if="!loading" :description="error || $t('home.session-instance.sys-monitor.no-data')" />
                    </div>
                </el-tab-pane>

                <!-- Disk Tab -->
                <el-tab-pane
                    :label="$t('home.session-instance.sys-monitor.disk')"
                    name="disk"
                >
                    <div v-loading="loading" class="sys-monitor__content">
                        <template v-if="diskInfo.length">
                            <div v-for="(disk, idx) in diskInfo" :key="idx" class="disk-card">
                                <div class="disk-card__header">
                                    <div class="disk-card__mount">
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                            <ellipse cx="12" cy="5" rx="9" ry="3"/>
                                            <path d="M3 5v14a9 3 0 0 0 18 0V5"/>
                                            <path d="M3 12a9 3 0 0 0 18 0"/>
                                        </svg>
                                        {{ disk.mountedOn }}
                                    </div>
                                    <el-tag size="small" :type="diskTagType(disk.usagePercent)">{{ disk.usagePercent }}</el-tag>
                                </div>
                                <el-progress
                                    :percentage="parseInt(disk.usagePercent) || 0"
                                    :color="progressColor(parseInt(disk.usagePercent))"
                                    :show-text="false"
                                    :stroke-width="8"
                                />
                                <div class="disk-card__detail">
                                    <span>{{ disk.used }} / {{ disk.total }}</span>
                                    <span class="disk-card__fs">{{ disk.filesystem }} · {{ disk.type }}</span>
                                </div>
                            </div>
                        </template>
                        <el-empty v-else-if="!loading" :description="error || $t('home.session-instance.sys-monitor.no-data')" />
                    </div>
                </el-tab-pane>

                <!-- Network Tab -->
                <el-tab-pane
                    :label="$t('home.session-instance.sys-monitor.network')"
                    name="network"
                >
                    <div v-loading="loading" class="sys-monitor__content">
                        <template v-if="netInfo.length">
                            <div v-for="(iface, idx) in netInfo" :key="idx" class="net-card">
                                <div class="net-card__header">
                                    <div class="net-card__name">
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="2" y="14" width="20" height="6" rx="1"/>
                                            <line x1="6" y1="18" x2="6.01" y2="18"/>
                                            <line x1="10" y1="18" x2="10.01" y2="18"/>
                                            <path d="M12 14v-4M8 10h8"/>
                                        </svg>
                                        {{ iface.name }}
                                    </div>
                                    <el-tag size="small" :type="iface.state === 'UP' ? 'success' : 'info'">
                                        {{ iface.state || 'UNKNOWN' }}
                                    </el-tag>
                                </div>
                                <div v-if="iface.ipv4.length" class="net-card__addr-row">
                                    <span class="net-card__addr-label">IPv4</span>
                                    <span v-for="ip in iface.ipv4" :key="ip" class="net-card__ip">{{ ip }}</span>
                                </div>
                                <div v-if="iface.ipv6.length" class="net-card__addr-row">
                                    <span class="net-card__addr-label">IPv6</span>
                                    <span v-for="ip in iface.ipv6" :key="ip" class="net-card__ip">{{ ip }}</span>
                                </div>
                                <div v-if="iface.rxBytes !== undefined" class="net-card__traffic">
                                    <div class="net-card__traffic-item">
                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="7 17 17 7"/><polyline points="7 7 17 7 17 17"/>
                                        </svg>
                                        <span>{{ $t('home.session-instance.sys-monitor.rx') }}: {{ formatBytes(iface.rxBytes) }}</span>
                                    </div>
                                    <div class="net-card__traffic-item">
                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="17 7 7 17"/><polyline points="17 17 7 17 7 7"/>
                                        </svg>
                                        <span>{{ $t('home.session-instance.sys-monitor.tx') }}: {{ formatBytes(iface.txBytes) }}</span>
                                    </div>
                                </div>
                            </div>
                        </template>
                        <el-empty v-else-if="!loading" :description="error || $t('home.session-instance.sys-monitor.no-data')" />
                    </div>
                </el-tab-pane>

                <!-- Process Tab -->
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
                        >
                            <el-table-column prop="pid" :label="$t('home.session-instance.sys-monitor.pid')" width="70" sortable />
                            <el-table-column prop="user" :label="$t('home.session-instance.sys-monitor.user')" width="80" show-overflow-tooltip />
                            <el-table-column prop="cpu" label="CPU%" width="80" sortable />
                            <el-table-column prop="mem" label="Mem%" width="80" sortable />
                            <el-table-column prop="comm" :label="$t('home.session-instance.sys-monitor.command')" show-overflow-tooltip />
                        </el-table>
                        <el-empty v-else-if="!loading" :description="error || $t('home.session-instance.sys-monitor.no-data')" />
                    </div>
                </el-tab-pane>

                <!-- Service Tab -->
                <el-tab-pane
                    :label="$t('home.session-instance.sys-monitor.service')"
                    name="service"
                >
                    <div v-loading="loading" class="sys-monitor__content">
                        <el-radio-group v-model="serviceFilter" size="small" style="margin-bottom: 8px">
                            <el-radio-button label="all">{{ $t('home.session-instance.sys-monitor.all') }}</el-radio-button>
                            <el-radio-button label="running">{{ $t('home.session-instance.sys-monitor.running') }}</el-radio-button>
                            <el-radio-button label="failed">{{ $t('home.session-instance.sys-monitor.failed') }}</el-radio-button>
                        </el-radio-group>
                        <el-table
                            v-if="filteredServices.length"
                            :data="filteredServices"
                            size="small"
                            height="calc(100vh - 260px)"
                        >
                            <el-table-column prop="name" label="Service" show-overflow-tooltip />
                            <el-table-column prop="state" label="State" width="90">
                                <template #default="{ row }">
                                    <el-tag size="small" :type="serviceTagType(row.state)">{{ row.state }}</el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column prop="description" label="Description" show-overflow-tooltip />
                        </el-table>
                        <el-empty v-else-if="!loading" :description="error || $t('home.session-instance.sys-monitor.no-data')" />
                    </div>
                </el-tab-pane>
            </el-tabs>
        </div>
    </el-drawer>
</template>

<script>
import { markRaw } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import {
    parseOsRelease, parseUname, parseUptime, parseCpuInfo,
    parseMemInfo, parseDf, parseIpAddr, parseNetDev,
    parseProcesses, parseServices, formatBytes
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
            if (!keyword) return this.processInfo
            return this.processInfo.filter(p =>
                p.comm.toLowerCase().includes(keyword) ||
                p.args.toLowerCase().includes(keyword) ||
                p.user.toLowerCase().includes(keyword) ||
                p.pid.toString().includes(keyword)
            )
        },
        filteredServices() {
            if (this.serviceFilter === 'all') return this.serviceInfo
            return this.serviceInfo.filter(s =>
                s.state.toLowerCase() === this.serviceFilter
            )
        },
        cpuLoadPercent() {
            const cores = this.sysInfo?.cpuCores || 1
            const load = this.sysInfo?.loadAvg1 || 0
            return Math.min(100, Math.round((load / cores) * 100))
        },
        swapPercent() {
            if (!this.sysInfo || !this.sysInfo.swapTotal) return 0
            const used = this.sysInfo.swapTotal - this.sysInfo.swapFree
            return Math.round((used / this.sysInfo.swapTotal) * 100)
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
            } catch (e) {
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
                this.netInfo = ipInterfaces.map(iface => {
                    const dev = devInterfaces.find(d => d.name === iface.name)
                    return { ...iface, ...dev }
                })

                this.processInfo = parseProcesses(processes)
                this.serviceInfo = parseServices(services)

                this.lastRefreshTime = new Date().toLocaleTimeString()
            } catch (e) {
                this.error = e.message || String(e)
            } finally {
                this.loading = false
            }
        },
        formatBytes,
        progressColor(percent) {
            if (percent >= 90) return '#f56c6c'
            if (percent >= 70) return '#e6a23c'
            return '#67c23a'
        },
        diskTagType(percent) {
            const p = parseInt(percent) || 0
            if (p >= 90) return 'danger'
            if (p >= 70) return 'warning'
            return 'success'
        },
        serviceTagType(state) {
            const s = (state || '').toLowerCase()
            if (s === 'running') return 'success'
            if (s === 'failed') return 'danger'
            return 'info'
        }
    }
}
</script>

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

/* System Info Cards */
.info-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
}

.info-card {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--n-bg-color-light, rgba(0, 0, 0, 0.03));
    border: 1px solid var(--n-border-color, rgba(0, 0, 0, 0.06));

    &__icon {
        flex-shrink: 0;
        color: var(--n-text-color-light, #999);
        display: flex;
        align-items: flex-start;
        padding-top: 2px;
    }

    &__body {
        flex: 1;
        min-width: 0;
    }

    &__title {
        font-size: 13px;
        font-weight: 600;
        color: var(--n-text-color-base, #333);
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__sub {
        font-size: 11px;
        color: var(--n-text-color-light, #999);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

/* Gauge Section */
.gauge-section {
    margin-bottom: 16px;

    &__title {
        font-size: 13px;
        font-weight: 600;
        color: var(--n-text-color-base, #333);
        margin-bottom: 8px;
    }
}

.gauge-row {
    display: flex;
    align-items: center;
    gap: 20px;
}

.gauge-center {
    text-align: center;

    &__value {
        font-size: 16px;
        font-weight: 700;
        color: var(--n-text-color-base, #333);
        line-height: 1.2;
    }

    &__label {
        font-size: 10px;
        color: var(--n-text-color-light, #999);
    }
}

.gauge-stats {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
}

.gauge-stat {
    display: flex;
    justify-content: space-between;
    font-size: 12px;

    &__label {
        color: var(--n-text-color-light, #999);
    }

    &__value {
        color: var(--n-text-color-base, #333);
        font-weight: 500;
    }
}

/* Uptime */
.uptime-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--n-text-color-light, #999);
    padding: 8px 0;
    border-top: 1px solid var(--n-border-color, rgba(0, 0, 0, 0.06));
}

/* Disk Cards */
.disk-card {
    padding: 10px 0;
    border-bottom: 1px solid var(--n-border-color, rgba(0, 0, 0, 0.06));

    &:last-child {
        border-bottom: none;
    }

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
    }

    &__mount {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        font-size: 13px;
        color: var(--n-text-color-base, #333);
    }

    &__detail {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 4px;
        font-size: 12px;
        color: var(--n-text-color-base, #333);
    }

    &__fs {
        font-size: 11px;
        color: var(--n-text-color-light, #999);
    }
}

/* Network Cards */
.net-card {
    padding: 10px 0;
    border-bottom: 1px solid var(--n-border-color, rgba(0, 0, 0, 0.06));

    &:last-child {
        border-bottom: none;
    }

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
    }

    &__name {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        font-size: 13px;
        color: var(--n-text-color-base, #333);
    }

    &__addr-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        margin: 2px 0;
        flex-wrap: wrap;
    }

    &__addr-label {
        color: var(--n-text-color-light, #999);
        flex-shrink: 0;
        font-size: 11px;
    }

    &__ip {
        color: var(--n-text-color-base, #333);
    }

    &__traffic {
        display: flex;
        gap: 16px;
        margin-top: 6px;
    }

    &__traffic-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: var(--n-text-color-light, #999);
    }
}
</style>

<style lang="scss">
/* Component-level dark mode overrides */
.sys-monitor-drawer {
    .el-drawer__header {
        color: var(--el-text-color-primary);
    }

    .el-empty__description {
        color: var(--el-text-color-secondary);
    }

    .el-loading-mask {
        background-color: var(--el-mask-color, rgba(255, 255, 255, 0.9));
    }
}
</style>

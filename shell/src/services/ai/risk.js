/**
 * Command risk grading engine.
 * Pure rule-based, no AI calls needed.
 *
 * Levels:
 *   "safe"      - read-only, no side effects
 *   "warning"   - has side effects, but recoverable
 *   "dangerous" - destructive, potentially unrecoverable
 */

const DANGEROUS_PATTERNS = [
    { pattern: /rm\s+-rf?\s+/i, reason: "Recursive force delete" },
    { pattern: /rm\s+-\w*r\w*f?\s+/i, reason: "Recursive force delete" },
    { pattern: /rm\s+-\w*f\w*r?\s+/i, reason: "Recursive force delete" },
    { pattern: /\bdd\s+if=.*of=\/dev\//i, reason: "Direct disk write" },
    { pattern: /mkfs/i, reason: "Format filesystem" },
    { pattern: /:\(\)\s*\{\s*:\|\s*:\&\s*\}\s*;/i, reason: "Fork bomb" },
    { pattern: />\s*\/dev\/sd[a-z]/i, reason: "Direct write to disk device" },
    { pattern: /shred\s+/i, reason: "Secure shred file/disk" },
    { pattern: /DROP\s+(TABLE|DATABASE)/i, reason: "SQL DROP" },
    { pattern: /TRUNCATE\s+TABLE/i, reason: "SQL TRUNCATE" },
    { pattern: /write\s+erase/i, reason: "Network device factory reset" },
    { pattern: /git\s+push\s+.*--force/i, reason: "Force push overwrites remote history" },
    { pattern: /git\s+reset\s+--hard/i, reason: "Hard reset discards uncommitted changes" },
    { pattern: /chmod\s+-R?\s+777\s+\//i, reason: "Recursive 777 on root path" },
    { pattern: /iptables\s+-F/i, reason: "Flush all firewall rules" },
    { pattern: /systemctl\s+(stop|disable)\s+/i, reason: "Stop/disable service" },
    { pattern: /shutdown|reboot|halt|poweroff/i, reason: "System power control" },
    { pattern: /kill\s+-9\s+0/i, reason: "Kill all processes" },
    { pattern: /pkill\s+-9/i, reason: "Force kill processes" },
    { pattern: /userdel\s+.*-r/i, reason: "Delete user with home directory" },
    { pattern: /parted.*rm/i, reason: "Remove partition" },
    { pattern: /fdisk/i, reason: "Disk partition manipulation" },
    { pattern: /wipefs/i, reason: "Wipe filesystem signature" }
]

const WARNING_PATTERNS = [
    { pattern: /kill\s+-\d+\s+/i, reason: "Send signal to process" },
    { pattern: /pkill\s+/i, reason: "Kill processes by name" },
    { pattern: /systemctl\s+(restart|reload)\s+/i, reason: "Restart/reload service" },
    { pattern: /service\s+\w+\s+(restart|stop)/i, reason: "Restart/stop service" },
    { pattern: /docker\s+(rm|stop|kill|rmi)\s+/i, reason: "Docker remove/stop container or image" },
    { pattern: /docker\s+compose\s+(down|restart)\s+/i, reason: "Docker compose down/restart" },
    { pattern: /chmod\s+/i, reason: "Change file permissions" },
    { pattern: /chown\s+/i, reason: "Change file ownership" },
    { pattern: /mv\s+.*\s+\//i, reason: "Move file to system path" },
    { pattern: /cp\s+.*\s+\/etc\//i, reason: "Copy to system config directory" },
    { pattern: /apt(itude)?\s+(remove|purge)\s+/i, reason: "Remove package" },
    { pattern: /yum\s+remove\s+/i, reason: "Remove package" },
    { pattern: /dnf\s+remove\s+/i, reason: "Remove package" },
    { pattern: /npm\s+uninstall\s+/i, reason: "Uninstall npm package" },
    { pattern: /pip\s+uninstall\s+/i, reason: "Uninstall pip package" },
    { pattern: /crontab\s+-r/i, reason: "Remove crontab" },
    { pattern: /redis-cli\s+FLUSHALL/i, reason: "Redis flush all" },
    { pattern: /redis-cli\s+FLUSHDB/i, reason: "Redis flush database" }
]

/**
 * Grade a command's risk level.
 *
 * @param {string} command - the command to evaluate
 * @returns {{ level: "safe"|"warning"|"dangerous", reason: string|null }}
 */
export function gradeCommand(command) {
    if (!command || typeof command !== "string") {
        return { level: "safe", reason: null }
    }

    for (const rule of DANGEROUS_PATTERNS) {
        if (rule.pattern.test(command)) {
            return { level: "dangerous", reason: rule.reason }
        }
    }

    for (const rule of WARNING_PATTERNS) {
        if (rule.pattern.test(command)) {
            return { level: "warning", reason: rule.reason }
        }
    }

    return { level: "safe", reason: null }
}

/**
 * Check if a command requires explicit user confirmation.
 *
 * @param {string} command
 * @returns {boolean}
 */
export function requiresConfirmation(command) {
    const { level } = gradeCommand(command)
    return level !== "safe"
}

/**
 * Get a human-readable risk label.
 *
 * @param {string} level - "safe" | "warning" | "dangerous"
 * @param {string} [locale] - "zh-CN" or "en-US"
 * @returns {string}
 */
export function riskLabel(level, locale = "zh-CN") {
    const labels = {
        "zh-CN": {
            safe: "🟢 只读",
            warning: "🟡 有副作用",
            dangerous: "🔴 破坏性"
        },
        "en-US": {
            safe: "🟢 Read-only",
            warning: "🟡 Side effects",
            dangerous: "🔴 Destructive"
        }
    }
    return (labels[locale] || labels["zh-CN"])[level] || level
}

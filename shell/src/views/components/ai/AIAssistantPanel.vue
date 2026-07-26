<template>
    <div class="ai-assistant-panel" v-show="visible" :style="{ width: panelWidth + 'px' }">
        <div class="ai-assistant-resizer" @mousedown="startResize"></div>

        <div class="ai-assistant-header">
            <span class="ai-assistant-title">{{ $t('home.ai.panel-title') }}</span>
            <div class="ai-assistant-actions">
                <el-button link type="info" size="small" @click="clear">
                    {{ $t('home.ai.clear') }}
                </el-button>
                <el-button link type="info" size="small" @click="close">
                    {{ $t('home.ai.close') }}
                </el-button>
            </div>
        </div>

        <div ref="messagesContainer" class="ai-assistant-messages">
            <div
                v-for="(msg, idx) in messages"
                :key="idx"
                :class="['ai-assistant-message', `ai-assistant-message--${msg.role}`]"
            >
                <div class="ai-assistant-message__avatar">
                    <span v-if="msg.role === 'user'">U</span>
                    <span v-else>AI</span>
                </div>
                <div
                    class="ai-assistant-message__content"
                    v-html="renderContent(msg.content)"
                    @click="handleContentClick($event)"
                />
            </div>
            <div v-if="loading" class="ai-assistant-message ai-assistant-message--assistant">
                <div class="ai-assistant-message__avatar"><span>AI</span></div>
                <div class="ai-assistant-message__content">
                    <span class="ai-assistant-typing">{{ $t('home.ai.thinking') }}</span>
                </div>
            </div>
        </div>

        <div v-if="suggestedCommand" class="ai-assistant-command">
            <div class="ai-assistant-command__header">
                <span :class="['ai-risk-badge', `ai-risk-badge--${risk.level}`]">
                    {{ riskLabel(risk.level, locale) }}
                </span>
                <span v-if="risk.reason" class="ai-assistant-command__reason">{{ risk.reason }}</span>
            </div>
            <div class="ai-assistant-command__body">
                <code>{{ suggestedCommand }}</code>
                <div class="ai-assistant-command__actions">
                    <el-button size="small" type="primary" @click="insertToTerminal(suggestedCommand)">
                        {{ $t('home.ai.insert-terminal') }}
                    </el-button>
                    <el-button size="small" @click="copyCommand">
                        {{ $t('home.ai.copy-command') }}
                    </el-button>
                </div>
            </div>
            <div v-if="risk.level !== 'safe'" class="ai-assistant-command__warning">
                <el-alert :title="$t('home.ai.confirm-required')" type="warning" :closable="false" show-icon />
            </div>
        </div>

        <div class="ai-assistant-input">
            <el-input
                v-model="inputText"
                :placeholder="$t('home.ai.input-placeholder')"
                type="textarea"
                :rows="1"
                @keydown.enter.exact.prevent="sendInput"
                :disabled="loading"
                resize="none"
            />
            <el-button
                type="primary"
                @click="sendInput"
                :loading="loading"
                :disabled="!inputText.trim()"
            >
                {{ $t('home.ai.send') }}
            </el-button>
        </div>
    </div>
</template>

<script>
import { chat, buildSystemPrompt } from "@/services/ai/provider"
import { gradeCommand, riskLabel } from "@/services/ai/risk"
import { ElMessage } from "element-plus"

const MIN_WIDTH = 280

function getInitialWidth() {
    const w = window.innerWidth || 1200
    return Math.max(MIN_WIDTH, Math.min(Math.round(w * 0.5), Math.round(w * 0.9)))
}

function getMaxWidth() {
    return Math.round((window.innerWidth || 1200) * 0.9)
}

export default {
    name: "AIAssistantPanel",
    data() {
        return {
            visible: false,
            loading: false,
            inputText: "",
            messages: [],
            suggestedCommand: "",
            context: {},
            panelWidth: getInitialWidth(),
            resizing: false
        }
    },
    computed: {
        risk() {
            if (!this.suggestedCommand) return { level: "safe", reason: null }
            return gradeCommand(this.suggestedCommand)
        },
        locale() {
            return this.$i18n.locale
        }
    },
    mounted() {
        this.bindResizeEvents()
    },
    beforeUnmount() {
        this.unbindResizeEvents()
    },
    methods: {
        bindResizeEvents() {
            document.addEventListener("mousemove", this.onResizeMove)
            document.addEventListener("mouseup", this.stopResize)
        },
        unbindResizeEvents() {
            document.removeEventListener("mousemove", this.onResizeMove)
            document.removeEventListener("mouseup", this.stopResize)
        },
        startResize(e) {
            this.resizing = true
            this.startX = e.clientX
            this.startWidth = this.panelWidth
            e.preventDefault()
        },
        onResizeMove(e) {
            if (!this.resizing) return
            const delta = this.startX - e.clientX
            const maxWidth = getMaxWidth()
            const newWidth = Math.max(MIN_WIDTH, Math.min(maxWidth, this.startWidth + delta))
            this.panelWidth = newWidth
        },
        stopResize() {
            this.resizing = false
        },
        renderContent(text) {
            if (!text) return ""
            const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
            let html = escape(text)

            html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
                const clean = code.trim()
                return `<pre class="ai-code-block" data-command="${clean}"><code>${clean}</code></pre>`
            })

            html = html.replace(/`([^`]+)`/g, (_, code) => {
                const clean = code.trim()
                return `<code class="ai-inline-code" data-command="${clean}">${clean}</code>`
            })

            html = html.replace(/\n/g, "<br>")
            return html
        },
        handleContentClick(e) {
            const target = e.target.closest(".ai-inline-code, .ai-code-block")
            if (!target) return
            const command = target.getAttribute("data-command")
            if (command) {
                this.insertToTerminal(command)
            }
        },
        riskLabel,
        scrollToBottom() {
            this.$nextTick(() => {
                const el = this.$refs.messagesContainer
                if (el) {
                    el.scrollTop = el.scrollHeight
                }
            })
        },
        extractCommand(text) {
            const codeBlockMatch = text.match(/```\w*\n?([\s\S]*?)```/)
            if (codeBlockMatch) {
                const code = codeBlockMatch[1].trim()
                const firstLine = code.split("\n")[0].trim()
                if (firstLine && !firstLine.toLowerCase().includes("explain")) {
                    return firstLine
                }
            }

            const inlineMatch = text.match(/`([^`]+)`/)
            if (inlineMatch) {
                const code = inlineMatch[1].trim()
                if (code && !code.toLowerCase().includes("explain")) {
                    return code
                }
            }

            return null
        },
        async ask(question) {
            this.messages.push({ role: "user", content: question })
            this.loading = true
            this.scrollToBottom()

            try {
                const systemPrompt = buildSystemPrompt(this.context)
                const chatMessages = [
                    { role: "system", content: systemPrompt },
                    ...this.messages.map(m => ({ role: m.role, content: m.content }))
                ]

                let fullResponse = ""
                await chat(chatMessages, (chunk) => {
                    fullResponse += chunk
                    const lastMsg = this.messages[this.messages.length - 1]
                    if (lastMsg && lastMsg.role === "assistant") {
                        lastMsg.content = fullResponse
                    } else {
                        this.messages.push({ role: "assistant", content: fullResponse })
                    }
                    this.scrollToBottom()
                })

                if (!fullResponse) {
                    this.messages.push({ role: "assistant", content: this.$t("home.ai.no-response") })
                }

                const cmd = this.extractCommand(fullResponse)
                this.suggestedCommand = cmd || ""
            } catch (e) {
                this.messages.push({ role: "assistant", content: `${this.$t("home.ai.error")}: ${e.message}` })
            } finally {
                this.loading = false
                this.scrollToBottom()
            }
        },
        async sendInput() {
            const text = this.inputText.trim()
            if (!text || this.loading) return
            this.inputText = ""
            await this.ask(text)
        },
        async explain() {
            const prompt = this.$t("home.ai.explain-prompt")
            await this.ask(prompt)
        },
        copyCommand() {
            if (!this.suggestedCommand) return
            navigator.clipboard.writeText(this.suggestedCommand)
            ElMessage.success(this.$t("home.ai.copied"))
        },
        insertToTerminal(command) {
            if (!command) return
            this.$emit("insert-command", command)
        },
        showAI(ctx) {
            this.context = ctx || {}
            this.visible = true

            if (ctx && ctx.selectedText) {
                this.explain()
            }
        },
        close() {
            this.visible = false
        },
        clear() {
            this.messages = []
            this.suggestedCommand = ""
        }
    }
}
</script>

<style lang="scss" scoped>
.ai-assistant-panel {
    display: flex;
    flex-direction: column;
    min-width: 280px;
    height: 100%;
    background-color: var(--n-bg-color-base);
    border-left: 1px solid var(--n-border-color);
    color: var(--n-text-color-base);
    padding: 10px 12px;
    box-sizing: border-box;
    position: relative;
    flex-shrink: 0;

    .ai-assistant-resizer {
        position: absolute;
        top: 0;
        left: -3px;
        bottom: 0;
        width: 6px;
        cursor: col-resize;
        z-index: 10;

        &:hover {
            background-color: var(--n-button-primary);
            opacity: 0.3;
        }
    }

    .ai-assistant-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        flex-shrink: 0;
    }

    .ai-assistant-title {
        font-size: 14px;
        font-weight: 600;
    }

    .ai-assistant-actions {
        display: flex;
        gap: 4px;
    }

    .ai-assistant-messages {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 8px;
        padding-right: 4px;
        min-height: 0;
    }

    .ai-assistant-message {
        display: flex;
        gap: 8px;

        &--user {
            flex-direction: row-reverse;

            .ai-assistant-message__content {
                background-color: var(--n-button-primary);
                color: var(--n-button-primary-text);
            }
        }

        &__avatar {
            flex-shrink: 0;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            background-color: var(--n-bg-color-light);
            color: var(--n-text-color-base);
        }

        &__content {
            padding: 6px 10px;
            border-radius: 6px;
            background-color: var(--n-bg-color-light);
            color: var(--n-text-color-base);
            font-size: 13px;
            line-height: 1.5;
            max-width: 100%;
            word-break: break-word;

            :deep(.ai-inline-code) {
                background-color: var(--n-bg-color-base);
                border-radius: 3px;
                padding: 1px 4px;
                font-family: "DejaVu Mono", monospace;
                font-size: 12px;
                color: var(--n-text-color-active);
                cursor: pointer;
                border: 1px dashed transparent;

                &:hover {
                    border-color: var(--n-button-primary);
                    background-color: var(--n-button-primary-hover);
                    color: var(--n-button-primary-text);
                }
            }

            :deep(.ai-code-block) {
                background-color: var(--n-bg-color-base);
                border-radius: 4px;
                padding: 6px 10px;
                margin: 4px 0;
                overflow-x: auto;
                cursor: pointer;
                border: 1px dashed transparent;

                &:hover {
                    border-color: var(--n-button-primary);
                }

                code {
                    font-family: "DejaVu Mono", monospace;
                    font-size: 13px;
                    pointer-events: none;
                }
            }
        }
    }

    .ai-assistant-typing {
        color: var(--n-text-color-light);
        font-style: italic;
    }

    .ai-assistant-command {
        border: 1px solid var(--n-border-color);
        border-radius: 6px;
        padding: 8px 10px;
        background-color: var(--n-bg-color-light);
        margin-bottom: 8px;
        flex-shrink: 0;

        &__header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }

        &__reason {
            font-size: 12px;
            color: var(--n-text-color-light);
        }

        &__body {
            display: flex;
            flex-direction: column;
            gap: 6px;

            code {
                padding: 5px 8px;
                background-color: var(--n-bg-color-base);
                border-radius: 4px;
                font-family: "DejaVu Mono", monospace;
                font-size: 13px;
                color: var(--n-text-color-active);
                word-break: break-all;
            }
        }

        &__actions {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
        }

        &__warning {
            margin-top: 6px;
        }
    }

    .ai-risk-badge {
        font-size: 12px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 4px;

        &--safe {
            background-color: rgba(0, 200, 0, 0.15);
            color: #67c23a;
        }

        &--warning {
            background-color: rgba(230, 162, 60, 0.15);
            color: #e6a23c;
        }

        &--dangerous {
            background-color: rgba(245, 108, 108, 0.15);
            color: #f56c6c;
        }
    }

    .ai-assistant-input {
        display: flex;
        gap: 8px;
        align-items: flex-end;
        flex-shrink: 0;
    }
}
</style>

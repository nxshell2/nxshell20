import { getAIConfig } from "./config"
import * as ollama from "./ollama"
import * as openai from "./openai"

const providers = { ollama, openai }

/**
 * Unified AI chat interface.
 *
 * @param {Array<{role: string, content: string}>} messages - chat messages
 * @param {function(string): void} [onChunk] - streaming callback, receives text chunks
 * @returns {Promise<string>} full response text
 */
export async function chat(messages, onChunk) {
    const config = getAIConfig()
    const providerName = config.provider
    const provider = providers[providerName]

    if (!provider) {
        throw new Error(`Unknown AI provider: ${providerName}`)
    }

    const providerConfig = config[providerName]
    if (!providerConfig) {
        throw new Error(`No config for provider: ${providerName}`)
    }

    return provider.chat(messages, providerConfig, onChunk)
}

/**
 * Build a system prompt with terminal context.
 *
 * @param {object} context - { hostInfo, sessionType, selectedText, recentOutput }
 * @returns {string} system prompt
 */
export function buildSystemPrompt(context = {}) {
    const parts = [
        "You are an AI assistant embedded in NXShell, a multi-protocol terminal application.",
        "You help users understand terminal output, diagnose errors, and suggest commands.",
        "Rules:",
        "- Respond concisely in the same language as the user's input.",
        "- When suggesting commands, wrap them in backticks for easy copying.",
        "- Always explain what a suggested command does before showing it.",
        "- Never suggest destructive commands without explicit warning.",
        "- If the user selects error output, explain the error and suggest a fix."
    ]

    if (context.hostInfo) {
        const { host, username, os } = context.hostInfo
        parts.push(`Current host: ${username || "unknown"}@${host || "unknown"}`)
        if (os) parts.push(`OS: ${os}`)
    }

    if (context.sessionType) {
        parts.push(`Session type: ${context.sessionType}`)
    }

    if (context.selectedText) {
        parts.push(`User selected the following text:\n\`\`\`\n${context.selectedText}\n\`\`\``)
    }

    if (context.recentOutput) {
        parts.push(`Recent terminal output (last ${context.recentLines || 50} lines):\n\`\`\`\n${context.recentOutput}\n\`\`\``)
    }

    return parts.join("\n")
}

/**
 * Send an "explain this" request to the AI.
 *
 * @param {object} context - { selectedText, recentOutput, hostInfo, sessionType }
 * @param {function(string): void} [onChunk]
 * @returns {Promise<string>}
 */
export async function explainError(context, onChunk) {
    const systemPrompt = buildSystemPrompt(context)
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please explain this error/output and suggest how to fix it." }
    ]
    return chat(messages, onChunk)
}

/**
 * Send a natural language command generation request.
 *
 * @param {string} naturalLanguage - what the user wants to do
 * @param {object} context - { hostInfo, sessionType }
 * @param {function(string): void} [onChunk]
 * @returns {Promise<string>}
 */
export async function generateCommand(naturalLanguage, context, onChunk) {
    const systemPrompt = buildSystemPrompt(context)
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a shell command to: ${naturalLanguage}` }
    ]
    return chat(messages, onChunk)
}

export { listModels as listOllamaModels } from "./ollama"

import { getProfile, updateProfile } from "@/services/globalSetting"

const DEFAULT_CONFIG: any = {
    provider: "ollama",
    ollama: {
        baseUrl: "http://localhost:11434",
        model: "qwen2.5-coder:7b"
    },
    openai: {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "gpt-4o-mini"
    },
    maxContextLines: 50
}

export function getAIConfig() {
    const profile = getProfile("xterm") as any
    if (!profile || !profile.ai) {
        return { ...DEFAULT_CONFIG }
    }
    return {
        provider: profile.ai.provider || DEFAULT_CONFIG.provider,
        ollama: { ...DEFAULT_CONFIG.ollama, ...profile.ai.ollama },
        openai: { ...DEFAULT_CONFIG.openai, ...profile.ai.openai },
        maxContextLines: profile.ai.maxContextLines || DEFAULT_CONFIG.maxContextLines
    }
}

export async function saveAIConfig(config: any) {
    await updateProfile("xterm", { ai: config })
}

export function getProviderConfig(providerName: string) {
    const config = getAIConfig()
    return config[providerName as string] || null
}

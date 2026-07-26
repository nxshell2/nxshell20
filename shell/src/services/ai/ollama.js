/**
 * Ollama provider - local LLM inference
 * API: http://localhost:11434/api/chat
 * No API key required, data stays local
 */
export async function chat(messages, config, onChunk) {
    const { baseUrl, model } = config

    const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            messages,
            stream: !!onChunk
        })
    })

    if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`)
    }

    if (!onChunk) {
        const data = await response.json()
        return data.message?.content || ""
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ""
    let buffer = ""
    let done = false

    while (!done) {
        const chunk = await reader.read()
        done = chunk.done
        if (done) break

        buffer += decoder.decode(chunk.value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
            if (!line.trim()) continue
            try {
                const json = JSON.parse(line)
                if (json.message?.content) {
                    fullText += json.message.content
                    onChunk(json.message.content)
                }
            } catch (e) {
                // partial JSON, skip
            }
        }
    }

    return fullText
}

export async function listModels(config) {
    const { baseUrl } = config
    const response = await fetch(`${baseUrl}/api/tags`)
    if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`)
    }
    const data = await response.json()
    return (data.models || []).map(m => m.name)
}

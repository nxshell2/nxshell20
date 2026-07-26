/**
 * OpenAI-compatible provider
 * Works with OpenAI, Azure OpenAI, 通义千问, 智谱, any OpenAI-compatible API
 */
export async function chat(messages, config, onChunk) {
    const { baseUrl, apiKey, model } = config

    if (!apiKey) {
        throw new Error("API key is required for OpenAI-compatible provider")
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            stream: !!onChunk
        })
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI request failed: ${response.status} ${errorText}`)
    }

    if (!onChunk) {
        const data = await response.json()
        return data.choices?.[0]?.message?.content || ""
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
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith("data: ")) continue
            const data = trimmed.slice(6)
            if (data === "[DONE]") continue

            try {
                const json = JSON.parse(data)
                const delta = json.choices?.[0]?.delta?.content
                if (delta) {
                    fullText += delta
                    onChunk(delta)
                }
            } catch (e) {
                // partial JSON, skip
            }
        }
    }

    return fullText
}

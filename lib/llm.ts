/**
 * LLM abstraction layer.
 * Supports Anthropic (default) and OpenAI via environment variables:
 *   LLM_PROVIDER = 'anthropic' | 'openai'
 *   LLM_MODEL = model ID override
 *   ANTHROPIC_API_KEY / OPENAI_API_KEY
 */

const DEFAULT_MODELS = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
} as const

export async function generateText(
  userPrompt: string,
  systemPrompt: string
): Promise<string> {
  const provider = (process.env.LLM_PROVIDER || 'anthropic') as 'anthropic' | 'openai'
  const model =
    process.env.LLM_MODEL || DEFAULT_MODELS[provider] || DEFAULT_MODELS.anthropic

  if (provider === 'openai') {
    return generateOpenAI(userPrompt, systemPrompt, model)
  }
  return generateAnthropic(userPrompt, systemPrompt, model)
}

async function generateAnthropic(
  userPrompt: string,
  systemPrompt: string,
  model: string
): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find((b: any) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text in LLM response')
  }
  return textBlock.text
}

async function generateOpenAI(
  userPrompt: string,
  systemPrompt: string,
  model: string
): Promise<string> {
  // Use fetch directly to avoid requiring openai as a dependency
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('No text in OpenAI response')
  return text
}

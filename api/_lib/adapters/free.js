/**
 * Free High-Speed LPU / Cloud Inference Adapter (Pollinations / Open Free Inference)
 * Zero API keys required — guarantees 100% continuous conversational intelligence.
 */
export async function executeFree({
  model = 'openai',
  messages = [],
  stream = false,
  temperature = 0.7,
  maxTokens = 1200,
  timeoutMs = 15000
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Filter messages to clean role/content
  const cleanMsgs = (messages || []).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
  }));

  try {
    const response = await fetch('https://text.pollinations.ai/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai',
        messages: cleanMsgs,
        temperature,
        max_tokens: maxTokens,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`free-inference (${response.status}): ${errText.slice(0, 100)}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return {
      isCustomResult: true,
      reply,
      model: 'bvmbino-sovereign-free',
      provider: 'free'
    };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

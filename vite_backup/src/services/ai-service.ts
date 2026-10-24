export interface AIResponse {
  text: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  stream?: (delta: string) => void;
}

class AIService {
  private async fetchChat(options: ChatOptions): Promise<AIResponse> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || `API Error: ${res.status}`);
    }

    if (options.stream) {
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      
      if (!reader) throw new Error("Stream reader not available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;
        options.stream(chunk);
      }
      return { text: fullText, model: options.model || 'default' };
    }

    return res.json();
  }

  /**
   * Execute with Cascade Fallback
   * 1. Attempt primary model (User selected)
   * 2. If fail, fallback to secondary (Gemini)
   * 3. If fail, fallback to ternary (Groq)
   */
  async execute(options: ChatOptions): Promise<AIResponse> {
    const fallbacks = [
      options.model || "gpt-4o",
      "gemini-1.5-pro",
      "llama-3-70b-versatile"
    ];

    let lastError: any = null;

    for (const model of fallbacks) {
      try {
        console.log(`[ai-service] Trying model: ${model}`);
        return await this.fetchChat({ ...options, model });
      } catch (err: any) {
        console.warn(`[ai-service] Model ${model} failed:`, err.message);
        lastError = err;
        continue; // Try next fallback
      }
    }

    throw lastError || new Error("All AI models in the cascade failed.");
  }
}

export const aiService = new AIService();

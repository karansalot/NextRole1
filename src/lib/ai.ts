import OpenAI from 'openai';

/**
 * Returns an OpenAI-compatible client for whichever provider the user has configured.
 * Priority: use whichever provider key is set + selected. Groq is free (14,400 req/day).
 *
 * Supported providers:
 *  - openai  → api.openai.com  (paid, gpt-4o-mini ~$0.15/1M tokens)
 *  - groq    → api.groq.com    (FREE, 14,400 req/day, llama-3.3-70b-versatile)
 */
export function getAIClient(opts: {
    openAIKey?: string;
    groqApiKey?: string;
    aiProvider?: 'openai' | 'groq';
}): { client: OpenAI; model: string; provider: string } {
    const { openAIKey, groqApiKey, aiProvider } = opts;

    // If provider is explicitly groq (or only groq key is set), use Groq
    if ((aiProvider === 'groq' || (!openAIKey && groqApiKey)) && groqApiKey) {
        return {
            client: new OpenAI({
                apiKey: groqApiKey,
                baseURL: 'https://api.groq.com/openai/v1',
            }),
            model: 'llama-3.3-70b-versatile',
            provider: 'groq (free)',
        };
    }

    // Default: OpenAI
    if (openAIKey) {
        return {
            client: new OpenAI({ apiKey: openAIKey }),
            model: 'gpt-4o-mini',
            provider: 'openai',
        };
    }

    throw new Error('No AI API key configured. Add your OpenAI key or free Groq key in Profile → API Keys.');
}

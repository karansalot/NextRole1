import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai';
import { saveGeneratedDoc } from '@/lib/storage';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { profile, job, hiringManager, openAIKey } = body;

    let client: any, model: string, provider: string;
    try {
        ({ client, model, provider } = getAIClient({ openAIKey, groqApiKey: profile?.groqApiKey, aiProvider: profile?.aiProvider }));
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }

    const prompt = `Generate a complete outreach sequence for a job candidate. Write in a genuine, concise, human way. No fluff. No AI-sounding language. Return valid JSON.

Candidate: ${profile.name}
Role Applied: ${job.title} at ${job.company}
Hiring Manager: ${hiringManager?.name || 'Hiring Team'}
Candidate Background: ${profile.summary || profile.experiences?.[0]?.title + ' with ' + profile.hackathons?.join(', ')}

Return JSON:
{
  "linkedinConnection": "A 300-char LinkedIn connection request note - personalized, specific, no generic templates",
  "linkedinFollowUp": "A follow-up message to send 5 days after connecting if no response (200 chars)",
  "emailSubject": "An attention-grabbing but professional email subject line",
  "emailBody": "A 180-word email introducing yourself, why this role, why this company, and a clear CTA. No bullet points. Conversational.",
  "emailFollowUp": "A 100-word polite follow-up email for 5 business days later if no response"
}

Be specific to this company and role. Reference something real about the company if possible. Keep it short and punchy.`;

    try {
        const response = await client.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: 'Return only valid JSON. Write like a real human.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.6,
            max_tokens: 800,
            // Note: response_format json_object only supported by OpenAI, not Groq
            ...(provider === 'openai' ? { response_format: { type: 'json_object' } } : {}),
        });

        const messages = JSON.parse(response.choices[0].message.content || '{}');

        // Save to disk
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `outreach_${job.company.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.json`;
        try {
            saveGeneratedDoc('outreach', job.company, filename, JSON.stringify(messages, null, 2));
        } catch (e) { }

        return NextResponse.json(messages);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
}

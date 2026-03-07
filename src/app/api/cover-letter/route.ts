import { NextRequest, NextResponse } from 'next/server';
import { getAIClient, getAnthropicClient } from '@/lib/ai';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { profile, job, openAIKey } = body;

    let client: any, model: string, provider: string;
    try {
        if (profile?.aiProvider === 'anthropic') {
            ({ client, model, provider } = getAnthropicClient(profile.anthropicApiKey));
        } else {
            ({ client, model, provider } = getAIClient({ openAIKey, groqApiKey: profile?.groqApiKey, aiProvider: profile?.aiProvider }));
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }

    const systemPrompt = `You are an expert cover letter writer who crafts human, compelling, authentic cover letters for ambitious candidates.

Your writing rules:
- Write in a warm, professional, conversational tone - not corporate-speak
- NEVER bold any words or use markdown formatting
- NEVER use dashes/hyphens in lists - use commas instead
- Do NOT copy-paste bullet points from the resume; instead weave experiences into narrative paragraphs
- Include ALL skills and requirements from the job description naturally
- Highlight soft skills (communication, leadership, adaptability, curiosity)
- Emphasize 5x hackathon wins as proof of creative problem-solving and performance under pressure
- Mention desire to learn about their future projects and how the candidate can contribute
- Only include projects that are relevant to THIS role
- Write as if you are the person themselves, humanly and passionately
- STRICT LENGTH LIMIT: MAXIMUM 250 words total. The letter MUST fit easily on a single page printed.
- Structure: Opening hook > Why This Company > 1 Paragraph Experience/Skills > Strong Close`;

    const userPrompt = `CANDIDATE PROFILE:
Name: ${profile.name}
Background: ${profile.summary || 'Ambitious, detail-oriented analyst with strong analytical and cross-functional skills'}
Work Experience: ${profile.experiences?.map((e: any) => `${e.title} at ${e.company}`).join(', ')}
Education: ${profile.education?.map((e: any) => `${e.degree} from ${e.school}`).join(', ')}
Skills: ${profile.skills?.join(', ')}
Hackathons: ${profile.hackathons?.join(', ') || '5x Hackathon Winner'}

---

JOB DESCRIPTION:
Company: ${job.company}
Title: ${job.title}
Location: ${job.location}

${job.description}

---

INSTRUCTIONS:
Write a VERY CONCISE, 1-page (MAXIMUM 250 words) cover letter for ${profile.name} applying for the ${job.title} role at ${job.company}.

Requirements:
1. Do NOT bold any words. Do NOT use dash-separated lists. Use commas where needed.
2. Weave in ALL key requirements from the job description naturally
3. Talk THROUGH experiences rather than listing resume bullets
4. Include 5x hackathon wins and explain why they prove value for THIS role
5. Show genuine curiosity about ${job.company}'s future initiatives and products
6. Add relevant soft skills: communication, adaptability, structured thinking, leadership
7. Only reference projects that make clear sense for this role
8. Make it feel deeply human, not like an AI wrote it
9. End with a confident, enthusiastic closing

Format:
[Candidate Name]
[Contact Info]
[Date]

Hiring Team,
${job.company}

[Letter body - strictly limited to 3 short paragraphs]

Sincerely,
${profile.name}`;

    try {
        let letter = '';
        if (provider === 'anthropic') {
            const response = await client.messages.create({
                model,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
                max_tokens: 1200,
                temperature: 0.7,
            });
            letter = response.content[0].text;
        } else {
            const response = await client.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1200,
            });
            letter = response.choices[0].message.content || '';
        }

        return NextResponse.json({ letter, filename: `cover_letter_${job.company.replace(/[^a-z0-9]/gi, '_')}.txt` });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
}

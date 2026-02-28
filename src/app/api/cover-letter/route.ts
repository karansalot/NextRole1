import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai';
import { saveGeneratedDoc } from '@/lib/storage';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { profile, job, openAIKey } = body;

    let client: any, model: string;
    try {
        ({ client, model } = getAIClient({ openAIKey, groqApiKey: profile?.groqApiKey, aiProvider: profile?.aiProvider }));
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
- Maximum 400 words, 1 page format
- Structure: Opening hook > Why This Company > Experience Narrative > Skills Alignment > Hackathon + Soft Skills > Future Contribution > Strong Close`;

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
Write a 1-page (under 400 words) cover letter for ${profile.name} applying for the ${job.title} role at ${job.company}.

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

[Letter body - 4-5 paragraphs]

Sincerely,
${profile.name}`;

    try {
        const response = await client.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1200,
        });

        const letter = response.choices[0].message.content || '';

        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `cover_letter_${job.company.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.txt`;
        try {
            saveGeneratedDoc('cover_letter', job.company, filename, letter);
        } catch (e) {
            console.error('Could not save to disk', e);
        }

        return NextResponse.json({ letter, filename });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
}

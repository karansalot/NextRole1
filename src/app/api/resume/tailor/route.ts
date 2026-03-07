import { NextRequest, NextResponse } from 'next/server';
import { getAIClient, getAnthropicClient } from '@/lib/ai';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { profile, job, openAIKey } = body;

    // Detect if user has provided LaTeX source
    const latexResume = profile?.latexResume?.trim() || '';
    const isLatex = latexResume.startsWith('\\documentclass') || latexResume.startsWith('%') || latexResume.includes('\\begin{document}');

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

    let systemPrompt: string;
    let userPrompt: string;

    if (isLatex) {
        systemPrompt = `You are an expert resume writer specializing in LaTeX resumes and ATS optimization.
Your goal is to make MINIMAL, TARGETED edits to a LaTeX resume to match a job description.

STRICT RULES:
- Return ONLY valid LaTeX code — the full modified .tex file
- Do NOT change job titles, companies, or dates
- Do NOT add fake experiences — only add/adjust bullets to existing roles using real-sounding language
- DO weave in exact keywords and phrases from the JD naturally into existing bullets
- DO reorder skills to put the most JD-relevant ones first
- Keep the resume to 1 page — if adding content, compress or cut less-relevant bullets
- Preserve ALL original LaTeX formatting, commands, and structure exactly — only change text content
- Output ONLY the complete .tex file, no explanation, no markdown fences`;

        userPrompt = `MY LATEX RESUME:
\`\`\`latex
${latexResume}
\`\`\`

JOB DESCRIPTION:
Company: ${job.company}
Title: ${job.title}
Location: ${job.location}

${job.description}

TASK:
1. Identify the top 10-15 keywords/phrases from the JD (tools, skills, methodologies, soft skills)
2. Weave those exact keywords into existing bullets wherever they genuinely fit — do NOT stuff keywords unnaturally
3. Adjust the professional summary (if present) to mirror the JD's language
4. Reorder the skills section so JD-relevant skills appear first
5. Keep every existing job title, company, and date UNCHANGED
6. Ensure the result fits on 1 page (compress/remove less-relevant bullets if needed)
7. Return the COMPLETE modified .tex file — nothing else`;
    } else {
        // Plain text mode (fallback)
        systemPrompt = `You are an expert resume writer specializing in ATS-optimized resumes.
Key rules:
- NEVER change job titles on actual work experience
- Use exact keywords and phrases from the job description — do NOT paraphrase them
- Add 1-2 bullets to existing roles only where genuinely transferable
- You may add 1 realistic project if needed — use defensible metrics
- Output must be STRICTLY 1 page (max 450 words). Be concise.
- ATS-friendly: plain text, no tables, no columns
- Use strong action verbs, quantified outcomes`;

        userPrompt = `CANDIDATE PROFILE:
Name: ${profile.name}
Visa Status: ${profile.visaStatus}
Email: ${profile.email}
Phone: ${profile.phone}
LinkedIn: ${profile.linkedin}

WORK EXPERIENCE:
${profile.experiences?.map((e: any) => `${e.title} at ${e.company} (${e.startDate} - ${e.endDate})\n${e.bullets?.join('\n')}`).join('\n\n')}

EDUCATION:
${profile.education?.map((e: any) => `${e.degree} - ${e.school} (${e.grad})`).join('\n')}

PROJECTS:
${profile.projects?.map((p: any) => `${p.name}: ${p.bullets?.join('. ')}`).join('\n')}

SKILLS: ${profile.skills?.join(', ')}
HACKATHONS/ACHIEVEMENTS: ${profile.hackathons?.join(', ')}

---
JOB DESCRIPTION:
Company: ${job.company}
Title: ${job.title}
${job.description}

---
INSTRUCTIONS:
1. Identify every key phrase/tool/methodology in the JD — use them verbatim in the resume where they fit
2. Keep all job titles EXACTLY as-is
3. Add bullets to existing roles using JD language — make them sound natural
4. Reorder skills so JD-relevant ones are first
5. Max 450 words. 1 page only.

Return ONLY the resume content in clean plain text format.`;
    }

    try {
        let resumeText = '';

        if (provider === 'anthropic') {
            const response = await client.messages.create({
                model,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
                max_tokens: 3000,
                temperature: 0.3,
            });
            resumeText = response.content[0].text;
        } else {
            const response = await client.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 3000,
            });
            resumeText = response.choices[0].message.content || '';
        }

        // Strip any markdown code fences if AI wrapped it
        resumeText = resumeText.replace(/^```latex\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/, '').trim();

        const ext = isLatex ? 'tex' : 'txt';
        const filename = `resume_${job.company.replace(/[^a-z0-9]/gi, '_')}_${job.title.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
        return NextResponse.json({ resume: resumeText, filename, provider, isLatex });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
}

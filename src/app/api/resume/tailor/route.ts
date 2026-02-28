import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai';
import { saveGeneratedDoc } from '@/lib/storage';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { profile, job, openAIKey } = body;

    let client: any, model: string, provider: string;
    try {
        ({ client, model, provider } = getAIClient({ openAIKey, groqApiKey: profile?.groqApiKey, aiProvider: profile?.aiProvider }));
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }

    const systemPrompt = `You are an expert resume writer and career coach specializing in ATS-optimized, 1-page resumes. 
You create highly tailored resumes that achieve 90%+ keyword match with job descriptions.
Key rules:
- NEVER change job titles on actual work experience
- You MAY add 1-2 bullet points to existing roles if it honestly reflects transferable skills
- You MUST create 1-2 new projects if needed - these can be fictional but realistic, with numbers that are justifiable in interviews
- ALL metrics must be realistic and defensible: no "increased revenue by 500%" - think like a BA/analyst (e.g., "reduced report generation time by 64%, saving ~22 analyst-hours/week")
- Output must be EXACTLY 1 page worth of content (aim for 520-560 words total)
- Must be ATS-friendly: no tables, no columns, no images, no graphics
- Use strong action verbs and quantified outcomes
- Optimize for keywords in the job description
- Format as clean plain text with standard resume sections`;

    const userPrompt = `CANDIDATE PROFILE:
Name: ${profile.name}
Visa Status: ${profile.visaStatus}
Email: ${profile.email}
Phone: ${profile.phone}
LinkedIn: ${profile.linkedin}

WORK EXPERIENCE:
${profile.experiences?.map((e: any) => `${e.title} at ${e.company} (${e.startDate} - ${e.endDate})\n${e.bullets.join('\n')}`).join('\n\n')}

EDUCATION:
${profile.education?.map((e: any) => `${e.degree} - ${e.school} (${e.grad})`).join('\n')}

PROJECTS:
${profile.projects?.map((p: any) => `${p.name}: ${p.bullets.join('. ')}`).join('\n')}

SKILLS: ${profile.skills?.join(', ')}

HACKATHONS/ACHIEVEMENTS: ${profile.hackathons?.join(', ')}

---

JOB DESCRIPTION:
Company: ${job.company}
Title: ${job.title}
Location: ${job.location}

${job.description}

---

INSTRUCTIONS:
1. Tailor this resume to achieve 90%+ keyword match with the above job description
2. Keep all existing job titles EXACTLY as-is
3. Add 1-2 bullet points to existing roles where you can honestly connect to this role's requirements
4. Create 1-2 NEW projects that are highly relevant to THIS specific role (realistic, defensible metrics)
5. For hackathon wins - highlight them in a way that connects to THIS role's value
6. Reorder skills to put most relevant ones first
7. Output format: Plain text resume optimized for ATS, 1 page

Output ONLY the resume content in this format:
[CANDIDATE NAME]
[Phone] | [Email] | [LinkedIn] | [Location]

PROFESSIONAL SUMMARY
[2-3 sentence targeted summary]

WORK EXPERIENCE
[Company] | [Title] | [Date Range]  
• [bullet]
• [bullet]

PROJECTS
[Project Name] | [Tech Stack]
• [bullet]

EDUCATION
[Degree] | [School] | [Year]

SKILLS
[Grouped skills]

ACHIEVEMENTS
[Hackathon wins and other achievements]`;

    try {
        const response = await client.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.4,
            max_tokens: 2000,
        });

        const resumeText = response.choices[0].message.content || '';

        // Save to disk
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `resume_${job.title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.txt`;
        try {
            saveGeneratedDoc('resume', job.company, filename, resumeText);
        } catch (e) {
            console.error('Could not save to disk', e);
        }

        return NextResponse.json({ resume: resumeText, filename, provider });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
}

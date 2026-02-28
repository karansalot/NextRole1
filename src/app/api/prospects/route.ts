import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DATA_DIR = path.join(os.homedir(), 'Documents', 'NextRole', '.data');
const PROSPECTS_FILE = path.join(DATA_DIR, 'prospects.json');

function loadProspects() {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        if (!fs.existsSync(PROSPECTS_FILE)) return [];
        return JSON.parse(fs.readFileSync(PROSPECTS_FILE, 'utf-8'));
    } catch { return []; }
}

function saveProspects(prospects: any[]) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PROSPECTS_FILE, JSON.stringify(prospects, null, 2));
}

// GET - load saved prospects
export async function GET() {
    return NextResponse.json(loadProspects());
}

// DELETE - remove a prospect
export async function DELETE(req: NextRequest) {
    const { id } = await req.json();
    const prospects = loadProspects().filter((p: any) => p.id !== id);
    saveProspects(prospects);
    return NextResponse.json({ ok: true });
}

// PUT - update prospect status / notes
export async function PUT(req: NextRequest) {
    const { id, updates } = await req.json();
    const prospects = loadProspects().map((p: any) => p.id === id ? { ...p, ...updates } : p);
    saveProspects(prospects);
    return NextResponse.json({ ok: true });
}

// POST - search for prospects + generate cold emails
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            openAIKey, hunterApiKey,
            industry,           // e.g. "AI/ML", "Fintech", "SaaS"
            companyStage,       // "Startup", "Series A", "Series B", "Growth"
            targetTitles,       // ["CEO", "CTO", "VP Engineering", "Founder"]
            location = 'United States',
            candidateProfile,   // UserProfile object
            count = 10,
        } = body;

        if (!openAIKey && !body.groqApiKey) return NextResponse.json({ error: 'Add a Groq (free) or OpenAI API key in Profile → API Keys' }, { status: 400 });

        let client: any, model: string;
        try { ({ client, model } = getAIClient({ openAIKey, groqApiKey: body.groqApiKey, aiProvider: body.aiProvider })); } catch (e: any) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }

        // Step 1: Ask AI for realistic US startup companies + people to target
        const searchPrompt = `You are a B2B sales researcher specializing in US tech startups.

Find ${count} real people in the US who fit this profile:
- Titles: ${(targetTitles || ['CEO', 'CTO', 'VP Engineering', 'Head of Product', 'Founder']).join(', ')}
- Industry: ${industry || 'tech / SaaS / AI'}
- Company stage: ${companyStage || 'Startup / Series A / Series B'}
- Location: United States

For each person, provide:
1. Real company name with US presence
2. Person's likely name and title (use real people from your training data where possible)
3. Company domain for email lookup
4. Their LinkedIn URL if you know it
5. Google X-Ray search to find them

Respond ONLY in this JSON format:
{
  "prospects": [
    {
      "name": "First Last",
      "title": "CEO",
      "company": "CompanyName",
      "companyDomain": "company.com",
      "companyStage": "Series A",
      "industry": "${industry || 'SaaS'}",
      "location": "San Francisco, CA",
      "linkedin": "linkedin.com/in/profile or null",
      "googleSearch": "site:linkedin.com/in \\\"First Last\\\" \\\"Company\\\"",
      "source": "ai"
    }
  ]
}`;

        const searchRes = await client.chat.completions.create({
            model,
            max_tokens: 1500,
            temperature: 0.4,
            messages: [
                { role: 'system', content: 'You are a research expert. Return valid JSON only.' },
                { role: 'user', content: searchPrompt }
            ]
        });

        const raw = searchRes.choices[0].message.content || '{}';
        const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
        const aiProspects = json.prospects || [];

        // Step 2: Try Hunter.io to find real emails for each prospect
        const enrichedProspects = [];

        for (const prospect of aiProspects) {
            let email = null;
            let emailConfidence = null;

            if (hunterApiKey && prospect.companyDomain) {
                try {
                    // Try email finder if we have a name
                    const nameParts = prospect.name.split(' ');
                    if (nameParts.length >= 2) {
                        const finderUrl = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(prospect.companyDomain)}&first_name=${encodeURIComponent(nameParts[0])}&last_name=${encodeURIComponent(nameParts.slice(1).join(' '))}&api_key=${hunterApiKey}`;
                        const fr = await fetch(finderUrl);
                        if (fr.ok) {
                            const fd = await fr.json();
                            if (fd.data?.email) {
                                email = fd.data.email;
                                emailConfidence = fd.data.score;
                            }
                        }
                    }

                    // If no individual email found, search domain for pattern
                    if (!email) {
                        const domainUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(prospect.companyDomain)}&api_key=${hunterApiKey}&limit=3`;
                        const dr = await fetch(domainUrl);
                        if (dr.ok) {
                            const dd = await dr.json();
                            const domainEmails = dd.data?.emails || [];
                            // Try to match by title seniority - prefer CEO/CTO/Founder emails
                            const seniorEmail = domainEmails.find((e: any) =>
                                ['ceo', 'cto', 'founder', 'vp', 'director', 'head'].some(t =>
                                    e.position?.toLowerCase().includes(t)
                                )
                            ) || domainEmails[0];
                            if (seniorEmail) {
                                email = seniorEmail.value;
                                emailConfidence = seniorEmail.confidence;
                            }
                        }
                    }
                } catch (e) {
                    // Hunter.io failed for this prospect, continue
                }
            }

            enrichedProspects.push({
                ...prospect,
                email,
                emailConfidence,
                source: email ? 'hunter.io' : 'ai',
            });
        }

        // Step 3: Generate personalized cold emails for each prospect
        if (candidateProfile && enrichedProspects.length > 0) {
            const candidateSummary = `
Candidate: ${candidateProfile.name}
Target Roles: ${candidateProfile.targetRoles?.join(', ')}
Skills: ${candidateProfile.skills?.slice(0, 10).join(', ')}
Hackathons: ${candidateProfile.hackathons?.join(', ')}
Visa: ${candidateProfile.visaStatus}
Summary: ${candidateProfile.summary || ''}
`.trim();

            for (const prospect of enrichedProspects) {
                try {
                    const emailRes = await client.chat.completions.create({
                        model,
                        max_tokens: 300,
                        temperature: 0.6,
                        messages: [{
                            role: 'user',
                            content: `Write a SHORT, human cold email (under 120 words) from a job seeker to ${prospect.name}, ${prospect.title} at ${prospect.company}.

Candidate info:
${candidateSummary}

Rules:
- Do NOT start with "I hope this email finds you well" or similar
- Reference something specific about ${prospect.company} or ${prospect.industry} industry
- Be direct: mention you're looking for ${candidateProfile.targetRoles?.[0] || 'a role'} opportunities
- 1 sentence about why you're a great fit (use a specific skill or hackathon win)
- Mention you're on OPT/visa and some companies sponsor — keep it brief, not apologetic
- End with a soft ask: 15-min call or if they can point you in the right direction
- Tone: confident, not desperate. Human, not template-sounding.

Also write a subject line (max 8 words, no "RE:" or "Following up").

Reply in JSON: {"subject": "...", "body": "..."}`
                        }]
                    });

                    const emailRaw = emailRes.choices[0].message.content || '{}';
                    const emailJson = JSON.parse(emailRaw.match(/\{[\s\S]*\}/)?.[0] || '{}');
                    prospect.coldEmail = emailJson.body;
                    prospect.emailSubject = emailJson.subject;
                } catch (e) {
                    // Email gen failed for this prospect
                }
            }
        }

        // Step 4: Save to local storage
        const existing = loadProspects();
        const newProspects = enrichedProspects.map(p => ({
            id: `prospect_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            ...p,
            status: 'new',
            savedAt: new Date().toISOString(),
        }));

        // Deduplicate by company+name
        const allProspects = [...existing];
        for (const np of newProspects) {
            const duplicate = allProspects.find(e => e.company === np.company && e.name === np.name);
            if (!duplicate) allProspects.push(np);
        }

        saveProspects(allProspects);

        return NextResponse.json({
            prospects: newProspects,
            totalSaved: allProspects.length,
            emailsFound: newProspects.filter(p => p.email).length,
        });

    } catch (error: any) {
        console.error('Prospects error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

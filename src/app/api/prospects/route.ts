import { NextRequest, NextResponse } from 'next/server';
import { getAIClient, getAnthropicClient } from '@/lib/ai';

// POST - search for prospects + generate cold emails
// All data is returned to client; client saves to localStorage
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            openAIKey, hunterApiKey,
            industry,
            companyStage,
            targetTitles,
            location = 'United States',
            candidateProfile,
            count = 10,
        } = body;

        if (!openAIKey && !body.groqApiKey && !body.anthropicApiKey) {
            return NextResponse.json({ error: 'Add a Groq (free), Claude, or OpenAI API key in Profile → API Keys' }, { status: 400 });
        }

        let client: any, model: string, provider: string;
        if (candidateProfile?.aiProvider === 'anthropic') {
            ({ client, model, provider } = getAnthropicClient(body.anthropicApiKey || candidateProfile?.anthropicApiKey));
        } else {
            ({ client, model, provider } = getAIClient({ openAIKey, groqApiKey: body.groqApiKey, aiProvider: body.aiProvider }));
        }
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

        const searchRes = await (provider === 'anthropic'
            ? client.messages.create({
                model, max_tokens: 1500, temperature: 0.4,
                system: 'You are a research expert. Return valid JSON only.',
                messages: [{ role: 'user', content: searchPrompt }]
            })
            : client.chat.completions.create({
                model, max_tokens: 1500, temperature: 0.4,
                messages: [
                    { role: 'system', content: 'You are a research expert. Return valid JSON only.' },
                    { role: 'user', content: searchPrompt }
                ]
            })
        );

        const raw = provider === 'anthropic'
            ? searchRes.content[0].text
            : (searchRes.choices[0].message.content || '{}');
        const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
        const aiProspects = json.prospects || [];

        // Step 2: Try Hunter.io to find real emails for each prospect
        const enrichedProspects = [];

        for (const prospect of aiProspects) {
            let email = null;
            let emailConfidence = null;

            if (hunterApiKey && prospect.companyDomain) {
                try {
                    const nameParts = prospect.name.split(' ');
                    if (nameParts.length >= 2) {
                        const finderUrl = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(prospect.companyDomain)}&first_name=${encodeURIComponent(nameParts[0])}&last_name=${encodeURIComponent(nameParts.slice(1).join(' '))}&api_key=${hunterApiKey}`;
                        const fr = await fetch(finderUrl);
                        if (fr.ok) {
                            const fd = await fr.json();
                            if (fd.data?.email) { email = fd.data.email; emailConfidence = fd.data.score; }
                        }
                    }
                    if (!email) {
                        const domainUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(prospect.companyDomain)}&api_key=${hunterApiKey}&limit=3`;
                        const dr = await fetch(domainUrl);
                        if (dr.ok) {
                            const dd = await dr.json();
                            const domainEmails = dd.data?.emails || [];
                            const seniorEmail = domainEmails.find((e: any) =>
                                ['ceo', 'cto', 'founder', 'vp', 'director', 'head'].some(t => e.position?.toLowerCase().includes(t))
                            ) || domainEmails[0];
                            if (seniorEmail) { email = seniorEmail.value; emailConfidence = seniorEmail.confidence; }
                        }
                    }
                } catch { }
            }

            enrichedProspects.push({ ...prospect, email, emailConfidence, source: email ? 'hunter.io' : 'ai' });
        }

        // Step 3: Generate personalized cold emails for each prospect
        if (candidateProfile && enrichedProspects.length > 0) {
            const candidateSummary = `Candidate: ${candidateProfile.name}\nTarget Roles: ${candidateProfile.targetRoles?.join(', ')}\nSkills: ${candidateProfile.skills?.slice(0, 10).join(', ')}\nHackathons: ${candidateProfile.hackathons?.join(', ')}\nVisa: ${candidateProfile.visaStatus}\nSummary: ${candidateProfile.summary || ''}`;

            for (const prospect of enrichedProspects) {
                try {
                    const emailPrompt = `Write a SHORT, human cold email (under 120 words) from a job seeker to ${prospect.name}, ${prospect.title} at ${prospect.company}.\n\nCandidate info:\n${candidateSummary}\n\nRules:\n- Do NOT start with "I hope this email finds you well"\n- Reference something specific about ${prospect.company} or ${prospect.industry} industry\n- Be direct: mention you're looking for ${candidateProfile.targetRoles?.[0] || 'a role'} opportunities\n- 1 sentence about why you're a great fit\n- Mention you're on OPT/visa and some companies sponsor - keep it brief, not apologetic\n- End with a soft ask: 15-min call\n- Tone: confident, not desperate. Human, not template-sounding.\n\nAlso write a subject line (max 8 words).\n\nReply in JSON: {"subject": "...", "body": "..."}`;

                    const emailRes = await (provider === 'anthropic'
                        ? client.messages.create({ model, max_tokens: 300, temperature: 0.6, system: 'Reply in JSON only', messages: [{ role: 'user', content: emailPrompt }] })
                        : client.chat.completions.create({ model, max_tokens: 300, temperature: 0.6, messages: [{ role: 'user', content: emailPrompt }] })
                    );

                    const emailRaw = provider === 'anthropic' ? emailRes.content[0].text : (emailRes.choices[0].message.content || '{}');
                    const emailJson = JSON.parse(emailRaw.match(/\{[\s\S]*\}/)?.[0] || '{}');
                    prospect.coldEmail = emailJson.body;
                    prospect.emailSubject = emailJson.subject;
                } catch { }
            }
        }

        // Return to client (client saves to localStorage)
        const newProspects = enrichedProspects.map(p => ({
            id: `prospect_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            ...p,
            status: 'new',
            savedAt: new Date().toISOString(),
        }));

        return NextResponse.json({
            prospects: newProspects,
            emailsFound: newProspects.filter(p => p.email).length,
        });

    } catch (error: any) {
        console.error('Prospects error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

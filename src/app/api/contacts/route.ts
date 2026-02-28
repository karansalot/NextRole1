import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai';

// POST /api/contacts
// Tries Hunter.io for real verified emails first, falls back to AI inference
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { company, jobTitle, openAIKey, hunterApiKey } = body;

        if (!company || !openAIKey) {
            return NextResponse.json({ error: 'company and AI key required' }, { status: 400 });
        }

        let client: any, model: string;
        try {
            ({ client, model } = getAIClient({ openAIKey, groqApiKey: body.groqApiKey, aiProvider: body.aiProvider }));
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        // --- Step 1: Try Hunter.io for real email data ---
        let hunterEmails: any[] = [];
        let hunterEmailFormats: string[] = [];
        let companyDomain = '';

        if (hunterApiKey) {
            try {
                // Try to guess domain from company name by asking AI
                const domainGuess = await client.chat.completions.create({
                    model,
                    max_tokens: 50,
                    messages: [{
                        role: 'user',
                        content: `What is the primary website domain for "${company}"? Reply with ONLY the domain like "stripe.com". No explanation.`
                    }]
                });
                companyDomain = domainGuess.choices[0].message.content?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '') || '';

                if (companyDomain) {
                    const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(companyDomain)}&api_key=${hunterApiKey}&limit=5&type=personal`;
                    const hunterRes = await fetch(hunterUrl);
                    if (hunterRes.ok) {
                        const hunterData = await hunterRes.json();
                        const data = hunterData.data;
                        hunterEmails = (data?.emails || []).slice(0, 5);
                        hunterEmailFormats = data?.pattern ? [data.pattern.replace('{f}', 'firstname').replace('{last}', 'lastname').replace('{domain}', companyDomain)] : [];
                        if (data?.organization) {
                            // Use pattern to construct hiring-manager style email
                        }
                    }
                }
            } catch (e) {
                console.error('Hunter.io error:', e);
            }
        }

        // --- Step 2: AI to identify likely hiring managers + enrich with Hunter data ---
        const hunterContext = hunterEmails.length > 0
            ? `Real emails found via Hunter.io at ${companyDomain}: ${JSON.stringify(hunterEmails.map(e => ({ name: `${e.first_name} ${e.last_name}`, email: e.value, title: e.position, confidence: e.confidence })))}`
            : `No real email data available — infer contacts based on company knowledge.`;

        const prompt = `You are a recruiting research expert.

Company: ${company}
Role being applied to: ${jobTitle || 'a software/business role'}
${hunterContext}

Your job:
1. Identify 2-3 likely hiring managers / decision makers for this role (Engineering Manager, Director, VP, Head of, Talent Acquisition, Recruiter)
2. For email, use the Hunter.io data if available. If you know real people from training data, include them. Otherwise clearly mark confidence as "low".
3. Provide actionable search strings.

Respond in this exact JSON format:
{
  "managers": [
    {
      "name": "First Last",
      "title": "Engineering Manager",
      "email": "first.last@company.com or null",
      "emailConfidence": 85,
      "linkedin": "linkedin.com/in/profile-url or null",
      "confidence": "high|medium|low",
      "reasoning": "Why this person is likely a decision maker"
    }
  ],
  "emailFormats": ["firstname.lastname@${companyDomain || 'company.com'}", "first@${companyDomain || 'company.com'}"],
  "googleXray": "site:linkedin.com/in \\\"${company}\\\" \\\"${jobTitle?.split(' ')[0] || 'engineering'}\\\" \\\"hiring\\\"",
  "linkedinSearch": "${company} ${jobTitle?.split(' ')[0] || ''} hiring manager",
  "outreachTip": "One actionable tip for reaching out to people at this company"
}`;

        const completion = await client.chat.completions.create({
            model,
            max_tokens: 600,
            temperature: 0.3,
            messages: [
                { role: 'system', content: 'You are a recruiting research expert. Always respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ],
        });

        const raw = completion.choices[0].message.content || '{}';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        const result = JSON.parse(jsonMatch?.[0] || '{}');

        // Merge hunter real emails into manager results if available
        if (hunterEmails.length > 0 && result.managers) {
            result.managers = result.managers.map((m: any, i: number) => {
                const hunterMatch = hunterEmails.find(h =>
                    m.name?.toLowerCase().includes(h.first_name?.toLowerCase()) ||
                    m.name?.toLowerCase().includes(h.last_name?.toLowerCase())
                );
                if (hunterMatch) {
                    return { ...m, email: hunterMatch.value, emailConfidence: hunterMatch.confidence, source: 'hunter.io', confidence: 'high' };
                }
                return m;
            });
        }

        if (hunterEmailFormats.length > 0 && !result.emailFormats?.length) {
            result.emailFormats = hunterEmailFormats;
        }

        result.companyDomain = companyDomain;
        result.hunterEmailsFound = hunterEmails.length;

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

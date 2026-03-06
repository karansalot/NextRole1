import { NextRequest, NextResponse } from 'next/server';

// Karan's core skills for local match scoring (no AI needed, instant)
const KARAN_SKILL_KEYWORDS = [
    'sql', 'python', 'power bi', 'tableau', 'business analyst', 'business analysis',
    'requirements gathering', 'requirements elicitation', 'etl', 'data modeling',
    'data warehouse', 'agile', 'scrum', 'jira', 'confluence', 'machine learning',
    'nlp', 'product strategy', 'product manager', 'product analyst', 'user research',
    'stakeholder', 'excel', 'tensorflow', 'aws', 'azure', 'snowflake', 'pandas',
    'a/b testing', 'statistical', 'predictive', 'brd', 'frd', 'user stories',
    'data analyst', 'program manager', 'project manager', 'cross-functional',
    'kpi', 'dashboard', 'visualization', 'analytics', 'data-driven', 'roadmap',
    'gap analysis', 'uat', 'operations', 'strategy', 'reporting', 'bi', 'langchain',
    'process improvement', 'process mapping', 'sprint', 'backlog',
];

function computeMatchScore(jobTitle: string, jobDescription: string, searchKeywords: string): number {
    const haystack = (jobTitle + ' ' + jobDescription).toLowerCase();
    const matched = KARAN_SKILL_KEYWORDS.filter(skill => haystack.includes(skill));
    let score = Math.min(88, Math.round((matched.length / KARAN_SKILL_KEYWORDS.length) * 100 * 3));
    const kw = (searchKeywords || '').toLowerCase().split(/\s+/);
    const titleLower = jobTitle.toLowerCase();
    const titleMatch = kw.some(k => k.length > 2 && titleLower.includes(k)) ||
        titleLower.includes('analyst') || titleLower.includes('product') ||
        titleLower.includes('manager') || titleLower.includes('operations') ||
        titleLower.includes('strategy') || titleLower.includes('data');
    if (titleMatch) score = Math.min(95, score + 15);
    return Math.max(25, score);
}

function detectH1bSponsorship(title: string, description: string): boolean {
    const text = (title + ' ' + description).toLowerCase();
    return text.includes('h1b') || text.includes('h-1b') || text.includes('visa sponsor') ||
        text.includes('sponsorship') || text.includes('opt') || text.includes('work authorization') ||
        text.includes('authorized to work') || text.includes('ead');
}

function stripHtml(html: string): string {
    return (html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function hoursAgo(dateStr: string): number {
    try {
        return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
    } catch { return 999; }
}

// POST /api/jobs/search
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { keywords, location, remote, visaFriendly, adzunaAppId, adzunaApiKey, page = 1 } = body;

        const results: any[] = [];
        const kw = keywords || 'Business Analyst';
        const loc = location || 'United States';

        // --- 1. Adzuna API (free key at developer.adzuna.com) ---
        if (adzunaAppId && adzunaApiKey) {
            try {
                const query = encodeURIComponent([kw, visaFriendly ? 'visa sponsorship' : ''].filter(Boolean).join(' '));
                const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/us/search/${page}?app_id=${adzunaAppId}&app_key=${adzunaApiKey}&results_per_page=20&what=${query}&where=${encodeURIComponent(loc)}&content-type=application/json&sort_by=date`;
                const adzRes = await fetch(adzunaUrl);
                if (adzRes.ok) {
                    const data = await adzRes.json();
                    for (const job of (data.results || [])) {
                        results.push({
                            id: `adzuna_${job.id}`,
                            title: job.title,
                            company: job.company?.display_name || 'Unknown',
                            location: job.location?.display_name || loc,
                            salary: job.salary_min ? `$${Math.round(job.salary_min / 1000)}k–$${Math.round((job.salary_max || job.salary_min * 1.3) / 1000)}k` : undefined,
                            description: job.description || '',
                            url: job.redirect_url,
                            source: 'Adzuna',
                            postedAt: job.created || new Date().toISOString(),
                            sponsorsVisa: detectH1bSponsorship(job.title, job.description),
                            matchScore: computeMatchScore(job.title, job.description, kw),
                            tags: [job.category?.label, remote ? 'Remote' : null].filter(Boolean),
                            status: 'discovered',
                        });
                    }
                }
            } catch (e) { console.error('Adzuna error', e); }
        }

        // --- 2. Remotive (FREE — remote jobs, no key needed) ---
        try {
            const kwLower = kw.toLowerCase();
            let categories = ['product', 'project-management'];
            if (kwLower.includes('data') || kwLower.includes('analyst')) categories = ['data', 'project-management'];
            else if (kwLower.includes('engineer') || kwLower.includes('software') || kwLower.includes('sde')) categories = ['software-dev'];
            else if (kwLower.includes('product')) categories = ['product'];

            for (const cat of categories.slice(0, 2)) {
                const remotiveUrl = `https://remotive.com/api/remote-jobs?category=${cat}&limit=20&search=${encodeURIComponent(kw)}`;
                const remotiveRes = await fetch(remotiveUrl, {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'NextRole/1.0' },
                    signal: AbortSignal.timeout(8000),
                });
                if (remotiveRes.ok) {
                    const remotiveData = await remotiveRes.json();
                    for (const job of (remotiveData.jobs || []).slice(0, 12)) {
                        const locationStr = (job.candidate_required_location || '').toLowerCase();
                        if (locationStr && !locationStr.includes('us') && !locationStr.includes('usa') &&
                            !locationStr.includes('united states') && !locationStr.includes('worldwide') &&
                            !locationStr.includes('anywhere') && !locationStr.includes('global')) continue;
                        const desc = stripHtml(job.description);
                        results.push({
                            id: `remotive_${job.id}`,
                            title: job.title,
                            company: job.company_name,
                            location: job.candidate_required_location || 'Remote – US',
                            salary: job.salary || undefined,
                            description: desc,
                            url: job.url,
                            source: 'Remotive',
                            postedAt: job.publication_date || new Date().toISOString(),
                            sponsorsVisa: detectH1bSponsorship(job.title, desc),
                            matchScore: computeMatchScore(job.title, desc, kw),
                            tags: ['Remote', ...(job.tags || []).slice(0, 3)],
                            status: 'discovered',
                        });
                    }
                }
            }
        } catch (e) { console.error('Remotive error', e); }

        // --- 3. RemoteOK (FREE — no key needed) ---
        try {
            const kwLower = kw.toLowerCase();
            const tag = kwLower.includes('data') ? 'analyst' :
                kwLower.includes('product') ? 'product' :
                    kwLower.includes('engineer') || kwLower.includes('software') ? 'engineer' : 'analyst';
            const remoteOkRes = await fetch(`https://remoteok.com/api?tag=${encodeURIComponent(tag)}`, {
                headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
                signal: AbortSignal.timeout(8000),
            });
            if (remoteOkRes.ok) {
                const allJobs = await remoteOkRes.json();
                const remoteOkJobs = Array.isArray(allJobs)
                    ? allJobs.filter((j: any) => j.id && j.company && j.position)
                    : [];
                for (const job of remoteOkJobs.slice(0, 15)) {
                    const desc = stripHtml(job.description || '');
                    results.push({
                        id: `remoteok_${job.id}`,
                        title: job.position,
                        company: job.company,
                        location: job.location || 'Remote – Worldwide',
                        salary: (job.salary_min && job.salary_max)
                            ? `$${Math.round(job.salary_min / 1000)}k–$${Math.round(job.salary_max / 1000)}k`
                            : job.salary_min ? `$${Math.round(job.salary_min / 1000)}k+` : undefined,
                        description: desc,
                        url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
                        source: 'RemoteOK',
                        postedAt: job.date ? new Date(parseInt(job.date) * 1000).toISOString() : new Date().toISOString(),
                        sponsorsVisa: detectH1bSponsorship(job.position, desc),
                        matchScore: computeMatchScore(job.position, desc, kw),
                        tags: ['Remote', ...(Array.isArray(job.tags) ? job.tags.slice(0, 3) : [])],
                        status: 'discovered',
                    });
                }
            }
        } catch (e) { console.error('RemoteOK error', e); }

        // --- 4. The Muse (FREE — no key needed, great tech companies) ---
        try {
            const kwLower = kw.toLowerCase();
            const museCategory = kwLower.includes('data') ? 'Data+and+Analytics' :
                kwLower.includes('product') ? 'Product' :
                    kwLower.includes('engineer') || kwLower.includes('software') ? 'Engineering' :
                        'Project+and+Program+Management';
            const museRes = await fetch(`https://www.themuse.com/api/public/jobs?category=${museCategory}&page=${page - 1}&descending=true`, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(8000),
            });
            if (museRes.ok) {
                const museData = await museRes.json();
                for (const job of (museData.results || []).slice(0, 10)) {
                    const locationNames = (job.locations || []).map((l: any) => l.name);
                    const locationStr = locationNames.join(', ') || 'US';
                    const isUS = !locationNames.length ||
                        locationNames.some((l: string) => /united states|new york|san francisco|seattle|chicago|austin|boston|los angeles|remote/i.test(l));
                    if (!isUS) continue;
                    const desc = stripHtml(job.contents || job.name);
                    results.push({
                        id: `muse_${job.id}`,
                        title: job.name,
                        company: job.company?.name || 'Unknown',
                        location: locationStr,
                        salary: undefined,
                        description: desc,
                        url: job.refs?.landing_page || '',
                        source: 'The Muse',
                        postedAt: job.publication_date || new Date().toISOString(),
                        sponsorsVisa: detectH1bSponsorship(job.name, desc),
                        matchScore: computeMatchScore(job.name, desc, kw),
                        tags: [(job.levels || [])[0]?.name, ...(job.functions || []).map((f: any) => f.name)].filter(Boolean).slice(0, 3),
                        status: 'discovered',
                    });
                }
            }
        } catch (e) { console.error('The Muse error', e); }

        // --- 5. USAJobs (FREE — no key needed) ---
        try {
            const usaRes = await fetch(
                `https://data.usajobs.gov/api/search?Keyword=${encodeURIComponent(kw)}&LocationName=${encodeURIComponent(loc)}&ResultsPerPage=10&DatePosted=7`,
                { headers: { 'Host': 'data.usajobs.gov', 'User-Agent': 'nextrole-app/1.0' }, signal: AbortSignal.timeout(8000) }
            );
            if (usaRes.ok) {
                const usaData = await usaRes.json();
                for (const item of (usaData.SearchResult?.SearchResultItems || [])) {
                    const pos = item.MatchedObjectDescriptor;
                    const desc = pos?.UserArea?.Details?.JobSummary || pos?.PositionTitle || '';
                    results.push({
                        id: `usajobs_${pos?.PositionID || Math.random()}`,
                        title: pos?.PositionTitle || 'Unknown',
                        company: pos?.OrganizationName || 'US Government',
                        location: pos?.PositionLocation?.[0]?.LocationName || 'US',
                        salary: pos?.PositionRemuneration?.[0]
                            ? `$${parseInt(pos.PositionRemuneration[0].MinimumRange).toLocaleString()}–$${parseInt(pos.PositionRemuneration[0].MaximumRange).toLocaleString()}`
                            : undefined,
                        description: desc,
                        url: pos?.PositionURI || '',
                        source: 'USAJobs',
                        postedAt: pos?.PublicationStartDate || new Date().toISOString(),
                        sponsorsVisa: false,
                        matchScore: computeMatchScore(pos?.PositionTitle || '', desc, kw),
                        tags: ['Government'],
                        status: 'discovered',
                    });
                }
            }
        } catch (e) { console.error('USAJobs error', e); }

        // --- Fallback: demo jobs when no results ---
        if (results.length === 0) {
            results.push(...getMockJobs(kw, loc));
        }

        // Filter by visa if requested (only strict filter when we have real results)
        const visaFiltered = visaFriendly ? results.filter(j => j.sponsorsVisa) : results;
        const toReturn = (visaFiltered.length > 3) ? visaFiltered : results;

        // Sort: highest match + freshest first
        toReturn.sort((a, b) => {
            const freshBoostA = hoursAgo(a.postedAt) < 24 ? 20 : hoursAgo(a.postedAt) < 72 ? 10 : 0;
            const freshBoostB = hoursAgo(b.postedAt) < 24 ? 20 : hoursAgo(b.postedAt) < 72 ? 10 : 0;
            return ((b.matchScore || 0) + freshBoostB) - ((a.matchScore || 0) + freshBoostA);
        });

        return NextResponse.json({ jobs: toReturn, total: toReturn.length });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

function getMockJobs(keywords: string, location: string) {
    return [
        {
            id: 'mock_1', title: 'Business Analyst – AI Products', company: 'Stripe',
            location: 'San Francisco, CA (Hybrid)', salary: '$110k–$145k',
            description: `Looking for a Business Analyst for our AI Products team. Work with PMs, engineers, and data scientists to define requirements, analyze user data, and drive strategic initiatives. Strong SQL, Power BI/Tableau, stakeholder management. H1B/OPT sponsorship available.`,
            url: 'https://stripe.com/jobs', source: 'Demo – Add API Keys',
            postedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
            sponsorsVisa: true, matchScore: 92, tags: ['Hybrid', 'H1B ✓', 'Fintech'], status: 'discovered',
        },
        {
            id: 'mock_2', title: 'Product Manager, Data Platform', company: 'Databricks',
            location: 'Remote – US', salary: '$130k–$175k',
            description: `PM for Data Platform team. Own the roadmap for data ingestion/processing features. Conduct customer interviews, define PRDs, analyze usage metrics with SQL/Python. Stakeholder management, agile scrum. H1B/OPT sponsorship provided.`,
            url: 'https://databricks.com/company/careers', source: 'Demo – Add API Keys',
            postedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
            sponsorsVisa: true, matchScore: 89, tags: ['Remote', 'H1B ✓', 'Data'], status: 'discovered',
        },
        {
            id: 'mock_3', title: 'Strategy & Operations Associate', company: 'Notion',
            location: 'Remote – US', salary: '$100k–$135k',
            description: `Strategy & Ops role. Lead cross-functional strategic initiatives. Build financial models, own KPI metrics and operational cadences. SQL, data analysis tools, process improvement, roadmap planning. H1B/OPT visa sponsorship available.`,
            url: 'https://www.notion.so/careers', source: 'Demo – Add API Keys',
            postedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
            sponsorsVisa: true, matchScore: 87, tags: ['Remote', 'H1B ✓', 'Strategy'], status: 'discovered',
        },
        {
            id: 'mock_4', title: 'Data Analyst – Growth', company: 'Figma',
            location: 'San Francisco, CA (Hybrid)', salary: '$115k–$150k',
            description: `Growth Data Analyst. Build dashboards (Tableau/Power BI), design A/B tests, cohort analyses. Advanced SQL, Python (Pandas), ETL pipeline experience. Stakeholder management, data-driven product decisions. H1B/OPT sponsorship available.`,
            url: 'https://www.figma.com/careers', source: 'Demo – Add API Keys',
            postedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
            sponsorsVisa: true, matchScore: 91, tags: ['Hybrid', 'H1B ✓', 'Growth'], status: 'discovered',
        },
        {
            id: 'mock_5', title: 'Product Analyst – Marketplace', company: 'Airbnb',
            location: 'San Francisco, CA (Hybrid)', salary: '$120k–$155k',
            description: `Product Analyst for Growth and Marketplace. Define, build and own core metrics. SQL, Python (Pandas), A/B testing frameworks, experiment analysis. Power BI or Tableau dashboards, ETL pipelines, data modeling, agile/scrum. H1B OPT sponsorship available.`,
            url: 'https://careers.airbnb.com', source: 'Demo – Add API Keys',
            postedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
            sponsorsVisa: true, matchScore: 90, tags: ['Hybrid', 'H1B ✓', 'Marketplace'], status: 'discovered',
        },
        {
            id: 'mock_6', title: 'Operations Analyst', company: 'DoorDash',
            location: 'New York, NY (Hybrid)', salary: '$90k–$120k',
            description: `Analyze end-to-end operational workflows, build dashboards (Tableau, Power BI), drive A/B tests. SQL, Excel, data visualization, process improvement, cross-functional collaboration, KPI tracking. Visa sponsorship considered.`,
            url: 'https://careers.doordash.com', source: 'Demo – Add API Keys',
            postedAt: new Date(Date.now() - 36 * 3600000).toISOString(),
            sponsorsVisa: true, matchScore: 85, tags: ['Hybrid', 'H1B Considered', 'Operations', 'NYC'], status: 'discovered',
        },
    ];
}

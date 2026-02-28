import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// POST /api/jobs/search
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { keywords, location, remote, visaFriendly, adzunaAppId, adzunaApiKey, page = 1 } = body;

        const results: any[] = [];

        // --- Adzuna API ---
        if (adzunaAppId && adzunaApiKey) {
            try {
                const query = encodeURIComponent(
                    [keywords, visaFriendly ? 'H1B visa sponsorship' : ''].filter(Boolean).join(' ')
                );
                const loc = encodeURIComponent(location || 'United States');
                const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/us/search/${page}?app_id=${adzunaAppId}&app_key=${adzunaApiKey}&results_per_page=20&what=${query}&where=${loc}&content-type=application/json`;
                const adzRes = await fetch(adzunaUrl);
                if (adzRes.ok) {
                    const data = await adzRes.json();
                    for (const job of (data.results || [])) {
                        results.push({
                            id: `adzuna_${job.id}`,
                            title: job.title,
                            company: job.company?.display_name || 'Unknown',
                            location: job.location?.display_name || location || 'US',
                            salary: job.salary_min
                                ? `$${Math.round(job.salary_min / 1000)}k-$${Math.round((job.salary_max || job.salary_min * 1.3) / 1000)}k`
                                : undefined,
                            description: job.description,
                            url: job.redirect_url,
                            source: 'Adzuna',
                            postedAt: job.created || new Date().toISOString(),
                            sponsorsVisa: visaFriendly,
                            tags: [job.category?.label, remote ? 'Remote' : null].filter(Boolean),
                            status: 'discovered',
                        });
                    }
                }
            } catch (e) {
                console.error('Adzuna error', e);
            }
        }

        // --- USAJobs (free, no key needed) ---
        try {
            const q = encodeURIComponent(keywords || 'business analyst');
            const usaJobsUrl = `https://data.usajobs.gov/api/search?Keyword=${q}&LocationName=${encodeURIComponent(location || 'United States')}&ResultsPerPage=10`;
            const usaRes = await fetch(usaJobsUrl, {
                headers: { 'Host': 'data.usajobs.gov', 'User-Agent': 'nextrole-app/1.0' }
            });
            if (usaRes.ok) {
                const usaData = await usaRes.json();
                for (const item of (usaData.SearchResult?.SearchResultItems || [])) {
                    const pos = item.MatchedObjectDescriptor;
                    results.push({
                        id: `usajobs_${pos?.PositionID || Math.random()}`,
                        title: pos?.PositionTitle || 'Unknown',
                        company: pos?.OrganizationName || 'US Government',
                        location: pos?.PositionLocation?.[0]?.LocationName || 'US',
                        salary: pos?.PositionRemuneration?.[0]
                            ? `$${parseInt(pos.PositionRemuneration[0].MinimumRange).toLocaleString()}-$${parseInt(pos.PositionRemuneration[0].MaximumRange).toLocaleString()}`
                            : undefined,
                        description: pos?.UserArea?.Details?.JobSummary || pos?.PositionTitle || '',
                        url: pos?.PositionURI || '',
                        source: 'USAJobs',
                        postedAt: pos?.PublicationStartDate || new Date().toISOString(),
                        sponsorsVisa: false,
                        tags: ['Government', 'US Citizen Required'],
                        status: 'discovered',
                    });
                }
            }
        } catch (e) {
            console.error('USAJobs error', e);
        }

        // --- Fallback mock data for demo when no API keys ---
        if (results.length === 0) {
            const mockJobs = getMockJobs(keywords || 'business analyst', location || 'US');
            results.push(...mockJobs);
        }

        // Sort newest first
        results.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

        return NextResponse.json({ jobs: results, total: results.length });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

function getMockJobs(keywords: string, location: string) {
    const roles = [
        {
            id: 'mock_1',
            title: 'Business Analyst - AI Products',
            company: 'Stripe',
            location: 'San Francisco, CA (Hybrid)',
            salary: '$110k-$145k',
            description: `We are looking for a Business Analyst to join our AI Products team. You will work closely with product managers, engineers, and data scientists to define product requirements, analyze user data, and drive strategic initiatives. The ideal candidate has experience with SQL, data visualization, and cross-functional collaboration. H1B sponsorship available for exceptional candidates.\n\nResponsibilities:\n- Define requirements and success metrics for new product features\n- Analyze large datasets to identify trends and opportunities\n- Create dashboards and reports for leadership\n- Collaborate with engineering on technical feasibility\n- Drive stakeholder alignment across teams\n\nRequirements:\n- 2-4 years BA/PM experience\n- Strong SQL and Excel/Google Sheets skills\n- Experience with Tableau, Looker, or similar\n- Excellent communication skills\n- Comfort with ambiguity in fast-paced environments`,
            url: 'https://stripe.com/jobs',
            source: 'Demo (Add API Keys)',
            postedAt: new Date(Date.now() - 86400000).toISOString(),
            sponsorsVisa: true,
            tags: ['Hybrid', 'H1B Friendly', 'Fintech'],
            status: 'discovered',
        },
        {
            id: 'mock_2',
            title: 'Product Manager, Data Platform',
            company: 'Databricks',
            location: 'Remote - US',
            salary: '$130k-$175k',
            description: `Databricks is looking for a Product Manager to join our Data Platform team. You will own the roadmap for our core data ingestion and processing features used by thousands of customers globally. H1B/OPT sponsorship is provided.\n\nResponsibilities:\n- Own the product roadmap for data platform features\n- Conduct customer interviews and synthesize feedback\n- Define detailed PRDs with engineering partners\n- Analyze usage metrics to inform prioritization\n- Launch new features and drive adoption\n\nRequirements:\n- 3+ years of product management experience\n- Technical background (CS degree or equivalent)\n- Experience with data / analytics products\n- Strong SQL and data analysis skills\n- Outstanding written and verbal communication`,
            url: 'https://databricks.com/company/careers',
            source: 'Demo (Add API Keys)',
            postedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            sponsorsVisa: true,
            tags: ['Remote', 'H1B Friendly', 'Data', 'Tech'],
            status: 'discovered',
        },
        {
            id: 'mock_3',
            title: 'Operations Analyst',
            company: 'DoorDash',
            location: 'New York, NY (On-site)',
            salary: '$90k-$120k',
            description: `DoorDash is seeking an Operations Analyst to help us streamline merchant onboarding and delivery operations. You will use data to identify process inefficiencies and work cross-functionally to implement improvements.\n\nResponsibilities:\n- Analyze end-to-end operational workflows to find bottlenecks\n- Build dashboards and automated reports for ops teams\n- Drive A/B tests and measure impact of process changes\n- Present findings to senior leadership\n- Partner with product and engineering on tooling improvements\n\nRequirements:\n- 1-3 years in ops, strategy, or analytics roles\n- Proficiency in SQL and Excel\n- Experience with data viz tools (Tableau/Looker)\n- Strong attention to detail and structured thinking\n- Visa sponsorship considered for exceptional candidates`,
            url: 'https://careers.doordash.com',
            source: 'Demo (Add API Keys)',
            postedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
            sponsorsVisa: true,
            tags: ['On-site', 'H1B Considered', 'Operations', 'NYC'],
            status: 'discovered',
        },
        {
            id: 'mock_4',
            title: 'Data Analyst - Growth',
            company: 'Figma',
            location: 'San Francisco, CA (Hybrid)',
            salary: '$115k-$150k',
            description: `The Growth team at Figma is hiring a Data Analyst to help us understand user acquisition, activation, and retention. You'll build models, design experiments, and help product and marketing teams make data-driven decisions.\n\nResponsibilities:\n- Build and maintain core growth metrics dashboards\n- Design and analyze A/B experiments\n- Create user segmentation and cohort analyses\n- Partner with growth PM and marketing on funnel optimization\n- Present insights and recommendations to leadership\n\nRequirements:\n- 2-4 years of data analytics experience\n- Advanced SQL (window functions, CTEs)\n- Experience with Python or R for statistical analysis\n- Experience with dbt, Airflow, or similar data tools\n- H1B/OPT sponsorship available`,
            url: 'https://www.figma.com/careers',
            source: 'Demo (Add API Keys)',
            postedAt: new Date(Date.now() - 86400000).toISOString(),
            sponsorsVisa: true,
            tags: ['Hybrid', 'H1B Friendly', 'Growth', 'Design Tech'],
            status: 'discovered',
        },
        {
            id: 'mock_5',
            title: 'Strategy & Operations Associate',
            company: 'Notion',
            location: 'Remote - US',
            salary: '$100k-$135k',
            description: `Notion is looking for a Strategy & Operations Associate to help scale our go-to-market and business operations. You'll work on high-impact strategic projects and help leadership make better decisions with data.\n\nResponsibilities:\n- Lead cross-functional strategic initiatives from scoping to delivery\n- Build financial models and business cases for new initiatives\n- Own operational metrics and cadences for key business functions\n- Identify and implement process improvements\n- Help plan and execute quarterly and annual business planning\n\nRequirements:\n- 2-4 years experience in consulting, ops, or strategy roles\n- Strong modeling and analytical skills\n- Comfort with SQL and data analysis tools\n- Excellent executive communication skills\n- H1B/OPT visa sponsorship available`,
            url: 'https://www.notion.so/careers',
            source: 'Demo (Add API Keys)',
            postedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
            sponsorsVisa: true,
            tags: ['Remote', 'H1B Friendly', 'Strategy', 'Startup'],
            status: 'discovered',
        },
    ];
    return roles;
}

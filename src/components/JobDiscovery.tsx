'use client';
import { useState, useCallback } from 'react';
import { Job, UserProfile, Application, JobSearchFilters } from '@/lib/types';
import JobDetailModal from './JobDetailModal';

interface Props {
    profile: UserProfile | null;
    savedJobs: Job[];
    setSavedJobs: React.Dispatch<React.SetStateAction<Job[]>>;
    onSaveApp: (app: Application) => void;
    applications: Application[];
}

const DEFAULT_FILTERS: JobSearchFilters = {
    keywords: 'Business Analyst',
    location: 'United States',
    remote: true,
    hybrid: true,
    onsite: true,
    visaFriendly: true,
};

// All job platforms Karan wants to use — with pre-filled search URLs
const PLATFORMS = [
    {
        name: 'Wellfound', icon: '🚀', color: '#F97316', badge: 'Startups',
        url: (kw: string) => `https://wellfound.com/jobs?q=${encodeURIComponent(kw)}&l=United+States`,
        desc: 'Startup jobs with visa filter',
    },
    {
        name: 'Built In', icon: '🏙️', color: '#6366F1', badge: 'Tech',
        url: (kw: string) => `https://builtin.com/jobs?title=${encodeURIComponent(kw)}`,
        desc: 'US tech company jobs',
    },
    {
        name: 'Hiring Cafe', icon: '☕', color: '#10B981', badge: 'New',
        url: (kw: string) => `https://hiring.cafe/?q=${encodeURIComponent(kw)}`,
        desc: 'AI-curated fresh openings',
    },
    {
        name: 'Career Vault', icon: '🏦', color: '#3B82F6', badge: 'Curated',
        url: (kw: string) => `https://careervault.io/?query=${encodeURIComponent(kw)}`,
        desc: 'Curated tech & startup roles',
    },
    {
        name: 'Stamplist', icon: '🛂', color: '#8B5CF6', badge: 'H1B',
        url: (_kw: string) => `https://stamplist.com/`,
        desc: 'Jobs with visa sponsorship only',
    },
    {
        name: 'The Hub', icon: '🌐', color: '#EC4899', badge: 'Startups',
        url: (kw: string) => `https://www.thehub.io/jobs?roles=${encodeURIComponent(kw)}`,
        desc: '100+ startups hiring new grads',
    },
    {
        name: "Brian's List", icon: '📋', color: '#F59E0B', badge: 'Free',
        url: (_kw: string) => `https://brianstarter.com/`,
        desc: 'Curated entry-level roles',
    },
    {
        name: 'HiringLat', icon: '🌎', color: '#14B8A6', badge: 'Remote',
        url: (kw: string) => `https://hiring.lat/?query=${encodeURIComponent(kw)}`,
        desc: 'Remote-first global jobs',
    },
    {
        name: 'Startup Gallery', icon: '🖼️', color: '#F43F5E', badge: 'Startups',
        url: (kw: string) => `https://startups.gallery/?q=${encodeURIComponent(kw)}`,
        desc: 'Discover early-stage startups',
    },
    {
        name: 'Venture Loop', icon: '🔄', color: '#06B6D4', badge: 'VC-Backed',
        url: (_kw: string) => `https://www.ventureloop.com/ventureloop/job_listing.php`,
        desc: 'VC-backed startup jobs',
    },
    {
        name: 'LinkedIn', icon: '💼', color: '#0A66C2', badge: 'Top Source',
        url: (kw: string) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(kw)}&f_WT=2&f_TPR=r86400&sortBy=DD`,
        desc: 'Posted today, sorted newest',
    },
    {
        name: 'Indeed', icon: '🔍', color: '#2164F3', badge: 'Volume',
        url: (kw: string) => `https://www.indeed.com/jobs?q=${encodeURIComponent(kw)}&fromage=1&sort=date`,
        desc: 'Last 24h, sorted by date',
    },
];

// Multi-role search presets for Karan
const ROLE_PRESETS = [
    { label: 'Business Analyst', keywords: 'Business Analyst', icon: '📊' },
    { label: 'Product Manager', keywords: 'Product Manager', icon: '🎯' },
    { label: 'Data Analyst', keywords: 'Data Analyst', icon: '📈' },
    { label: 'Product Analyst', keywords: 'Product Analyst', icon: '🔬' },
    { label: 'Ops & Strategy', keywords: 'Strategy Operations Associate', icon: '⚙️' },
    { label: 'Program Manager', keywords: 'Program Manager', icon: '🗂️' },
    { label: 'Project Manager', keywords: 'Project Manager', icon: '📅' },
    { label: 'SDE / Engineer', keywords: 'Software Engineer Product', icon: '💻' },
];

function getFreshnessLabel(postedAt: string): { label: string; color: string } | null {
    const hrs = (Date.now() - new Date(postedAt).getTime()) / (1000 * 60 * 60);
    if (hrs < 3) return { label: '🔥 Just posted', color: '#F97316' };
    if (hrs < 12) return { label: '⚡ < 12h ago', color: '#EAB308' };
    if (hrs < 24) return { label: '✨ Today', color: '#10B981' };
    if (hrs < 72) return { label: '📅 < 3 days', color: '#6366F1' };
    return null;
}

function getApplicantEstimate(postedAt: string): string | null {
    const hrs = (Date.now() - new Date(postedAt).getTime()) / (1000 * 60 * 60);
    if (hrs < 2) return '🏆 Top 10 applicants';
    if (hrs < 6) return '🥇 Top 25 applicants';
    if (hrs < 12) return '⚡ Top 50 applicants';
    if (hrs < 24) return '🎯 Top 100 applicants';
    return null;
}

export default function JobDiscovery({ profile, savedJobs, setSavedJobs, onSaveApp, applications }: Props) {
    const [filters, setFilters] = useState<JobSearchFilters>(DEFAULT_FILTERS);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [searched, setSearched] = useState(false);
    const [page, setPage] = useState(1);
    const [showPlatforms, setShowPlatforms] = useState(true);

    const savedIds = new Set(savedJobs.map(j => j.id));
    const appliedIds = new Set(applications.map(a => a.job.id));

    const search = useCallback(async (p = 1) => {
        setLoading(true);
        setSearched(true);
        setShowPlatforms(false);
        try {
            const res = await fetch('/api/jobs/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...filters,
                    adzunaAppId: profile?.adzunaAppId,
                    adzunaApiKey: profile?.adzunaApiKey,
                    page: p
                }),
            });
            const data = await res.json();
            if (p === 1) setJobs(data.jobs || []);
            else setJobs(prev => [...prev, ...(data.jobs || [])]);
            setPage(p);
        } finally {
            setLoading(false);
        }
    }, [filters, profile]);

    const saveJob = (job: Job) => {
        setSavedJobs(prev => savedIds.has(job.id) ? prev.filter(j => j.id !== job.id) : [...prev, job]);
    };

    const getMatchColor = (score?: number) => {
        if (!score) return 'match-low';
        if (score >= 80) return 'match-high';
        if (score >= 60) return 'match-mid';
        return 'match-low';
    };

    const workModes = [
        { key: 'remote', label: 'Remote' },
        { key: 'hybrid', label: 'Hybrid' },
        { key: 'onsite', label: 'On-site' },
    ] as const;

    const SOURCE_COLORS: Record<string, string> = {
        'Adzuna': '#F59E0B',
        'Remotive': '#10B981',
        'RemoteOK': '#3B82F6',
        'The Muse': '#EC4899',
        'USAJobs': '#6366F1',
        'Demo – Add API Keys': '#6B7280',
    };

    return (
        <div style={{ padding: '28px 32px' }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 4 }}>
                    Discover Jobs
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    AI match scoring across Remotive, RemoteOK, The Muse, Adzuna, USAJobs + 12 platform launchers
                </p>
            </div>

            {/* Role quick presets */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {ROLE_PRESETS.map(preset => (
                    <button
                        key={preset.keywords}
                        onClick={() => {
                            setFilters(f => ({ ...f, keywords: preset.keywords }));
                        }}
                        style={{
                            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border: `1px solid ${filters.keywords === preset.keywords ? 'var(--accent)' : 'var(--border)'}`,
                            background: filters.keywords === preset.keywords ? 'var(--accent-glow)' : 'transparent',
                            color: filters.keywords === preset.keywords ? 'var(--accent)' : 'var(--text-muted)',
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: 5,
                        }}
                    >
                        {preset.icon} {preset.label}
                    </button>
                ))}
            </div>

            {/* Search bar */}
            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                        <label className="label">Job Title / Keywords</label>
                        <input
                            className="input"
                            placeholder="Business Analyst, Product Manager, Data Analyst..."
                            value={filters.keywords}
                            onChange={e => setFilters(f => ({ ...f, keywords: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && search(1)}
                        />
                    </div>
                    <div>
                        <label className="label">Location</label>
                        <input
                            className="input"
                            placeholder="New York, NY or United States"
                            value={filters.location}
                            onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && search(1)}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    {workModes.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                            style={{
                                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                border: `1px solid ${filters[key] ? 'var(--accent)' : 'var(--border)'}`,
                                background: filters[key] ? 'var(--accent-glow)' : 'transparent',
                                color: filters[key] ? 'var(--accent)' : 'var(--text-muted)',
                                transition: 'all 0.15s',
                            }}
                        >{label}</button>
                    ))}
                    <button
                        onClick={() => setFilters(f => ({ ...f, visaFriendly: !f.visaFriendly }))}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border: `1px solid ${filters.visaFriendly ? '#10B981' : 'var(--border)'}`,
                            background: filters.visaFriendly ? 'rgba(16,185,129,0.08)' : 'transparent',
                            color: filters.visaFriendly ? '#10B981' : 'var(--text-muted)',
                            transition: 'all 0.15s',
                        }}
                    >
                        🛂 {filters.visaFriendly ? 'H1B/OPT Filter ON' : 'All Visas'}
                    </button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '7px 14px' }}
                            onClick={() => setShowPlatforms(v => !v)}>
                            {showPlatforms ? '🗂️ Hide Platforms' : '🗂️ Show Platforms'}
                        </button>
                        <button className="btn-primary" onClick={() => search(1)} disabled={loading}
                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {loading ? <span className="spinner" /> : '🔍'}
                            {loading ? 'Searching...' : 'Search Jobs'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Platform Launcher */}
            {showPlatforms && (
                <div className="card" style={{ padding: 20, marginBottom: 20, borderColor: 'rgba(79,142,247,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                                🚀 Platform Launcher
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                Click to open each platform pre-filled with "{filters.keywords}" — be first 50 applicants on fresh posts
                            </div>
                        </div>
                        <button
                            className="btn-primary"
                            style={{ fontSize: 12, padding: '7px 16px' }}
                            onClick={() => {
                                // Open all platforms at once
                                PLATFORMS.forEach(p => window.open(p.url(filters.keywords), '_blank'));
                            }}
                        >
                            ⚡ Open All ({PLATFORMS.length})
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {PLATFORMS.map(platform => (
                            <a
                                key={platform.name}
                                href={platform.url(filters.keywords)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none' }}
                            >
                                <div
                                    style={{
                                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                                        border: `1px solid var(--border)`,
                                        background: 'var(--bg-secondary)',
                                        transition: 'all 0.15s',
                                        display: 'flex', flexDirection: 'column', gap: 4,
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLDivElement).style.borderColor = platform.color;
                                        (e.currentTarget as HTMLDivElement).style.background = `${platform.color}10`;
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                                        (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-secondary)';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 16 }}>{platform.icon}</span>
                                        <span style={{
                                            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                            background: `${platform.color}20`, color: platform.color,
                                        }}>{platform.badge}</span>
                                    </div>
                                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{platform.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.3 }}>{platform.desc}</div>
                                </div>
                            </a>
                        ))}
                    </div>
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(79,142,247,0.06)', borderRadius: 8, border: '1px solid rgba(79,142,247,0.15)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <strong style={{ color: '#4F8EF7' }}>💡 Pro Tip:</strong> For "first 50 applicants" — filter by "posted today" or "last 24h" on each platform. LinkedIn: use <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: 3 }}>f_TPR=r3600</code> for last hour. Set job alerts on all platforms for instant notifications.
                        </div>
                    </div>
                </div>
            )}

            {/* Results header */}
            {searched && !loading && jobs.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Found <strong style={{ color: 'var(--text-primary)' }}>{jobs.length}</strong> positions
                        {filters.visaFriendly && <span style={{ color: '#34d399', marginLeft: 8 }}>• H1B/OPT filter on</span>}
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                            — sorted by match score + freshness
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}
                            onClick={() => setSavedJobs(prev => {
                                const ids = new Set(prev.map(j => j.id));
                                return [...prev, ...jobs.filter(j => !ids.has(j.id))];
                            })}>
                            + Save All to Batch Apply
                        </button>
                    </div>
                </div>
            )}

            {/* No results */}
            {searched && !loading && jobs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
                    <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 6 }}>No jobs found</div>
                    <div style={{ fontSize: 13 }}>Try broader keywords or add your Adzuna API keys in Profile for more results</div>
                </div>
            )}

            {/* Job cards */}
            {jobs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {jobs.map(job => {
                        const isSaved = savedIds.has(job.id);
                        const isApplied = appliedIds.has(job.id);
                        const freshness = getFreshnessLabel(job.postedAt);
                        const applicantEstimate = getApplicantEstimate(job.postedAt);
                        const sourceColor = SOURCE_COLORS[job.source] || '#6B7280';

                        return (
                            <div
                                key={job.id}
                                className="card"
                                style={{
                                    padding: '16px 20px', cursor: 'pointer', transition: 'all 0.2s',
                                    ...(freshness && { borderColor: 'rgba(16,185,129,0.2)' }),
                                }}
                                onClick={() => setSelectedJob(job)}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                    {/* Match ring */}
                                    <div className={`match-ring ${getMatchColor(job.matchScore)}`}>
                                        {job.matchScore ? `${job.matchScore}%` : '—'}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                                            <h3 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{job.title}</h3>
                                            {job.sponsorsVisa && <span className="badge badge-green" style={{ fontSize: 9 }}>H1B ✓</span>}
                                            {isApplied && <span className="badge badge-purple" style={{ fontSize: 9 }}>Applied</span>}
                                            {freshness && (
                                                <span style={{
                                                    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                                                    background: `${freshness.color}20`, color: freshness.color,
                                                }}>{freshness.label}</span>
                                            )}
                                            {applicantEstimate && (
                                                <span style={{
                                                    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                                                    background: 'rgba(79,142,247,0.1)', color: '#4F8EF7',
                                                }}>{applicantEstimate}</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                            {job.company} · {job.location}
                                            {job.salary && <span style={{ color: '#10B981', marginLeft: 6 }}>· {job.salary}</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                            {job.tags?.slice(0, 4).map(t => <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>)}
                                            <span style={{
                                                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                                                background: `${sourceColor}15`, color: sourceColor,
                                            }}>via {job.source}</span>
                                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                · {new Date(job.postedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                        <button
                                            className="btn-secondary"
                                            style={{
                                                padding: '6px 14px', fontSize: 12,
                                                borderColor: isSaved ? 'var(--accent)' : undefined,
                                                color: isSaved ? 'var(--accent)' : undefined,
                                            }}
                                            onClick={() => saveJob(job)}
                                        >
                                            {isSaved ? '★ Saved' : '☆ Save'}
                                        </button>
                                        <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}
                                            onClick={() => setSelectedJob(job)}>
                                            View →
                                        </button>
                                    </div>
                                </div>

                                {/* Description preview */}
                                <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginLeft: 66 }}>
                                    {(job.description || '').slice(0, 200).replace(/\n/g, ' ')}...
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Load more */}
            {jobs.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <button className="btn-secondary" onClick={() => search(page + 1)} disabled={loading}
                        style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                        {loading ? <span className="spinner" /> : null} Load More Jobs (page {page + 1})
                    </button>
                </div>
            )}

            {/* Job Detail Modal */}
            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    profile={profile}
                    onClose={() => setSelectedJob(null)}
                    onSave={() => saveJob(selectedJob)}
                    isSaved={savedIds.has(selectedJob.id)}
                    onSaveApp={onSaveApp}
                />
            )}
        </div>
    );
}

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

export default function JobDiscovery({ profile, savedJobs, setSavedJobs, onSaveApp, applications }: Props) {
    const [filters, setFilters] = useState<JobSearchFilters>(DEFAULT_FILTERS);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [searched, setSearched] = useState(false);
    const [page, setPage] = useState(1);

    const savedIds = new Set(savedJobs.map(j => j.id));
    const appliedIds = new Set(applications.map(a => a.job.id));

    const search = useCallback(async (p = 1) => {
        setLoading(true);
        setSearched(true);
        try {
            const res = await fetch('/api/jobs/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...filters, adzunaAppId: profile?.adzunaAppId, adzunaApiKey: profile?.adzunaApiKey, page: p }),
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

    return (
        <div style={{ padding: '28px 32px' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 4 }}>
                    Discover Jobs
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    AI-powered job discovery across 50+ sources with visa sponsorship filters
                </p>
            </div>

            {/* Search */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
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
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    {/* Work mode toggles */}
                    <div style={{ display: 'flex', gap: 6 }}>
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
                    </div>

                    {/* Visa toggle */}
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
                        🛂 {filters.visaFriendly ? 'H1B/OPT Only' : 'All Visas'}
                    </button>

                    <div style={{ marginLeft: 'auto' }}>
                        <button className="btn-primary" onClick={() => search(1)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {loading ? <span className="spinner" /> : '🔍'}
                            {loading ? 'Searching...' : 'Search Jobs'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Source badges */}
            {!searched && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {['Adzuna', 'USAJobs', 'Y Combinator', 'Wellfound', 'LinkedIn (Beta)', 'Glassdoor', 'Indeed', 'Hacker News Hiring', 'Crunchbase', 'Company Sites'].map(s => (
                        <span key={s} className="tag">{s}</span>
                    ))}
                </div>
            )}

            {/* Results */}
            {searched && !loading && jobs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
                    <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 6 }}>No jobs found</div>
                    <div style={{ fontSize: 13 }}>Try broader keywords or add your Adzuna API keys in Profile for more results</div>
                </div>
            )}

            {jobs.length > 0 && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Found <strong style={{ color: 'var(--text-primary)' }}>{jobs.length}</strong> positions
                            {filters.visaFriendly && <span style={{ color: '#34d399', marginLeft: 8 }}>• Visa-friendly filter on</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}
                                onClick={() => { setSavedJobs(jobs); }}>
                                + Save All
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {jobs.map(job => {
                            const isSaved = savedIds.has(job.id);
                            const isApplied = appliedIds.has(job.id);
                            return (
                                <div
                                    key={job.id}
                                    className="card"
                                    style={{ padding: '16px 20px', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onClick={() => setSelectedJob(job)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                        {/* Match ring */}
                                        <div className={`match-ring ${getMatchColor(job.matchScore)}`}>
                                            {job.matchScore ? `${job.matchScore}%` : '—'}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                <h3 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{job.title}</h3>
                                                {job.sponsorsVisa && <span className="badge badge-green" style={{ fontSize: 9 }}>H1B ✓</span>}
                                                {isApplied && <span className="badge badge-purple" style={{ fontSize: 9 }}>Applied</span>}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                                {job.company} · {job.location} {job.salary ? `· ${job.salary}` : ''}
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                {job.tags?.slice(0, 4).map(t => <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>)}
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                                                    via {job.source} · {new Date(job.postedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                            <button
                                                className={isSaved ? 'btn-secondary' : 'btn-secondary'}
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
                                        {job.description.slice(0, 180).replace(/\n/g, ' ')}...
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Load more */}
                    <div style={{ textAlign: 'center', marginTop: 24 }}>
                        <button className="btn-secondary" onClick={() => search(page + 1)} disabled={loading} style={{ display: 'inline-flex', gap: 8 }}>
                            {loading ? <span className="spinner" /> : null} Load More Jobs
                        </button>
                    </div>
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

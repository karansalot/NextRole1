'use client';
import { useState, useEffect } from 'react';
import { UserProfile, Prospect } from '@/lib/types';

interface Props {
    profile: UserProfile | null;
}

const INDUSTRIES = ['AI / Machine Learning', 'Fintech', 'SaaS / B2B', 'Health Tech', 'EdTech', 'E-commerce', 'Cybersecurity', 'Data / Analytics', 'Developer Tools', 'Consumer Tech'];
const STAGES = ['Pre-Seed / Seed', 'Series A', 'Series B', 'Series C+', 'Growth / Pre-IPO', 'Any Stage'];
const TITLES = ['CEO / Founder', 'CTO / VP Engineering', 'VP Product', 'Head of Data', 'Director of Analytics', 'Engineering Manager', 'Head of Operations'];

const STATUS_COLORS: Record<string, string> = {
    new: '#4F8EF7',
    emailed: '#F59E0B',
    replied: '#10B981',
    meeting: '#8B5CF6',
    not_interested: '#6B7280',
};
const STATUS_LABELS: Record<string, string> = {
    new: '🆕 New',
    emailed: '📤 Emailed',
    replied: '💬 Replied',
    meeting: '🤝 Meeting',
    not_interested: '❌ Pass',
};

export default function ProspectOutreach({ profile }: Props) {
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingProspects, setLoadingProspects] = useState(true);
    const [error, setError] = useState('');
    const [view, setView] = useState<'search' | 'list'>('list');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Search form
    const [industry, setIndustry] = useState('AI / Machine Learning');
    const [stage, setStage] = useState('Series A');
    const [selectedTitles, setSelectedTitles] = useState<string[]>(['CEO / Founder', 'CTO / VP Engineering', 'VP Product']);
    const [count, setCount] = useState(10);

    useEffect(() => { loadProspects(); }, []);

    const loadProspects = async () => {
        setLoadingProspects(true);
        try {
            const res = await fetch('/api/prospects');
            const data = await res.json();
            setProspects(Array.isArray(data) ? data : []);
        } catch { setProspects([]); }
        finally { setLoadingProspects(false); }
    };

    const search = async () => {
        if (!profile?.openAIKey) { setError('Add your OpenAI API key in Profile settings'); return; }
        setLoading(true); setError('');
        try {
            const res = await fetch('/api/prospects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    openAIKey: profile.openAIKey,
                    hunterApiKey: profile.hunterApiKey || '',
                    industry,
                    companyStage: stage,
                    targetTitles: selectedTitles.map(t => t.split(' / ')[0]),
                    location: 'United States',
                    candidateProfile: profile,
                    count,
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            await loadProspects();
            setView('list');
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    const updateStatus = async (id: string, status: string) => {
        await fetch('/api/prospects', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, updates: { status } }),
        });
        setProspects(prev => prev.map(p => p.id === id ? { ...p, status: status as any } : p));
    };

    const deleteProspect = async (id: string) => {
        await fetch('/api/prospects', {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        setProspects(prev => prev.filter(p => p.id !== id));
    };

    const copy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    const toggleTitle = (t: string) => {
        setSelectedTitles(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    };

    const emailedCount = prospects.filter(p => p.status !== 'new').length;
    const repliedCount = prospects.filter(p => p.status === 'replied' || p.status === 'meeting').length;
    const emailFoundCount = prospects.filter(p => p.email).length;

    return (
        <div style={{ padding: '28px 32px' }}>
            {/* Header */}
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Proactive Outreach</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        Find startup founders, CTOs, and VPs in the US — get their real emails via Hunter.io, send personalized cold emails
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className={view === 'list' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12, padding: '7px 16px' }} onClick={() => setView('list')}>
                        🗂 Saved ({prospects.length})
                    </button>
                    <button className={view === 'search' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12, padding: '7px 16px' }} onClick={() => setView('search')}>
                        + Find Prospects
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'Total Prospects', val: prospects.length, color: '#4F8EF7' },
                    { label: 'Real Emails Found', val: emailFoundCount, color: '#10B981' },
                    { label: 'Emailed', val: emailedCount, color: '#F59E0B' },
                    { label: 'Replied / Meeting', val: repliedCount, color: '#8B5CF6' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Tip */}
            {!profile?.hunterApiKey && (
                <div style={{ padding: '10px 16px', marginBottom: 16, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, fontSize: 12.5, color: '#fbbf24', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span>💡</span>
                    <span>Add your <strong>Hunter.io API key</strong> in Profile → API Keys for real verified email addresses (free: 25 lookups/month). Without it, AI will infer emails with lower accuracy.</span>
                </div>
            )}

            {/* SEARCH FORM */}
            {view === 'search' && (
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Find Startup Founders & Decision Makers</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
                        <div>
                            <label className="label">Industry</label>
                            <select className="input" value={industry} onChange={e => setIndustry(e.target.value)}>
                                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Company Stage</label>
                            <select className="input" value={stage} onChange={e => setStage(e.target.value)}>
                                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">How many to find</label>
                            <select className="input" value={count} onChange={e => setCount(Number(e.target.value))}>
                                {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} prospects</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: 18 }}>
                        <label className="label">Target Titles (select all that apply)</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                            {TITLES.map(t => (
                                <button key={t}
                                    onClick={() => toggleTitle(t)}
                                    style={{
                                        padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                                        border: `1px solid ${selectedTitles.includes(t) ? 'var(--accent)' : 'var(--border)'}`,
                                        background: selectedTitles.includes(t) ? 'rgba(79,142,247,0.12)' : 'transparent',
                                        color: selectedTitles.includes(t) ? 'var(--accent)' : 'var(--text-secondary)',
                                        fontFamily: 'inherit', transition: 'all 0.15s',
                                    }}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ padding: '12px 16px', marginBottom: 16, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>What happens next:</strong> AI identifies real {selectedTitles.slice(0, 2).join(' / ')} at {stage} {industry} companies in the US
                        {profile?.hunterApiKey ? ' → Hunter.io looks up their real verified email' : ' → AI infers likely email (add Hunter.io key for verified emails)'}
                        {' → personalized cold email is written for each → everything saved to ~/Documents/NextRole/.data/prospects.json'}
                    </div>

                    {error && <div style={{ padding: '8px 12px', marginBottom: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: '#f87171' }}>⚠ {error}</div>}

                    <button className="btn-primary" onClick={search} disabled={loading || selectedTitles.length === 0}
                        style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, padding: '10px 24px' }}>
                        {loading ? (
                            <><span className="spinner" /> Searching + writing cold emails ({count} prospects)...</>
                        ) : (
                            `🔍 Find ${count} Prospects + Write Cold Emails`
                        )}
                    </button>
                </div>
            )}

            {/* PROSPECTS LIST */}
            {view === 'list' && (
                <div>
                    {loadingProspects ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading saved prospects...</div>
                        </div>
                    ) : prospects.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
                            <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 6 }}>No prospects yet</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Find startup founders, CTOs, and VPs to proactively reach out to</div>
                            <button className="btn-primary" onClick={() => setView('search')} style={{ fontSize: 13, padding: '9px 24px' }}>
                                + Find Prospects
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* Status filter */}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                    <span key={k} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: `${STATUS_COLORS[k]}18`, color: STATUS_COLORS[k], border: `1px solid ${STATUS_COLORS[k]}33` }}>
                                        {v}: {prospects.filter(p => p.status === k).length}
                                    </span>
                                ))}
                            </div>

                            {prospects.map(prospect => (
                                <div key={prospect.id} className="card" style={{ padding: '16px 20px' }}>
                                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                        {/* Left: person info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                                                <span style={{ fontSize: 15, fontWeight: 700 }}>{prospect.name}</span>
                                                <span className="badge badge-blue" style={{ fontSize: 9 }}>{prospect.title}</span>
                                                {prospect.email && <span className="badge badge-green" style={{ fontSize: 9 }}>✓ Email Found</span>}
                                                {prospect.source === 'hunter.io' && <span className="badge badge-purple" style={{ fontSize: 9 }}>Hunter.io</span>}
                                            </div>
                                            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                                {prospect.company}
                                                {prospect.companyStage ? ` · ${prospect.companyStage}` : ''}
                                                {prospect.industry ? ` · ${prospect.industry}` : ''}
                                                {prospect.location ? ` · 📍 ${prospect.location}` : ''}
                                            </div>

                                            {/* Email + LinkedIn row */}
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                                {prospect.email && (
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 10px' }}>
                                                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>📧 {prospect.email}</span>
                                                        {prospect.emailConfidence && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{prospect.emailConfidence}%</span>}
                                                        <button className="btn-ghost" style={{ fontSize: 9, padding: '2px 6px' }}
                                                            onClick={() => copy(prospect.email!, prospect.id + '_email')}>
                                                            {copiedId === prospect.id + '_email' ? '✓' : 'Copy'}
                                                        </button>
                                                    </div>
                                                )}
                                                {prospect.linkedin && (
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 10px' }}>
                                                        <span style={{ fontSize: 12, color: '#a78bfa' }}>🔗 LinkedIn</span>
                                                        <a href={`https://${prospect.linkedin.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer">
                                                            <button className="btn-ghost" style={{ fontSize: 9, padding: '2px 6px' }}>Open</button>
                                                        </a>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Cold email preview */}
                                            {prospect.coldEmail && (
                                                <div style={{
                                                    background: expandedId === prospect.id ? 'var(--bg-secondary)' : 'transparent',
                                                    border: expandedId === prospect.id ? '1px solid var(--border)' : '1px solid transparent',
                                                    borderRadius: 8, overflow: 'hidden', transition: 'all 0.2s',
                                                }}>
                                                    {expandedId === prospect.id ? (
                                                        <div style={{ padding: '12px 14px' }}>
                                                            {prospect.emailSubject && (
                                                                <div style={{ marginBottom: 8 }}>
                                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Subject</div>
                                                                    <div style={{ fontFamily: 'monospace', fontSize: 12.5, color: 'var(--accent)', background: 'var(--bg-primary)', padding: '5px 10px', borderRadius: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        {prospect.emailSubject}
                                                                        <button className="btn-ghost" style={{ fontSize: 9, padding: '2px 6px', marginLeft: 8 }}
                                                                            onClick={() => copy(prospect.emailSubject!, prospect.id + '_subj')}>
                                                                            {copiedId === prospect.id + '_subj' ? '✓' : 'Copy'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Cold Email Body</div>
                                                            <div style={{ fontSize: 12.5, lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                                                                {prospect.coldEmail}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                                                <button className="btn-primary" style={{ fontSize: 11, padding: '5px 14px' }}
                                                                    onClick={() => copy(`Subject: ${prospect.emailSubject || ''}\n\n${prospect.coldEmail}`, prospect.id + '_full')}>
                                                                    {copiedId === prospect.id + '_full' ? '✓ Copied!' : '📋 Copy Full Email'}
                                                                </button>
                                                                <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }}
                                                                    onClick={() => setExpandedId(null)}>
                                                                    Collapse
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 10px', color: 'var(--accent)' }}
                                                            onClick={() => setExpandedId(prospect.id)}>
                                                            ✉ View Cold Email →
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Right: status + actions */}
                                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                                            <select
                                                className="input"
                                                style={{ fontSize: 11, padding: '4px 8px', width: 'auto', background: `${STATUS_COLORS[prospect.status] || '#4F8EF7'}18`, borderColor: `${STATUS_COLORS[prospect.status] || '#4F8EF7'}44`, color: STATUS_COLORS[prospect.status] || '#4F8EF7' }}
                                                value={prospect.status}
                                                onChange={e => updateStatus(prospect.id, e.target.value)}
                                            >
                                                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                            </select>
                                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                {new Date(prospect.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                            <button className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px', color: '#ef4444' }}
                                                onClick={() => deleteProspect(prospect.id)}>
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

'use client';
import { useState } from 'react';
import { UserProfile } from '@/lib/types';

interface Props {
    profile: UserProfile | null;
}

export default function HiringProspector({ profile }: Props) {
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('Business Analyst');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [history, setHistory] = useState<{ company: string; role: string; data: any }[]>([]);

    const search = async () => {
        if (!company) return;
        if (!profile?.openAIKey) { setError('Add your OpenAI API key in Profile settings'); return; }
        setLoading(true); setError('');
        try {
            const res = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company, jobTitle: role, openAIKey: profile.openAIKey }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setResult(data);
            setHistory(prev => [{ company, role, data }, ...prev.slice(0, 9)]);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    const copy = (text: string) => navigator.clipboard.writeText(text);

    return (
        <div style={{ padding: '28px 32px' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Hiring Prospects</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Find hiring managers at any company in minutes. AI-inferred contacts with LinkedIn X-Ray search and email patterns.
                </p>
            </div>

            {/* Comparison card from the guide */}
            <div className="card" style={{ padding: 16, marginBottom: 24, background: 'linear-gradient(135deg, rgba(79,142,247,0.05), rgba(139,92,246,0.05))' }}>
                <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ flex: 1, textAlign: 'center', padding: '12px 16px', background: 'rgba(239,68,68,0.05)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.15)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#f87171', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manual Search</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#f87171' }}>3 hrs</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>per company</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 18 }}>⚡</div>
                    <div style={{ flex: 1, textAlign: 'center', padding: '12px 16px', background: 'rgba(16,185,129,0.05)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#34d399', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>NextRole AI</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#34d399' }}>3 min</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>per company</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
                {/* Main */}
                <div>
                    {/* Search */}
                    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                                <label className="label">Company Name</label>
                                <input className="input" placeholder="Stripe, Notion, Figma..."
                                    value={company} onChange={e => setCompany(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && search()} />
                            </div>
                            <div>
                                <label className="label">Target Role</label>
                                <input className="input" placeholder="Business Analyst"
                                    value={role} onChange={e => setRole(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && search()} />
                            </div>
                        </div>
                        <button className="btn-primary" onClick={search} disabled={loading || !company}
                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {loading ? <><span className="spinner" /> Finding contacts...</> : '🎯 Find Hiring Manager'}
                        </button>
                        {error && <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: '#f87171' }}>⚠ {error}</div>}
                    </div>

                    {/* Results */}
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Finding hiring managers at {company}...</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>AI is inferring contacts, email formats, and search strings</div>
                        </div>
                    )}

                    {result && !loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Contacts */}
                            {result.managers?.map((m: any, i: number) => (
                                <div key={i} className="card" style={{ padding: '16px 20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{m.name}</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.title} · {company}</div>
                                        </div>
                                        <span className={`badge ${m.confidence === 'high' ? 'badge-green' : m.confidence === 'medium' ? 'badge-orange' : 'badge-red'}`}>
                                            {m.confidence === 'high' ? '🟢' : m.confidence === 'medium' ? '🟡' : '🔴'} {m.confidence}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                        {m.email && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', borderRadius: 8, padding: '6px 12px', border: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'monospace' }}>📧 {m.email}</span>
                                                <button className="btn-ghost" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => copy(m.email)}>Copy</button>
                                            </div>
                                        )}
                                        {m.linkedin && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', borderRadius: 8, padding: '6px 12px', border: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: 12, color: '#a78bfa' }}>🔗 {m.linkedin}</span>
                                                <a href={`https://${m.linkedin}`} target="_blank" rel="noopener noreferrer">
                                                    <button className="btn-ghost" style={{ fontSize: 10, padding: '2px 6px' }}>Open</button>
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {m.reasoning && (
                                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                                            💡 {m.reasoning}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Email Patterns */}
                            {result.emailFormats && (
                                <div className="card" style={{ padding: '14px 20px' }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>📧 Email Patterns at {company}</div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {result.emailFormats.map((fmt: string) => (
                                            <div key={fmt} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', borderRadius: 6, padding: '5px 10px', border: '1px solid var(--border)' }}>
                                                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>{fmt}</span>
                                                <button className="btn-ghost" style={{ fontSize: 9, padding: '1px 5px' }} onClick={() => copy(fmt)}>Copy</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Search Strings */}
                            <div className="card" style={{ padding: '14px 20px' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>🔍 Find on Google & LinkedIn</div>
                                {result.googleXray && (
                                    <div style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Google X-Ray Search:</div>
                                        <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 6, lineHeight: 1.5 }}>
                                            {result.googleXray}
                                        </div>
                                        <button className="btn-ghost" style={{ fontSize: 10, padding: '3px 10px' }}
                                            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(result.googleXray)}`, '_blank')}>
                                            Search Google →
                                        </button>
                                    </div>
                                )}
                                {result.linkedinSearch && (
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>LinkedIn Search:</div>
                                        <div style={{ fontSize: 12.5, color: 'var(--text-primary)', marginBottom: 6 }}>{result.linkedinSearch}</div>
                                        <button className="btn-ghost" style={{ fontSize: 10, padding: '3px 10px' }}
                                            onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(result.linkedinSearch)}`, '_blank')}>
                                            Search LinkedIn →
                                        </button>
                                    </div>
                                )}
                            </div>

                            {result.outreachTip && (
                                <div style={{ padding: '12px 16px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    💡 <strong style={{ color: 'var(--text-primary)' }}>Outreach tip:</strong> {result.outreachTip}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* History sidebar */}
                <div>
                    <div className="card" style={{ padding: 16, position: 'sticky', top: 24 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Recent Searches</div>
                        {history.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No searches yet</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {history.map((h, i) => (
                                    <button key={i} className="btn-ghost" style={{ width: '100%', textAlign: 'left', padding: '8px 10px' }}
                                        onClick={() => { setCompany(h.company); setRole(h.role); setResult(h.data); }}>
                                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{h.company}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.role}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tips */}
                    <div className="card" style={{ padding: 16, marginTop: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Pro Tips 💡</div>
                        {[
                            'Apply within 48 hours of posting — early applicants get 3-8x higher response rates',
                            'Always send a LinkedIn connection request the same day you apply',
                            'Reference something specific about the company — shows you did your research',
                            'Follow up exactly 5 business days after your initial outreach',
                        ].map((tip, i) => (
                            <div key={i} style={{ fontSize: 11.5, color: 'var(--text-muted)', borderLeft: '2px solid var(--accent)', paddingLeft: 10, marginBottom: 8, lineHeight: 1.5 }}>
                                {tip}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

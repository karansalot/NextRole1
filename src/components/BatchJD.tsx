'use client';
import { useState } from 'react';
import { UserProfile } from '@/lib/types';

interface Props {
    profile: UserProfile | null;
}

interface JDResult {
    company: string;
    title: string;
    resume: string;
    coverLetter: string;
    contacts: any;
    outreach: any;
    isLatex: boolean;
    status: 'pending' | 'loading' | 'done' | 'error';
    error?: string;
}

const EMPTY_JD = { company: '', title: '', jd: '' };

export default function BatchJD({ profile }: Props) {
    const [jds, setJds] = useState([
        { ...EMPTY_JD },
        { ...EMPTY_JD },
        { ...EMPTY_JD },
        { ...EMPTY_JD },
        { ...EMPTY_JD },
    ]);
    const [results, setResults] = useState<JDResult[]>([]);
    const [running, setRunning] = useState(false);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    const hasKey = !!(profile?.openAIKey || profile?.groqApiKey || profile?.anthropicApiKey);
    const latexDetected = profile?.latexResume?.includes('\\begin{document}') || profile?.baseResumeLaTeX?.includes('\\begin{document}');

    const updateJd = (i: number, field: string, val: string) => {
        setJds(prev => prev.map((j, idx) => idx === i ? { ...j, [field]: val } : j));
    };

    const addRow = () => setJds(prev => [...prev, { ...EMPTY_JD }]);

    const download = (content: string, filename: string) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
        a.download = filename;
        a.click();
    };

    const copy = (text: string) => navigator.clipboard.writeText(text);

    const runAll = async () => {
        const activeJds = jds.filter(j => j.jd.trim().length > 50);
        if (activeJds.length === 0) return;
        if (!hasKey) return;

        setRunning(true);

        // Initialize results
        const init: JDResult[] = activeJds.map(j => ({
            company: j.company || 'Unknown',
            title: j.title || 'Unknown Role',
            resume: '', coverLetter: '', contacts: null, outreach: null,
            isLatex: false, status: 'loading',
        }));
        setResults(init);

        // Process all JDs in parallel
        await Promise.all(activeJds.map(async (jd, i) => {
            const jobPayload = {
                id: `batch_${i}`,
                title: jd.title || 'Role',
                company: jd.company || 'Company',
                location: 'United States',
                description: jd.jd,
                url: '',
                source: 'Batch',
                postedAt: new Date().toISOString(),
                tags: [],
            };

            const profileWithLatex = {
                ...profile,
                latexResume: profile?.latexResume || profile?.baseResumeLaTeX || '',
            };

            try {
                // All 4 calls in parallel
                const [resumeRes, coverRes, contactsRes, outreachRes] = await Promise.all([
                    fetch('/api/resume/tailor', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ profile: profileWithLatex, job: jobPayload, openAIKey: profile?.openAIKey }),
                    }).then(r => r.json()),
                    fetch('/api/cover-letter', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ profile, job: jobPayload, openAIKey: profile?.openAIKey }),
                    }).then(r => r.json()),
                    fetch('/api/contacts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ company: jobPayload.company, jobTitle: jobPayload.title, openAIKey: profile?.openAIKey, hunterApiKey: profile?.hunterApiKey }),
                    }).then(r => r.json()),
                    fetch('/api/outreach', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ profile, job: jobPayload, openAIKey: profile?.openAIKey }),
                    }).then(r => r.json()),
                ]);

                setResults(prev => prev.map((r, idx) => idx === i ? {
                    ...r,
                    resume: resumeRes.resume || '',
                    coverLetter: coverRes.letter || '',
                    contacts: contactsRes,
                    outreach: outreachRes,
                    isLatex: !!resumeRes.isLatex,
                    status: 'done',
                } : r));
            } catch (e: any) {
                setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'error', error: e.message } : r));
            }
        }));

        setRunning(false);
    };

    const hm = (contacts: any) => contacts?.managers?.[0];

    return (
        <div style={{ padding: '28px 32px' }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    Batch JD Processor
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Paste up to 5+ job descriptions at once → get a tailored resume, 1-page cover letter, hiring manager contact + cold email for each
                </p>
            </div>

            {/* LaTeX status */}
            <div style={{
                padding: '10px 16px', marginBottom: 20,
                background: latexDetected ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${latexDetected ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                borderRadius: 10, fontSize: 12.5,
                color: latexDetected ? '#34d399' : '#fbbf24',
            }}>
                {latexDetected
                    ? '✅ LaTeX resume detected in your profile — the AI will make minimal targeted edits and return a modified .tex file for each JD'
                    : '⚠️ No LaTeX resume found in your profile. Go to My Profile → Resume → paste your LaTeX source code into the "LaTeX Resume" field. Or add plain text resume for non-LaTeX output.'}
            </div>

            {/* JD Input Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {jds.map((jd, i) => (
                    <div key={i} className="card" style={{ padding: 16 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                            <div style={{
                                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                background: jd.jd.trim() ? 'var(--accent)' : 'var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700, color: jd.jd.trim() ? 'white' : 'var(--text-muted)',
                            }}>{i + 1}</div>
                            <input
                                className="input" placeholder="Company name (e.g. Stripe)"
                                value={jd.company}
                                onChange={e => updateJd(i, 'company', e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <input
                                className="input" placeholder="Job title (e.g. Business Analyst)"
                                value={jd.title}
                                onChange={e => updateJd(i, 'title', e.target.value)}
                                style={{ flex: 1.5 }}
                            />
                            <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px', color: '#ef4444', flexShrink: 0 }}
                                onClick={() => setJds(prev => prev.filter((_, idx) => idx !== i))}>
                                ✕
                            </button>
                        </div>
                        <textarea
                            className="input"
                            placeholder={`Paste the full job description here...\n\nInclude requirements, responsibilities, and qualifications for best results.`}
                            value={jd.jd}
                            onChange={e => updateJd(i, 'jd', e.target.value)}
                            style={{ height: 120, resize: 'vertical', fontSize: 12.5, lineHeight: 1.6 }}
                        />
                        {jd.jd.trim() && (
                            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                                {jd.jd.trim().split(/\s+/).length} words
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Row + Run */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
                <button className="btn-secondary" style={{ fontSize: 13 }} onClick={addRow}>
                    + Add Another JD
                </button>
                <button
                    className="btn-primary"
                    onClick={runAll}
                    disabled={running || !hasKey || jds.filter(j => j.jd.trim().length > 50).length === 0}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                        fontSize: 14, padding: '10px 24px', border: 'none',
                        opacity: (!hasKey || jds.filter(j => j.jd.trim().length > 50).length === 0) ? 0.5 : 1,
                    }}
                >
                    {running ? <><span className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> Processing all JDs...</>
                        : `⚡ Process ${jds.filter(j => j.jd.trim().length > 50).length} JD${jds.filter(j => j.jd.trim().length > 50).length !== 1 ? 's' : ''} — Resume + Cover Letter + Contacts + Cold Email`}
                </button>
                {!hasKey && (
                    <span style={{ fontSize: 12, color: '#f87171', alignSelf: 'center' }}>⚠ Add API key in Profile first</span>
                )}
            </div>

            {/* Results */}
            {results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        Results ({results.filter(r => r.status === 'done').length}/{results.length} complete)
                    </div>
                    {results.map((res, i) => (
                        <div key={i} className="card" style={{
                            padding: 0, overflow: 'hidden',
                            borderColor: res.status === 'done' ? 'rgba(16,185,129,0.3)' : res.status === 'error' ? 'rgba(239,68,68,0.3)' : 'var(--border)',
                        }}>
                            {/* Result header */}
                            <div style={{
                                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
                                borderBottom: expandedIdx === i ? '1px solid var(--border)' : 'none',
                                background: res.status === 'done' ? 'rgba(16,185,129,0.04)' : 'transparent',
                                cursor: 'pointer',
                            }} onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}>
                                <div style={{ fontSize: 20 }}>
                                    {res.status === 'loading' ? <span className="spinner" style={{ display: 'block', width: 20, height: 20 }} /> : res.status === 'done' ? '✅' : '❌'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>{res.company} — {res.title}</div>
                                    {res.status === 'loading' && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Generating resume, cover letter, contacts &amp; cold email...</div>}
                                    {res.status === 'done' && (
                                        <div style={{ fontSize: 12, color: '#34d399', display: 'flex', gap: 10 }}>
                                            <span>✓ {res.isLatex ? 'LaTeX resume' : 'Resume'}</span>
                                            <span>✓ Cover letter</span>
                                            <span>✓ {hm(res.contacts)?.name ? `${hm(res.contacts).name}` : 'Contacts'}</span>
                                            <span>✓ Cold email</span>
                                        </div>
                                    )}
                                    {res.status === 'error' && <div style={{ fontSize: 12, color: '#f87171' }}>{res.error}</div>}
                                </div>
                                {res.status === 'done' && (
                                    <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                                        <button className="btn-secondary" style={{ fontSize: 11, padding: '5px 12px' }}
                                            onClick={() => download(res.resume, `resume_${res.company}.${res.isLatex ? 'tex' : 'txt'}`)}>
                                            ⬇ Resume {res.isLatex ? '(.tex)' : '(.txt)'}
                                        </button>
                                        <button className="btn-secondary" style={{ fontSize: 11, padding: '5px 12px' }}
                                            onClick={() => download(res.coverLetter, `cover_${res.company}.txt`)}>
                                            ⬇ Cover Letter
                                        </button>
                                        {res.outreach && hm(res.contacts)?.email && (
                                            <a href={`mailto:${hm(res.contacts).email}?subject=${encodeURIComponent(res.outreach.emailSubject || '')}&body=${encodeURIComponent(res.outreach.emailBody || '')}`}
                                                style={{ textDecoration: 'none' }}>
                                                <button className="btn-primary" style={{ fontSize: 11, padding: '5px 14px', background: 'linear-gradient(135deg,#10B981,#059669)', border: 'none' }}>
                                                    🚀 Send Email
                                                </button>
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Expanded details */}
                            {expandedIdx === i && res.status === 'done' && (
                                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

                                    {/* Resume */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>📝 Tailored Resume {res.isLatex ? '(LaTeX .tex)' : '(Plain Text)'}</div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => copy(res.resume)}>📋 Copy</button>
                                                <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }}
                                                    onClick={() => download(res.resume, `resume_${res.company}.${res.isLatex ? 'tex' : 'txt'}`)}>⬇ Download</button>
                                            </div>
                                        </div>
                                        <pre style={{
                                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                            borderRadius: 8, padding: '14px 16px', fontSize: 11.5,
                                            lineHeight: 1.6, maxHeight: 320, overflowY: 'auto', whiteSpace: 'pre-wrap',
                                            color: 'var(--text-primary)', fontFamily: 'monospace',
                                        }}>{res.resume}</pre>
                                    </div>

                                    {/* Cover Letter */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>✉️ Cover Letter (1 page, ~250 words)</div>
                                            <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => copy(res.coverLetter)}>📋 Copy</button>
                                        </div>
                                        <div style={{
                                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                            borderRadius: 8, padding: '14px 16px', fontSize: 13, lineHeight: 1.8,
                                            whiteSpace: 'pre-wrap', color: 'var(--text-primary)', maxHeight: 280, overflowY: 'auto',
                                        }}>{res.coverLetter}</div>
                                    </div>

                                    {/* Contacts + Outreach */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        {/* Hiring Manager */}
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🎯 Hiring Manager</div>
                                            {hm(res.contacts) ? (
                                                <div className="card" style={{ padding: '12px 16px' }}>
                                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{hm(res.contacts).name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{hm(res.contacts).title}</div>
                                                    {hm(res.contacts).email && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>📧 {hm(res.contacts).email}</span>
                                                            <button className="btn-ghost" style={{ fontSize: 9, padding: '2px 6px' }} onClick={() => copy(hm(res.contacts).email)}>Copy</button>
                                                        </div>
                                                    )}
                                                    {hm(res.contacts).linkedin && (
                                                        <div style={{ fontSize: 12, color: '#a78bfa', marginTop: 4 }}>
                                                            🔗 <a href={`https://${hm(res.contacts).linkedin.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer"
                                                                style={{ color: '#a78bfa' }}>LinkedIn Profile</a>
                                                        </div>
                                                    )}
                                                    <span className={`badge ${hm(res.contacts).confidence === 'high' ? 'badge-green' : hm(res.contacts).confidence === 'medium' ? 'badge-orange' : 'badge-red'}`} style={{ fontSize: 9, marginTop: 6, display: 'inline-block' }}>
                                                        {hm(res.contacts).confidence} confidence
                                                    </span>
                                                </div>
                                            ) : <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No contact found</div>}
                                        </div>

                                        {/* Cold Email + LinkedIn */}
                                        {res.outreach && (
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📤 Cold Email</div>
                                                <div className="card" style={{ padding: '12px 16px', fontSize: 12.5 }}>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</div>
                                                    <div style={{ fontFamily: 'monospace', color: 'var(--accent)', marginBottom: 10, fontSize: 12 }}>{res.outreach.emailSubject}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Body</div>
                                                    <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text-primary)', maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                                                        {res.outreach.emailBody}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                                                        <button className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }}
                                                            onClick={() => copy(`Subject: ${res.outreach.emailSubject}\n\n${res.outreach.emailBody}`)}>📋 Copy Email</button>
                                                        {res.outreach.linkedinConnection && (
                                                            <button className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }}
                                                                onClick={() => copy(res.outreach.linkedinConnection)}>🔗 Copy LinkedIn Msg</button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* LinkedIn messages */}
                                    {res.outreach?.linkedinConnection && (
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🔗 LinkedIn Messages</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                {[
                                                    { label: 'Connection Request', key: 'linkedinConnection' },
                                                    { label: 'Follow-up (after 5 days)', key: 'linkedinFollowUp' },
                                                ].map(({ label, key }) => (
                                                    <div key={key} className="card" style={{ padding: '12px 14px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#a78bfa' }}>{label}</span>
                                                            <button className="btn-ghost" style={{ fontSize: 9, padding: '2px 6px' }}
                                                                onClick={() => copy((res.outreach as any)[key])}>Copy</button>
                                                        </div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                                                            {(res.outreach as any)[key]}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

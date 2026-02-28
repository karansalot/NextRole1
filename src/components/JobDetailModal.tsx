'use client';
import { useState } from 'react';
import { Job, UserProfile, Application, HiringManager, OutreachMessages } from '@/lib/types';

interface Props {
    job: Job;
    profile: UserProfile | null;
    onClose: () => void;
    onSave: () => void;
    isSaved: boolean;
    onSaveApp: (app: Application) => void;
}

type ActionTab = 'details' | 'resume' | 'cover' | 'contacts' | 'outreach';

type PackStep = 'hm' | 'resume' | 'cover' | 'outreach' | 'done' | null;

export default function JobDetailModal({ job, profile, onClose, onSave, isSaved, onSaveApp }: Props) {
    const [activeTab, setActiveTab] = useState<ActionTab>('details');
    const [loadingResume, setLoadingResume] = useState(false);
    const [loadingCover, setLoadingCover] = useState(false);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [loadingOutreach, setLoadingOutreach] = useState(false);
    const [loadingPack, setLoadingPack] = useState(false);
    const [packStep, setPackStep] = useState<PackStep>(null);
    const [resume, setResume] = useState('');
    const [coverLetter, setCoverLetter] = useState('');
    const [contacts, setContacts] = useState<any>(null);
    const [outreach, setOutreach] = useState<OutreachMessages | null>(null);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    const noKey = !profile?.openAIKey;

    const generateResume = async (silent = false) => {
        if (noKey) { if (!silent) setError('Add your OpenAI API key in Profile settings'); return null; }
        setLoadingResume(true); if (!silent) setError('');
        try {
            const res = await fetch('/api/resume/tailor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile, job, openAIKey: profile!.openAIKey }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setResume(data.resume);
            return data.resume;
        } catch (e: any) { if (!silent) setError(e.message); return null; }
        finally { setLoadingResume(false); }
    };

    const generateCoverLetter = async (silent = false) => {
        if (noKey) { if (!silent) setError('Add your OpenAI API key in Profile settings'); return null; }
        setLoadingCover(true); if (!silent) setError('');
        try {
            const res = await fetch('/api/cover-letter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile, job, openAIKey: profile!.openAIKey }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setCoverLetter(data.letter);
            return data.letter;
        } catch (e: any) { if (!silent) setError(e.message); return null; }
        finally { setLoadingCover(false); }
    };

    const findContacts = async (silent = false) => {
        if (noKey) { if (!silent) setError('Add your OpenAI API key in Profile settings'); return null; }
        setLoadingContacts(true); if (!silent) setError('');
        try {
            const res = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company: job.company, jobTitle: job.title, openAIKey: profile?.openAIKey, hunterApiKey: profile?.hunterApiKey }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setContacts(data);
            return data;
        } catch (e: any) { if (!silent) setError(e.message); return null; }
        finally { setLoadingContacts(false); }
    };

    const generateOutreach = async (contactsData?: any, silent = false) => {
        if (noKey) { if (!silent) setError('Add your OpenAI API key in Profile settings'); return null; }
        setLoadingOutreach(true); if (!silent) setError('');
        try {
            const hm = contactsData?.managers?.[0] || contacts?.managers?.[0];
            const res = await fetch('/api/outreach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile, job, hiringManager: hm, openAIKey: profile?.openAIKey }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setOutreach(data);
            return data;
        } catch (e: any) { if (!silent) setError(e.message); return null; }
        finally { setLoadingOutreach(false); }
    };

    // === GENERATE FULL PACK ===
    const generateFullPack = async () => {
        if (noKey) { setError('Add your OpenAI API key in Profile settings'); return; }
        setLoadingPack(true);
        setError('');
        try {
            // Step 1: Find hiring manager
            setPackStep('hm');
            const contactsData = await findContacts(true);

            // Step 2: Tailor resume
            setPackStep('resume');
            await generateResume(true);

            // Step 3: Cover letter
            setPackStep('cover');
            await generateCoverLetter(true);

            // Step 4: Full outreach (with HM context)
            setPackStep('outreach');
            await generateOutreach(contactsData, true);

            setPackStep('done');
        } catch (e: any) {
            setError('Pack generation ran into an issue. Check individual tabs for details.');
        } finally {
            setLoadingPack(false);
        }
    };

    const saveToTracker = () => {
        const app: Application = {
            id: `app_${job.id}_${Date.now()}`,
            job: { ...job, resumeGenerated: !!resume, coverLetterGenerated: !!coverLetter },
            status: resume && coverLetter ? 'resume_ready' : 'saved',
            tailoredResume: resume,
            coverLetter,
            hiringManagers: contacts?.managers,
            outreachMessages: outreach || undefined,
            savedAt: new Date().toISOString(),
        };
        onSaveApp(app);
        setSaved(true);
    };

    const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);
    const download = (content: string, filename: string) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
        a.download = filename;
        a.click();
    };

    const packStepLabel: Record<string, string> = {
        hm: '🎯 Finding hiring manager...',
        resume: '📝 Tailoring resume...',
        cover: '✉️ Writing cover letter...',
        outreach: '💬 Crafting cold email sequence...',
        done: '✅ Full pack ready!',
    };

    const completionCount = [!!resume, !!coverLetter, !!contacts, !!outreach].filter(Boolean).length;

    const tabs: { key: ActionTab; label: string; icon: string; done?: boolean }[] = [
        { key: 'details', label: 'Job Details', icon: '📄' },
        { key: 'resume', label: 'Tailor Resume', icon: '📝', done: !!resume },
        { key: 'cover', label: 'Cover Letter', icon: '✉️', done: !!coverLetter },
        { key: 'contacts', label: 'Hiring Manager', icon: '🎯', done: !!contacts },
        { key: 'outreach', label: 'Cold Outreach', icon: '📤', done: !!outreach },
    ];

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: 900 }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'flex-start', gap: 16,
                    position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, borderRadius: '20px 20px 0 0'
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{job.title}</h2>
                            {job.sponsorsVisa && <span className="badge badge-green" style={{ fontSize: 9 }}>H1B ✓</span>}
                            {completionCount > 0 && (
                                <span className="badge badge-purple" style={{ fontSize: 9 }}>{completionCount}/4 ready</span>
                            )}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {job.company} · {job.location} {job.salary ? `· ${job.salary}` : ''} · via {job.source}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}
                            onClick={onSave}>{isSaved ? '★ Saved' : '☆ Save'}</button>

                        {/* ⚡ Full Pack Button */}
                        <button
                            onClick={generateFullPack}
                            disabled={loadingPack || noKey}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                border: 'none', fontFamily: 'inherit',
                                background: packStep === 'done'
                                    ? 'linear-gradient(135deg, #059669, #10B981)'
                                    : 'linear-gradient(135deg, #F59E0B, #EF4444)',
                                color: 'white',
                                opacity: noKey ? 0.5 : 1,
                                transition: 'all 0.2s',
                                boxShadow: loadingPack ? '0 0 20px rgba(245,158,11,0.4)' : 'none',
                            }}
                        >
                            {loadingPack ? (
                                <><span className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                                    {packStep ? packStepLabel[packStep] : 'Starting...'}</>
                            ) : packStep === 'done' ? '✅ Pack Complete' : '⚡ Generate Full Pack'}
                        </button>

                        <button
                            className={saved ? 'btn-green' : 'btn-primary'}
                            style={{ fontSize: 12, padding: '6px 14px' }}
                            onClick={saveToTracker}
                        >{saved ? '✓ In Tracker' : '+ Add to Tracker'}</button>
                        <a href={job.url} target="_blank" rel="noopener noreferrer">
                            <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>Apply 🔗</button>
                        </a>
                        <button className="btn-ghost" onClick={onClose} style={{ fontSize: 18, padding: '4px 10px' }}>✕</button>
                    </div>
                </div>

                {/* Full Pack Progress Banner */}
                {loadingPack && packStep && (
                    <div style={{
                        padding: '10px 24px',
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.05))',
                        borderBottom: '1px solid rgba(245,158,11,0.2)',
                        display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                        <span className="spinner" style={{ width: 14, height: 14, borderTopColor: '#F59E0B', borderColor: 'rgba(245,158,11,0.2)' }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12.5, color: '#fbbf24', fontWeight: 600 }}>{packStepLabel[packStep]}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 5 }}>
                                {(['hm', 'resume', 'cover', 'outreach'] as const).map((s, i) => {
                                    const steps = ['hm', 'resume', 'cover', 'outreach'];
                                    const idx = steps.indexOf(packStep as string);
                                    const done = i < idx || packStep === 'done';
                                    const active = steps[i] === packStep;
                                    return (
                                        <div key={s} style={{ flex: 1, height: 3, borderRadius: 999, background: done ? '#10B981' : active ? '#F59E0B' : 'var(--border)', transition: 'background 0.3s' }} />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {packStep === 'done' && !loadingPack && (
                    <div style={{
                        padding: '10px 24px',
                        background: 'rgba(16,185,129,0.06)',
                        borderBottom: '1px solid rgba(16,185,129,0.2)',
                        display: 'flex', alignItems: 'center', gap: 10,
                        fontSize: 12.5, color: '#34d399',
                    }}>
                        ✅ Full application pack generated! Resume, Cover Letter, Hiring Manager, and Cold Email outreach are all ready. Now review each tab and apply!
                    </div>
                )}

                {/* Tabs */}
                <div style={{ padding: '12px 24px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 0 }}>
                        {tabs.map(t => (
                            <button key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                style={{
                                    padding: '8px 16px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                                    background: 'none', border: 'none', fontFamily: 'inherit',
                                    color: activeTab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
                                    borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5, position: 'relative',
                                }}
                            >
                                <span>{t.icon}</span> {t.label}
                                {t.done && (
                                    <span style={{
                                        width: 7, height: 7, borderRadius: '50%', background: '#10B981',
                                        position: 'absolute', top: 6, right: 4,
                                    }} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ margin: '12px 24px 0', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12.5, color: '#f87171' }}>
                        ⚠ {error}
                    </div>
                )}

                {/* Content */}
                <div style={{ padding: 24 }}>

                    {/* Job Details */}
                    {activeTab === 'details' && (
                        <div>
                            {job.tags?.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                                    {job.tags.map(t => <span key={t} className="badge badge-blue" style={{ fontSize: 10 }}>{t}</span>)}
                                </div>
                            )}

                            {/* One-click CTA */}
                            {!loadingPack && packStep !== 'done' && (
                                <div style={{
                                    padding: '14px 18px', marginBottom: 16,
                                    background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(239,68,68,0.04))',
                                    border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12,
                                    display: 'flex', alignItems: 'center', gap: 14,
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>⚡ Generate Full Application Pack</div>
                                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                            One click: Find Hiring Manager → Tailor Resume → Write Cover Letter → Draft Cold Email Outreach
                                        </div>
                                    </div>
                                    <button
                                        onClick={generateFullPack}
                                        disabled={loadingPack || noKey}
                                        style={{
                                            padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                            border: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap',
                                            background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                                            color: 'white', opacity: noKey ? 0.5 : 1,
                                            boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
                                        }}
                                    >
                                        ⚡ One-Click Pack {noKey ? '(Add API Key)' : ''}
                                    </button>
                                </div>
                            )}

                            <div style={{
                                background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px 20px',
                                fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.85,
                                whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto',
                                border: '1px solid var(--border)',
                            }}>
                                {job.description}
                            </div>
                            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button className="btn-primary" onClick={() => { setActiveTab('resume'); generateResume(); }}>
                                    📝 Tailor Resume
                                </button>
                                <button className="btn-secondary" onClick={() => { setActiveTab('cover'); generateCoverLetter(); }}>
                                    ✉️ Cover Letter
                                </button>
                                <button className="btn-secondary" onClick={() => { setActiveTab('contacts'); findContacts(); }}>
                                    🎯 Find HM
                                </button>
                                <button className="btn-secondary" onClick={() => { setActiveTab('outreach'); generateOutreach(); }}>
                                    📤 Cold Email
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Resume */}
                    {activeTab === 'resume' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>ATS-Optimized 1-Page Resume</h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>GPT-4o · 90%+ keyword match · Never changes your job titles · Realistic metrics · Auto-saved to ~/Documents/NextRole/Generated</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {resume && <>
                                        <button className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }}
                                            onClick={() => copyToClipboard(resume)}>📋 Copy</button>
                                        <button className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }}
                                            onClick={() => download(resume, `resume_${job.company}.txt`)}>⬇ Download</button>
                                    </>}
                                    <button className="btn-primary" style={{ fontSize: 12, padding: '8px 16px' }}
                                        onClick={() => generateResume()} disabled={loadingResume}>
                                        {loadingResume ? <><span className="spinner" /> Generating...</> : resume ? '🔄 Regenerate' : '✨ Generate'}
                                    </button>
                                </div>
                            </div>
                            {loadingResume && (
                                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>GPT-4o is tailoring your resume for {job.company}...</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Adding relevant projects, optimizing keywords, crafting realistic metrics</div>
                                </div>
                            )}
                            {resume && !loadingResume && (
                                <div>
                                    <div style={{
                                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                        borderRadius: 12, padding: '20px 24px', fontFamily: 'monospace',
                                        fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                                        color: 'var(--text-primary)', maxHeight: 480, overflowY: 'auto',
                                    }}>
                                        {resume}
                                    </div>
                                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, fontSize: 11.5, color: '#34d399' }}>
                                        ✓ Saved to ~/Documents/NextRole/Generated/resume/{job.company}/
                                    </div>
                                </div>
                            )}
                            {!resume && !loadingResume && (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>📝</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>No resume generated yet</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Click Generate — or use ⚡ Full Pack to generate everything at once</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cover Letter */}
                    {activeTab === 'cover' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>1-Page Cover Letter</h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Human tone · No bold · No dashes · Full JD coverage · Hackathon wins highlighted · Auto-saved</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {coverLetter && <>
                                        <button className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }}
                                            onClick={() => copyToClipboard(coverLetter)}>📋 Copy</button>
                                        <button className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }}
                                            onClick={() => download(coverLetter, `cover_letter_${job.company}.txt`)}>⬇ Download</button>
                                    </>}
                                    <button className="btn-primary" style={{ fontSize: 12, padding: '8px 16px' }}
                                        onClick={() => generateCoverLetter()} disabled={loadingCover}>
                                        {loadingCover ? <><span className="spinner" /> Generating...</> : coverLetter ? '🔄 Regenerate' : '✨ Generate'}
                                    </button>
                                </div>
                            </div>
                            {loadingCover && (
                                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Writing your cover letter for {job.company}...</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Human tone, no bold or dashes, covering every JD requirement</div>
                                </div>
                            )}
                            {coverLetter && !loadingCover && (
                                <div>
                                    <div style={{
                                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                        borderRadius: 12, padding: '20px 24px',
                                        fontSize: 13.5, lineHeight: 1.85, whiteSpace: 'pre-wrap',
                                        color: 'var(--text-primary)', maxHeight: 480, overflowY: 'auto',
                                    }}>
                                        {coverLetter}
                                    </div>
                                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, fontSize: 11.5, color: '#34d399' }}>
                                        ✓ Saved to ~/Documents/NextRole/Generated/cover_letter/{job.company}/
                                    </div>
                                </div>
                            )}
                            {!coverLetter && !loadingCover && (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>✉️</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>No cover letter yet</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Click Generate — or use ⚡ Full Pack to do everything at once</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contacts */}
                    {activeTab === 'contacts' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Hiring Manager Finder</h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>AI-inferred contacts · Email patterns · LinkedIn X-Ray search strings</p>
                                </div>
                                <button className="btn-primary" style={{ fontSize: 12, padding: '8px 16px' }}
                                    onClick={() => findContacts()} disabled={loadingContacts}>
                                    {loadingContacts ? <><span className="spinner" /> Finding...</> : contacts ? '🔄 Refresh' : '🎯 Find Contacts'}
                                </button>
                            </div>

                            {loadingContacts && (
                                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Finding hiring managers at {job.company}...</div>
                                </div>
                            )}

                            {contacts && !loadingContacts && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {contacts.managers?.map((m: HiringManager, i: number) => (
                                        <div key={i} className="card" style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{m.name}</div>
                                                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 6 }}>{m.title}</div>
                                                    {m.email && <div style={{ fontSize: 11.5, fontFamily: 'monospace', color: 'var(--accent)', marginBottom: 4 }}>📧 {m.email}</div>}
                                                    {m.linkedin && <div style={{ fontSize: 11.5, color: '#a78bfa' }}>🔗 {m.linkedin}</div>}
                                                    {(m as any).reasoning && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{(m as any).reasoning}</div>}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                                                    <span className={`badge ${m.confidence === 'high' ? 'badge-green' : m.confidence === 'medium' ? 'badge-orange' : 'badge-red'}`}>
                                                        {m.confidence} confidence
                                                    </span>
                                                    {m.email && <button className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => copyToClipboard(m.email!)}>Copy Email</button>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {contacts.emailFormats && (
                                        <div className="card" style={{ padding: '14px 18px' }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Patterns at {job.company}</div>
                                            {contacts.emailFormats.map((fmt: string) => (
                                                <div key={fmt} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>{fmt}</span>
                                                    <button className="btn-ghost" style={{ fontSize: 9, padding: '2px 6px' }} onClick={() => copyToClipboard(fmt)}>Copy</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {contacts.googleXray && (
                                        <div className="card" style={{ padding: '14px 18px' }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔍 Google X-Ray Search</div>
                                            <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 6, marginBottom: 6, lineHeight: 1.5 }}>
                                                {contacts.googleXray}
                                            </div>
                                            <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
                                                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(contacts.googleXray)}`, '_blank')}>
                                                Open in Google →
                                            </button>
                                        </div>
                                    )}

                                    {contacts.linkedinSearch && (
                                        <div className="card" style={{ padding: '14px 18px' }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>LinkedIn People Search</div>
                                            <div style={{ fontSize: 12.5, color: 'var(--text-primary)', marginBottom: 6 }}>{contacts.linkedinSearch}</div>
                                            <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
                                                onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(contacts.linkedinSearch)}`, '_blank')}>
                                                Search on LinkedIn →
                                            </button>
                                        </div>
                                    )}

                                    {/* Quick link to generate cold email from here */}
                                    <div style={{
                                        padding: '12px 16px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)',
                                        borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                                            Ready to reach out? Generate personalized cold email + LinkedIn sequence →
                                        </div>
                                        <button className="btn-primary" style={{ fontSize: 11, padding: '6px 14px', flexShrink: 0 }}
                                            onClick={() => { setActiveTab('outreach'); generateOutreach(contacts); }}>
                                            📤 Draft Cold Email
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!contacts && !loadingContacts && (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>🎯</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>No contacts found yet</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Click "Find Contacts" or use ⚡ Full Pack above</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Outreach / Cold Email */}
                    {activeTab === 'outreach' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Cold Email + LinkedIn Outreach</h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        Personalized 5-touch sequence · Cold email + subject + follow-up · LinkedIn connection + follow-up
                                    </p>
                                </div>
                                <button className="btn-primary" style={{ fontSize: 12, padding: '8px 16px' }}
                                    onClick={() => generateOutreach()} disabled={loadingOutreach}>
                                    {loadingOutreach ? <><span className="spinner" /> Generating...</> : outreach ? '🔄 Refresh' : '📤 Generate Outreach'}
                                </button>
                            </div>

                            {!contacts && !outreach && (
                                <div style={{ padding: '10px 14px', marginBottom: 14, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, color: '#fbbf24' }}>
                                    💡 Tip: Find the Hiring Manager first (Hiring Manager tab) for a more personalized cold email
                                </div>
                            )}

                            {loadingOutreach && (
                                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>📤</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Crafting cold email sequence for {job.company}...</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Personalized to the hiring manager and this specific role</div>
                                </div>
                            )}

                            {outreach && !loadingOutreach && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {/* Cold Email — most prominent */}
                                    <div style={{
                                        border: '1px solid rgba(79,142,247,0.3)',
                                        background: 'rgba(79,142,247,0.04)',
                                        borderRadius: 14, overflow: 'hidden',
                                    }}>
                                        <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(79,142,247,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <span className="badge badge-blue" style={{ fontSize: 9 }}>Step 1</span>
                                                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>📧 Cold Email</span>
                                            </div>
                                            <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 12px' }}
                                                onClick={() => copyToClipboard(`Subject: ${outreach.emailSubject}\n\n${outreach.emailBody}`)}>
                                                📋 Copy Full Email
                                            </button>
                                        </div>
                                        <div style={{ padding: '12px 18px' }}>
                                            <div style={{ marginBottom: 10 }}>
                                                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Subject Line</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ flex: 1, fontFamily: 'monospace', fontSize: 12.5, color: 'var(--accent)', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                                                        {outreach.emailSubject}
                                                    </div>
                                                    <button className="btn-ghost" style={{ fontSize: 10, padding: '4px 8px', flexShrink: 0 }} onClick={() => copyToClipboard(outreach.emailSubject)}>Copy</button>
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Email Body</div>
                                                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', fontSize: 12.5, lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                                                    {outreach.emailBody}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Email Follow-up */}
                                    {[
                                        { key: 'emailFollowUp', label: '📧 Email Follow-up', step: 'Step 2', badge: 'badge-blue', desc: 'Send if no reply after 5 business days' },
                                        { key: 'linkedinConnection', label: '🔗 LinkedIn Connection Request', step: 'Step 3', badge: 'badge-purple', desc: 'Send same day as email or same day as applying' },
                                        { key: 'linkedinFollowUp', label: '🔗 LinkedIn Follow-up', step: 'Step 4', badge: 'badge-purple', desc: 'Send 5 days after connecting if no response' },
                                    ].map(item => (
                                        <div key={item.key} className="card" style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <span className={`badge ${item.badge}`} style={{ fontSize: 9 }}>{item.step}</span>
                                                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</span>
                                                </div>
                                                <button className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }}
                                                    onClick={() => copyToClipboard((outreach as any)[item.key])}>📋 Copy</button>
                                            </div>
                                            <div style={{
                                                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                                borderRadius: 8, padding: '10px 14px',
                                                fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap',
                                            }}>
                                                {(outreach as any)[item.key]}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Download all */}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn-secondary" style={{ fontSize: 12, padding: '8px 16px', flex: 1 }}
                                            onClick={() => {
                                                const all = `=== COLD EMAIL ===\nSubject: ${outreach.emailSubject}\n\n${outreach.emailBody}\n\n=== EMAIL FOLLOW-UP ===\n${outreach.emailFollowUp}\n\n=== LINKEDIN CONNECTION ===\n${outreach.linkedinConnection}\n\n=== LINKEDIN FOLLOW-UP ===\n${outreach.linkedinFollowUp}`;
                                                copyToClipboard(all);
                                            }}>
                                            📋 Copy All Messages
                                        </button>
                                        <button className="btn-secondary" style={{ fontSize: 12, padding: '8px 16px', flex: 1 }}
                                            onClick={() => {
                                                const all = `=== COLD EMAIL ===\nSubject: ${outreach.emailSubject}\n\n${outreach.emailBody}\n\n=== EMAIL FOLLOW-UP ===\n${outreach.emailFollowUp}\n\n=== LINKEDIN CONNECTION ===\n${outreach.linkedinConnection}\n\n=== LINKEDIN FOLLOW-UP ===\n${outreach.linkedinFollowUp}`;
                                                download(all, `outreach_${job.company}.txt`)
                                            }}>
                                            ⬇ Download All
                                        </button>
                                    </div>
                                    <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, fontSize: 11.5, color: '#34d399' }}>
                                        ✓ Saved to ~/Documents/NextRole/Generated/outreach/{job.company}/
                                    </div>
                                </div>
                            )}

                            {!outreach && !loadingOutreach && (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(79,142,247,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>📤</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>No outreach messages yet</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Includes cold email, email follow-up, LinkedIn connection + follow-up</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

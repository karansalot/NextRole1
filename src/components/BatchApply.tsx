'use client';
import { useState } from 'react';
import { Job, UserProfile, Application } from '@/lib/types';
import JobDetailModal from './JobDetailModal';

interface Props {
    savedJobs: Job[];
    setSavedJobs: React.Dispatch<React.SetStateAction<Job[]>>;
    profile: UserProfile | null;
    onSaveApp: (app: Application) => void;
}

interface BatchJob extends Job {
    checked: boolean;
    resume?: string;
    coverLetter?: string;
    generating?: boolean;
    done?: boolean;
    error?: string;
}

export default function BatchApply({ savedJobs, setSavedJobs, profile, onSaveApp }: Props) {
    const [jobs, setJobs] = useState<BatchJob[]>(savedJobs.map(j => ({ ...j, checked: true })));
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [viewJob, setViewJob] = useState<BatchJob | null>(null);
    const [customNotes, setCustomNotes] = useState('');

    const checked = jobs.filter(j => j.checked);
    const ready = jobs.filter(j => j.done);

    const toggleAll = () => {
        const allChecked = jobs.every(j => j.checked);
        setJobs(jobs.map(j => ({ ...j, checked: !allChecked })));
    };

    const updateJob = (id: string, updates: Partial<BatchJob>) => {
        setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
    };

    const generateAll = async () => {
        if (!profile?.openAIKey) {
            alert('Please add your OpenAI API key in Profile settings first!');
            return;
        }
        const selected = jobs.filter(j => j.checked && !j.done);
        if (selected.length === 0) return;

        setRunning(true);
        setProgress(0);

        for (let i = 0; i < selected.length; i++) {
            const job = selected[i];
            updateJob(job.id, { generating: true });

            try {
                // Generate resume
                const resRes = await fetch('/api/resume/tailor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profile, job, openAIKey: profile.openAIKey }),
                });
                const resData = await resRes.json();

                // Generate cover letter
                const covRes = await fetch('/api/cover-letter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profile, job, openAIKey: profile.openAIKey }),
                });
                const covData = await covRes.json();

                updateJob(job.id, {
                    resume: resData.resume,
                    coverLetter: covData.letter,
                    generating: false,
                    done: true,
                });

                // Save to tracker
                const app: Application = {
                    id: `app_${job.id}_${Date.now()}`,
                    job: { ...job, resumeGenerated: true, coverLetterGenerated: true },
                    status: 'resume_ready',
                    tailoredResume: resData.resume,
                    coverLetter: covData.letter,
                    notes: customNotes,
                    savedAt: new Date().toISOString(),
                };
                onSaveApp(app);
            } catch (e: any) {
                updateJob(job.id, { generating: false, error: e.message });
            }

            setProgress(Math.round(((i + 1) / selected.length) * 100));
        }

        setRunning(false);
    };

    const downloadAll = () => {
        const doneJobs = jobs.filter(j => j.done && j.resume);
        for (const job of doneJobs) {
            if (job.resume) {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([job.resume], { type: 'text/plain' }));
                a.download = `resume_${job.company.replace(/\s/g, '_')}.txt`;
                a.click();
            }
            if (job.coverLetter) {
                const b = document.createElement('a');
                b.href = URL.createObjectURL(new Blob([job.coverLetter], { type: 'text/plain' }));
                b.download = `cover_${job.company.replace(/\s/g, '_')}.txt`;
                b.click();
            }
        }
    };

    return (
        <div style={{ padding: '28px 32px' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Batch Apply</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Generate tailored resumes and cover letters for multiple jobs at once, then manually apply with full control
                </p>
            </div>

            {savedJobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
                    <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 6 }}>No jobs saved yet</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Go to Discover Jobs, save roles you want to apply to, then come back here for batch processing</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
                    {/* Job list */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <input type="checkbox" checked={jobs.every(j => j.checked)} onChange={toggleAll}
                                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }} />
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>{checked.length}</strong> of {jobs.length} selected
                                </span>
                                {ready.length > 0 && <span className="badge badge-green" style={{ fontSize: 9 }}>{ready.length} Ready</span>}
                            </div>
                            <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--accent-red)', padding: '4px 10px' }}
                                onClick={() => { setSavedJobs([]); setJobs([]); }}>
                                Clear All
                            </button>
                        </div>

                        {/* Progress */}
                        {running && (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                    <span>Generating documents...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {jobs.map(job => (
                                <div key={job.id} className="card"
                                    style={{
                                        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                                        borderColor: job.done ? 'rgba(16,185,129,0.3)' : undefined,
                                        background: job.done ? 'rgba(16,185,129,0.03)' : undefined,
                                    }}>
                                    <input type="checkbox" checked={job.checked} disabled={job.done || running}
                                        onChange={() => updateJob(job.id, { checked: !job.checked })}
                                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }} />

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {job.title}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{job.company} · {job.location}</div>
                                        {job.error && <div style={{ fontSize: 11, color: 'var(--accent-red)', marginTop: 2 }}>⚠ {job.error}</div>}
                                    </div>

                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                        {job.generating && <span className="spinner" />}
                                        {job.done && (
                                            <>
                                                <span className="badge badge-green" style={{ fontSize: 9 }}>✓ Generated</span>
                                                <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
                                                    onClick={() => setViewJob(job)}>View</button>
                                                <a href={job.url} target="_blank" rel="noopener noreferrer">
                                                    <button className="btn-primary" style={{ fontSize: 11, padding: '5px 12px' }}>Apply 🔗</button>
                                                </a>
                                            </>
                                        )}
                                        {!job.done && !job.generating && (
                                            <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
                                                onClick={() => setViewJob(job)}>Preview</button>
                                        )}
                                        {job.sponsorsVisa && <span className="badge badge-blue" style={{ fontSize: 9 }}>H1B ✓</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action panel */}
                    <div style={{ position: 'sticky', top: 24 }}>
                        <div className="card" style={{ padding: 20, marginBottom: 14 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚡ Batch Actions</h3>

                            <div style={{ marginBottom: 14 }}>
                                <label className="label">Notes (added to all applications)</label>
                                <textarea className="textarea" rows={2} style={{ minHeight: 60 }}
                                    placeholder="e.g. Applied via LinkedIn Easy Apply, followed up on..."
                                    value={customNotes} onChange={e => setCustomNotes(e.target.value)} />
                            </div>

                            <button className="btn-primary" style={{ width: '100%', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                onClick={generateAll} disabled={running || checked.length === 0}>
                                {running ? <><span className="spinner" /> Generating... ({progress}%)</> : `✨ Generate for ${checked.length} Jobs`}
                            </button>

                            {ready.length > 0 && (
                                <button className="btn-green" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}
                                    onClick={downloadAll}>
                                    ⬇ Download All ({ready.length} sets)
                                </button>
                            )}

                            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>Manual Apply Workflow:</strong><br />
                                    1. Click Generate for all selected jobs<br />
                                    2. Review each generated resume + cover letter<br />
                                    3. Click "Apply 🔗" to open the job page<br />
                                    4. Paste your tailored documents and submit<br />
                                    5. All saved to ~/Documents/NextRole/Generated/
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="card" style={{ padding: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session Stats</div>
                            {[
                                { label: 'Saved Jobs', val: jobs.length, color: 'var(--accent)' },
                                { label: 'Selected', val: checked.length, color: '#8B5CF6' },
                                { label: 'Generated', val: ready.length, color: '#10B981' },
                            ].map(s => (
                                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{s.label}</span>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {viewJob && (
                <JobDetailModal
                    job={viewJob}
                    profile={profile}
                    onClose={() => setViewJob(null)}
                    onSave={() => { }}
                    isSaved={true}
                    onSaveApp={onSaveApp}
                />
            )}
        </div>
    );
}

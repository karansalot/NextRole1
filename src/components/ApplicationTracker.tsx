'use client';
import { useState } from 'react';
import { Application, ApplicationStatus, UserProfile } from '@/lib/types';
import JobDetailModal from './JobDetailModal';

interface Props {
    applications: Application[];
    profile: UserProfile | null;
    onUpdateApp: (id: string, updates: Partial<Application>) => void;
}

const STATUS_COLUMNS: { status: ApplicationStatus; label: string; color: string; icon: string }[] = [
    { status: 'saved', label: 'Saved', color: '#4F8EF7', icon: '⭐' },
    { status: 'resume_ready', label: 'Ready to Apply', color: '#8B5CF6', icon: '📝' },
    { status: 'applied', label: 'Applied', color: '#10B981', icon: '✅' },
    { status: 'outreach_sent', label: 'Outreach Sent', color: '#F59E0B', icon: '📤' },
    { status: 'interview', label: 'Interview', color: '#EC4899', icon: '🎙' },
    { status: 'offer', label: 'Offer', color: '#34d399', icon: '🎉' },
];

export default function ApplicationTracker({ applications, profile, onUpdateApp }: Props) {
    const [viewJob, setViewJob] = useState<Application | null>(null);
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

    const byStatus = (status: ApplicationStatus) => applications.filter(a => a.status === status || (status === 'saved' && a.status === 'discovered'));

    const moveStatus = (appId: string, newStatus: ApplicationStatus) => {
        onUpdateApp(appId, { status: newStatus });
    };

    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div style={{ padding: '28px 32px' }}>
            {/* Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Application Tracker</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Track every application through your pipeline</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className={viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12, padding: '7px 16px' }} onClick={() => setViewMode('kanban')}>Kanban</button>
                    <button className={viewMode === 'table' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12, padding: '7px 16px' }} onClick={() => setViewMode('table')}>Table</button>
                </div>
            </div>

            {applications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                    <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 6 }}>No applications yet</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Discover jobs and click "Add to Tracker" to start tracking</div>
                </div>
            ) : viewMode === 'kanban' ? (
                <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16 }}>
                    {STATUS_COLUMNS.map(col => {
                        const apps = byStatus(col.status);
                        return (
                            <div key={col.status} className="kanban-col" style={{ minWidth: 260 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>{col.icon}</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{col.label}</span>
                                    </div>
                                    <span style={{ background: col.color + '22', color: col.color, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{apps.length}</span>
                                </div>

                                {apps.map(app => (
                                    <div key={app.id} className="card"
                                        style={{ padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }}
                                        onClick={() => setViewJob(app)}>
                                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.job.title}</div>
                                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 6 }}>{app.job.company}</div>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                                            {app.tailoredResume && <span className="badge badge-green" style={{ fontSize: 9 }}>Resume ✓</span>}
                                            {app.coverLetter && <span className="badge badge-purple" style={{ fontSize: 9 }}>Cover ✓</span>}
                                            {app.job.sponsorsVisa && <span className="badge badge-blue" style={{ fontSize: 9 }}>H1B</span>}
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Saved {formatDate(app.savedAt)}</div>

                                        {/* Quick move */}
                                        <select
                                            className="input"
                                            style={{ marginTop: 8, fontSize: 11, padding: '4px 8px' }}
                                            value={app.status}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => { e.stopPropagation(); moveStatus(app.id, e.target.value as ApplicationStatus); }}
                                        >
                                            {STATUS_COLUMNS.map(s => <option key={s.status} value={s.status}>{s.icon} {s.label}</option>)}
                                            <option value="rejected">❌ Rejected</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Table view */
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                                {['Company', 'Role', 'Location', 'Status', 'Resume', 'Cover Letter', 'Saved', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {applications.map((app, i) => (
                                <tr key={app.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{app.job.company}</td>
                                    <td style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>{app.job.title}</td>
                                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: 'var(--text-muted)' }}>{app.job.location}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <select className="input" style={{ fontSize: 11, padding: '4px 8px', width: 'auto' }}
                                            value={app.status}
                                            onChange={e => moveStatus(app.id, e.target.value as ApplicationStatus)}>
                                            {STATUS_COLUMNS.map(s => <option key={s.status} value={s.status}>{s.label}</option>)}
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        {app.tailoredResume ? <span className="badge badge-green" style={{ fontSize: 9 }}>✓ Ready</span> : <span className="badge badge-red" style={{ fontSize: 9 }}>Missing</span>}
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        {app.coverLetter ? <span className="badge badge-purple" style={{ fontSize: 9 }}>✓ Ready</span> : <span className="badge badge-red" style={{ fontSize: 9 }}>Missing</span>}
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(app.savedAt)}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setViewJob(app)}>View</button>
                                            <a href={app.job.url} target="_blank" rel="noopener noreferrer">
                                                <button className="btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}>Apply 🔗</button>
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {viewJob && (
                <JobDetailModal
                    job={viewJob.job}
                    profile={profile}
                    onClose={() => setViewJob(null)}
                    onSave={() => { }}
                    isSaved={true}
                    onSaveApp={(app) => onUpdateApp(app.id, app)}
                />
            )}
        </div>
    );
}

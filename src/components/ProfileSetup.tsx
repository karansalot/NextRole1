'use client';
import { useState } from 'react';
import { UserProfile, Experience, Education, Project } from '@/lib/types';

interface Props {
    profile: UserProfile | null;
    onSave: (p: UserProfile) => void;
}

const BLANK_PROFILE: UserProfile = {
    name: '', email: '', phone: '', linkedin: '', location: '',
    visaStatus: 'OPT', targetRoles: ['Business Analyst', 'Product Manager'],
    targetLocations: ['New York, NY', 'San Francisco, CA', 'Remote'],
    baseResumeLaTeX: '', baseResumeText: '', summary: '',
    skills: [], experiences: [], education: [], projects: [],
    hackathons: ['5x Hackathon Winner'],
    openAIKey: '', groqApiKey: '', aiProvider: 'groq' as const,
    adzunaAppId: '', adzunaApiKey: '', hunterApiKey: '',
};

export default function ProfileSetup({ profile, onSave }: Props) {
    const [form, setForm] = useState<UserProfile>(profile || BLANK_PROFILE);
    const [saved, setSaved] = useState(false);
    const [activeSection, setActiveSection] = useState('basics');

    const set = (key: keyof UserProfile, val: any) => setForm(prev => ({ ...prev, [key]: val }));

    const handleSave = async () => {
        await onSave(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const sections = [
        { key: 'basics', label: 'Basic Info', icon: '👤' },
        { key: 'api', label: 'API Keys', icon: '🔑' },
        { key: 'resume', label: 'Base Resume', icon: '📄' },
        { key: 'experience', label: 'Experience', icon: '💼' },
        { key: 'education', label: 'Education', icon: '🎓' },
        { key: 'projects', label: 'Projects', icon: '🛠' },
        { key: 'skills', label: 'Skills & More', icon: '⚡' },
    ];

    return (
        <div style={{ padding: '28px 32px' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>My Profile</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Your profile powers all AI features — resume tailoring, cover letters, and outreach</p>
                </div>
                <button className={saved ? 'btn-green' : 'btn-primary'} onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {saved ? '✓ Saved!' : '💾 Save Profile'}
                </button>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
                {/* Section nav */}
                <div style={{ width: 180, flexShrink: 0 }}>
                    {sections.map(s => (
                        <button key={s.key} className={`sidebar-item ${activeSection === s.key ? 'active' : ''}`}
                            style={{ width: '100%', marginBottom: 2, fontSize: 13 }}
                            onClick={() => setActiveSection(s.key)}>
                            <span>{s.icon}</span> {s.label}
                        </button>
                    ))}
                </div>

                {/* Section content */}
                <div className="card" style={{ flex: 1, padding: 24 }}>

                    {/* Basics */}
                    {activeSection === 'basics' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Basic Information</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                {[
                                    { key: 'name', label: 'Full Name', placeholder: 'Karan Salot' },
                                    { key: 'email', label: 'Email', placeholder: 'karan@email.com' },
                                    { key: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000' },
                                    { key: 'linkedin', label: 'LinkedIn URL', placeholder: 'linkedin.com/in/karansalot' },
                                    { key: 'location', label: 'Current Location', placeholder: 'New York, NY' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className="label">{f.label}</label>
                                        <input className="input" placeholder={f.placeholder}
                                            value={(form as any)[f.key]} onChange={e => set(f.key as any, e.target.value)} />
                                    </div>
                                ))}
                                <div>
                                    <label className="label">Visa Status</label>
                                    <select className="input" value={form.visaStatus} onChange={e => set('visaStatus', e.target.value)}>
                                        {['OPT', 'OPT STEM Extension', 'H1B', 'H1B Transfer', 'Green Card', 'Citizen', 'TN', 'L1', 'Other'].map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label">Professional Summary</label>
                                <textarea className="textarea" rows={3}
                                    placeholder="Results-driven Business Analyst with 3+ years of experience in..."
                                    value={form.summary} onChange={e => set('summary', e.target.value)} />
                            </div>
                            <div>
                                <label className="label">Target Roles (comma-separated)</label>
                                <input className="input" placeholder="Business Analyst, Product Manager, Data Analyst"
                                    value={form.targetRoles.join(', ')}
                                    onChange={e => set('targetRoles', e.target.value.split(',').map(s => s.trim()))} />
                            </div>
                            <div>
                                <label className="label">Target Locations (comma-separated)</label>
                                <input className="input" placeholder="New York, NY, San Francisco, CA, Remote"
                                    value={form.targetLocations.join(', ')}
                                    onChange={e => set('targetLocations', e.target.value.split(',').map(s => s.trim()))} />
                            </div>
                        </div>
                    )}

                    {/* API Keys */}
                    {activeSection === 'api' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>API Keys</h2>
                            <div style={{ padding: '12px 16px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                🔒 All keys are stored locally on your Mac only. They are never sent to any server except the API providers directly.
                            </div>

                            {/* AI Provider Toggle */}
                            <div style={{ padding: '14px 18px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>🤖 AI Provider <span style={{ fontSize: 10, color: '#34d399', fontWeight: 500 }}>— pick one</span></div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {[
                                        { val: 'groq', label: '⚡ Groq (FREE)', desc: '14,400 req/day · Llama 3.3 70B · No cost', color: '#10B981' },
                                        { val: 'openai', label: '🧠 OpenAI', desc: 'GPT-4o-mini · ~$0.05-0.10/pack', color: '#4F8EF7' },
                                    ].map(p => (
                                        <button key={p.val}
                                            onClick={() => set('aiProvider', p.val as any)}
                                            style={{
                                                flex: 1, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                                                border: `2px solid ${form.aiProvider === p.val ? p.color : 'var(--border)'}`,
                                                background: form.aiProvider === p.val ? `${p.color}14` : 'var(--bg-secondary)',
                                                fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
                                            }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: form.aiProvider === p.val ? p.color : 'var(--text-secondary)', marginBottom: 3 }}>{p.label}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="label">Groq API Key <span style={{ color: '#34d399', fontSize: 10 }}>FREE — 14,400 requests/day</span></label>
                                <input className="input" type="password" placeholder="gsk_..." value={form.groqApiKey || ''} onChange={e => set('groqApiKey', e.target.value)} />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Free at <a href="https://console.groq.com" target="_blank" style={{ color: '#34d399' }}>console.groq.com</a> — sign up, go to API Keys, create one. Runs Llama 3.3 70B (same quality as GPT-4o).
                                </div>
                            </div>

                            <div>
                                <label className="label">OpenAI API Key <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Only needed if using OpenAI provider above</span></label>
                                <input className="input" type="password" placeholder="sk-..." value={form.openAIKey} onChange={e => set('openAIKey', e.target.value)} />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Get yours at <a href="https://platform.openai.com/api-keys" target="_blank" style={{ color: 'var(--accent)' }}>platform.openai.com/api-keys</a>
                                </div>
                            </div>

                            <div>
                                <label className="label">Adzuna App ID <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Optional — for job search</span></label>
                                <input className="input" placeholder="your-app-id" value={form.adzunaAppId} onChange={e => set('adzunaAppId', e.target.value)} />
                            </div>
                            <div>
                                <label className="label">Adzuna API Key</label>
                                <input className="input" type="password" placeholder="your-api-key" value={form.adzunaApiKey} onChange={e => set('adzunaApiKey', e.target.value)} />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Free at <a href="https://developer.adzuna.com" target="_blank" style={{ color: 'var(--accent)' }}>developer.adzuna.com</a> — gives access to 50k+ real job listings
                                </div>
                            </div>

                            <div>
                                <label className="label">Hunter.io API Key <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Optional — for real email finding</span></label>
                                <input className="input" type="password" placeholder="your-hunter-api-key" value={form.hunterApiKey || ''} onChange={e => set('hunterApiKey', e.target.value)} />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Free at <a href="https://hunter.io" target="_blank" style={{ color: 'var(--accent)' }}>hunter.io</a> — 25 free email lookups/month. Used in Hiring Manager Finder + Proactive Outreach to get real verified emails.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Base Resume */}
                    {activeSection === 'resume' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Base Resume</h2>
                            <div>
                                <label className="label">Paste Your Resume Text (used as base for AI tailoring)</label>
                                <textarea className="textarea" rows={18}
                                    placeholder="Paste your current resume text here. This will be the base that GPT-4o tailors for each job application..."
                                    value={form.baseResumeText} onChange={e => set('baseResumeText', e.target.value)} />
                                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                                    The more complete this is, the better the AI tailoring. Include all bullet points, projects, and achievements.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Experience */}
                    {activeSection === 'experience' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Work Experience</h2>
                                <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}
                                    onClick={() => set('experiences', [...form.experiences, { title: '', company: '', location: '', startDate: '', endDate: '', bullets: [''] }])}>
                                    + Add Role
                                </button>
                            </div>
                            {form.experiences.map((exp, i) => (
                                <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                        <div><label className="label">Job Title</label><input className="input" placeholder="Business Analyst" value={exp.title} onChange={e => { const n = [...form.experiences]; n[i].title = e.target.value; set('experiences', n); }} /></div>
                                        <div><label className="label">Company</label><input className="input" placeholder="Accenture" value={exp.company} onChange={e => { const n = [...form.experiences]; n[i].company = e.target.value; set('experiences', n); }} /></div>
                                        <div><label className="label">Start Date</label><input className="input" placeholder="Jun 2022" value={exp.startDate} onChange={e => { const n = [...form.experiences]; n[i].startDate = e.target.value; set('experiences', n); }} /></div>
                                        <div><label className="label">End Date</label><input className="input" placeholder="Present" value={exp.endDate} onChange={e => { const n = [...form.experiences]; n[i].endDate = e.target.value; set('experiences', n); }} /></div>
                                    </div>
                                    <label className="label">Bullet Points (one per line)</label>
                                    <textarea className="textarea" rows={4} placeholder="• Analyzed 500k+ customer records to identify churn patterns, reducing monthly churn by 12%..."
                                        value={exp.bullets.join('\n')}
                                        onChange={e => { const n = [...form.experiences]; n[i].bullets = e.target.value.split('\n'); set('experiences', n); }} />
                                    <button className="btn-ghost" style={{ marginTop: 8, color: 'var(--accent-red)', fontSize: 11 }}
                                        onClick={() => set('experiences', form.experiences.filter((_, j) => j !== i))}>Remove</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Education */}
                    {activeSection === 'education' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Education</h2>
                                <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}
                                    onClick={() => set('education', [...form.education, { degree: '', school: '', grad: '', gpa: '' }])}>
                                    + Add
                                </button>
                            </div>
                            {form.education.map((edu, i) => (
                                <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        <div><label className="label">Degree</label><input className="input" placeholder="B.S. in Information Systems" value={edu.degree} onChange={e => { const n = [...form.education]; n[i].degree = e.target.value; set('education', n); }} /></div>
                                        <div><label className="label">School</label><input className="input" placeholder="NYU Stern" value={edu.school} onChange={e => { const n = [...form.education]; n[i].school = e.target.value; set('education', n); }} /></div>
                                        <div><label className="label">Graduation Year</label><input className="input" placeholder="May 2024" value={edu.grad} onChange={e => { const n = [...form.education]; n[i].grad = e.target.value; set('education', n); }} /></div>
                                        <div><label className="label">GPA (optional)</label><input className="input" placeholder="3.8" value={edu.gpa || ''} onChange={e => { const n = [...form.education]; n[i].gpa = e.target.value; set('education', n); }} /></div>
                                    </div>
                                    <button className="btn-ghost" style={{ marginTop: 8, color: 'var(--accent-red)', fontSize: 11 }}
                                        onClick={() => set('education', form.education.filter((_, j) => j !== i))}>Remove</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Projects */}
                    {activeSection === 'projects' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Projects</h2>
                                <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}
                                    onClick={() => set('projects', [...form.projects, { name: '', description: '', tech: [], bullets: [''] }])}>
                                    + Add Project
                                </button>
                            </div>
                            {form.projects.map((proj, i) => (
                                <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                        <div><label className="label">Project Name</label><input className="input" placeholder="Customer Churn Predictor" value={proj.name} onChange={e => { const n = [...form.projects]; n[i].name = e.target.value; set('projects', n); }} /></div>
                                        <div><label className="label">Tech Stack</label><input className="input" placeholder="Python, SQL, Tableau" value={proj.tech.join(', ')} onChange={e => { const n = [...form.projects]; n[i].tech = e.target.value.split(',').map(s => s.trim()); set('projects', n); }} /></div>
                                    </div>
                                    <label className="label">Bullet Points (one per line)</label>
                                    <textarea className="textarea" rows={3} placeholder="• Built end-to-end ML pipeline analyzing 2M+ transactions..."
                                        value={proj.bullets.join('\n')}
                                        onChange={e => { const n = [...form.projects]; n[i].bullets = e.target.value.split('\n'); set('projects', n); }} />
                                    <button className="btn-ghost" style={{ marginTop: 8, color: 'var(--accent-red)', fontSize: 11 }}
                                        onClick={() => set('projects', form.projects.filter((_, j) => j !== i))}>Remove</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Skills */}
                    {activeSection === 'skills' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Skills & Achievements</h2>
                            <div>
                                <label className="label">Skills (comma-separated)</label>
                                <textarea className="textarea" rows={4}
                                    placeholder="SQL, Python, Tableau, Excel, Figma, JIRA, Confluence, Product Analytics, A/B Testing, Data Modeling"
                                    value={form.skills.join(', ')}
                                    onChange={e => set('skills', e.target.value.split(',').map(s => s.trim()))} />
                            </div>
                            <div>
                                <label className="label">Hackathons & Achievements (one per line)</label>
                                <textarea className="textarea" rows={5}
                                    placeholder="1st Place — NYU Data Science Hackathon 2024&#10;Winner — Google Cloud Accelerator Hackathon 2023&#10;1st Place — TechCrunch Disrupt Hackathon 2023"
                                    value={form.hackathons.join('\n')}
                                    onChange={e => set('hackathons', e.target.value.split('\n').filter(Boolean))} />
                                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                                    These are highlighted prominently in your cover letters and resumes to showcase your competitive edge
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

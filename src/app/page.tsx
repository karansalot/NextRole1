'use client';
import { useState, useEffect, useCallback } from 'react';
import JobDiscovery from '@/components/JobDiscovery';
import ApplicationTracker from '@/components/ApplicationTracker';
import ProfileSetup from '@/components/ProfileSetup';
import BatchApply from '@/components/BatchApply';
import HiringProspector from '@/components/HiringProspector';
import ProspectOutreach from '@/components/ProspectOutreach';
import { Application, Job, UserProfile } from '@/lib/types';

type Tab = 'discover' | 'tracker' | 'batch' | 'prospector' | 'outreach' | 'profile';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(p => {
      if (p && p.name) setProfile(p);
      setProfileLoaded(true);
    });
    fetch('/api/applications').then(r => r.json()).then(a => {
      if (Array.isArray(a)) setApplications(a);
    });
  }, []);

  const saveApp = useCallback(async (app: Application) => {
    await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(app),
    });
    setApplications(prev => {
      const idx = prev.findIndex(a => a.id === app.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = app; return n; }
      return [app, ...prev];
    });
  }, []);

  const updateApp = useCallback(async (id: string, updates: Partial<Application>) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    await fetch('/api/applications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
  }, []);

  const saveProfile = useCallback(async (p: UserProfile) => {
    setProfile(p);
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
  }, []);

  const navItems: { key: Tab; label: string; icon: string; badge?: number }[] = [
    { key: 'discover', label: 'Discover Jobs', icon: '🔍' },
    { key: 'tracker', label: 'Application Tracker', icon: '📋', badge: applications.filter(a => ['applied', 'interview'].includes(a.status)).length },
    { key: 'batch', label: 'Batch Apply', icon: '⚡', badge: savedJobs.length || undefined },
    { key: 'prospector', label: 'Hiring Manager Finder', icon: '🎯' },
    { key: 'outreach', label: 'Proactive Outreach', icon: '🚀' },
    { key: 'profile', label: 'My Profile', icon: '👤' },
  ];

  const stats = {
    discovered: applications.length,
    applied: applications.filter(a => a.status === 'applied').length,
    interviews: applications.filter(a => a.status === 'interview').length,
    offers: applications.filter(a => a.status === 'offer').length,
  };

  if (profileLoaded && !profile?.name && activeTab !== 'profile') {
    // Show onboarding nudge
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '12px 14px 24px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #4F8EF7, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>🚀</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>NextRole</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>AI JOB ASSISTANT</div>
            </div>
          </div>
          {profile?.visaStatus && (
            <div style={{ marginTop: 10 }}>
              <span className="badge badge-blue" style={{ fontSize: 10 }}>🛂 {profile.visaStatus}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ padding: '12px 14px', marginBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { label: 'Tracked', val: stats.discovered, color: '#4F8EF7' },
              { label: 'Applied', val: stats.applied, color: '#10B981' },
              { label: 'Interviews', val: stats.interviews, color: '#F59E0B' },
              { label: 'Offers', val: stats.offers, color: '#8B5CF6' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 10px', textAlign: 'center'
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="divider" style={{ margin: '0 14px 8px' }} />

        {/* Nav */}
        {navItems.map(item => (
          <button
            key={item.key}
            className={`sidebar-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => setActiveTab(item.key)}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge ? (
              <span style={{
                background: 'var(--accent)', color: 'white',
                borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700
              }}>{item.badge}</span>
            ) : null}
          </button>
        ))}

        {/* Bottom */}
        <div style={{ marginTop: 'auto', padding: '16px 14px 0', borderTop: '1px solid var(--border)' }}>
          {!profile?.openAIKey && (
            <div style={{
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 10, padding: '10px 12px', marginBottom: 8
            }}>
              <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 2 }}>⚠ Add API Keys</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                OpenAI key required for AI features. Add in Profile settings.
              </div>
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
            All data stored locally<br />100% private on your Mac
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content" style={{ padding: '0 0 40px' }}>
        {!profile?.name && profileLoaded && activeTab !== 'profile' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(79,142,247,0.1), rgba(139,92,246,0.1))',
            borderBottom: '1px solid var(--border)',
            padding: '14px 32px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>👋</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                Welcome! Set up your profile first to enable AI features.{' '}
              </span>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '2px 10px', color: 'var(--accent)' }}
                onClick={() => setActiveTab('profile')}>
                Set Up Profile →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'discover' && (
          <JobDiscovery
            profile={profile}
            savedJobs={savedJobs}
            setSavedJobs={setSavedJobs}
            onSaveApp={saveApp}
            applications={applications}
          />
        )}
        {activeTab === 'tracker' && (
          <ApplicationTracker
            applications={applications}
            profile={profile}
            onUpdateApp={updateApp}
          />
        )}
        {activeTab === 'batch' && (
          <BatchApply
            savedJobs={savedJobs}
            setSavedJobs={setSavedJobs}
            profile={profile}
            onSaveApp={saveApp}
          />
        )}
        {activeTab === 'prospector' && (
          <HiringProspector profile={profile} />
        )}
        {activeTab === 'outreach' && (
          <ProspectOutreach profile={profile} />
        )}
        {activeTab === 'profile' && (
          <ProfileSetup profile={profile} onSave={saveProfile} />
        )}
      </main>
    </div>
  );
}

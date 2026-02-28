// Storage utility using local file system for persistence
import fs from 'fs';
import path from 'path';
import { UserProfile, Application, Job } from './types';

const DATA_DIR = path.join(process.env.HOME || '/tmp', 'Documents', 'NextRole', '.data');
const APPS_FILE = path.join(DATA_DIR, 'applications.json');
const PROFILE_FILE = path.join(DATA_DIR, 'profile.json');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');

function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadProfile(): UserProfile | null {
    ensureDir();
    if (!fs.existsSync(PROFILE_FILE)) return null;
    return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf-8'));
}

export function saveProfile(profile: UserProfile) {
    ensureDir();
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2));
}

export function loadApplications(): Application[] {
    ensureDir();
    if (!fs.existsSync(APPS_FILE)) return [];
    return JSON.parse(fs.readFileSync(APPS_FILE, 'utf-8'));
}

export function saveApplications(apps: Application[]) {
    ensureDir();
    fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2));
}

export function saveApplication(app: Application) {
    const apps = loadApplications();
    const idx = apps.findIndex(a => a.id === app.id);
    if (idx >= 0) apps[idx] = app;
    else apps.push(app);
    saveApplications(apps);
}

export function loadJobs(): Job[] {
    ensureDir();
    if (!fs.existsSync(JOBS_FILE)) return [];
    return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8'));
}

export function saveJobs(jobs: Job[]) {
    ensureDir();
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

// Save generated documents to ~/Documents/NextRole/Generated
export function saveGeneratedDoc(type: 'resume' | 'cover_letter' | 'outreach', company: string, filename: string, content: string) {
    const dir = path.join(process.env.HOME || '/tmp', 'Documents', 'NextRole', 'Generated', type, company);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
}

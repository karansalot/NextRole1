// Core data types for NextRole app
export interface UserProfile {
    name: string;
    email: string;
    phone: string;
    linkedin: string;
    location: string;
    visaStatus: string; // OPT, H1B, Citizen, etc.
    targetRoles: string[];
    targetLocations: string[];
    baseResumeLaTeX: string;
    latexResume: string;       // Active LaTeX resume used for tailoring
    baseResumeText: string;
    summary: string;
    skills: string[];
    experiences: Experience[];
    education: Education[];
    projects: Project[];
    hackathons: string[];
    openAIKey: string;
    groqApiKey: string;          // Free: console.groq.com — 14,400 req/day
    anthropicApiKey: string;     // Claude API Key
    aiProvider: 'openai' | 'groq' | 'anthropic'; // Which provider to use
    adzunaAppId: string;
    adzunaApiKey: string;
    hunterApiKey: string; // hunter.io - free 25 searches/month
}

export interface Experience {
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
}

export interface Education {
    degree: string;
    school: string;
    grad: string;
    gpa?: string;
}

export interface Project {
    name: string;
    description: string;
    tech: string[];
    bullets: string[];
}

export interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    salary?: string;
    description: string;
    url: string;
    source: string;
    postedAt: string;
    sponsorsVisa?: boolean;
    matchScore?: number;
    matchReason?: string;
    tags: string[];
    status?: ApplicationStatus;
    resumeGenerated?: boolean;
    coverLetterGenerated?: boolean;
}

export type ApplicationStatus =
    | 'discovered'
    | 'saved'
    | 'resume_ready'
    | 'applied'
    | 'outreach_sent'
    | 'interview'
    | 'offer'
    | 'rejected';

export interface Application {
    id: string;
    job: Job;
    status: ApplicationStatus;
    tailoredResume?: string;
    coverLetter?: string;
    hiringManagers?: HiringManager[];
    outreachMessages?: OutreachMessages;
    notes?: string;
    appliedAt?: string;
    savedAt: string;
}

export interface HiringManager {
    name: string;
    title: string;
    linkedin?: string;
    email?: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface OutreachMessages {
    linkedinConnection: string;
    linkedinFollowUp: string;
    emailSubject: string;
    emailBody: string;
    emailFollowUp: string;
}

export interface Prospect {
    id: string;
    name: string;
    title: string;              // e.g. "CEO", "CTO", "VP Engineering"
    company: string;
    companyStage?: string;      // Startup, Series A, Series B, etc.
    industry?: string;
    location?: string;          // US city/state
    email?: string;
    emailConfidence?: number;   // 0-100 from Hunter.io
    linkedin?: string;
    source: string;             // "hunter.io" | "google" | "ai"
    coldEmail?: string;         // generated cold email body
    emailSubject?: string;
    status: 'new' | 'emailed' | 'replied' | 'meeting' | 'not_interested';
    notes?: string;
    savedAt: string;
}

export interface JobSearchFilters {
    keywords: string;
    location: string;
    remote: boolean;
    hybrid: boolean;
    onsite: boolean;
    visaFriendly: boolean;
    minSalary?: number;
    maxSalary?: number;
    companySize?: string;
    industry?: string;
    experienceLevel?: string;
    postedWithin?: number; // days
}

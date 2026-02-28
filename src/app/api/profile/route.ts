import { NextRequest, NextResponse } from 'next/server';
import { loadProfile, saveProfile } from '@/lib/storage';

export async function GET() {
    const profile = loadProfile();
    return NextResponse.json(profile || {});
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    saveProfile(body);
    return NextResponse.json({ success: true });
}

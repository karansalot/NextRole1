import { NextRequest, NextResponse } from 'next/server';
import { loadApplications, saveApplication, saveApplications } from '@/lib/storage';

export async function GET() {
    return NextResponse.json(loadApplications());
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    saveApplication(body);
    return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
    const body = await req.json();
    const apps = loadApplications();
    const idx = apps.findIndex(a => a.id === body.id);
    if (idx >= 0) {
        apps[idx] = { ...apps[idx], ...body };
        saveApplications(apps);
        return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function DELETE(req: NextRequest) {
    const { id } = await req.json();
    const apps = loadApplications().filter(a => a.id !== id);
    saveApplications(apps);
    return NextResponse.json({ success: true });
}

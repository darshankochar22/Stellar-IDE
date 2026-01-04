import { NextResponse } from 'next/server';
import { getWorkspacePath } from '@/lib/docker/utils';

export async function GET() {
    try {
        const workspacePath = getWorkspacePath();
        return NextResponse.json({
            success: true,
            workspacePath,
            // We can add other config here if needed
        });
    } catch (error) {
        console.error('Config API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

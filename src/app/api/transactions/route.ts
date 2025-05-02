import { NextResponse } from 'next/server';
import { fetchWithErrorHandling } from '@/services/api';

const BACKEND_URL = process.env.BACKEND_URL;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;

export async function GET() {
  try {
    if (!BACKEND_URL || !BACKEND_API_KEY) {
      throw new Error('Missing required environment variables');
    }

    const data = await fetchWithErrorHandling(`${BACKEND_URL}/getalltransactions`, {
      headers: {
        'x-api-key': BACKEND_API_KEY
      }
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 
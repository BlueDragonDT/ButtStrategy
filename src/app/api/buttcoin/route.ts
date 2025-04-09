import { NextResponse } from 'next/server';
import { getButtcoinData } from '@/services/buttcoinService';

export async function GET() {
  try {
    const data = await getButtcoinData();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch buttcoin data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 
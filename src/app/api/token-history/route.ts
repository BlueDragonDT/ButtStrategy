import { NextResponse } from 'next/server';
import { fetchTokenPriceHistory } from '@/services/tokenService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFrom = parseInt(searchParams.get('timeFrom') || '0');
    const timeTo = parseInt(searchParams.get('timeTo') || (Date.now() / 1000).toString());
    const interval = searchParams.get('interval') || '2H';

    const data = await fetchTokenPriceHistory(timeFrom, timeTo, interval);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch token history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 
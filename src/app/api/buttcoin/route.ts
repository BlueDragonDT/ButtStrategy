import { NextResponse } from 'next/server';
import { getButtcoinData } from '@/services/buttcoinService';
import { TOTAL_USD_SPENT } from '@/services/buttcoinService';

//deploy on vercel

export async function GET() {
  try {
    const data = await getButtcoinData();
    
    // Debug logs for avgCostPerCoin calculation
    console.log('DEBUG - Balance:', data.balance);
    console.log('DEBUG - TOTAL_USD_SPENT from import:', TOTAL_USD_SPENT); // This will show the actual constant
    console.log('DEBUG - TOTAL_USD_SPENT hardcoded:', 255687);
    console.log('DEBUG - Avg Cost (from service):', data.avgCostPerCoin);
    console.log('DEBUG - Calculated Avg Cost:', 255687 / data.balance);
    
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch buttcoin data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 

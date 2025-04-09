import { NextResponse } from 'next/server';
import { fetchAllTransactions } from '@/services/transactionService';

export async function GET() {
  try {
    const data = await fetchAllTransactions();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 
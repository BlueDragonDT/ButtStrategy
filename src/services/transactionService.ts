import { fetchWithErrorHandling } from './api';

const BACKEND_URL = process.env.BACKEND_URL;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;

export interface Transaction {
  _id: string;
  timestamp: string; // Format: "MM/DD/YYYY HH:MM:SS"
  balance: number;
  price: number;
  amount: number;
  txhash: string;
  type: string;
}

export interface PurchaseData {
  reported: string;
  buttcoinAcquisitions: number;
  avgbuttcoinCost: number;
  acquisitionCost: number;
  buttcoinHoldings: number;
  buttcoinSupply: number;
  type: string;
  txHash: string;
}

export interface TransactionSummary {
  transactions: PurchaseData[];
  totalButtcoinAcquisitions: number;
  totalAcquisitionCost: number;
  averageAcquisitionCost: number;
  latestHoldings: number;
}

/**
 * Fetches all transaction data
 */
export const fetchAllTransactions = async (): Promise<Transaction[]> => {
  try {
    if (!BACKEND_URL) {
      throw new Error("BACKEND_URL is not defined");
    }
    if (!BACKEND_API_KEY) {
      throw new Error("BACKEND_API_KEY is not defined");
    }
    
    return await fetchWithErrorHandling(`${BACKEND_URL}/getalltransactions`, {
      headers: {
        'x-api-key': BACKEND_API_KEY
      }
    });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    throw error;
  }
};

/**
 * Processes transactions into purchase data with calculated totals and summaries
 */
export const getProcessedTransactions = async (): Promise<TransactionSummary> => {
  try {
    const transactions = await fetchAllTransactions();
    
    let total = 0;
    let totalCost = 0;

    // Process each transaction into PurchaseData format
    const parsedData: PurchaseData[] = transactions.map((item) => {
      const amount = Number(item.amount) || 0;
      const price = Number(item.price) || 0;
      const balance = Number(item.balance) || 0;

      const acquisitionCost = parseFloat((amount * price).toFixed(4));
      total += amount;
      totalCost += acquisitionCost;

      return {
        reported: item.timestamp,
        buttcoinAcquisitions: amount,
        avgbuttcoinCost: price,
        acquisitionCost,
        buttcoinHoldings: balance,
        buttcoinSupply: parseFloat(((amount / 1_000_000_000) * 100).toFixed(4)),
        type: item.type || "",
        txHash: item.txhash || "",
      };
    });

    // Sort by latest date
    const sortedData = [...parsedData].sort(
      (a, b) => new Date(b.reported).getTime() - new Date(a.reported).getTime()
    );

    const latestHoldings = sortedData[0]?.buttcoinHoldings ?? 0;
    const averageAcquisitionCost = total ? totalCost / total : 0;

    return {
      transactions: sortedData,
      totalButtcoinAcquisitions: total,
      totalAcquisitionCost: totalCost,
      averageAcquisitionCost,
      latestHoldings
    };
  } catch (error) {
    console.error("Failed to process transactions:", error);
    throw error;
  }
}; 
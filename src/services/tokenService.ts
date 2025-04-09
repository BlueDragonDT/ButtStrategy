import { fetchWithErrorHandling } from './api';

// Constants from environment variables
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || "";
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "";

// Validate required environment variables
if (!BIRDEYE_API_KEY || !TOKEN_ADDRESS) {
  throw new Error('Missing required environment variables for token service');
}

export interface PriceDataItem {
  date: string;
  price: number;
}

/**
 * Fetches historical price data for the token
 * @param timeFrom Unix timestamp for start time
 * @param timeTo Unix timestamp for end time
 * @param interval Time interval for data points (e.g., '1H', '2H', '1D')
 */
export const fetchTokenPriceHistory = async (
  timeFrom: number,
  timeTo: number = Math.floor(Date.now() / 1000),
  interval: string = '2H'
): Promise<PriceDataItem[]> => {
  try {
    const url = `https://public-api.birdeye.so/defi/history_price?address=${TOKEN_ADDRESS}&address_type=token&type=${interval}&time_from=${timeFrom}&time_to=${timeTo}`;
    
    const response = await fetchWithErrorHandling(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-chain": "solana",
        "X-API-KEY": BIRDEYE_API_KEY,
      },
    });
    
    if (response.success && response.data && response.data.items) {
      return response.data.items.map((item: { unixTime: number; value: number }) => {
        const date = new Date(item.unixTime * 1000);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        return {
          date: formattedDate,
          price: item.value,
        };
      });
    }
    
    throw new Error("Invalid API response structure");
  } catch (error) {
    console.error("Failed to fetch token price history:", error);
    throw error;
  }
}; 
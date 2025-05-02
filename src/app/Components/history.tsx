"use client";
import * as React from "react";
import Typography from "@mui/material/Typography";
import { ResponsiveChartContainer } from "@mui/x-charts/ResponsiveChartContainer";
import { LinePlot, LineHighlightPlot, ScatterPlot } from "@mui/x-charts";
import { ChartsXAxis } from "@mui/x-charts/ChartsXAxis";
import { ChartsYAxis } from "@mui/x-charts/ChartsYAxis";
import { ChartsTooltip } from "@mui/x-charts/ChartsTooltip";
import { ChartsAxisHighlight } from "@mui/x-charts/ChartsAxisHighlight";
import { axisClasses } from "@mui/x-charts/ChartsAxis";
import { LineSeriesType, ScatterSeriesType, ScatterValueType } from "@mui/x-charts/models";
import useSWR from 'swr';
import type { PriceDataItem } from '../../services/tokenService';
import type { Transaction } from '../../services/transactionService';

// Constants
const TIME_FROM_DEFAULT = 1738985230; // Move to env or config
const REFRESH_INTERVAL = 5 * 60 * 1000; // Change to 5 minutes instead of 2 hours

interface ExtendedScatterValueType extends ScatterValueType {
  extraData: Transaction;
}

// Date range options
const DATE_RANGES = [
  { label: "1 Week", value: 7 * 24 * 60 * 60 },
  { label: "1 Month", value: 30 * 24 * 60 * 60 },
  { label: "3 Months", value: 90 * 24 * 60 * 60 },
  { label: "6 Months", value: 180 * 24 * 60 * 60 },
  { label: "1 Year", value: 365 * 24 * 60 * 60 },
  { label: "All Time", value: 0 } // 0 means use default TIME_FROM
];

export default function ButtcoinHistory() {
  const [selectedRange, setSelectedRange] = React.useState<number>(0); // Default to "All Time"
  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  
  // Handle responsiveness - using conditional check to handle SSR
  React.useEffect(() => {
    // Safely check if window is defined (client-side only)
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 640);
      };
      
      // Initial check
      checkMobile();
      
      // Add resize listener
      window.addEventListener('resize', checkMobile);
      
      // Cleanup
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);
  
  // Calculate timeFrom based on selected range
  const timeFrom = React.useMemo(() => {
    if (selectedRange === 0) return TIME_FROM_DEFAULT;
    const now = Math.floor(Date.now() / 1000);
    return now - selectedRange;
  }, [selectedRange]);

  // Fetch price data with SWR for caching and revalidation
  const { data: priceData, error: priceError, isLoading: priceIsLoading, mutate: refreshPriceData } = useSWR(
    ['tokenPrice', timeFrom],
    async () => {
      const response = await fetch(`/api/token-history?timeFrom=${timeFrom}`);
      if (!response.ok) {
        throw new Error('Failed to fetch token history');
      }
      return response.json();
    },
    { 
      refreshInterval: REFRESH_INTERVAL,
      revalidateOnFocus: false,
      dedupingInterval: 30000 // Reduce to 30 seconds
    }
  );

  // Fetch transaction data with SWR
  const { data: transactions, error: txError, isLoading: txIsLoading, mutate: refreshTransactionData } = useSWR(
    'transactions',
    async () => {
      const response = await fetch('/api/transactions');
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
    { 
      refreshInterval: REFRESH_INTERVAL,
      revalidateOnFocus: false,
      dedupingInterval: 30000 // Reduce to 30 seconds
    }
  );

  // Error state
  const error = priceError || txError;
  const isLoading = priceIsLoading || txIsLoading;
  
  // Handle refresh
  const handleRefresh = React.useCallback(() => {
    refreshPriceData();
    refreshTransactionData();
  }, [refreshPriceData, refreshTransactionData]);

  // Handle range change
  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRange(Number(e.target.value));
  };

  // Combine data - memoized to prevent recalculations
  const combinedData = React.useMemo(() => {
    if (!priceData || !transactions) return [];

    try {
      const birdeyePoints = priceData.map((item: PriceDataItem) => ({
        timestamp: new Date(item.date).getTime(),
        price: item.price,
        date: item.date,
      }));

      const transactionPoints = transactions.map((tx: Transaction) => ({
        timestamp: new Date(tx.timestamp).getTime(),
        price: tx.price,
        date: tx.timestamp,
      }));

      // Filter for the selected time range
      const timeThreshold = timeFrom * 1000; // Convert to milliseconds
      const filteredPoints = [...birdeyePoints, ...transactionPoints]
        .filter(point => point.timestamp >= timeThreshold)
        .sort((a, b) => a.timestamp - b.timestamp);

      return filteredPoints;
    } catch (error) {
      console.error("Error processing combined data:", error);
      return [];
    }
  }, [priceData, transactions, timeFrom]);

  // Scatter data - memoized
  const scatterData = React.useMemo(() => {
    if (!transactions) return [];

    try {
      // Filter for the selected time range
      const timeThreshold = timeFrom * 1000; // Convert to milliseconds
      
      return transactions
        .filter((tx: Transaction) => {
          try {
            return new Date(tx.timestamp).getTime() >= timeThreshold;
          } catch {
            console.error("Invalid timestamp format:", tx.timestamp);
            return false;
          }
        })
        .map((tx: Transaction) => {
          try {
            const txTimestamp = new Date(tx.timestamp).getTime();
            return {
              id: tx._id,
              x: txTimestamp,
              y: tx.price,
              extraData: tx,
            } as ScatterValueType;
          } catch {
            console.error("Error processing transaction:", tx);
            return null;
          }
        })
        .filter((item: ScatterValueType | null): item is ScatterValueType => item !== null); // Type-safe filter
    } catch (error) {
      console.error("Error processing scatter data:", error);
      return [];
    }
  }, [transactions, timeFrom]);

  // Series configuration - memoized
  const series = React.useMemo<(LineSeriesType | ScatterSeriesType)[]>(() => [
    {
      type: "line",
      id: "price-line",
      data: combinedData.map((item) => item.price),
      label: "Buttcoin Price",
      color: "#FA660F",
      valueFormatter: (value: number | null, context: { dataIndex?: number }) => {
        if (value == null) return "N/A";
        const index = context?.dataIndex ?? 0;
        const date = combinedData[index]?.date || "Unknown Date";
        return `Date: ${date}\nButtcoin Price: $${value.toFixed(6)}`;
      },
    },
    {
      type: "scatter",
      id: "transactions-scatter",
      data: scatterData,
      label: "Transactions",
      color: "#ffc73b",
      valueFormatter: (value: ScatterValueType) => {
        try {
          const extendedValue = value as ExtendedScatterValueType;
          // Add basic check to prevent runtime errors
          if (!extendedValue || typeof extendedValue.y !== 'number') {
            return "Invalid data point";
          }
          
          return extendedValue.y != null
            ? `Type: ${extendedValue.extraData?.type || 'Unknown'}\n` +
              `Price: $${extendedValue.y.toFixed(6)}\n` +
              `Timestamp: ${extendedValue.extraData?.timestamp || 'Unknown'}\n` +
              `Balance: ${extendedValue.extraData?.balance || 0}\n` +
              `Amount: ${extendedValue.extraData?.amount || 0}\n`
            : "N/A";
        } catch (err) {
          console.error("Error formatting scatter value:", err);
          return "Error showing data";
        }
      },
      markerSize: 10,
    },
  ], [combinedData, scatterData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-black text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FA660F] mr-3"></div>
        <span>Loading chart data...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-black text-white">
        <p className="text-red-500 mb-4">Failed to load data: {error.message}</p>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-[#FA660F] rounded-md hover:bg-[#d55a0f] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "90%", backgroundColor: "black" }} className="text-white m-auto mt-8 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
        <Typography sx={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
          Buttcoin Price
        </Typography>
        
        {/* Date range selector */}
        <div className="flex items-center">
          <label htmlFor="dateRange" className="mr-2 text-gray-400">
            Time Range:
          </label>
          <select
            id="dateRange"
            value={selectedRange}
            onChange={handleRangeChange}
            className="bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-1"
          >
            {DATE_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Position with flexbox for better layout */}
      <div className="hidden md:flex w-full justify-center mb-8">
        <span className="text-[40px] font-bold">Acquisitions</span>
      </div>

      <style jsx global>{`
        .MuiChartsAxisHighlight-line {
          stroke: white !important;
          stroke-width: 2 !important;
          stroke-opacity: 0.8 !important;
        }
        .MuiScatterItem-root {
          stroke: #000000 !important;
          stroke-width: 1px !important;
        }
        @media (max-width: 640px) {
          .MuiChartsAxis-tickLabel {
            font-size: 12px !important;
          }
          .MuiChartsAxis-label {
            font-size: 14px !important;
          }
          .mobile-chart-container {
            min-width: 500px;
            overflow-x: auto;
            padding: 0 10px;
          }
        }
      `}</style>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        {combinedData.length > 0 ? (
          <div className={isMobile ? 'mobile-chart-container' : ''}>
            <ResponsiveChartContainer
              series={series}
              height={isMobile ? 400 : 550}
              margin={{ 
                top: 10, 
                left: isMobile ? 80 : 120, 
                right: isMobile ? 20 : 150, 
                bottom: isMobile ? 80 : 60 
              }}
              xAxis={[
                {
                  id: "date",
                  data: combinedData.map((item) => item.date ? new Date(item.date) : new Date()),
                  scaleType: "time",
                  valueFormatter: (value: Date) => {
                    if (!value || !(value instanceof Date) || isNaN(value.getTime())) {
                      return "Invalid date";
                    }
                    const year = value.getFullYear();
                    const month = String(value.getMonth() + 1).padStart(2, "0");
                    const day = String(value.getDate()).padStart(2, "0");
                    return isMobile ? `${month}/${day}` : `${year}-${month}-${day}`;
                  },
                  tickInterval: (value: Date) => {
                    const date = new Date(value);
                    return date.getHours() === 0 && date.getMinutes() === 0;
                  },
                  tickLabelInterval: (value: Date) => {
                    const date = new Date(value);
                    return date.getHours() === 0 && date.getMinutes() === 0 && 
                      (isMobile ? date.getDate() % 15 === 0 : date.getDate() % 5 === 0);
                  },
                  tickLabelStyle: {
                    fontSize: isMobile ? 12 : 18,
                    fill: "white",
                    fontWeight: "bold",
                    angle: isMobile ? 45 : 0,
                    textAnchor: "middle",
                  },
                },
              ]}
              yAxis={[
                {
                  id: "price",
                  scaleType: "linear",
                  valueFormatter: (value: number) => `$${value.toFixed(6)}`,
                  tickLabelStyle: { 
                    fontSize: isMobile ? 12 : 18, 
                    fill: "white", 
                    fontWeight: "bold" 
                  },
                },
              ]}
            >
              <div className="text-white">
                <ChartsAxisHighlight x="line" y="line" />
              </div>
              <LinePlot />
              <LineHighlightPlot />
              <ScatterPlot />
              <ChartsXAxis
                position="bottom"
                axisId="date"
                sx={{
                  [`& .${axisClasses.line}`]: { stroke: "white" },
                  [`& .${axisClasses.label}`]: { fill: "white", fontWeight: "bold", fontSize: 24 },
                  [`& .${axisClasses.tick}`]: { stroke: "white" },
                }}
              />
              <ChartsYAxis
                position="left"
                axisId="price"
                sx={{
                  [`& .${axisClasses.line}`]: { stroke: "white" },
                  [`& .${axisClasses.tick}`]: { stroke: "white" },
                  [`& .${axisClasses.label}`]: {
                    transform: "translate(-40px, -10px)",
                    fill: "white",
                    fontWeight: "bold",
                    position: "initial",
                    fontSize: 24,
                  },
                }}
              />
              <ChartsTooltip
                trigger="item"
                slotProps={{
                  popper: {
                    sx: {
                      "& .MuiChartsTooltip-root": {
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        color: "white",
                        borderRadius: "2px",
                        padding: "4px",
                        whiteSpace: "pre-line",
                      },
                    },
                  },
                }}
              />
            </ResponsiveChartContainer>
          </div>
        ) : (
          <div className="text-white text-center">No data available for the selected time range</div>
        )}
      </div>
    </div>
  );
}
"use client"; // Fix for Next.js

import { useState } from "react";
import OptionalButton from "./Components/OptionalButton";
import Btc from "./Components/btc";
// import Charts from "./Components/charts";
import Purchases from "./Components/purchases";
import History_ from "./Components/history";

export default function Home() {
    const optionButton_name = ["BTC", "HISTORY","PURCHASES",];
    const [currentIndex, setCurrentIndex] = useState(0);

    return (
        <main className="relative w-screen montserrat bg-black text-white overflow-x-hidden p-12 my-[80px]">

            <OptionalButton 
                names={optionButton_name} 
                currentIndex={currentIndex} 
                onSelect={setCurrentIndex}
            />

            <div className="mt-6">
                {currentIndex === 0 && <Btc />}
                {currentIndex === 1 && <History_ />}
                {currentIndex === 2 && <Purchases />}           
            </div>
            <div className="w-full text-lg text-white opacity-80 italic mt-4">
            Buttcoin market data last updated: today •  Market data source: ButtDex.com  •  See <a href="https://x.com/ButtStrategy_" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400">x.com/ButtStrategy_</a> for important information.
            </div>
        </main>
    );
}

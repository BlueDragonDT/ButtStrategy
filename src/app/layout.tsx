import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { Orbitron, Montserrat, Ubuntu } from "next/font/google";
import "./globals.css";
import Navbar from "./layouts/Navbar";
import Footer from "./layouts/Footer";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

const orbitron = Orbitron({
  variable: "--font-orbitron", // Define CSS variable
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  weight: ['300', '400', '500', '700'],
  style: ['normal', 'italic'],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Buttcoin Strategy",
  description: "Buttcoin market data and strategy information",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${montserrat.variable} ${ubuntu.variable}`}>
      <head>
      </head>

      <body className="overflow-x-hidden">
        <Navbar />
        {children}
        <Footer />

      </body>
    </html>
  );
}

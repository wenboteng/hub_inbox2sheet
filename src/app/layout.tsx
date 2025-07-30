import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "./components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OTA Answers - Find Solutions for Tour Vendors",
  description: "Get instant help with OTA issues. Search verified solutions from Airbnb, Viator, Booking.com, and other platforms. Built for tour vendors.",
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <head>
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-MNLM83KNT9"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-MNLM83KNT9');
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-gradient-to-br from-[#0B0F2F] to-[#1E223F] text-white flex flex-col min-h-screen`}>
        <Navigation />
        <main className="flex-1 max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

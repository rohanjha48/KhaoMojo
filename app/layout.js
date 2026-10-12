import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../components/CartContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#09090b",
};

export const metadata = {
  title: "KhaoMojo | Late-Night Hostel Delivery & Printing",
  description:
    "Late-night food cravings, snacks, Maggi, and urgent assignment printouts delivered to your hostel room in 15 mins. Operational 10:00 PM to 4:00 AM.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950">
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}

import "./globals.css";
import { ThemeProvider } from "next-themes";
import Navbar from "../components/Navbar";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: "Kitchen Sync",
  description: "Recipes, lists & meal plans — in sync. Offline-first, private by default.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="manifest" href="/manifest.json" />
				<meta name="theme-color" content="#3b82f6" />
			</head>
			<body>
				<ThemeProvider attribute="class" defaultTheme="system">
					<Navbar />
					{children}
					<SpeedInsights />
				</ThemeProvider>
			</body>
		</html>
  );
}

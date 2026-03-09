import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import "./globals.css";
import { UserProvider } from "@/contexts/user";
import { ToastProvider } from "@/contexts/toast";
import ToastMessage from "@/components/application/toast";

export const metadata: Metadata = {
  metadataBase: new URL("https://learn.analogueshifts.com"),
  title: "Online tech courses and tech trainings - Analogue Shifts",
  description:
    "Accelerate your tech career growth with our comprehensive online tech courses and training. Discover the latest tools and industry insights at your convenience.",
  openGraph: {
    title: "Online tech courses and tech trainings - Analogue Shifts",
    description:
      "Accelerate your tech career growth with our comprehensive online tech courses and training. Discover the latest tools and industry insights at your convenience.",
    url: "https://learn.analogueshifts.app",
    siteName: "AnalogueShifts",
    images: [
      {
        url: "/og-image.webp",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "https://learn.analogueshifts.app",
  },
  verification: {
    google: "wNT1hvWDYGZp2pbVAHsjrug-fDv3T_Z0uxTL_SWBOwc",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="https://raw.githubusercontent.com/analogueshifts/www.analogueshifts.com/refs/heads/master/public/favicon.ico"
          sizes="any"
        />
      </head>
      <body
        className={cn(
          "font-sans",
          "overflow-x-hidden w-full max-w-full"
        )}
      >
        <UserProvider>
          <ToastProvider>
            <ToastMessage />
            {children}
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}

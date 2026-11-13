import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventQuestions",
  description: "Collect audience questions before your event.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}

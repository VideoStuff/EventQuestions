import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isSignedIn, signOut } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Show Sheets",
  description: "Show info sheets: PM call notes, checklist and LED wall planning for each show.",
};

async function logout() {
  "use server";
  await signOut();
  redirect("/login");
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isSignedIn();
  return (
    <html lang="en">
      <body>
        {signedIn && (
          <header className="topbar no-print">
            <nav className="wide row">
              <Link href="/" className="brand">Show Sheets</Link>
              <Link href="/">Shows</Link>
              <Link href="/questions">Questions</Link>
              <form action={logout} style={{ marginLeft: "auto" }}>
                <button className="link" type="submit">Sign out</button>
              </form>
            </nav>
          </header>
        )}
        <main className="wide">{children}</main>
      </body>
    </html>
  );
}

import { redirect } from "next/navigation";
import { checkPassword, isSignedIn, signIn } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  const pw = formData.get("password");
  if (typeof pw !== "string" || !checkPassword(pw)) redirect("/login?error=1");
  await signIn();
  redirect("/");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isSignedIn()) redirect("/");
  const { error } = await searchParams;
  return (
    <div className="narrow">
      <h1>Show Sheets</h1>
      {error && <div className="card error">Wrong password.</div>}
      <form action={login} className="stack card">
        <label>
          Password
          <input name="password" type="password" required autoFocus autoComplete="current-password" />
        </label>
        <div>
          <button type="submit">Sign in</button>
        </div>
      </form>
    </div>
  );
}

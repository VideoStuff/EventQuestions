import { redirect } from "next/navigation";
import { checkPassword, isAdmin, signIn } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  const pw = formData.get("password");
  if (typeof pw !== "string" || !checkPassword(pw)) redirect("/admin/login?error=1");
  await signIn();
  redirect("/admin");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <>
      <h1>Organizer sign in</h1>
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
    </>
  );
}

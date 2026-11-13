import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p className="muted">This page doesn&apos;t exist. Check the link you were given.</p>
      <Link href="/">Home</Link>
    </>
  );
}

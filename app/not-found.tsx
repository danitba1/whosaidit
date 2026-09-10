import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-display text-4xl">Page not found</h1>
      <p className="mt-3 text-muted">That game or page does not exist.</p>
      <Link className="mt-6 inline-block text-accent underline" href="/">
        Back home
      </Link>
    </main>
  );
}

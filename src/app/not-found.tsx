import Link from "next/link";
import { Logo, ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="blueprint flex min-h-screen flex-col items-center justify-center px-4 text-center text-white">
      <Link href="/"><Logo dark /></Link>
      <p className="mt-10 font-display text-7xl font-semibold text-brand-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold">This page isn&apos;t on the drawings.</h1>
      <p className="mt-2 text-navy-300">It may have moved, or the link is wrong.</p>
      <ButtonLink href="/" className="mt-8">Back to the homepage</ButtonLink>
    </div>
  );
}

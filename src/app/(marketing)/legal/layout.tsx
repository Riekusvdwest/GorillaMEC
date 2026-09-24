export default function LegalLayout({ children }: LayoutProps<"/legal">) {
  return (
    <div className="bg-[var(--bg)]">
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 [&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:text-navy-950 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-navy-950 [&_li]:ml-5 [&_li]:list-disc [&_li]:mt-1.5 [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-navy-800 [&_ul]:mt-3 [&_ul]:text-navy-800">
        {children}
      </article>
    </div>
  );
}

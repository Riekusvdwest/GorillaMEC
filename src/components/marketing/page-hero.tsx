export function PageHero({ eyebrow, title, body, children }: { eyebrow: string; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <section className="blueprint text-white">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
        {body ? <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-navy-200">{body}</p> : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}

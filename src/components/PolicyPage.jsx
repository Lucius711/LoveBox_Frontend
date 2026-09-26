import MainLayout from '../layouts/MainLayout';

export default function PolicyPage({ title, sections }) {
  return (
    <MainLayout>
      <article className="mx-auto max-w-2xl px-4 py-14">
        <h1 className="font-serif text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-stone-500">Cập nhật lần cuối: 24/09/2026</p>
        <div className="mt-8 space-y-7">
          {sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="font-semibold">{h}</h2>
              <p className="mt-1.5 leading-relaxed text-stone-600">{body}</p>
            </section>
          ))}
        </div>
      </article>
    </MainLayout>
  );
}

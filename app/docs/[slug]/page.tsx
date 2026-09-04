import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft } from 'lucide-react';
import { docs, getDoc } from '@/lib/docs';

export function generateStaticParams() {
  return docs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const doc = await getDoc((await params).slug);
  return doc ? { title: doc.title, description: doc.description } : {};
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const doc = await getDoc((await params).slug);
  if (!doc) notFound();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[220px_minmax(0,760px)]">
        <aside>
          <Link href="/docs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All docs</Link>
          <nav className="mt-7 hidden space-y-1 lg:block" aria-label="Documentation">
            {docs.map((entry) => <Link key={entry.slug} href={`/docs/${entry.slug}`} className={`block rounded-md px-3 py-2 text-sm ${entry.slug === doc.slug ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{entry.title}</Link>)}
          </nav>
        </aside>
        <article className="min-w-0 pb-20">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="mb-6 text-4xl font-semibold tracking-tight">{children}</h1>,
              h2: ({ children }) => <h2 className="mb-3 mt-10 border-t pt-8 text-2xl font-semibold">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-2 mt-7 text-xl font-semibold">{children}</h3>,
              p: ({ children }) => <p className="my-4 leading-7 text-muted-foreground">{children}</p>,
              ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 text-muted-foreground">{children}</ul>,
              ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6 text-muted-foreground">{children}</ol>,
              a: ({ href, children }) => {
                const external = href?.startsWith('http');
                return <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{children}</a>;
              },
              pre: ({ children }) => <pre className="docs-code-block my-6 overflow-x-auto rounded-xl border border-zinc-800 bg-[#090d16] text-zinc-100 shadow-sm">{children}</pre>,
              code: ({ children, className }) => <code className={`docs-inline-code font-mono text-[0.875em] ${className ?? ''}`}>{children}</code>,
              table: ({ children }) => <div className="my-5 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>,
              th: ({ children }) => <th className="border bg-muted p-2 text-left">{children}</th>,
              td: ({ children }) => <td className="border p-2 text-muted-foreground">{children}</td>,
            }}
          >{doc.content}</ReactMarkdown>
        </article>
      </div>
    </main>
  );
}

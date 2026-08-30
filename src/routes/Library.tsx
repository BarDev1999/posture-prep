import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Markdown } from '../components/Markdown.tsx'
import { articles, facts, getQuestion, sectionTitle } from '../lib/content.ts'
import { search } from '../lib/search.ts'
import type { SearchHit } from '../lib/search.ts'

/**
 * The reference library: the articles parsed out of file A, plus one search box
 * that covers articles, questions and facts together.
 */
export function Library() {
  const [query, setQuery] = useState('')
  const hits = useMemo(() => search(query), [query])
  const searching = query.trim().length >= 2

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <h1 className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Reference</h1>

      <label className="mt-2 block">
        <span className="sr-only">Search articles, questions and facts</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search articles, questions and facts"
          autoCapitalize="off"
          autoCorrect="off"
          className="min-h-12 w-full rounded border border-line bg-surface2 px-3 text-base"
        />
      </label>

      {searching ? (
        <SearchResults hits={hits} query={query} />
      ) : (
        <ul className="mt-4 space-y-2">
          {articles.map((article) => (
            <li key={article.id}>
              <Link
                to={`/library/${article.slug}`}
                className="block border border-line bg-surface p-3 hover:border-line-strong"
              >
                <span className="text-sm font-semibold">{article.title}</span>
                {article.headings.length > 0 ? (
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    {article.headings.slice(0, 4).join(' · ')}
                    {article.headings.length > 4 ? ' · ...' : ''}
                  </span>
                ) : null}
                {article.hasTable ? (
                  <span className="mt-1 block font-mono text-[11px] text-faint">contains tables</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SearchResults({ hits, query }: { hits: SearchHit[]; query: string }) {
  if (hits.length === 0) {
    return (
      <div className="mt-8 text-center">
        <p className="text-sm font-semibold">Nothing matches "{query.trim()}"</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Search covers the reference articles, all 91 questions with their answers, and the fact deck.
          Try a single term.
        </p>
      </div>
    )
  }

  return (
    <>
      <p className="mt-3 font-mono text-[11px] text-faint">
        {hits.length} {hits.length === 1 ? 'result' : 'results'}
      </p>
      <ul className="mt-2 space-y-2">
        {hits.map((hit) => (
          <li key={`${hit.kind}-${hit.id}`}>
            <HitCard hit={hit} />
          </li>
        ))}
      </ul>
    </>
  )
}

function HitCard({ hit }: { hit: SearchHit }) {
  const meta = [hit.kind, hit.section !== null ? sectionTitle(hit.section) : null].filter(Boolean).join(' · ')

  if (hit.kind === 'article') {
    const article = articles.find((entry) => entry.id === hit.id)
    return (
      <Link
        to={article ? `/library/${article.slug}` : '/library'}
        className="block border border-line bg-surface p-3 hover:border-line-strong"
      >
        <span className="font-mono text-[11px] text-faint">{meta}</span>
        <span className="mt-1 block text-sm font-semibold">{hit.title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">{hit.snippet}</span>
      </Link>
    )
  }

  const question = hit.kind === 'question' ? getQuestion(hit.id) : undefined
  const fact = hit.kind === 'fact' ? facts.find((entry) => entry.id === hit.id) : undefined

  return (
    <details className="border border-line bg-surface">
      <summary className="cursor-pointer px-3 py-3">
        <span className="font-mono text-[11px] text-faint">{meta}</span>
        <span className="mt-1 block text-sm font-semibold">{hit.title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">{hit.snippet}</span>
      </summary>
      <div className="border-t border-line px-3 pb-3">
        {question ? (
          <>
            <Markdown className="mt-2">{question.prompt}</Markdown>
            <p className="mt-3 font-mono text-xs tracking-wide text-muted uppercase">Answer</p>
            <Markdown className="mt-1">{question.answer}</Markdown>
          </>
        ) : null}
        {fact ? <Markdown className="mt-2">{fact.back}</Markdown> : null}
      </div>
    </details>
  )
}

/** One article, tables intact, scrolling sideways inside their own container. */
export function Article() {
  const { slug } = useParams()
  const article = articles.find((entry) => entry.slug === slug)

  if (!article) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 text-center">
        <p className="text-sm font-semibold">No such article</p>
        <Link to="/library" className="mt-3 inline-block text-sm text-accent underline">
          Back to the reference
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <Link to="/library" className="font-mono text-xs text-muted hover:text-ink">
        Reference
      </Link>
      <h1 className="mt-2 text-lg leading-snug font-semibold">{article.title}</h1>
      <Markdown className="mt-3">{article.markdown}</Markdown>
    </div>
  )
}

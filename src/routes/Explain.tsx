import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Markdown } from '../components/Markdown.tsx'
import { questions, sectionTitle } from '../lib/content.ts'
import { mergeDeck } from '../lib/deck.ts'
import { keyPoints } from '../lib/keypoints.ts'
import { useProgress } from '../state/AppContext.tsx'

/**
 * Explain it back, after the Feynman technique. Retrieval and comparison are
 * the whole value, so nothing here is scored: the user writes from memory, then
 * ticks off the points the model answer makes that they actually covered.
 *
 * Only material already marked as known is offered, because explaining
 * something you have never met teaches nothing.
 */

type Concept = {
  key: string
  title: string
  answer: string
  section: number
  origin: string
}

export function Explain() {
  const progress = useProgress()
  const [index, setIndex] = useState(0)
  const [written, setWritten] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [ticked, setTicked] = useState<Set<number>>(new Set())

  const concepts = useMemo<Concept[]>(() => {
    const deck = mergeDeck(progress.extraFacts)
    const fromFacts: Concept[] = deck
      .filter((fact) => {
        const entry = progress.facts[fact.id]
        return entry?.lastRating === 'got' || entry?.lastRating === 'easy'
      })
      .map((fact) => ({
        key: fact.id,
        title: fact.front,
        answer: fact.back,
        section: fact.section,
        origin: 'fact you rated as known',
      }))

    const fromQuestions: Concept[] = questions
      .filter((question) => progress.questions[question.id]?.lastResult === 'correct')
      .map((question) => ({
        key: question.id,
        title: question.stem,
        answer: question.answer,
        section: question.section,
        origin: 'question you answered correctly',
      }))

    return [...fromFacts, ...fromQuestions]
  }, [progress.facts, progress.questions, progress.extraFacts])

  const concept = concepts[index % Math.max(1, concepts.length)]
  const points = useMemo(() => (concept ? keyPoints(concept.answer) : []), [concept])

  const nextConcept = () => {
    setIndex((value) => value + 1)
    setWritten('')
    setRevealed(false)
    setTicked(new Set())
  }

  if (!concept) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 text-center">
        <h1 className="text-lg font-semibold">Nothing to explain yet</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          This screen only offers material you have already marked as known, so there is something in
          your head to retrieve. Rate a few cards as Got it first.
        </p>
        <Link
          to="/drill"
          className="mx-auto mt-6 flex min-h-12 max-w-sm items-center justify-center rounded-sm bg-accent text-sm font-semibold text-accent-ink"
        >
          Go to the fact drill
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <h1 className="eyebrow">Explain it back</h1>
      <p className="mt-1 text-xs text-faint">
        {concept.origin} · {sectionTitle(concept.section)}
      </p>

      <div className="mt-3 sheet p-3">
        <Markdown className="prose-lead">{concept.title}</Markdown>
        <p className="mt-3 text-sm text-muted">
          Explain this in your own words, as if to someone who has never heard of it. No notes.
        </p>
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Your explanation</span>
        <textarea
          value={written}
          onChange={(event) => setWritten(event.target.value)}
          rows={8}
          readOnly={revealed}
          placeholder="Say it the way you would to a colleague."
          className="mt-1 w-full resize-y rounded-sm border border-rule bg-raised p-3 text-sm"
        />
      </label>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          disabled={written.trim().length === 0}
          className="min-h-14 w-full rounded-sm bg-accent text-base font-semibold text-accent-ink disabled:opacity-50"
        >
          Compare with the model answer
        </button>
      ) : (
        <>
          <div className="mt-2 sheet p-3">
            <p className="eyebrow">Model answer</p>
            <Markdown className="mt-2">{concept.answer}</Markdown>
          </div>

          {points.length > 0 ? (
            <div className="mt-2 sheet p-3">
              <p className="eyebrow">
                Which of these did you cover?
              </p>
              <ul className="mt-2 space-y-1">
                {points.map((point, position) => {
                  const checked = ticked.has(position)
                  return (
                    <li key={position}>
                      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-sm p-1 hover:bg-raised">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setTicked((current) => {
                              const next = new Set(current)
                              if (next.has(position)) next.delete(position)
                              else next.add(position)
                              return next
                            })
                          }
                          className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                        />
                        <span className={`text-sm leading-relaxed ${checked ? 'text-ink' : 'text-muted'}`}>
                          {point}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 data">
                {ticked.size} of {points.length} covered. Nothing is scored, and nothing is saved.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={nextConcept}
            className="mt-3 min-h-14 w-full rounded-sm bg-accent text-base font-semibold text-accent-ink"
          >
            Next concept
          </button>
        </>
      )}

      <p className="mt-4 text-xs text-faint">
        {concepts.length} {concepts.length === 1 ? 'concept' : 'concepts'} available, drawn from what you
        have already marked as known.
      </p>
    </div>
  )
}

# Posture Prep

A study app for the Palo Alto Networks Junior Security Posture Researcher assessment.

Runs entirely in the browser. No backend, no database, no accounts. Progress lives in
`localStorage`. Installs to a phone home screen and works with the network disabled.

## Commands

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

| Command | What it does |
|---|---|
| `npm run dev` | Parses the content, then starts Vite on port 5173 |
| `npm run build` | Parses the content, typechecks, then builds to `dist/` |
| `npm run preview` | Serves the built output, which is the only way to test the service worker |
| `npm run content` | Runs the parser on its own |
| `npm run verify` | Runs the three check suites below |
| `npm run verify:core` | Parser failures, Leitner rules, session and practice queues, search, diffs |
| `npm run verify:sandbox` | Builds the seeded database and runs every reference query from file C |
| `npm run verify:lessons` | Curriculum graph, lesson shape, sources, backward fading, Parsons rules, and every lesson query against the sandbox |
| `npm run verify:offline` | Audits `dist/` for the service worker and subpath wiring, after a build |
| `npm run typecheck` | Typechecks the app and the build scripts |
| `npm run icons` | Regenerates the app icons in `public/` |

## Where the content goes

Four markdown files belong in `content/source/`, named exactly:

| File | What it holds |
|---|---|
| `A_reference_brief_cortex_cloud_posture.md` | Reference material, split into articles by heading |
| `B_question_bank_91_questions.md` | 91 tagged questions plus the SQL schema block |
| `C_answer_key.md` | Model answers, paired to questions by ID |
| `D_fact_deck_54.md` | 58 numbered facts plus the priority list at the bottom |

`scripts/build-content.ts` reads them at build time and writes `src/data/content.json`,
which is imported into the bundle. Nothing is fetched at runtime, which is what makes
the app work offline.

The parser fails the build loudly, with a non zero exit code, when:

- any of the four files is missing or empty, naming the file and the expected path
- a question has no answer, or an answer has no question, printing the unmatched IDs
- a question is missing its difficulty or format tag
- the priority list at the bottom of file D is missing
- the parsed question counts disagree with the table at the top of file B

To parse a different directory, set `CONTENT_SOURCE_DIR` and `CONTENT_OUT_FILE`.

Extra facts can also be added after the build, without one: Settings takes a markdown
file in the same shape as file D, parses it in the browser, and merges it into the drill.

## Deployment

Static build, deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push
to `main`. Enable Pages for the repository with source set to GitHub Actions.

The workflow passes `VITE_BASE=/<repository-name>/`, which sets the Vite base, the
service worker scope and the manifest `start_url` together. Getting those out of step is
the usual way a progressive web app silently breaks under a Pages subpath. Locally the
base defaults to `/posture-prep/`, and the dev server uses it too, so development and
production share one set of URLs.

Routing uses hashes (`/#/drill`) so a deep link cannot 404 on Pages before the service
worker is installed.

`npm run verify:offline` checks the built output for the usual silent failures: an asset
missing from the precache list, a manifest scope that does not match the base, an
absolute precache URL, or a runtime call to another origin. It audits the build, not the
runtime. **Loading the app with the network disabled still needs confirming once in a
real browser**: `npm run build && npm run preview`, open it, then use the browser's
offline toggle and reload.

## Layout

```
DESIGN.md          the token plan and its critique, written at stage 4
content/source/    the four markdown files, the only source of study content
scripts/           build-content.ts (parser), verify-core.ts, verify-sandbox.ts, make-icons.mjs
src/lib/           storage, Leitner scheduling, session and practice queues, search
src/lib/learn.ts   unlocking, backward fading, Parsons grading, guidance tiers
src/lib/sql/       schema conversion, seed data, sql.js wrapper, result set grading
src/state/         React context plus a reducer, the whole app state
src/routes/        Home, Drill, Practice, Sandbox, Library, Mock, Explain, Settings, Learn, Lesson
src/components/    shell, markdown renderer, code diff, result table, more sheet
src/components/learn/  lesson diagrams and the Parsons widget
src/data/          content.json, generated, not committed
src/data/curriculum.ts     the 58 lesson graph and its prerequisites
src/data/misconceptions.ts the documented misconception list every trap maps to
src/data/lessons/          one file per lesson, plus one bundle per topic
```

## The Learn module

The practice side of the app tests. The Learn module teaches, and the two are different
jobs: a lesson builds a model before retrieval is possible, so every lesson runs worked
example first and free production last, with the scaffolding faded out step by step.

Every lesson is nine steps, always all nine, always in this order:

1. vocabulary, so no term is used before it is defined
2. the mental model, with an inline SVG diagram
3. the fully worked example, with self explanation prompts that must be opened
4. the light fade, with the last step blanked
5. the heavy fade, with more blanked, always counting backwards from the end
6. a Parsons problem, blocks to put in order, with distractors above level 1
7. free production, graded on the rows it returns by the existing sql.js sandbox
8. a trap, drawn from the documented misconception list, never invented
9. the handoff into practice or the drill, filtered to that lesson's tagged items

Failing step 7 does not reveal the answer. It drops the learner back to step 6 with the
same problem as blocks, and a lesson finished that way does not count towards fluency.

Lessons are typed modules rather than JSON. The spec asked for structured JSON, one file
per lesson; the shape is the same and so is hand editing one file, but a nine field
object and a discriminated union cannot be typechecked through a JSON import, and a typo
in a later lesson should fail the build rather than blank a screen on a phone.

Every factual claim traces to files A to D through the `sources` array on each lesson.
`npm run verify:lessons` resolves every source to a fact id, question id, article id or
a heading that really exists in one of the four files, checks that every trap names a
documented misconception, and runs every model query against the seeded database. It
also pins the arithmetic: every row count and total quoted in lesson prose is asserted
against the real database, so a lesson cannot drift away from the data it describes.

Section 5 of the brief lists twelve specific SQL traps. They map one to one onto lessons
3 to 14, one trap per lesson, and the verifier fails if any is unused or used twice.
Lessons 1 and 2 come before that material and name one of the four documented
misconception *categories* instead, because no specific trap applies to a lesson that
has not introduced a WHERE clause yet.

**Chunking.** The first chunk carries the curriculum graph, the misconception list and
the id of every written lesson: enough to draw the topic map and decide what is locked.
The lessons themselves are one chunk per topic, fetched when a lesson is opened, and the
player and the SQLite engine are separate again on top of that. Opening the topic map
downloads no lesson prose at all.

## Build stages

Built in the order set by the spec, one commit per stage.

1. **Stage 1, done.** Project setup, content parser, storage, routing, home screen, fact
   drill with Leitner scheduling, progressive web app and service worker, dark mode.
2. **Stage 2, done.** Query sandbox on sql.js with a seeded database and grading by
   result set, question practice for every format, reference library with search, and
   the difficulty level system.
3. **Stage 3, done.** Mock exam with a countdown and saved attempts, explain it back,
   progress export and import, extra fact deck import, reset behind a typed confirmation.
4. **Stage 4, done.** Styling pass against real content. The token plan and the
   critique behind it are in [DESIGN.md](DESIGN.md).

The Learn module has its own stages, set by the second spec.

- **Stage A, done.** Curriculum graph, lesson data format, topic map, the nine step
  lesson player, progress schema version 3 with its migration, and lessons 1 to 6.
- **Stage B, done.** Lessons 7 to 14, the JOIN and GROUP BY block. Lessons split
  one chunk per topic and fetched on the way into a lesson. Drag and drop was
  dropped on purpose: tap to select then tap to place is the final interaction,
  because it is the one that works one handed. Python indentation comes with the
  Python lessons.
- **Stage C.** Trace stepper, then the Python lessons, 15 to 23.
- **Stage D.** Rule builder, then AI security, 24 to 34.
- **Stage E.** Sections 3, 4 and 5, lessons 35 to 58.
- **Stage F.** Guidance fading tiers applied to the player, the blocked to interleaved
  transition, and misconception weak spots on the home screen. Stage A stores every
  counter these need; nothing consumes them yet.

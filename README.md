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
scripts/           build-content.ts (parser), verify-core.ts, verify-lessons.ts, verify-sandbox.ts,
                   verify-offline.ts, make-icons.mjs
src/lib/           storage, Leitner scheduling, session and practice queues, search
src/lib/learn.ts   unlocking, fading, grading, guidance tiers, the hybrid schedule, weak spots
src/lib/shuffle.ts seeded option ordering, so a right answer is never in a fixed place
src/lib/sql/       schema conversion, seed data, sql.js wrapper, result set grading
src/state/         React context plus a reducer, the whole app state
src/routes/        Home, Drill, Practice, Sandbox, Library, Mock, Explain, Settings, Learn, Lesson
src/components/    shell, markdown renderer, code diff, result table, more sheet
src/components/learn/  diagrams, the Parsons widget, the trace stepper, the rule builder, the blanks widget
src/data/          content.json, generated, not committed
src/data/curriculum.ts     the 59 lesson graph, its prerequisites and its practice handoffs
src/data/misconceptions.ts every misconception a trap may name, with its source
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
7. free production
8. a trap, drawn from the misconception list, never invented
9. the handoff into practice or the drill, filtered to that lesson's tagged items

Failing step 7 does not reveal the answer. It drops the learner back to step 6 with the
same problem as blocks, and a lesson finished that way does not count towards fluency.

**Three families, one shape.** What step 7 produces differs by what the section is for,
and so does how it is graded:

| Family | Step 7 produces | Graded by |
|---|---|---|
| SQL, lessons 1 to 14 and the stretch | a query | running it against the seeded sql.js database and comparing result sets |
| Python, lessons 15 to 23 | filled blanks in a program | the blanks, normalised for spacing and case sensitive |
| Security, lessons 24 to 58 | the seven part detection rule from file A | every row, chosen from candidates |

The Python lessons use PRIMM rather than the plain worked example sequence: predict,
run, investigate, modify. There is no Python runtime in the app and there should not be
one, so Run is a **trace stepper**: an authored frame per line, with the variables and
the output on screen, advanced by tapping. Every trace was executed against a real
interpreter while it was written, and the printed output is what Python actually printed.

The security lessons produce a rule because that is what the job produces. Their worked
example is the seven part template itself, their fades blank rows from the end, and step
7 fills all seven rows for a scenario the learner has not seen. Rows are chosen rather
than typed: grading a typed sentence either rejects a correct answer worded differently
or accepts anything with the right keyword in it, and neither teaches.

**Every option list is shuffled.** They were authored with the right answer first,
because that is how a person writes a question. The widgets render them in an order
seeded on the question, so it owes nothing to how they were written and is the same when
the learner comes back tomorrow. `npm run verify:lessons` checks the resulting
distribution, which is what caught the first hash being too weak to move anything.

**Nothing is locked by default.** The prerequisite graph is still there and still drawn,
and it advises rather than blocking: every lesson opens, a lesson already known can be
marked as known from its row on the topic map, and any exercise step can be skipped from
inside the player. Skipping costs the lesson its clean completion and says so. Guided
order in settings restores the original locking exactly, and the verifier exercises both
paths.

**Guidance fades automatically.** Two clean step 7 completions in a topic drop the worked
example, five drop the fades and the blocks, and the learner is told in one line what
changed. Nothing is taken away: the worked example is one tap from the step that replaced
it.

**Practice is blocked, then interleaved.** While the learner is inside a topic, the daily
session stays blocked to it. Once every topic in an exam section is finished, that section
joins the interleaved pool. This is the correction the second brief makes to the first,
and it is implemented as a recommendation rather than a lock: the home screen says what
it is doing and why, and drilling everything is one tap away.

**Weak spots.** A misconception answered wrongly twice and not since cleared appears on
the home screen, named in the learner's own words. Getting a later trap on the same one
right clears it.

Lessons are typed modules rather than JSON. The spec asked for structured JSON, one file
per lesson; the shape is the same and so is hand editing one file, but a nine field
object and a discriminated union cannot be typechecked through a JSON import, and a typo
in a later lesson should fail the build rather than blank a screen on a phone.

Every factual claim traces to files A to D through the `sources` array on each lesson.
`npm run verify:lessons` resolves every source to a fact id, question id, article id or
a heading that really exists in one of the four files, checks that every trap names a
misconception from the list, and runs every SQL model answer against the seeded database.
It also pins the arithmetic: every row count and total quoted in lesson prose is asserted
against the real database, so a lesson cannot drift away from the data it describes.

Section 5 of the brief lists twelve specific SQL traps. They map one to one onto lessons
3 to 14, one trap per lesson, and the verifier fails if any is unused or used twice.
Lessons 1 and 2 come before that material and name one of the four documented
misconception *categories* instead. The brief also lists eight security traps, and the
security sections run to thirty five lessons, so the rest are **derived**: read off a
named fact or question in files A to D, with the source recorded on the entry and
resolved by the verifier exactly like a lesson source.

**Chunking.** The first chunk carries the curriculum graph, the misconception list and
the id of every written lesson: enough to draw the topic map and decide what is open.
The lessons themselves are one chunk per topic, fetched when a lesson is opened, and the
player and the SQLite engine are separate again on top of that. Opening the topic map
downloads no lesson prose at all, and every topic chunk is precached, so a lesson opens
with the network off.

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

The Learn module has its own stages, set by the second spec. All of them are done.

- **Stage A.** Curriculum graph, lesson data format, topic map, the nine step lesson
  player, progress schema version 3 with its migration, and lessons 1 to 6.
- **Stage B.** Lessons 7 to 14, the JOIN and GROUP BY block. Lessons split one chunk per
  topic. Drag and drop was dropped on purpose: tap to select then tap to place is the
  final interaction, because it is the one that works one handed.
- **Stage C.** The trace stepper, the fill in the blanks widget, Parsons indentation, and
  the Python lessons, 15 to 23. Unlocking became advisory here, and progress schema
  version 4 carries the skip flag and the guided order setting.
- **Stage D.** The rule builder, and AI security, lessons 24 to 34.
- **Stage E.** Sections 3, 4 and 5, lessons 35 to 58, plus the SQL stretch lesson on
  window functions.
- **Stage F.** Guidance tiers applied to the player, the blocked to interleaved
  transition, weak spots on the home screen, and seeded option order.

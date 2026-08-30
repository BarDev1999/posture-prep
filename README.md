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
| `npm run verify` | Checks the parser failures, the Leitner rules and the session queue |
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

## Deployment

Static build, deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push
to `main`. Enable Pages for the repository with source set to GitHub Actions.

The workflow passes `VITE_BASE=/<repository-name>/`, which sets the Vite base, the
service worker scope and the manifest `start_url` together. Getting those out of step is
the usual way a progressive web app silently breaks under a Pages subpath. Locally the
base defaults to `/posture-prep/`; `npm run dev` ignores it.

Routing uses hashes (`/#/drill`) so a deep link cannot 404 on Pages before the service
worker is installed.

## Layout

```
content/source/    the four markdown files, the only source of study content
scripts/           build-content.ts (parser), verify-stage1.ts, make-icons.mjs
src/lib/           storage, Leitner scheduling, session assembly, dates, highlighting
src/state/         React context plus a reducer, the whole app state
src/routes/        Home, Drill, Settings
src/components/    shell, markdown renderer, difficulty control, progress bar
src/data/          content.json, generated, not committed
```

## Build stages

Built in the order set by the spec, one commit per stage.

1. **Stage 1, done.** Project setup, content parser, storage, routing, home screen, fact
   drill with Leitner scheduling, progressive web app and service worker, dark mode.
2. **Stage 2.** Query sandbox on sql.js, question practice, reference library, the
   difficulty level system applied across screens.
3. **Stage 3.** Mock exam, explain it back, export and import, extra content import.
4. **Stage 4.** Styling pass against real content.

# BUILD SPEC: Posture Prep
## A study web app for the Palo Alto Networks Junior Security Posture Researcher assessment

**Read this entire file before writing any code.**

---

## 0. Non negotiables

1. **No backend. No database. No authentication. No accounts.** Everything runs client side. Progress lives in `localStorage`.
2. **Mobile first.** The primary device is a phone used at the gym and on a bus. Design for a 380px viewport, then scale up. Every interaction must work with one thumb.
3. **Must work offline.** Ship as an installable PWA with a service worker caching all assets and content.
4. **Do not invent study content.** All content comes from the four markdown files described in section 3. If something is missing from those files, leave the feature empty and note it, do not fabricate security facts.
5. **Stage 1 must be shippable on its own.** Build in the order given in section 10 and commit after each stage.
6. Read `/mnt/skills/public/frontend-design/SKILL.md` before the styling pass and follow its two pass process.

---

## 1. Who this is for

One user. A 2026 Computer Science graduate working in IT and identity operations, preparing for a 90 minute written technical assessment.

His measured starting point, from a 15 question diagnostic scored at roughly 1.5 out of 15:

- **SQL:** was at zero this morning, now writes correct single table queries. Understands `SELECT`, `FROM`, `WHERE`, value types, `IS NULL` versus `= FALSE`, `IN`, `!=`, `ORDER BY` with `ASC` and `DESC`, `LIMIT`. Has just started JOINs. Has not touched `GROUP BY`, `HAVING`, aggregation, or window functions.
- **Python:** can read code. Cannot yet write a comprehension. Does not know class inheritance or `super()`. Did not know parameterized queries.
- **Everything else:** near zero. Did not know what OWASP is. No AWS IAM, no VPC, no containers, no SAML.

**Design implication:** this app must teach from zero, not quiz someone who already knows the material. Assume no prior knowledge on every screen. Never use an acronym before expanding it once.

---

## 2. The exam being prepared for

90 minutes, written, in English, five sections with fixed weights:

| Section | Weight | Content |
|---|---|---|
| 1. Code and SQL | 25 percent | Filtering, JOINs, GROUP BY and aggregation, ORDER BY with LIMIT, Python list and dict filtering, Python OOP inheritance, secure coding |
| 2. AI Security | 25 percent | Risks and threats in modern LLM architectures |
| 3. Cloud Security | 20 percent | Network and infrastructure, IAM and service design |
| 4. Linux, Web Security, Containers | 20 percent | Fundamentals across all three |
| 5. Identity Security | 10 percent | Federated authentication, SAML and SSO flows |

Section weights drive the app. The home screen must show progress per section, and any "what should I study next" logic must weight by exam percentage multiplied by remaining gap, not by section order.

---

## 3. Content pipeline

The user will place four markdown files in `/content/source/` before you run:

| File | What it holds |
|---|---|
| `A_reference_brief_cortex_cloud_posture.md` | Reference material: Cortex Cloud, posture vocabulary, the seven part rule template, OWASP LLM Top 10 in the 2025 and 2026 editions, OWASP Agentic ASI Top 10, OWASP Web Top 10 2025, MITRE ATLAS, MITRE ATT&CK cloud and container techniques |
| `B_question_bank_91_questions.md` | 91 questions tagged `easy`, `medium`, `hard` in formats `MCQ`, `short`, `SQL`, `Python`, `scenario`, organized by exam section, plus the SQL schema |
| `C_answer_key.md` | Model answers with the trap in each question called out explicitly |
| `D_fact_deck_54.md` | 58 numbered question and answer pairs for recall drilling, grouped by exam section, with a priority list at the end |

**Your first task is a parser.** Write `scripts/build-content.ts` that reads those four files and emits `src/data/content.json`. Run it at build time, not at runtime.

The parser must:

- Pair every question in file B with its answer in file C by question ID (`Q1.1`, `Q2.3` and so on). **Fail the build loudly if any question has no matching answer or any answer has no matching question.** Print the unmatched IDs.
- Preserve fenced code blocks exactly, including the language hint. Questions and answers contain SQL, Python, JSON, and YAML that must render as code, not prose.
- Extract each question's section, difficulty tag, and format tag into structured fields.
- Split file D into individual fact records with a stable ID, a front, a back, a section, and a boolean `isPriority` taken from the priority list at the bottom of that file.
- Split file A into reference articles by heading, keeping the markdown tables intact.
- Extract the `CREATE TABLE`-style schema block from file B into a separate field so the SQL sandbox can display it.

If a file is missing, fail with a clear message naming the file and the expected path. Do not silently continue with partial content.

---

## 4. Tech stack

Use exactly this. Do not substitute.

- **Vite + React + TypeScript**
- **Tailwind CSS** for styling
- **sql.js** for the SQL sandbox, which is SQLite compiled to WebAssembly and runs entirely in the browser
- **react-markdown** with **remark-gfm** for rendering content, since the source files use GFM tables
- **Prism** or **highlight.js** for code block syntax highlighting
- **vite-plugin-pwa** for the service worker and install manifest
- **localStorage** for all persistence, accessed only through a single module at `src/lib/storage.ts`

Do not add a state management library. React context plus `useReducer` is sufficient.

Do not add Pyodide. Running Python in the browser costs roughly 10MB of download and it would break the offline and mobile goals. Python is handled as reading and fixing code, described in section 6.

---

## 5. Difficulty levels

A global level setting, persisted, changeable at any time from a control that is always reachable. Three levels:

**Level 1, From zero.** For material the user has never seen. Definitions before questions. Multiple choice reduced to two options. Cloze deletion, meaning a sentence with one term blanked out. Every question shows a "Teach me this first" button that opens the matching reference article inline. Hints are on by default.

**Level 2, Exam level.** Matches the real assessment. Four option multiple choice, short answer, write the query, fix the code. Hints available but hidden behind a tap.

**Level 3, Hard.** Only the `hard` tagged questions and the scenario format. No hints. A timer runs on each question.

Rules:
- Content tagged `easy` appears at levels 1 and 2. `medium` appears at 2 and 3. `hard` appears at level 3 only, and at level 2 if the user has cleared the medium set for that section.
- The level control must be two taps at most from anywhere. Label it plainly, "Difficulty: From zero", not with an icon alone.
- Changing level never destroys progress.

---

## 6. Features

### P0, stage 1: Fact drill

The single most important screen, because it is the one used at the gym.

- Loads the 58 facts from file D.
- One fact per screen. Question shown. A large button reveals the answer. No typing.
- After reveal, four buttons: **Missed it**, **Hard**, **Got it**, **Easy**.
- **Leitner box scheduling**, five boxes. A card starts in box 1. "Got it" or "Easy" moves it up one box, "Hard" keeps it, "Missed it" sends it back to box 1. Box review intervals in days: 1, 2, 4, 8, 16. Cards due today are those whose last review plus their box interval is on or before today.
- The daily session serves due cards first, then unseen cards, and prioritizes cards where `isPriority` is true.
- A "Priority only" toggle that restricts the session to the priority list.
- Section filter, so the user can drill only Cloud Security if he wants.
- Swipe left and right must work as an alternative to the buttons, but buttons are the primary control and must be large enough for a thumb.
- Show a small counter: how many due today, how many completed in this session.

### P0, stage 1: Home screen

- Five section cards, each showing the exam weight, a progress bar, and the count of facts and questions completed versus total.
- One prominent action: **Start today's session**, which routes to whichever activity the weighting logic picks.
- Days remaining until the exam date, which is configurable in settings and defaults to 2026-09-03.
- Current streak, meaning consecutive days with at least one completed session.

### P1, stage 2: SQL sandbox

The highest value feature for the exam, since Section 1 is 25 percent and SQL is where the user is improving fastest.

- On load, create an in memory SQLite database using sql.js with the schema extracted from file B: `cloud_accounts`, `resources`, `rules`, `findings`, `identities`, `permissions`, `vulnerabilities`.
- **Seed data requirements. These are not optional, they are what makes the exercises teach the right lessons.** Generate roughly 40 resources, 80 findings, 6 accounts, 20 identities, 30 vulnerabilities, such that all of the following are true:
  - `resources.is_public` contains a mix of `1`, `0`, and `NULL`, with at least 6 NULL rows, so that `is_public = 0` and `is_public IS NULL` return different counts.
  - At least 5 resources have no matching row in `findings`, so anti join exercises return a non empty result.
  - At least 1 account has no public exploitable resources, so `LEFT JOIN` exercises that must show a zero are actually testable.
  - At least one resource has many findings, so fan out and `COUNT(DISTINCT ...)` exercises produce visibly wrong answers when done wrong.
  - `identities.last_used_at` contains both NULL values and dates older than 90 days.
  - Accounts span `prod`, `staging`, and `dev`, and providers span `aws`, `azure`, and `gcp`.
- A code editor area with a monospaced font, a **Run** button, and a results table below it. Errors from SQLite must be shown verbatim, because reading real error messages is part of learning.
- The schema must be visible on screen without navigating away. On phone, a collapsible panel above the editor.
- **Exercises.** Load every question in file B tagged `SQL` as an exercise. Show the task text, let the user write a query, run it.
- **Grading by result set, never by query text.** Run the user's query, run the reference query from file C, compare the returned rows. Compare as sets when the task does not specify an order, and as ordered lists when the task uses ORDER BY or asks for "top N" or "most recent". Report one of: correct, correct rows but wrong order, wrong rows, or query error.
- On a wrong answer, do not show the model query immediately. Show one hint. Allow a retry. Only then reveal the reference query alongside the trap explanation from file C.
- A **Free query** mode with no exercise attached, so the user can explore the data.

### P1, stage 2: Question practice

- Serves questions from file B filtered by section, difficulty, and format.
- `MCQ`: tappable options, immediate feedback, then the explanation from file C.
- `short` and `scenario`: a text area. On submit, reveal the model answer from file C side by side with what the user wrote, and ask the user to self grade as **Got it**, **Partial**, or **Missed it**. Self grading is honest enough for this purpose and avoids needing a grader.
- `Python`: show the code in a highlighted block. For questions that ask to find and fix a bug, first ask the user to identify the problem from four options, then reveal the fixed code with a line by line diff. This replaces running Python.
- Every question links to the relevant reference article from file A.
- Wrong and partial answers enter a **review queue** that surfaces at the start of the next session.

### P1, stage 2: Reference library

- The articles parsed from file A, browsable and searchable.
- Search across article text, question text, and fact text in one box.
- Tables from file A must render as real tables and must scroll horizontally on phone rather than overflow.

### P2, stage 3: Mock exam

- 25 questions weighted to the blueprint: 6 from section 1, 6 from section 2, 5 from section 3, 5 from section 4, 3 from section 5.
- A 90 minute countdown, or 60 minutes for a short version covering sections 1, 2 and 4 only.
- No hints, no reference access, no feedback until submission.
- On submission: total score, a per section score against the exam weights, and a full review of every wrong answer with the trap explanation.
- Results are saved so two attempts can be compared.

### P2, stage 3: Explain it back

Based on the Feynman technique, which is well supported for consolidating understanding.

- Picks a concept the user has marked **Got it** on.
- Prompts: explain this in your own words as if to someone who has never heard of it.
- The user types. On submit, the model answer appears next to their text with a checklist of the key points the answer contains, and the user ticks which ones they covered.
- No automated scoring. The value is in the retrieval attempt and the comparison.

---

## 7. Learning mechanics, and why each one is here

Implement these deliberately. They are the reason the app beats reading a PDF.

| Mechanic | Where it appears | Why |
|---|---|---|
| **Active recall** | Fact drill, question practice | Attempting to retrieve before seeing the answer produces far better retention than rereading. This is why the answer is always behind a button press, never shown alongside the question. |
| **Spaced repetition** | Leitner boxes in fact drill | Reviewing at expanding intervals beats massed practice. Five boxes at 1, 2, 4, 8, 16 days. |
| **Retrieval with immediate feedback** | Everywhere | Feedback must arrive right after the attempt, and it must name the trap, not just mark it wrong. |
| **Interleaving** | Daily session mixes sections | Mixing topics within a session beats studying one topic in a block, even though it feels harder while doing it. The daily session must never serve one section only unless the user explicitly filters. |
| **Confidence rated recall** | The four button rating | The user's own judgment of how well he knew it drives scheduling, which is more accurate than binary right or wrong. |
| **Cloze deletion** | Level 1 only | Filling a blank in a sentence is an easier retrieval step than free recall, appropriate for material seen for the first time. |
| **Elaborative interrogation** | After a correct answer at level 2 and 3 | Occasionally ask "why is this true?" with the reasoning from file C available on tap. Do not do this on every question, it becomes noise. |
| **Generation effect** | SQL sandbox, Explain it back | Producing an answer rather than recognizing one. This is why SQL exercises require writing a query and not picking from options. |
| **Streaks and progress** | Home screen | Motivation only. Keep it quiet: a number and a bar, no confetti, no badges, no sound. |

Explicitly do not build: leaderboards, XP levels, avatars, unlockable themes, timed pressure outside the mock exam. This is a working tool for an adult with four days, not a game.

---

## 8. Progress, upload and download

- All progress in `localStorage` under a single versioned key. Include a schema version number and handle migration.
- Track per fact: box number, last reviewed date, review count, last rating.
- Track per question: attempts, last result, whether it is in the review queue.
- Track sessions: date, duration, items completed, per section counts.
- **Export.** A button that downloads all progress as a single JSON file with a dated filename.
- **Import.** A button that accepts that JSON file and restores state, with a confirmation step that states how many records will be replaced.
- Export and import let the user move between phone and laptop, which matters because there is no backend.
- Also allow **importing extra content**: a user supplied markdown file in the same format as file D, parsed at runtime and merged into the fact deck. This is how the user adds material after the exam without a rebuild.
- A **Reset progress** action, behind a typed confirmation.

---

## 9. Design direction

Follow the two pass process in the frontend-design skill: write a token plan first, critique it against generic defaults, then build.

Constraints specific to this brief:

- The subject is security posture assessment. The vernacular of the domain is findings, severity, evidence, and status. There is a real visual language available in that world: the ledger, the audit trail, the severity scale. Use it as a source of ideas rather than reaching for a generic study app or SaaS dashboard look.
- **Do not** use the AI generated default clusters the skill lists. Specifically avoid warm cream with a serif display and terracotta accent, and avoid identical rounded cards with the same soft grey shadow.
- Severity colour coding is legitimate and useful here, since the content genuinely has critical, high, medium, low. Use it as real information, not decoration, and never as the only carrier of meaning. Pair it with text.
- One typeface family for interface text, plus one monospaced family for code. The monospaced face must be genuinely readable at 14px on a phone, since the user will read SQL on it.
- Touch targets minimum 44px. The four rating buttons in the fact drill must be reachable with one thumb at the bottom of the screen.
- Dark mode required, respecting `prefers-color-scheme`. The gym is not a bright room and neither is a bus at night.
- Respect `prefers-reduced-motion`. Card reveal may animate. Nothing else needs to.
- Visible keyboard focus on every interactive element.

Copy rules: sentence case, plain verbs, no filler. Buttons say what happens. An empty state says what to do next, for example "No cards due today. Drill the priority list instead" with a button that does exactly that.

---

## 10. Build order

Commit after each stage. Verify the acceptance criteria for a stage before starting the next one.

**Stage 1.** Project setup, content parser, `content.json` generated and validated, storage module, routing, home screen, fact drill with Leitner scheduling, PWA and service worker, dark mode. **At the end of stage 1 the app must be deployable and usable on a phone.**

**Stage 2.** SQL sandbox with sql.js, seeded database, exercise grading by result set. Question practice for all four formats. Reference library with search. Difficulty level system across all screens.

**Stage 3.** Mock exam with timer and scoring. Explain it back. Export and import. Extra content import.

**Stage 4.** Styling pass following the frontend-design skill. Do the design token plan and critique now, with real content already on screen, rather than guessing at the start.

---

## 11. Acceptance criteria

Do not report the build as finished until every line here passes.

**Content**
- [ ] The build fails loudly if any of the four source files is missing.
- [ ] The build fails loudly if any question ID lacks a matching answer, and prints the IDs.
- [ ] All 58 facts, all 91 questions, and their answers are present in `content.json`.
- [ ] Code blocks in questions and answers render as highlighted code, not as prose.
- [ ] Tables from file A render as tables and scroll horizontally on a 380px viewport.

**Fact drill**
- [ ] A card rated "Missed it" reappears in the next session. A card rated "Easy" does not reappear for at least 16 days after reaching box 5.
- [ ] Progress survives a full page reload and an app restart.
- [ ] The priority filter serves only the facts flagged in file D's priority list.

**SQL sandbox**
- [ ] `SELECT COUNT(*) FROM resources WHERE is_public = 0;` and `SELECT COUNT(*) FROM resources WHERE is_public IS NULL;` return different non zero numbers on the seed data.
- [ ] An anti join exercise looking for resources with no findings returns at least 5 rows.
- [ ] A correct query written differently from the reference query is still marked correct, because grading compares result sets.
- [ ] A SQL syntax error shows the SQLite message verbatim without crashing the app.
- [ ] A wrong answer shows a hint and allows a retry before revealing the reference query.

**Mobile and offline**
- [ ] Fully usable at 380px width with no horizontal page scroll.
- [ ] Installs to the home screen on iOS and Android.
- [ ] Loads and works with the network disabled after one visit.
- [ ] Every rating and navigation control is reachable with one thumb.

**Data**
- [ ] Export downloads a JSON file. Import of that file on a fresh browser profile restores the same state.
- [ ] Reset requires a typed confirmation.

**Quality floor**
- [ ] Dark mode works and follows the system setting.
- [ ] Keyboard focus is visible everywhere.
- [ ] `prefers-reduced-motion` is respected.
- [ ] No console errors on any screen.

---

## 12. Deployment

Static build, deployed to GitHub Pages, since the user already has a Pages site at `bardev1999.github.io`.

- Set `base` in `vite.config.ts` to the repository name.
- Add a GitHub Actions workflow that builds and deploys on push to `main`.
- Confirm the service worker scope is correct under a subpath, because this is the most common way a PWA silently breaks on Pages.
- Include a README with the local dev command, the build command, and instructions for where to drop the four content files.

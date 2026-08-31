# BUILD SPEC 2: The Learn Module
## Teaching from zero, added to the existing Posture Prep app

**Read this entire file before writing any code.**

This is a second module inside the app you already built, not a second app. Reasons: it shares the content files, it shares the progress store, and every lesson must be able to hand the learner straight into the existing practice screens. A separate site would duplicate all three and drift out of sync.

---

## 0. What is different about this module

The existing app **tests**. This module **teaches**. Those are different jobs and the research says they need opposite designs.

The practice module assumes you know something and asks you to retrieve it. This module assumes you know nothing and has to build a mental model before retrieval is even possible. Asking a novice to solve problems before they have a schema is the single most common instructional mistake, and it is well documented: unguided problem solving overloads working memory through means ends analysis, leaving no capacity for actually forming the knowledge structures (Sweller and Cooper 1985, and the cognitive load theory literature since).

So this module is built on **worked examples first, production last**, with the scaffolding faded out step by step.

---

## 1. The learner

One user. Measured at roughly 1.5 out of 15 on an intermediate diagnostic across all five exam sections.

Current state after one session of teaching:
- **SQL:** can write correct single table queries. Knows `SELECT`, `FROM`, `WHERE`, value types, `IS NULL` versus `= FALSE`, `IN`, `!=`, `ORDER BY` with `ASC` and `DESC`, `LIMIT`. Has seen JOINs explained once, has not practiced them. No `GROUP BY`, no aggregation, no window functions.
- **Python:** reads code, cannot write a comprehension, does not know classes or `super()`, did not know parameterized queries.
- **AI Security, Cloud, Linux, Web, Containers, Identity:** effectively zero. Did not know what OWASP is.

**Two design consequences, and they are not negotiable:**

1. Never use a term before defining it. Mayer's pre training principle: learners understand a lesson far better when they already know the names and characteristics of its key concepts. Every lesson opens with its vocabulary.
2. Assume no transfer from other domains. He has a computer science degree but the diagnostic says the knowledge is not retrievable. Teach as if to a smart adult with no background.

---

## 2. Lesson anatomy

Every lesson follows this seven step sequence. Do not reorder it, do not skip steps, and do not let a learner jump ahead within a lesson.

### Step 1: Vocabulary, pre training
Three to six terms with one sentence plain definitions. Tappable throughout the rest of the lesson to re reveal. No jargon inside the definitions themselves.

### Step 2: The mental model
One short explanation of how the thing actually works, expressed concretely before abstractly. This is the step that prevents misconceptions rather than correcting them later. Where a diagram helps, use inline SVG, not an image file.

Example for SQL execution order: show the query being processed stage by stage with the row count shrinking at each stage, rather than stating the order as a list to memorize.

### Step 3: Fully worked example
The complete solution, every step shown, with an explanation of **why** each step is there, not just what it does. Nothing for the learner to produce yet.

Attach **self explanation prompts**: after two or three of the steps, ask a one tap question such as "why is this condition in `ON` rather than in `WHERE`?" with the answer behind a reveal. Self explanation is what makes worked examples work rather than being passively skimmed.

### Step 4: Faded example, light
The same class of problem with **the last step removed** for the learner to complete. Use **backward fading**, meaning remove the final step first, then the second to last on the next problem, and so on. Backward fading beats the common alternative of alternating one example with one full problem (Renkl et al.). Learners learn most about precisely the principles that are faded, because a blank triggers self explanation.

### Step 5: Faded example, heavy
More steps blanked. Only the skeleton remains.

### Step 6: Parsons problem
Mixed up blocks that the learner drags into the correct order. This is the bridge between recognizing a solution and producing one.

The evidence here is strong and worth respecting: solving a Parsons problem produces learning gains equal to writing the equivalent code, in significantly less time, with lower cognitive load, and in one study 26 percent better transfer performance. Use it deliberately, not as a gimmick.

Requirements:
- Include **subgoal labels** as comments on blocks, for example `-- filter to open findings`. Subgoal labels focus novices on the structure of a solution rather than its surface features.
- Include **distractor blocks**, meaning plausible but wrong lines, at difficulty level 2 and above only. Distractors reduce learning efficiency for true beginners, so level 1 has none.
- For SQL and Python, indentation and clause order both matter, so make the drop zones ordered and, for Python, indentable.

### Step 7: Free production
Write it from nothing. For SQL this runs against the existing sql.js sandbox and grades by result set. For Python this is a Parsons problem with no distractors plus a fill in the blanks, since there is no Python runtime.

**On failure at step 7:** do not show the answer. Drop the learner back to step 6 with the same problem as a Parsons problem. This is the "Parsons as help" pattern and it measurably improves both practice performance and efficiency.

### Step 8: Misconception trap
One deliberately broken version. "This looks right. It is not. What is wrong, and what will it silently do?"

Every trap must come from the documented misconception list in section 5. Do not invent traps.

### Step 9: Handoff
A button that sends the learner into the existing practice module, filtered to this lesson's tagged questions and facts. The Learn module builds the model, the practice module consolidates it through retrieval and spacing, which are the two highest utility learning techniques in the Dunlosky review and its 2021 meta analysis.

---

## 3. Correction to the previous spec

**Build Spec 1 said the daily session must always interleave sections. That was wrong for this learner and you should change it.**

Interleaving is a desirable difficulty that produces better long term retention than blocked practice, but only above a threshold of prior knowledge. Below that threshold it becomes an undesirable difficulty: the switching cost consumes the working memory needed to build the schema in the first place. For low prior knowledge learners, initial blocked practice is what allows interleaving to help later.

**Implement a hybrid schedule:**

- While a learner is inside a topic in the Learn module, practice is **blocked**. Same topic, repeated, until fluent.
- Once a topic is marked complete, its items join the **interleaved** pool used by the practice module's daily session.
- Define fluent as: the learner completed step 7 unaided on two consecutive lessons in that topic.

Show this to the learner in one line on the topic screen, for example "Blocked practice until you finish JOINs, then this mixes in with everything else." People trust a system more when the schedule makes sense to them.

---

## 4. Guidance fading across the whole module

The **expertise reversal effect** is real and matters here: instructional support that helps a novice becomes redundant and actively harmful as expertise develops. Worked examples that helped in lesson one become noise in lesson twelve.

So guidance must fade automatically, not only by the manual difficulty switch:

| Learner state in a topic | What the lesson shows |
|---|---|
| First two lessons | All nine steps, self explanation prompts on, no distractors |
| After two clean step 7 completions | Skip step 3, start at the light fade. Distractors on |
| After five clean completions | Steps 1, 2, 7, 8 only. Worked examples available on demand behind a button, never shown by default |

The learner can always override downward with the existing difficulty control. Never override upward automatically without telling them, and show one line explaining what changed and why.

---

## 5. Misconceptions to pre empt, by topic

These are not invented. SQL items come from the think aloud research on novice SQL misconceptions and the large scale error analyses; the security items come from this learner's own diagnostic errors. **Every step 8 trap must map to one of these.**

### SQL

Research finding to design around: the dominant error type in novice SQL is **omission**, and omissions cluster in queries requiring a JOIN, a subquery, or a GROUP BY. Also common and rarely self corrected: missing or extraneous grouping columns, wrong comparison operators, and missing ordering columns.

The four documented misconception categories are: carryover from previous course knowledge, over generalization from one case to all cases, **language based** misconceptions caused by SQL borrowing English words, and an incomplete or wrong mental model.

Specific traps to build:

| Trap | Misconception category |
|---|---|
| `is_public != TRUE` silently drops NULL rows | Wrong mental model of three valued logic |
| `is_public = 'false'` with quotes, comparing a boolean to a text value | Language based, quotes look decorative |
| `IS NOT 'low'` used as a general not equals | Over generalization from `IS NOT NULL` |
| `NOT IN` with a NULL in the subquery returning zero rows | Wrong mental model |
| `WHERE` placed after `GROUP BY` or after `HAVING` | Wrong mental model of execution order |
| Using `WHERE` where `HAVING` is needed | Wrong mental model of execution order |
| `INNER JOIN` used when searching for absence, returning zero rows always | Omission plus wrong mental model |
| Right table condition placed in `WHERE` instead of `ON`, silently converting a LEFT JOIN to an INNER JOIN | Wrong mental model |
| `COUNT(*)` after a one to many JOIN, inflating the count | Omission of DISTINCT |
| `SUM` across two chained JOINs, double counting from fan out | Wrong mental model |
| Missing `ORDER BY` on a "top N" question | Omission |
| Grouping column omitted from `SELECT`, or a non aggregated column selected without grouping | Omission |

### Python

| Trap | Note |
|---|---|
| `d["key"]` on data with missing keys, raising KeyError | This learner hit exactly this |
| `== True` instead of `is True` or a plain truth test | Style, but it precedes the real bug |
| Truthiness accepting `"true"` or `1` where an explicit boolean check was intended | Security relevant |
| Writing a loop where a comprehension was requested | Recognition versus production gap |
| Redefining parent attributes instead of calling `super().__init__()` | |
| Overriding a method with a different signature | |
| String concatenation into SQL, then "fixing" it by adding more quotes | This learner did exactly this |
| `shell=True` with concatenation | |

### Security sections

| Trap | Note |
|---|---|
| Confusing direct and indirect prompt injection with stored and reflected XSS | This learner did exactly this. Address it head on by teaching both and contrasting them |
| Believing input sanitization solves prompt injection | |
| Filtering RAG results after retrieval instead of authorizing before it | |
| Believing a private subnet blocks outbound traffic | |
| Believing a public IP is what makes a subnet public | |
| Believing MFA protects against Golden SAML | |
| Believing an explicit Allow can override an SCP Deny | |
| Treating a container as a security boundary equivalent to a VM | |

---

## 6. Security lessons need a different worked example

For SQL and Python the worked example is a solution. For the security sections it must be **the rule building process**, because that is what the job actually produces and it gives every abstract concept a concrete output.

Use the seven part rule template already in `A_reference_brief_cortex_cloud_posture.md`: data source, condition, context and enrichment, severity, false positives and exceptions, remediation, evidence.

So a security lesson looks like:

1. Vocabulary
2. Mental model, meaning how the technology actually works
3. **Worked example:** here is a real misconfiguration, here is how an attacker uses it, and here is the complete seven part rule that catches it
4. **Light fade:** same rule template, the false positives row and the evidence row are blank
5. **Heavy fade:** only the data source is given, the learner fills condition, context, severity
6. **Parsons variant:** given eight candidate conditions, drag the four that belong into the rule and leave the distractors out
7. **Free production:** a new scenario, write the whole rule
8. **Trap:** a rule that looks correct but produces a false negative, matching a documented misconception
9. Handoff to practice

File A already contains three fully worked instances of this: public bucket with sensitive data, over permissioned role, and privileged pod with a host mount. Use those as the model for tone and depth.

---

## 7. Curriculum

Order matters. A lesson may not be unlocked until its prerequisites are complete. Store the graph in `src/data/curriculum.ts`.

### Section 1, SQL, 14 lessons
1. What a table is, what a query is, and why SQL describes what you want rather than how to fetch it
2. SELECT and FROM
3. WHERE, and the four value types: text in quotes, numbers bare, booleans bare, NULL special
4. NULL as unknown, and three valued logic
5. ORDER BY and LIMIT
6. The execution order model, `FROM` then `WHERE` then `GROUP BY` then `HAVING` then `SELECT` then `ORDER BY` then `LIMIT`
7. Why data is split across tables, and what a foreign key is
8. INNER JOIN
9. LEFT JOIN, and the ON versus WHERE distinction
10. The anti join, finding what is absent
11. GROUP BY, meaning collapsing many rows into one
12. Aggregate functions, and `COUNT(*)` versus `COUNT(col)` versus `COUNT(DISTINCT col)`
13. HAVING versus WHERE
14. Fan out and duplicate inflation across chained JOINs

Stretch, unlocked only after 14: window functions and `ROW_NUMBER` for top N per group.

### Section 1, Python, 9 lessons
15. Lists and dicts, and `.get()` versus bracket access
16. Filtering with a loop, then the same thing as a comprehension
17. Comprehensions with multiple conditions, and dict comprehensions
18. Functions and return values
19. Classes and objects
20. Inheritance and `super()`
21. Method overriding and `NotImplementedError`
22. SQL injection and parameterized queries
23. Command injection, `shell=False`, and input validation

Lessons 15 through 21 use the **PRIMM** sequence rather than the standard worked example sequence: Predict what this code prints, Run it, Investigate line by line, Modify it, Make your own. The underlying principle is read code before you write code, and it exists because novices are routinely asked to write programs before they can reliably trace them.

Since there is no Python runtime in the app, implement Run as a **stepped trace**: show the value of each variable after each line, advanced by tapping. This teaches tracing directly, which is the skill PRIMM is built around.

### Section 2, AI Security, 11 lessons
24. What an LLM application is made of: model, system prompt, context window, tools, memory, retrieval
25. Why instructions and data are the same text, and why that has no syntactic fix
26. Prompt injection, direct and indirect, explicitly contrasted with stored and reflected XSS
27. Tools, and what agency means
28. Excessive Agency and least agency
29. What RAG is and how retrieval works
30. RAG risks: poisoning, cross tenant leakage, authorize before retrieval
31. Memory, persistence, and the three kinds of poisoning
32. Supply chain, serialization, and why pickle executes code
33. Output handling, and treating model output as untrusted input
34. The OWASP lists, MITRE ATLAS, NIST AI RMF, and what each is for

### Section 3, Cloud Security, 9 lessons
35. What a cloud account is, and control plane versus data plane
36. VPC, subnets, and route tables
37. Security groups and NACLs, stateful versus stateless
38. IAM: principals, policies, actions, resources, conditions
39. Policy evaluation order, and the layers that can deny
40. Roles, assume role, and temporary credentials
41. IMDS, and why SSRF reaches it
42. Privilege escalation paths, PassRole and policy self modification
43. Posture: CSPM, CIEM, attack paths, toxic combinations

### Section 4, Linux, Web, Containers, 9 lessons
44. Linux filesystem, users, and permission bits including setuid
45. Processes, listening ports, and persistence locations
46. HTTP, requests, responses, and sessions
47. The injection family: SQL, command, and why they are the same shape
48. Broken access control, IDOR, and SSRF
49. XSS, three kinds
50. What a container actually is: shared kernel, namespaces, cgroups
51. Container escape, privileged mode, and host mounts
52. Kubernetes, service accounts, and RBAC

### Section 5, Identity, 6 lessons
53. Authentication versus authorization
54. Why federation exists, and what an IdP and an SP are
55. The SAML flow, step by step
56. What the SP must validate, and what breaks if it does not
57. OAuth 2.0 and OIDC, and how they differ from SAML
58. Golden SAML, and ITDR versus CIEM

---

## 8. Content authoring rules

You must generate the lesson prose, worked examples, fades, Parsons blocks, and traps. That is authoring, and it carries hallucination risk in a security domain. Constrain it:

1. **Every factual claim must trace to files A, B, C, or D.** Add a `sources` array to each lesson listing the fact IDs, question IDs, or article headings it draws on. If a lesson needs a fact that is not in those files, do not invent it. Emit the lesson with a `NEEDS_REVIEW` flag and a note naming the missing fact.
2. What you may generate freely: analogies, the mental model narrative, the ordering of ideas, worked example walkthroughs, self explanation prompts, and the wording of everything. Explanatory scaffolding is yours. Facts are not.
3. **Apply the coherence principle.** Cut anything that does not serve the lesson objective. No decorative history, no "fun facts," no tangents. Extraneous material measurably reduces learning.
4. **Apply the segmenting principle.** Each of the nine steps is its own screen, advanced by the learner. Never a long scroll.
5. **Apply the signaling principle.** Highlight the one thing that matters on each screen. In code, highlight the changed or critical line. Do not highlight five things.
6. Write at roughly a B2 English level. The learner is fluent but not a native speaker, and reading English technical text under time pressure is itself a load he is carrying.
7. Every lesson must state its objective in one sentence at the top, phrased as what the learner will be able to do, not what will be covered.
8. Cap each lesson at 10 to 15 minutes.

Store lessons as MDX or as structured JSON in `src/data/lessons/`, one file per lesson, so they can be corrected by hand without a rebuild of everything.

---

## 9. New UI surfaces

**Learn tab**, alongside the existing practice surfaces.

- **Topic map.** Five sections, lessons within each, showing locked, available, in progress, and complete. Show the prerequisite links visually. This is a genuine sequence, so numbered markers are appropriate here.
- **Lesson player.** One step per screen. A progress indicator showing which of the nine steps you are on. Back is always allowed, forward only when the current step is satisfied.
- **Parsons widget.** Drag and drop, must work with touch. Provide a tap to select then tap to place fallback, because drag and drop on a phone is unreliable and this must work at the gym. Indentation control for Python.
- **Trace stepper.** For PRIMM Run steps. A variable table that updates line by line as you tap forward.
- **Rule builder.** For security lessons. The seven part template as a form, some rows pre filled and some blank depending on the fade level.
- **Lesson complete screen.** What you can now do, the misconception you were just shown, and the handoff button into blocked practice.

Reuse the existing sql.js sandbox for SQL free production. Do not build a second one.

---

## 10. Progress model additions

Extend the existing store, do not create a parallel one. Bump the schema version and write a migration.

Per lesson: status, current step, attempts at step 7, whether step 7 was passed unaided, timestamp of completion.
Per topic: fluency counter driving the blocked to interleaved transition, and the guidance fading tier.
Per misconception: whether the learner fell for it, and whether they have since passed a lesson testing the same one. Surface any misconception they fell for twice on the home screen as a named weak spot.

All of it must ride the existing export and import.

---

## 11. Build order

**Stage A.** Curriculum graph, lesson data format, topic map screen, lesson player shell with the nine step flow, progress extensions and migration. Author lessons 1 through 6 only. Ship it and check the shape works before authoring fifty more.

**Stage B.** Parsons widget with touch support. Author lessons 7 through 14, the JOIN and GROUP BY block, which is the highest value content in the whole module.

**Stage C.** Trace stepper. Author the Python lessons, 15 through 23.

**Stage D.** Rule builder. Author section 2, lessons 24 through 34.

**Stage E.** Author sections 3, 4, 5, lessons 35 through 58.

**Stage F.** Guidance fading tiers, blocked to interleaved transition, misconception tracking on the home screen.

Commit at every stage. Do not author content ahead of the widget that displays it.

---

## 12. Acceptance criteria

**Lesson flow**
- [ ] A lesson cannot be skipped forward past an unsatisfied step.
- [ ] A locked lesson cannot be opened until its prerequisites are complete.
- [ ] Failing step 7 drops the learner to step 6 with the same problem, and does not reveal the answer.
- [ ] Self explanation prompts appear in step 3 and their answers are hidden until tapped.
- [ ] Backward fading is actually implemented, meaning the light fade blanks the last step and the heavy fade blanks more, not a random subset.

**Parsons**
- [ ] Works by touch on a 380px screen, including the tap to select and tap to place fallback.
- [ ] Python problems support indentation and validate it.
- [ ] Level 1 problems contain no distractor blocks. Level 2 and above do.
- [ ] Subgoal label comments are present on blocks.

**Adaptivity**
- [ ] After two clean step 7 completions in a topic, the next lesson starts at the light fade rather than the worked example.
- [ ] The learner is told in one line whenever guidance level changes.
- [ ] Practice launched from a lesson handoff is blocked to that topic. Practice from the home screen is interleaved across completed topics only.

**Content integrity**
- [ ] Every lesson has a non empty `sources` array.
- [ ] Any lesson containing a fact not traceable to files A through D is flagged `NEEDS_REVIEW` and listed in the build output.
- [ ] Every step 8 trap maps to a named misconception from section 5 of this spec.

**Quality floor, unchanged from the previous spec**
- [ ] Usable at 380px with no horizontal scroll, works offline, dark mode, visible focus, reduced motion respected, no console errors.

---

## 13. What not to build

No video. No audio narration. No AI tutor chat inside the app, since the learner already has one. No streaks or points inside lessons, because motivation mechanics belong in practice and they distract during instruction. No timers on any lesson step, since time pressure during schema formation is the opposite of what is wanted.

---

## 14. Research this is based on

Given to you so you understand the intent behind each requirement, not to be quoted into the app.

- Dunlosky et al. 2013, and the 2021 meta analysis of 242 studies, on the relative utility of ten learning techniques. Practice testing and distributed practice rank highest.
- Sweller and Cooper 1985 and the cognitive load theory literature, on the worked example effect for novices.
- Renkl et al. 2002 on faded worked examples and backward fading, and on fading triggering self explanation.
- Kalyuga et al. on the expertise reversal effect, meaning support that helps novices harms experts.
- Ericson et al. on Parsons problems: equal learning gains to code writing, less time, lower cognitive load, better transfer, and better as scaffolding when a learner fails at writing.
- Sentance and Waite 2017 on PRIMM, built on the principle that novices should read and trace code before writing it.
- Chen, Paas and Sweller 2021 and the blocked versus interleaved literature, on interleaving becoming an undesirable difficulty below a prior knowledge threshold, and on hybrid schedules outperforming either alone.
- Mayer's multimedia principles, specifically pre training, segmenting, signaling, and coherence.
- Taipalus et al. on novice SQL misconceptions from think aloud studies, and the large scale analyses finding omission as the dominant error type, concentrated in JOIN, subquery, and GROUP BY.

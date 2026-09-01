import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L33',
  number: 33,
  topicId: 'ai-security',
  sectionId: 2,
  title: 'Output handling: model output is untrusted input',
  objective:
    'You will be able to state the output handling principle in one sentence, name the consumer that has to enforce it, and write a rule for a model output flowing into a system that executes it.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F20', 'Q2.18', 'Q2.19', 'F46'],

  steps: {
    vocabulary: [
      {
        term: 'consumer',
        definition: 'Whatever receives the model output next: a browser, a database, a shell, a file writer, another service. Each one has its own dangerous characters.',
      },
      {
        term: 'improper output handling',
        definition: 'Passing model output into a consumer without validating or encoding it for that consumer. It is LLM05 in 2025 and LLM10 in 2026.',
      },
      {
        term: 'boundary',
        definition: 'The point where data crosses from one system into another. It is where encoding and validation belong, because only there do you know the target.',
      },
      {
        term: 'text to SQL',
        definition: 'Having the model write a query from a question in words. Useful, common, and an execution path straight from a sentence to a database.',
      },
      {
        term: 'application failure',
        definition: 'A failure caused by what your code does with a value, not by the value itself. This whole category is one of those.',
      },
    ],

    model: {
      narrative: [
        'The principle is one sentence, and fact 20 gives it: treat model output as untrusted user input, and validate it at the boundary of every consumer.',
        '',
        'The reason people resist it is worth naming. The output feels like it came from your system, because you wrote the prompt, you called the API and you own the code. But what came back is a text prediction shaped by everything in the context window, including a retrieved document written by a stranger. It is exactly as trustworthy as the least trustworthy thing that influenced it.',
        '',
        'Question 2.19 asks why this is an application failure rather than a model failure, and that is the framing that makes it fixable. Nobody can promise a model will never emit a semicolon or a script tag. What your application can promise is that whatever comes back is parameterised before it reaches a database, escaped before it reaches a browser, and validated against a schema before it reaches a tool.',
        '',
        'Notice that every one of those controls is one you already know. This is not a new discipline; it is the boundary discipline from lessons 22 and 23, applied to a value that arrives from a model instead of from a form.',
        '',
        'The 2026 list moved this down to tenth, and file A is explicit that this is not because it was solved: input boundary injection and disclosure now dominate the incident records. The control is unchanged.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'One answer, four consumers. The model output is the same text in every branch; what makes it dangerous is what the next system does with it.',
        nodes: [
          { label: 'the model returns text', note: 'Shaped by the prompt, the retrieved documents and the user question together.' },
          {
            label: 'into a database as SQL',
            note: 'Executed. This is the text to SQL path, and it is code by construction.',
            danger: true,
          },
          { label: 'into a browser as markup', note: 'Rendered. An unescaped link or image tag makes a request the user never chose.' },
          { label: 'into a shell or a tool call', note: 'Run. Arguments that were never validated against a schema.' },
          { label: 'into a file or a log', note: 'Stored, then read back later, which is where memory poisoning started.' },
        ],
      },
      takeaway: 'Model output is untrusted input to the next system. Validate at the boundary of every consumer, because each one is dangerous differently.',
    },

    worked: {
      task:
        'Question 2.18: the model generates SQL that the application executes directly against the database. Identify the category, and write the rule with two controls.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The application code path from the model response to the database call, the database identity used for those queries, and the prompt template that asks for SQL.',
          why: 'The finding is a path, so the source is the code between the two ends, plus the identity that decides how bad the far end is.',
          prompt: {
            question: 'Why is the database identity part of this rule rather than a separate one?',
            answer:
              'Because it is the only thing bounding the impact once you accept that the query text cannot be trusted. A read only identity restricted to one schema turns arbitrary SQL from a catastrophe into a data disclosure question, and that difference belongs in the severity of this finding.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A model response executed as a query without validation against an allowlist of shapes, or executed with an identity that can write or read outside the intended tables.',
          why: 'Two conditions, because there are two independent failures: no validation of the text, and no limit on what the text can do.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether untrusted content reaches the prompt that produces the SQL, what the database identity can reach, and whether the results are returned to the user.',
          why: 'Untrusted content in the prompt turns this from an accident waiting to happen into a directed attack path, and returned results are how the data leaves.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the identity can write or the prompt reads untrusted content. High when the identity is read only but reaches beyond the intended tables. Medium when it is read only and scoped, since a wrong query is still a disclosure.',
          why: 'Same shape as always: what can it reach, and who can influence it. The medium case is real, because the model can still be talked into selecting a column the user should not see.',
          prompt: {
            question: 'The team proposes checking the generated SQL for the word DROP. Where does that fit?',
            answer:
              'It does not, and it is the blocklist instinct for the third time in this section. An allowlist of query shapes, or a query builder that only accepts a table and a filter from a fixed set, is the version that works. Matching on dangerous words fails on the first synonym.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Applications where the model only chooses parameters for a query written by hand, and applications running against a disposable analytics replica with a read only identity. Both verified from the code rather than from a description.',
          why: 'The first exception is the fixed form of this design and should be recognised, or the rule punishes the teams that already did it right.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Have the model choose from a set of parameterised queries rather than write SQL, or validate its output against an allowlist of shapes, and run every generated query with a read only identity scoped to the intended tables and a statement timeout.',
          why: 'Two controls, as the question asks. One removes the ability to write arbitrary SQL, the other limits what arbitrary SQL could do if the first one is bypassed.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The code path from response to execute, the database identity permissions, one generated query from the logs, and the prompt template with its untrusted inputs marked.',
          why: 'One real generated query is usually enough, because it is almost never the query anyone expected.',
        },
      ],
      result:
        'A rule that names the category correctly, improper output handling, and produces a finding with two independent remediations that can be applied in either order.',
    },

    fadeLight: {
      task: 'A rule for model output rendered in a browser without escaping.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The frontend rendering code for assistant answers and the content security policy of the page.',
          why: 'The renderer decides whether text becomes markup, and the policy decides what that markup may reach.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'Model output inserted into the page as HTML or as markdown with raw HTML allowed, with no escaping and no restriction on which tags survive.',
          why: 'Precise about the two ways it happens: raw HTML insertion, and a markdown renderer configured to pass HTML through.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the application retrieves untrusted content, whether the page holds a session cookie readable by script, and whether a content security policy restricts outbound requests.',
          why: 'A strict policy turns this from data theft into a rendering bug, so it belongs in the enrichment rather than being assumed absent.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High when untrusted content reaches the prompt and no content security policy restricts outbound requests, because an image tag can carry the conversation to another host with no click.',
          why: 'No click is the part that matters. It removes the one step that makes reflected XSS hard to land.',
          choices: [
            'High when untrusted content reaches the prompt and no content security policy restricts outbound requests, because an image tag can carry the conversation to another host with no click.',
            'Medium, because the user has to click a link for anything to happen.',
            'Low, since the model rarely produces markup unless asked to.',
            'Critical always, because rendering untrusted markup is always critical.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'This is the one place in the AI section where the ordinary web control is exactly right. Escaping works here because the consumer is a browser, and a browser parses.',
    },

    fadeHeavy: {
      task: 'A rule for tool arguments taken from model output without schema validation.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What each tool does with its arguments, whether any argument is a path, a URL or a command, and whether the tool runs with credentials.',
          why: 'An unvalidated string argument is only as dangerous as the thing the tool does with it.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when an unvalidated argument reaches a filesystem path, a URL fetch or a command. High when it reaches a database identifier.',
          why: 'Path traversal, server side request forgery and command injection are all reachable from one unvalidated argument, and all three have been seen in agent tooling.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Validate every tool argument against a strict schema before the call, allowlist paths and hosts rather than filtering them, and reject the call rather than repairing the argument.',
          why: 'Reject rather than repair is the same rule as the command injection lesson, and it is the one that survives contact with a case nobody thought of.',
          choices: [
            'Validate every tool argument against a strict schema before the call, allowlist paths and hosts rather than filtering them, and reject the call rather than repairing the argument.',
            'Ask the model to double check its arguments before calling the tool.',
            'Log every tool call with its arguments and alert on unusual ones.',
            'Limit the number of tool calls per conversation.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The tool definition with its argument types, the call site showing no validation, and one recorded call whose argument would not pass a strict schema.',
          why: 'A recorded call that fails the schema you propose is the argument for the schema, in one line.',
          choices: [
            'The tool definition with its argument types, the call site showing no validation, and one recorded call whose argument would not pass a strict schema.',
            'The total number of tool calls made in the last month.',
            'The model provider documentation on structured outputs.',
            'A test showing the tool works with valid arguments.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Notice that asking the model to check itself appears once more, and fails once more, for the reason it always fails: the checker reads the same context that produced the value.',
    },

    parsons: {
      task:
        'Four of these belong in the rule for question 2.18, model generated SQL executed directly. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the asset', code: 'the application executes a query written by the model' },
        { id: 'p2', label: 'the missing validation', code: 'and the query text is not checked against an allowlist of shapes' },
        { id: 'p3', label: 'the identity', code: 'and it runs with an identity that can write or read beyond the intended tables' },
        { id: 'p4', label: 'the influence', code: 'and untrusted content reaches the prompt that produces the query' },
        { id: 'd1', label: 'the missing validation', code: 'and the generated query is not checked for the word DROP', distractor: true },
        { id: 'd2', label: 'the identity', code: 'and the database password is stored in an environment variable', distractor: true },
        { id: 'd3', label: 'the influence', code: 'and the model temperature is set above zero', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'Temperature is the interesting distractor. Setting it to zero makes the output repeatable, not safe: a deterministic wrong query is still a wrong query, and the input that shapes it is what changed.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A build assistant reads a failing test log, proposes a patch, and writes the patch to a file in the repository, which a watcher then commits. Write the rule.',
      rows: [
        {
          part: 'source',
          answer:
            'The code path from the model response to the file write, the watcher configuration that commits, and the credentials both processes run with.',
          options: [
            'The code path from the model response to the file write, the watcher configuration that commits, and the credentials both processes run with.',
            'The failing test logs the assistant reads.',
            'The repository commit history for the last month.',
          ],
          why: 'Response to file to commit is the path, and the credentials at each hop decide how far a bad patch travels.',
        },
        {
          part: 'condition',
          answer:
            'Model output written to a filesystem path without validating the path or the content, in a process whose output is automatically committed.',
          options: [
            'Model output written to a filesystem path without validating the path or the content, in a process whose output is automatically committed.',
            'A build assistant that proposes patches for failing tests.',
            'A watcher that commits changes without a review step.',
          ],
          why: 'The second and third options are each half of the finding. The condition has to name the unvalidated write, because that is what makes the automation dangerous rather than merely fast.',
        },
        {
          part: 'context',
          answer:
            'Whether the path is constrained to the repository, whether the test log contains text from outside the company, and whether the commit triggers a deploy.',
          options: [
            'Whether the path is constrained to the repository, whether the test log contains text from outside the company, and whether the commit triggers a deploy.',
            'How many patches the assistant proposes per day and how many are accepted.',
            'Which model the assistant uses and what it costs per run.',
          ],
          why: 'Path constraint is traversal, external text in the log is the injection path, and a deploy on commit is the escalation. Three enrichments, three different escalations.',
        },
        {
          part: 'severity',
          answer:
            'Critical when the path is unconstrained or the commit triggers a deploy, since a patch can be written outside the intended directory or shipped without review.',
          options: [
            'Critical when the path is unconstrained or the commit triggers a deploy, since a patch can be written outside the intended directory or shipped without review.',
            'High, because a human will read the commit eventually.',
            'Medium, because the assistant only proposes changes to test files.',
          ],
          why: 'Eventually is not a control, and only proposes is a claim about intent rather than about what the code permits.',
        },
        {
          part: 'falsePositives',
          answer:
            'Assistants that open a pull request for human review instead of committing, and assistants whose writes are constrained to a temporary directory outside the repository.',
          options: [
            'Assistants that open a pull request for human review instead of committing, and assistants whose writes are constrained to a temporary directory outside the repository.',
            'Assistants that have never produced a bad patch.',
            'Assistants operated by the team that owns the repository.',
          ],
          why: 'Both exceptions name a control that removes the automatic path to the main branch. The others describe history and ownership.',
        },
        {
          part: 'remediation',
          answer:
            'Validate the target path against an allowlist inside the repository, require a human review before commit, and run the writing process with a credential scoped to one repository.',
          options: [
            'Validate the target path against an allowlist inside the repository, require a human review before commit, and run the writing process with a credential scoped to one repository.',
            'Ask the model to include the intended file path in its explanation so it can be checked later.',
            'Reject patches containing suspicious code patterns before writing them.',
          ],
          why: 'Constrain the path, put a person before the irreversible step, narrow the credential. Explaining after the fact is not validation, and pattern matching on code is a blocklist.',
        },
        {
          part: 'evidence',
          answer:
            'The write call with the path taken from model output, the watcher configuration that commits automatically, and one patch that was committed without review.',
          options: [
            'The write call with the path taken from model output, the watcher configuration that commits automatically, and one patch that was committed without review.',
            'The diff of every patch the assistant has produced.',
            'The test suite pass rate before and after the assistant was introduced.',
          ],
          why: 'Three artefacts that show the whole automatic path. The pass rate is the argument for keeping the assistant, which is a different conversation.',
        },
      ],
      closing:
        'The model output in this scenario was never SQL, markup or a command. It was a file path and a patch, which is the reminder worth keeping: every consumer is dangerous in its own way, so the validation has to live at each boundary rather than once in the middle.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the build assistant.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the asset', code: 'the assistant writes model produced patches to files' },
          { id: 'f2', label: 'the missing validation', code: 'and neither the path nor the content is validated' },
          { id: 'f3', label: 'the automation', code: 'and a watcher commits the change with no human review' },
          { id: 'f4', label: 'the influence', code: 'and the logs it reads can contain text from outside the company' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Asset, missing validation, automation, influence. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'ai-output-is-trusted',
      setup:
        'An internal tool that turns a question into a chart. The team argues that the SQL is safe because the model is theirs, the prompt is theirs, and the users are employees.',
      code:
        'sql = model.generate(SYSTEM_SQL_PROMPT + question)\nrows = warehouse.execute(sql)          # runs as the analytics service account\nreturn chart(rows)',
      language: 'python',
      question: 'Which part of their argument is wrong?',
      options: [
        { text: 'None of it. Internal users and an internal model make this an acceptable design.', correct: false },
        {
          text: 'Ownership of the prompt does not make the output yours: it is shaped by the question and by anything else in the context, and it is executed unchecked with a service account.',
          correct: true,
        },
        { text: 'The model is the problem: a better model would not generate dangerous SQL.', correct: false },
        { text: 'The design is fine but the chart function should sanitise the rows.', correct: false },
      ],
      silently:
        'It works for every question anyone asks in the demo, and the failure mode is not an error but a query that returns more than it should. A question phrased to reach another schema produces a valid query, a valid result set and a correct looking chart, and the only trace is a line in the warehouse log that looks like analytics. Because the service account is shared, nothing in the log ties the query to a person either.',
      explanation:
        'Owning the prompt is not owning the output. The output is a prediction shaped by everything in the context, and in any system with retrieval or shared history that includes text you did not write. Fact 20 states the principle in one sentence: treat model output as untrusted user input and validate it at the boundary of every consumer. Question 2.19 asks why that makes this an application failure rather than a model failure, and the answer is the useful part: no model can promise never to emit dangerous output, while your application can promise never to execute it unchecked.',
    },

    handoff: {
      canNow: [
        'State the output handling principle in one sentence',
        'Name the consumer that has to validate, and say why each consumer is dangerous differently',
        'Write a rule for model output flowing into a database, a browser, a tool or a file',
      ],
      note: 'Q2.18 is the text to SQL scenario and Q2.19 asks for the principle as a design statement. Fact 20 is the sentence to keep word for word.',
    },
  },
}

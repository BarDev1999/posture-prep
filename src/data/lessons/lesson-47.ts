import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L47',
  number: 47,
  topicId: 'linux-web-containers',
  sectionId: 4,
  title: 'The injection family: SQL, command, and one shape',
  objective:
    'You will be able to state the one shape every injection shares, name the control that removes it in each context, and write a policy as code rule that finds the shape before it ships.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F7', 'F8', 'Q4.9', 'Q4.10', 'A#Policy as code and shift left'],

  steps: {
    vocabulary: [
      {
        term: 'injection',
        definition: 'Data ending up in a place that is parsed as instructions. The family covers SQL, shell, LDAP, XML, template and header injection.',
      },
      {
        term: 'interpreter',
        definition: 'Anything that parses text and acts on it: a database, a shell, a template engine, a browser. Injection needs one.',
      },
      {
        term: 'parameterisation',
        definition: 'Sending the instructions and the values through separate channels, so a value cannot be parsed as an instruction.',
      },
      {
        term: 'policy as code',
        definition: 'A rule that lives in a repository as code, reviewed and versioned, rather than as a setting in a console.',
      },
      {
        term: 'shift left',
        definition: 'Moving a check earlier: into the editor, the pre commit hook, the pull request or the pipeline, where a fix costs a fraction of production.',
      },
    ],

    model: {
      narrative: [
        'You have already fixed two of these, in lessons 22 and 23. This lesson names the shape they share, because the exam asks about the family and because the control is the same idea in every context.',
        '',
        'The shape is always: a string is assembled from a part you wrote and a part somebody else supplied, and the result is handed to something that parses text as instructions. The parser cannot tell the halves apart, because after concatenation there are no halves.',
        '',
        'The control is always: stop assembling. Send the instructions and the values separately, so the parser receives your instructions in one channel and the values in another after parsing is done. In SQL that is a parameterised query. In the shell it is an argument list. In a template engine it is autoescaping with the value passed as data. In LDAP and XML it is the same idea with different names.',
        '',
        'The controls that do not work are also the same everywhere: escaping the dangerous characters, blocking known bad patterns, validating for shape and then concatenating anyway. Each one is an attempt to make a value safe inside a shared channel, and each has to be complete forever against an attacker who needs one gap.',
        '',
        'The interesting move for a posture researcher is that this shape is detectable in code, which makes it a policy as code rule rather than a runtime finding. That is what shift left means concretely: the same rule, run in the pull request, where fixing it costs a comment.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'The same defect and the same fix in two contexts. Only the name of the channel changes.',
        left: {
          title: 'one channel',
          points: [
            'SQL: "... WHERE name = \'" + name',
            'Shell: "ping -c 1 " + host',
            'The parser sees one string.',
            'A value can become an instruction.',
          ],
        },
        right: {
          title: 'two channels',
          points: [
            'SQL: execute(q, (name,))',
            'Shell: check_output(["ping", "-c", "1", host])',
            'The parser receives instructions, then values.',
            'A value cannot become an instruction.',
          ],
        },
      },
      takeaway: 'One shape: data concatenated into text an interpreter will parse. One fix: separate channels, not safer strings.',
    },

    worked: {
      task:
        'Write the policy as code rule that finds the shape in a repository, so it fires in a pull request rather than in production.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The repository source, scanned in the pull request, plus the dependency manifest so the rule knows which database and process libraries are in use.',
          why: 'The manifest is what makes the rule precise: knowing which library is used tells you which call signatures matter and removes most false positives.',
          prompt: {
            question: 'Why run this in the pull request rather than as a scan of the main branch?',
            answer:
              'Because of cost and ownership. In a pull request the author is present, the change is small, and the fix is a comment. On the main branch the finding is a ticket assigned to whoever owns the file, weeks later, with no memory of why the line was written.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A call to a query, execute or subprocess function whose argument is built by concatenation, formatting or interpolation from a value that is not a literal, and where the safe parameterised form of the same call exists in that library.',
          why: 'Named call shapes plus the presence of a safe alternative. The last clause is what makes the finding actionable: there is always a specific line to write instead.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the concatenated value can be traced to a request parameter, whether the file is in a request handling path, and whether the same pattern appears elsewhere in the repository.',
          why: 'Reachability from a request parameter is what separates a script nobody calls from an endpoint. Counting the pattern elsewhere turns one comment into a piece of work.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the value traces to a request parameter and the target is a database or a shell. High when the source cannot be traced. Blocking in the pipeline for the critical case.',
          why: 'This is the guardrail against gate question from file A: warn on the ambiguous case, block on the traceable one, and be able to defend the false positive rate of the thing that blocks.',
          prompt: {
            question: 'Where would you set the boundary between a warning and a blocked merge?',
            answer:
              'Block where the finding is unambiguous and the fix is mechanical, which is concatenation into a query or a shell call with a safe alternative available in the same library. Warn where taint cannot be traced. A gate that blocks on an uncertain finding gets disabled, and then neither the gate nor the warning exists.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Static queries assembled from literals only, migration scripts run by hand from a controlled input, and identifiers that genuinely cannot be parameterised such as a table name, which must instead come from a fixed allowlist.',
          why: 'The identifier case is real: a table or column name cannot be a parameter in most databases, so the honest exception names the allowlist that replaces it.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Use the parameterised form for values, and for identifiers select from a fixed map in code. For processes, pass an argument list with shell disabled and validate the input separately.',
          why: 'Both halves of the fix, and the identifier map is the part people are missing when they say it cannot be parameterised here.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The line with its concatenation, the parameterised form of the same call, and where the value came from if it can be traced.',
          why: 'Showing the two lines next to each other is the fastest possible review comment, and it is why this finding belongs in the pull request.',
        },
      ],
      result:
        'One rule covering a whole family, running where the fix is cheapest, with an honest boundary between warning and blocking.',
    },

    fadeLight: {
      task: 'A rule for a shell call built from a joined string, which is question 4.10.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The repository source, looking at process invocation calls and their arguments.',
          why: 'A small, well defined set of calls, which makes the rule cheap and accurate.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A process call with shell enabled, or with a command built by concatenation or formatting from a non literal value.',
          why: 'Either half is enough to fire: shell enabled is a choice worth questioning even with a fixed string, and concatenation is worth questioning even without a shell.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the value comes from a request or from configuration, and whether the process runs with elevated privileges.',
          why: 'Configuration is not safe by definition, and a privileged process turns command injection into privilege escalation.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the value traces to a request parameter, since the shell will execute anything after a semicolon or a pipe.',
          why: 'The shell is the most powerful interpreter on the host, so this ranks above most other injection contexts.',
          choices: [
            'Critical when the value traces to a request parameter, since the shell will execute anything after a semicolon or a pipe.',
            'High, because the attacker still needs to know which shell is in use.',
            'Medium, because the command runs with the privileges of the application user only.',
            'Low if the input is validated for length before use.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The answer key for question 4.10 names both controls: an argument list with shell disabled, and explicit input validation. Two controls, two jobs, and the rule should ask for both.',
    },

    fadeHeavy: {
      task: 'A rule for template rendering with autoescaping disabled.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the template renders any value that came from a request or a database, and whether the output is HTML shown to other users.',
          why: 'Autoescaping off in a template that renders only literals is harmless. The finding is the pairing with untrusted data.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High when an untrusted value is rendered into HTML with escaping disabled, because that is stored cross site scripting waiting for a save.',
          why: 'Same shape as every other injection: the interpreter is the browser and the instructions are markup.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Enable autoescaping globally and mark only the specific values that are genuinely trusted markup, rather than disabling it for the template.',
          why: 'The direction matters: default safe with named exceptions, rather than default unsafe with named protections.',
          choices: [
            'Enable autoescaping globally and mark only the specific values that are genuinely trusted markup, rather than disabling it for the template.',
            'Strip HTML tags from the values before rendering them.',
            'Add a content security policy so injected scripts cannot run.',
            'Move the rendering to the client so the server never emits markup.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The template with escaping disabled, the value being rendered with its source, and the rendered output for a value containing markup.',
          why: 'The rendered output with a benign tag in it is proof without an attack, which is the right kind of evidence to attach to a ticket.',
          choices: [
            'The template with escaping disabled, the value being rendered with its source, and the rendered output for a value containing markup.',
            'The full template file.',
            'A working cross site scripting payload against the production site.',
            'The content security policy header for the site.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'A content security policy is a genuine second layer and it is not the fix, which is worth being clear about: it reduces what an injected script can do after the injection has already succeeded.',
    },

    parsons: {
      task:
        'Four of these belong in the injection policy as code rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the sink', code: 'a call is made to a query, execute or process function' },
        { id: 'p2', label: 'the assembly', code: 'and its argument is built by concatenation or formatting from a non literal value' },
        { id: 'p3', label: 'the available fix', code: 'and the same library offers a parameterised or argument list form' },
        { id: 'p4', label: 'the reachability', code: 'and the value can be traced to a request parameter' },
        { id: 'd1', label: 'the assembly', code: 'and the argument contains a single quote character', distractor: true },
        { id: 'd2', label: 'the available fix', code: 'and the value is not escaped before use', distractor: true },
        { id: 'd3', label: 'the reachability', code: 'and the file has no unit tests', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The escaping distractor is the one to reject on principle: making escaping part of the condition implies that escaping would satisfy the rule, and the whole lesson is that it does not.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. An internal reporting tool lets a user pick a column to sort by, and builds the ORDER BY clause by concatenating that value into the query. Parameterisation does not work for an identifier. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The repository source at the query construction site, and the list of columns the reporting schema actually has.',
          options: [
            'The repository source at the query construction site, and the list of columns the reporting schema actually has.',
            'The query logs from the reporting database.',
            'The reporting tool user list and their roles.',
          ],
          why: 'The code holds the concatenation and the schema holds the allowlist that will replace it.',
        },
        {
          part: 'condition',
          answer:
            'An identifier such as a column or table name concatenated into a query from a non literal value, with no allowlist check against a fixed set.',
          options: [
            'An identifier such as a column or table name concatenated into a query from a non literal value, with no allowlist check against a fixed set.',
            'Any query built with string concatenation.',
            'A query whose ORDER BY clause is dynamic.',
          ],
          why: 'The specific case matters because the ordinary fix does not apply. The condition has to name the missing allowlist rather than the missing parameter.',
        },
        {
          part: 'context',
          answer:
            'Whether the value reaches the query from a request, what the database identity can read, and whether the tool is reachable from outside.',
          options: [
            'Whether the value reaches the query from a request, what the database identity can read, and whether the tool is reachable from outside.',
            'How many rows the report returns and how long it takes.',
            'Which reporting library the tool uses.',
          ],
          why: 'Reachability plus the identity scope. An internal tool with a read only identity on one schema is a very different finding from the same code with a broad identity.',
        },
        {
          part: 'severity',
          answer:
            'High. The concatenation point is an identifier, so a crafted value can add a clause or a subquery, limited by what the database identity can read.',
          options: [
            'High. The concatenation point is an identifier, so a crafted value can add a clause or a subquery, limited by what the database identity can read.',
            'Critical, because all SQL injection is critical.',
            'Low, because a column name cannot contain an attack.',
          ],
          why: 'The last option is the belief that makes this bug survive review: an identifier position is still a text position in the query.',
        },
        {
          part: 'falsePositives',
          answer:
            'Sites where the value is already checked against a fixed allowlist of column names before use, verified by reading the check rather than the comment.',
          options: [
            'Sites where the value is already checked against a fixed allowlist of column names before use, verified by reading the check rather than the comment.',
            'Sites where the input comes from a dropdown in the user interface.',
            'Sites where the tool is only used by analysts.',
          ],
          why: 'A dropdown is a client side constraint and the request can be made without it, which is the most commonly accepted false exception in web security.',
        },
        {
          part: 'remediation',
          answer:
            'Map the user value to a column through a fixed dictionary in code, and reject anything not in it, so the query is assembled from literals only.',
          options: [
            'Map the user value to a column through a fixed dictionary in code, and reject anything not in it, so the query is assembled from literals only.',
            'Escape the value and check it against a pattern of allowed characters.',
            'Quote the identifier using the database quoting function.',
          ],
          why: 'A dictionary means the query is built from your own literals, which removes the injection entirely. Escaping and quoting are the two per context patches, and this lesson is about why they are not the answer.',
        },
        {
          part: 'evidence',
          answer:
            'The concatenation line, the request parameter it reads, and the mapped dictionary version as the proposed fix.',
          options: [
            'The concatenation line, the request parameter it reads, and the mapped dictionary version as the proposed fix.',
            'A crafted request demonstrating a subquery in the sort parameter.',
            'The database identity permissions in full.',
          ],
          why: 'Attaching the fix is what makes a policy as code finding cheap to close. Demonstrating the exploit against a live internal tool is rarely necessary and often unwelcome.',
        },
      ],
      closing:
        'The identifier case is worth practising because it is the one people use to argue that parameterisation is impossible here. It is impossible for the identifier, and an allowlist mapped to literals is better than parameterisation anyway.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the dynamic sort column.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the sink', code: 'a query is built with an identifier taken from a request value' },
          { id: 'f2', label: 'the assembly', code: 'and that value is concatenated into the query text' },
          { id: 'f3', label: 'the missing control', code: 'and no allowlist maps it to a fixed set of column names' },
          { id: 'f4', label: 'the impact', code: 'and the database identity can read beyond the reporting schema' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Sink, assembly, missing control, impact. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'web-escaping-is-the-fix',
      setup:
        'A fix submitted after an injection report. The author has added an escaping helper and applied it consistently at every concatenation point in the file.',
      code:
        'def esc(v):\n    return v.replace("\'", "\'\'").replace("\\\\", "\\\\\\\\")\n\nq = ("SELECT * FROM findings WHERE resource = \'" + esc(rid)\n     + "\' AND severity_rank > " + esc(rank)\n     + " ORDER BY " + esc(sort_col))',
      language: 'python',
      question: 'What is still wrong after this fix?',
      options: [
        {
          text: 'Two of the three positions have no quotes to escape at all, so escaping quotes protects nothing there.',
          correct: true,
        },
        { text: 'Nothing, as long as the escaping helper is applied everywhere.', correct: false },
        { text: 'The helper should escape double quotes as well as single ones.', correct: false },
        { text: 'The escaping should happen inside the database driver rather than in the application.', correct: false },
      ],
      silently:
        'The pull request looks like a careful fix, and it is consistent, which is exactly what a reviewer is trained to look for. The first position genuinely is harder to exploit afterwards, so a retest of the original payload passes and the ticket closes. The numeric and identifier positions are untouched, because there was never a quote in them to escape, and the query is still assembled from a value somebody else supplied.',
      explanation:
        'Escaping is a per context patch and every context has different rules: quoted string, numeric literal, identifier, comment, LIKE pattern. Getting all of them right forever is the job the parameterised query does for you, and it does it by removing the shared channel rather than by cleaning what goes into it. Fact 7 is the sentence to keep: use a parameterised query, never concatenate, and escaping is not a fix. Where a position genuinely cannot be a parameter, such as an identifier, the answer is a fixed allowlist mapped in code so that the query is built from your literals.',
    },

    handoff: {
      canNow: [
        'State the one shape every injection shares and the one control that removes it',
        'Name the safe form in a database call, a process call and a template',
        'Write a policy as code rule that fires in a pull request, and defend where it blocks',
      ],
      note: 'Q4.9 and Q4.10 are the two Python fixes and facts 7 and 8 are the two sentences. Both facts are on the priority list.',
    },
  },
}

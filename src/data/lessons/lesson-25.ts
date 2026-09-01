import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L25',
  number: 25,
  topicId: 'ai-security',
  sectionId: 2,
  title: 'Why instructions and data are the same text',
  objective:
    'You will be able to explain the structural reason prompt injection has no syntactic fix, and write a rule that finds the applications where that structure is worst.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F13', 'Q2.2', 'Q2.4', 'F7'],

  steps: {
    vocabulary: [
      {
        term: 'instruction',
        definition: 'A sentence the model is meant to obey. Nothing marks it as one: it is a sentence, and it looks like every other sentence.',
      },
      {
        term: 'data',
        definition: 'Text the model is meant to work on rather than obey, such as a document to summarise. It arrives in the same place as the instructions.',
      },
      {
        term: 'syntactic boundary',
        definition: 'A separation the machine enforces, not one you ask for. The placeholder in a parameterized query is one; nothing in a prompt is.',
      },
      {
        term: 'delimiter',
        definition: 'Text put around a section of a prompt to mark where it starts and ends. It is a convention the model may follow, not a rule it must.',
      },
      {
        term: 'prompt injection',
        definition: 'Text in the data half of a prompt that the model reads as an instruction. It is the first entry in the OWASP LLM Top 10.',
      },
    ],

    model: {
      narrative: [
        'You have already seen the fix that does work, twice. In SQL, the query goes down one channel and the values down another, so a value cannot become code. In the shell, the argument list keeps the command and its arguments apart, so an argument cannot become a command.',
        '',
        'Both work because the machine on the far end has two inputs. The database parses the query before the values arrive. The operating system takes the argument array as an array.',
        '',
        'A model has one input. Everything arrives as one sequence of text, and the model has no field, no header and no bit that says this part was your instruction and this part came from a web page. It infers the difference from the wording, which means the difference can be argued with.',
        '',
        'That is the structural answer question 2.2 wants, and it is why sanitising the input cannot solve this. Sanitising works when dangerous input has a shape: a quote, a semicolon, a script tag. Here the dangerous input is a fluent sentence, in any language, and the same sentence is legitimate in another document.',
        '',
        'The practical consequence for a researcher is the order of assembly. Anything untrusted placed after your instructions is the last thing the model reads, and later text is the easiest text to argue from. So the design question is never whether the boundary can be made real. It is what the model is allowed to do once an instruction crosses it.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'Two channels versus one. The left column is why parameterized queries work; the right column is why the same trick has no equivalent for a prompt.',
        left: {
          title: 'SQL, two channels',
          points: [
            'Query text is parsed first.',
            'Values arrive afterwards, separately.',
            'A value cannot change the parse.',
            'The boundary is enforced by the database.',
          ],
        },
        right: {
          title: 'a prompt, one channel',
          points: [
            'Instructions and data are concatenated.',
            'The model reads one sequence of text.',
            'A sentence can change what the model does.',
            'The boundary is a convention you asked for.',
          ],
        },
      },
      takeaway: 'There is no placeholder for a prompt. The boundary is a request, so the control has to be what happens after it is crossed.',
    },

    worked: {
      task:
        'Write the rule for the structural finding behind question 2.4: an application that concatenates retrieved content into the prompt after the system instructions, with no provenance marking and no restriction on what the model may do next.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The prompt assembly code and prompt templates in the repository, plus the application manifest listing which tools are registered for that agent.',
          why: 'This finding lives in code rather than in cloud configuration, which is what shift left means in practice. The tool list is needed because the same assembly is harmless or serious depending on what the model can do with it.',
          prompt: {
            question: 'Why is the data source a repository rather than a runtime log?',
            answer:
              'Because the property being detected is structural: how the prompt is built, every time, for every user. A log shows individual conversations and cannot tell you the order of assembly. This is a design finding, so it is found where the design is written down.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A prompt built by concatenating retrieved or fetched content after the system instructions, with no provenance markers around it, in an application that also registers at least one tool with a side effect.',
          why: 'Three parts, and the third is what makes it a finding rather than a style note. Concatenating documents into a summariser with no tools is a risk you can accept; the same assembly with a send mail tool is not.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Where the retrieved content comes from and who can write to it, whether the application is internet facing, and whether any tool it holds is irreversible.',
          why: 'Who can write to the source is the whole question. A corpus only your own team can edit is a very different risk from one built by crawling the public web or by reading customer tickets.',
          prompt: {
            question: 'Two applications concatenate identically. One reads internal wiki pages, the other reads customer support tickets. Same severity?',
            answer:
              'No. The wiki needs an insider or a compromised account before anything reaches the prompt. The ticket queue accepts text from strangers by design, so the attacker needs an email address. Same code, different reachability, different severity.',
          },
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when untrusted content is concatenated and the agent holds a tool with an irreversible effect. High when it holds only read tools. Medium when it has no tools at all.',
          why: 'Severity follows what the model can do once an injected instruction is obeyed, because that is the impact. The injection itself is close to certain in every one of these cases.',
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Applications whose retrieved corpus is fully controlled and write restricted, where the write path itself is reviewed. Exception granted per application, recorded with the corpus and its writers, and revisited whenever a new tool is registered.',
          why: 'The exception is tied to the two things that make it safe, and both can change without anyone touching this application. Tying the review to tool registration is what stops a stale exception becoming the hole.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Put the untrusted content last with explicit provenance marking, drop the tools the task does not need, require confirmation for irreversible ones, and authorise every tool call against the user rather than against a service identity.',
          why: 'Note what is not on this list: sanitising the input. The fixes that work all limit what an obeyed instruction can achieve, because the instruction cannot be reliably detected.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The prompt assembly code with the concatenation highlighted, the tool manifest, a rendered example prompt with a benign document in place, and the write path to the corpus.',
          why: 'A rendered prompt is the thing that ends the argument. Reading the assembly code, people picture separation that is not there; seeing the final string, they stop picturing it.',
        },
      ],
      result:
        'A rule that finds the applications where prompt injection has the most to work with, ranked by what the model may do rather than by how likely the injection is.',
    },

    fadeLight: {
      task: 'A rule for an application that puts user text before the system instructions, so the user text is not even the last word.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The prompt templates and assembly code in the repository.',
          why: 'A structural property, so it is read from the code rather than from a log.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A prompt where user supplied text is concatenated before the system instructions, or where a single template interleaves the two.',
          why: 'Stated as a fact about the order of concatenation, which is a thing you can grep for rather than a thing you have to judge.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the application is internet facing and which tools it registers.',
          why: 'The same two enrichments as the worked example, for the same reason: reachability and impact.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High when the application is internet facing and holds tools. Medium otherwise, and never below medium while any user text sits above the instructions.',
          why: 'A floor rather than a scale, because the ordering itself is a defect regardless of the current tool list.',
          choices: [
            'High when the application is internet facing and holds tools. Medium otherwise, and never below medium while any user text sits above the instructions.',
            'Low, since instruction order is a prompt engineering preference rather than a security control.',
            'Critical always, because any prompt injection risk is critical.',
            'Derived from the number of tokens the system prompt uses.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'A floor is the right shape whenever the defect is structural. The tool list changes next sprint; the ordering will still be wrong.',
    },

    fadeHeavy: {
      task: 'A rule for the control that actually helps: an agent whose tool calls are authorised against a service identity rather than the requesting user.',
      steps: [
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the service identity can reach data across tenants or users. High when it is scoped to one tenant but wider than the requesting user.',
          why: 'Cross tenant reach is the difference between one user reading their own data twice and one user reading everybody data.',
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Agents doing genuinely system level work with no user in the request at all, such as a nightly summariser, allowed by an approved tag naming the job.',
          why: 'A job with no user cannot authorise against one. The exception has to name the job rather than the pattern, or every agent claims it.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Derive the permissions of every tool call from the requesting user, narrow each tool to one task, and require human approval for irreversible actions.',
          why: 'This is fact 15 of the deck, said as a fix: least agency is enforced by scoping tools per task and deriving permissions per user.',
          choices: [
            'Derive the permissions of every tool call from the requesting user, narrow each tool to one task, and require human approval for irreversible actions.',
            'Add a filter that rejects prompts containing the words ignore previous instructions.',
            'Move the service identity credentials into the system prompt so they are not in the code.',
            'Increase the context window so the system instructions are never truncated.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The tool manifest, the identity used for tool calls, its effective permissions, and one request showing a tool call made with no reference to the requesting user.',
          why: 'Effective permissions rather than granted ones: what the identity can actually reach is the number that decides the blast radius.',
          choices: [
            'The tool manifest, the identity used for tool calls, its effective permissions, and one request showing a tool call made with no reference to the requesting user.',
            'A list of every prompt the application has ever sent, exported from the logs.',
            'The vendor security questionnaire for the model provider.',
            'A screenshot of the agent answering a question correctly.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Both blanked rows named the same idea from different ends: what the identity can reach. Injection you cannot prevent; reach you can decide.',
    },

    parsons: {
      task:
        'Four of these belong in a rule for an application that concatenates untrusted content into its prompt and holds tools. Place those four in a sensible reading order and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the asset', code: 'the application assembles its prompt from more than one source' },
        { id: 'p2', label: 'the structure', code: 'untrusted content is concatenated after the system instructions' },
        { id: 'p3', label: 'the missing marking', code: 'with no provenance markers separating it from the instructions' },
        { id: 'p4', label: 'the impact', code: 'and the application registers at least one tool with a side effect' },
        { id: 'd1', label: 'the structure', code: 'the prompt contains the phrase ignore previous instructions', distractor: true },
        { id: 'd2', label: 'the missing marking', code: 'the user input is not escaped for quotes and angle brackets', distractor: true },
        { id: 'd3', label: 'the impact', code: 'the model is a third party hosted model rather than self hosted', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'Every block you left out is a form of the same mistake: looking for the attack rather than for the structure. A phrase match finds last year attacks in English. Escaping quotes is a control for a parser, and there is no parser here. Where the model is hosted changes who else sees the data, not whether an instruction in a document is obeyed.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A support assistant reads the customer ticket, then the internal knowledge base article, then the agent instructions, and it can close tickets and issue refunds. Write the rule for what is wrong with this design.',
      rows: [
        {
          part: 'source',
          answer: 'The prompt assembly code and templates in the repository, plus the tool manifest for the assistant.',
          options: [
            'The prompt assembly code and templates in the repository, plus the tool manifest for the assistant.',
            'The support ticket database, searched for suspicious phrases.',
            'The model provider usage dashboard.',
          ],
          why: 'The finding is how the prompt is built and what the assistant can do, and both of those are written down in the repository rather than observable per conversation.',
        },
        {
          part: 'condition',
          answer:
            'Customer supplied ticket text is concatenated into the prompt with no provenance marking, in an assistant that registers a refund tool with a financial effect.',
          options: [
            'Customer supplied ticket text is concatenated into the prompt with no provenance marking, in an assistant that registers a refund tool with a financial effect.',
            'The assistant answers more than one hundred tickets a day.',
            'The knowledge base article is longer than the context window allows.',
          ],
          why: 'The structure plus the consequence. Volume and truncation are operational concerns; neither decides whether an instruction inside a ticket gets obeyed.',
        },
        {
          part: 'context',
          answer:
            'Anyone with an email address can write into this corpus, the refund tool moves money, and the assistant runs with one service identity for every customer.',
          options: [
            'Anyone with an email address can write into this corpus, the refund tool moves money, and the assistant runs with one service identity for every customer.',
            'The assistant was fine tuned on last year support transcripts.',
            'The knowledge base is maintained by the support team and reviewed quarterly.',
          ],
          why: 'Three enrichments that all raise severity: an open write path, an irreversible tool, and an identity wider than the requesting user.',
        },
        {
          part: 'severity',
          answer: 'Critical. Untrusted text from strangers reaches a model that can move money without a human in the path.',
          options: [
            'Critical. Untrusted text from strangers reaches a model that can move money without a human in the path.',
            'Medium, because the model usually follows the agent instructions rather than the ticket.',
            'Low, since a refund can be reversed by the finance team later.',
          ],
          why: 'Severity follows exposure and impact. Usually following the instructions is not a control, and a reversal after the fact is incident response rather than prevention.',
        },
        {
          part: 'falsePositives',
          answer:
            'Assistants whose tools are all read only, and assistants where every irreversible action already requires a human approval step.',
          options: [
            'Assistants whose tools are all read only, and assistants where every irreversible action already requires a human approval step.',
            'Assistants that have never had a security incident reported against them.',
            'Assistants built by the platform team rather than by a product team.',
          ],
          why: 'The exceptions name a control that actually removes the impact. A clean history is survivorship, and who built it is not a property of the system.',
        },
        {
          part: 'remediation',
          answer:
            'Move ticket text last with explicit provenance marking, require human approval for refunds, scope the tools per task, and derive permissions from the customer in the request.',
          options: [
            'Move ticket text last with explicit provenance marking, require human approval for refunds, scope the tools per task, and derive permissions from the customer in the request.',
            'Strip instruction like phrases from the ticket before adding it to the prompt.',
            'Instruct the model in the system prompt to ignore any instructions found in ticket text.',
          ],
          why: 'The last two are the sanitisation misconception in its two most common forms. Neither survives a paraphrase, another language, or an instruction split across two sentences.',
        },
        {
          part: 'evidence',
          answer:
            'The rendered prompt with a ticket in place, the tool manifest showing the refund tool, and the identity that tool call runs as.',
          options: [
            'The rendered prompt with a ticket in place, the tool manifest showing the refund tool, and the identity that tool call runs as.',
            'A transcript of the assistant refusing a naive injection attempt.',
            'The model provider statement that their model is resistant to prompt injection.',
          ],
          why: 'A rendered prompt shows the structure. One refusal proves nothing, since the claim is not that every attempt works, and a vendor statement is not evidence about your application.',
        },
      ],
      closing:
        'Read your remediation row again. Not one item on it tries to detect the injection, and that is the lesson: the boundary cannot be made real, so every control that works limits what an obeyed instruction can reach.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the support assistant finding.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the asset', code: 'the assistant assembles a prompt from ticket text and internal articles' },
          { id: 'f2', label: 'the structure', code: 'customer supplied text is concatenated with no provenance marking' },
          { id: 'f3', label: 'the impact', code: 'and the assistant registers a refund tool with a financial effect' },
          { id: 'f4', label: 'the missing control', code: 'and no human approval is required before that tool runs' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Asset, structure, impact, missing control. Now write the seven rows out.',
      },
    },

    trap: {
      misconceptionId: 'sec-sanitisation-solves-injection',
      setup:
        'The team added a filter after their first injection incident. It runs over every document before the document reaches the prompt, and it was tested against the payload from the incident.',
      code:
        'BANNED = ["ignore previous", "disregard the above", "system:", "you are now"]\n\ndef clean(document):\n    lowered = document.lower()\n    for phrase in BANNED:\n        if phrase in lowered:\n            raise ValueError("injection attempt")\n    return document',
      language: 'python',
      question: 'What does this actually prevent?',
      options: [
        { text: 'Prompt injection, as long as the list is kept up to date.', correct: false },
        {
          text: 'Only the exact phrasings on the list. The same instruction in other words, another language, or split across sentences goes straight through.',
          correct: true,
        },
        { text: 'Nothing, because the filter runs on the document rather than on the user input.', correct: false },
        { text: 'Prompt injection in English, which covers the realistic cases.', correct: false },
      ],
      silently:
        'It blocks the one payload from the incident, so the incident closes and the control is marked as effective. It also introduces a second failure nobody counts: legitimate documents get rejected for containing an innocent phrase, so the list stays short to keep the false positives down, which makes it weaker still. Meanwhile every rewritten instruction passes, and the log shows a filter that fires often enough to look like it is working.',
      explanation:
        'Sanitising works when the dangerous input has a shape the machine can recognise. That is true of a quote in SQL, where a parameterized query removes the need to recognise anything at all. It is not true here: the dangerous input is a fluent sentence, in any language, and a request to summarise a document about prompt injection is indistinguishable from an attack by content alone. Fact 13 states it structurally: the model does not separate instructions from data, both are text in the same context, and there is no syntactic boundary like the one between code and parameters. The controls that work do not try to find the instruction; they limit what obeying one can do.',
    },

    handoff: {
      canNow: [
        'Give the structural reason prompt injection has no syntactic fix',
        'Contrast a prompt with a parameterized query, and say exactly what the query has that the prompt does not',
        'Write a rule that ranks applications by what an obeyed instruction could reach',
      ],
      note: 'Q2.2 asks for the structural reason in one paragraph, and Q2.4 asks about the assembly order. Fact 13 is the sentence to be able to say without thinking.',
    },
  },
}

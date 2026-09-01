import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L26',
  number: 26,
  topicId: 'ai-security',
  sectionId: 2,
  title: 'Prompt injection, direct and indirect, against XSS',
  objective:
    'You will be able to tell direct from indirect prompt injection, say why neither maps onto reflected or stored XSS, and write the rule that finds an application exposed to the indirect kind.',
  minutes: 14,
  difficulty: 'medium',
  sources: ['F12', 'Q2.1', 'Q2.3', 'Q2.5', 'F46'],

  steps: {
    vocabulary: [
      {
        term: 'direct prompt injection',
        definition: 'The instruction comes from the person talking to the model. They are attacking their own session, which matters when the model can do more than they can.',
      },
      {
        term: 'indirect prompt injection',
        definition: 'The instruction is planted in content the model reads: a document, an email, a web page, a ticket, a retrieved chunk. The user never sees it.',
      },
      {
        term: 'reflected XSS',
        definition: 'Script that comes back in the same response as the request that carried it, so the victim has to be persuaded to click a link.',
      },
      {
        term: 'stored XSS',
        definition: 'Script saved on the server and served to everyone who views the page afterwards. No link needed.',
      },
      {
        term: 'payload',
        definition: 'The attacker text itself. In XSS it is code for a browser. In prompt injection it is a sentence for a model.',
      },
    ],

    model: {
      narrative: [
        'These two pairs get mapped onto each other constantly, and the mapping is wrong in a way worth being precise about, because it leads to the wrong controls.',
        '',
        'The XSS pair is about where the payload lives on its way to a browser. Reflected means it travelled in the request and came back in that response, so the attacker needs the victim to follow a link. Stored means it was saved and is served to everyone afterwards. In both, the victim is a different person from the attacker, and the fix is the same in both: encode on output, because a browser has a parser and you can make text stop being code.',
        '',
        'The prompt injection pair is about who supplied the text. Direct means the person in the conversation typed it. Indirect means it arrived inside content the model was asked to read, and the person in the conversation never saw it.',
        '',
        'The two axes are not the same axis. Direct injection is a user attacking their own session, which is only interesting when the model can reach more than the user can: exfiltrating a system prompt, or calling a tool the user has no permission for. Nobody else is the victim. Indirect injection has a third party, and the victim is the user or the organisation, which is why fact 12 calls it the dangerous one.',
        '',
        'And the fixes do not transfer. Output encoding works for XSS because the browser parses. A model does not parse: there is no encoding that makes a sentence stop being a sentence. So the controls are the ones from the last lesson, all of them about limiting what an obeyed instruction can reach.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'Two different axes. The XSS pair asks where the payload was stored; the injection pair asks who supplied the text.',
        left: {
          title: 'XSS: where it lived',
          points: [
            'Reflected: in the request, echoed back.',
            'Stored: saved, served to everyone.',
            'Victim: another user browser.',
            'Fix: encode on output. The browser parses, so text can be made inert.',
          ],
        },
        right: {
          title: 'injection: who supplied it',
          points: [
            'Direct: the user typed it themselves.',
            'Indirect: planted in content the model reads.',
            'Victim: direct, nobody but the user. Indirect, the user or the company.',
            'Fix: none by encoding. Limit tools, permissions and autonomy instead.',
          ],
        },
      },
      takeaway: 'XSS splits on where the payload was stored. Injection splits on who supplied the text. Only one of the two has an encoding fix.',
    },

    worked: {
      task:
        'Question 2.5 asks for a rule that flags an LLM application exposed to indirect prompt injection. Write it, given that the property to detect is a path from content strangers can write into to a model that can act.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The application manifest listing its retrieval sources and its registered tools, the write path configuration of each source, and the prompt assembly code.',
          why: 'Indirect injection is a path, so the rule needs both ends of it: where content enters, and what the model can do once it has read it.',
          prompt: {
            question: 'Why is the write path to the corpus part of the data source?',
            answer:
              'Because it is what makes the injection indirect at all. A corpus only your team can write to needs an insider; a ticket queue, an inbox or a crawled site accepts text from strangers by design. The exposure is decided by who can write, not by what is currently written.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'An application whose prompt includes content from a source with an unauthenticated or external write path, and which registers at least one tool, in the same request path.',
          why: 'In the same request path is the part that stops this being a list of every application in the company. Two unconnected features are not an attack path.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Who can write to the source and whether they are authenticated, whether any registered tool is irreversible or reaches another system, and whether the output is rendered as HTML or markdown for a human.',
          why: 'The third one catches the compound case: model output rendered without escaping is how an indirect injection turns into ordinary XSS against the person reading the answer.',
          prompt: {
            question: 'Why does rendering the answer as HTML matter to a prompt injection rule?',
            answer:
              'Because the model output is untrusted input to whatever consumes it. An injected instruction can ask for a link or an image tag pointing at an attacker server with the conversation in the query string, and a renderer that does not escape it makes the request. That is improper output handling, and it is a separate lesson, but it is the pair that produces real incidents.',
          },
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when an anonymous stranger can write to the source and a tool is irreversible. High when writes need an authenticated account. Medium when the source is internal and write restricted but not reviewed.',
          why: 'Severity tracks how far the write path reaches and how bad the tool is. It is the same reachability plus impact formula as everywhere else in this section.',
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Applications with no tools at all and output that is never rendered as markup. Exception granted per application and re examined whenever a tool is registered or a new retrieval source is added.',
          why: 'The exception is tied to the two conditions that make it safe, both of which are one pull request away from changing. Tying the review to a change event is what keeps it honest.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Authorise retrieval per user before it happens, mark provenance in the prompt, scope tools to one task each, require approval for irreversible actions, and escape model output at every consumer.',
          why: 'Five controls, none of which tries to detect the payload. Notice that authorise before retrieval is on the list: it is the next lesson but two, and it is the control that also limits what a poisoned document can reach.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The retrieval source and its write path, the tool manifest, a rendered prompt containing a document from that source, and, where it exists, one conversation where retrieved content changed what the model did.',
          why: 'One real conversation ends the discussion faster than any amount of design argument. Where none exists, the rendered prompt plus the write path is enough to make the path visible.',
        },
      ],
      result:
        'A rule that finds the applications where a stranger can write text that a model will read and act on, ranked by how far that action reaches.',
    },

    fadeLight: {
      task: 'A narrower rule: an email assistant that summarises incoming mail and can send replies automatically. This is question 2.3.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The assistant configuration, its mail integration scopes, and the prompt assembly code.',
          why: 'The scopes are the impact half: read only and send are different findings.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'An assistant that puts incoming message bodies into the prompt and holds a send scope, with no human confirmation before sending.',
          why: 'Incoming mail is the most open write path there is: anybody who knows the address can write into the corpus.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the mailbox is externally reachable, what the send scope covers, and whether the assistant can also read other mailboxes or attachments.',
          why: 'A shared mailbox that can read a whole folder turns one injected mail into access to everything in it.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical: an anonymous sender can put instructions in front of a model that can send mail as the user without confirmation.',
          why: 'Every ingredient is at its worst. There is no authentication on the write path and the tool is irreversible the moment it fires.',
          choices: [
            'Critical: an anonymous sender can put instructions in front of a model that can send mail as the user without confirmation.',
            'High, because the model usually summarises rather than obeying text inside a message.',
            'Medium, because sending an email is reversible by sending a correction.',
            'Low while no incident has been reported for this assistant.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Question 2.3 describes exactly this: white text on a white background inside an email, holding instructions. Invisible to the human, ordinary text to the model, and the send scope is what turns it into an incident.',
    },

    fadeHeavy: {
      task: 'A rule for the compound case: model output rendered as HTML in the user interface without escaping.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether any retrieval source has an external write path, and whether the interface renders links and images from the answer without escaping.',
          why: 'Both halves are needed for the compound case. Untrusted content in, unescaped markup out, and the user browser makes the request.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High. An injected instruction can produce an image tag that sends the conversation to an attacker server as soon as the answer renders.',
          why: 'No click required, which is what separates this from a phishing link in an answer.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Escape model output at the consumer, allow only a known set of markup, and block outbound requests to hosts not on a list.',
          why: 'This is the output handling principle applied at the boundary of the consumer, which is where it belongs. The model is not the thing being fixed.',
          choices: [
            'Escape model output at the consumer, allow only a known set of markup, and block outbound requests to hosts not on a list.',
            'Ask the model in the system prompt not to produce image tags.',
            'Scan the retrieved documents for hidden text before they enter the prompt.',
            'Disable retrieval entirely for this application.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The rendering code path, one answer containing an image tag with a query string, and the outbound request recorded in the browser network log.',
          why: 'The outbound request is the proof that the data left. Everything before it is a description of how it could.',
          choices: [
            'The rendering code path, one answer containing an image tag with a query string, and the outbound request recorded in the browser network log.',
            'A list of the documents currently in the retrieval corpus.',
            'The system prompt, showing the instruction not to produce markup.',
            'The model provider policy on generating HTML.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'This is where the XSS comparison finally earns its keep, and notice where: not in the injection, but in the output. The injection has no encoding fix; the rendering of the answer has exactly the ordinary one.',
    },

    parsons: {
      task:
        'Four of these belong in the indirect injection rule from question 2.5. Place those four in a reading order and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the asset', code: 'the application puts retrieved or fetched content into its prompt' },
        { id: 'p2', label: 'the write path', code: 'and that content comes from a source strangers can write to' },
        { id: 'p3', label: 'the impact', code: 'and the application registers at least one tool in the same request path' },
        { id: 'p4', label: 'the missing control', code: 'and no human approval stands between the model and an irreversible tool' },
        { id: 'd1', label: 'the write path', code: 'and the retrieved documents contain hidden or white on white text', distractor: true },
        { id: 'd2', label: 'the impact', code: 'and the model is larger than seven billion parameters', distractor: true },
        { id: 'd3', label: 'the missing control', code: 'and the user input is not escaped before it enters the prompt', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'Hidden text is one payload style out of many and dates instantly. Model size is not a security property. Escaping the user input is the XSS fix imported into a place with no parser to protect, which is the exact confusion this lesson exists to clear up.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. An agent reads issue tickets from an external tracker, summarises them, and opens pull requests in your repositories. This is question 2.9. Write the rule.',
      rows: [
        {
          part: 'source',
          answer:
            'The agent configuration listing its ticket source and its repository credentials, plus the write path settings of the tracker.',
          options: [
            'The agent configuration listing its ticket source and its repository credentials, plus the write path settings of the tracker.',
            'The pull requests the agent has already opened, reviewed by hand.',
            'The model provider logs for the agent API key.',
          ],
          why: 'Both ends of the path: who can file a ticket, and what the agent can do in the repository. Reviewing past pull requests finds incidents, not exposure.',
        },
        {
          part: 'condition',
          answer:
            'An agent that reads externally filed ticket text into its prompt and holds credentials that can push branches or open pull requests.',
          options: [
            'An agent that reads externally filed ticket text into its prompt and holds credentials that can push branches or open pull requests.',
            'An agent that opens more than five pull requests per day.',
            'An agent whose summaries are longer than the ticket they summarise.',
          ],
          why: 'The condition names the path: untrusted text in, repository write out. The other two are activity measures that say nothing about who can influence the agent.',
        },
        {
          part: 'context',
          answer:
            'Whether anyone can file a ticket without an account, what the repository credentials can reach, and whether pull requests can trigger CI that holds secrets.',
          options: [
            'Whether anyone can file a ticket without an account, what the repository credentials can reach, and whether pull requests can trigger CI that holds secrets.',
            'How many repositories the organisation has in total.',
            'Whether the agent uses a hosted or a self hosted model.',
          ],
          why: 'CI is the escalation nobody expects: a pull request that runs a workflow with secrets turns a text injection into code execution with credentials.',
        },
        {
          part: 'severity',
          answer:
            'Critical when tickets can be filed anonymously and pull requests trigger CI with secrets. High when filing requires an account.',
          options: [
            'Critical when tickets can be filed anonymously and pull requests trigger CI with secrets. High when filing requires an account.',
            'Medium, because a pull request has to be reviewed by a human before it merges.',
            'Low, because the agent only writes to a branch and not to main.',
          ],
          why: 'Review before merge is a control against the merge, not against the CI run that happens when the pull request opens. That distinction is the whole finding.',
        },
        {
          part: 'falsePositives',
          answer:
            'Agents restricted to an internal tracker where filing requires an employee account, with no CI triggered by pull requests from agent branches.',
          options: [
            'Agents restricted to an internal tracker where filing requires an employee account, with no CI triggered by pull requests from agent branches.',
            'Agents that have been running for more than six months without an incident.',
            'Agents owned by the platform team, which reviews its own changes.',
          ],
          why: 'The exception names the two conditions that remove the path. Time without an incident is not evidence of a control, and ownership is not a property of the system.',
        },
        {
          part: 'remediation',
          answer:
            'Scope the repository credential to one repository and to branch creation only, require human approval before a pull request opens, and stop CI running automatically on agent branches.',
          options: [
            'Scope the repository credential to one repository and to branch creation only, require human approval before a pull request opens, and stop CI running automatically on agent branches.',
            'Filter ticket text for instruction like phrases before it enters the prompt.',
            'Have the agent summarise the ticket twice and compare the two summaries.',
          ],
          why: 'Narrow the credential, put a human in front of the irreversible step, and remove the automatic escalation. The other two try to detect the payload, which is the thing that cannot be done reliably.',
        },
        {
          part: 'evidence',
          answer:
            'The agent tool manifest and credential scopes, the tracker write settings, a rendered prompt with a ticket in place, and the CI trigger configuration.',
          options: [
            'The agent tool manifest and credential scopes, the tracker write settings, a rendered prompt with a ticket in place, and the CI trigger configuration.',
            'A screenshot of a pull request the agent opened correctly.',
            'The agent system prompt, showing that it is told to ignore instructions in tickets.',
          ],
          why: 'Four artefacts that together show the whole path. A correct pull request shows the happy case, and an instruction in the system prompt is the request that this lesson has just finished explaining is not a control.',
        },
      ],
      closing:
        'You have now written the same rule three times against three different scenarios, and the shape did not change: who can write, what the model can do, what stands between them. That is the shape of every indirect injection finding.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the ticket reading agent.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the asset', code: 'the agent reads externally filed ticket text into its prompt' },
          { id: 'f2', label: 'the write path', code: 'and anyone can file a ticket in that tracker' },
          { id: 'f3', label: 'the impact', code: 'and the agent holds credentials that can open pull requests' },
          { id: 'f4', label: 'the escalation', code: 'and opening a pull request triggers CI that holds secrets' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Read it back as a sentence. It is an attack path, and each block is one hop.',
      },
    },

    trap: {
      misconceptionId: 'sec-injection-vs-xss',
      setup:
        'A design review. The reviewer maps the new concepts onto ones they already know, and proposes the controls that follow from the mapping.',
      code:
        'Direct prompt injection is basically reflected XSS: it comes\nin the request and comes back in the response.\nIndirect is stored XSS: it is saved and served later.\nSo: escape the input, encode the output, and we are covered.',
      language: 'text',
      question: 'Where does this go wrong?',
      options: [
        {
          text: 'The two pairs split on different things, and encoding cannot help because a model has no parser to make text inert for.',
          correct: true,
        },
        { text: 'The mapping is right, but it is the other way round: direct is stored and indirect is reflected.', correct: false },
        { text: 'Nothing is wrong with the mapping. Escaping the input does prevent both kinds.', correct: false },
        { text: 'The mapping holds for text models but not for models that accept images.', correct: false },
      ],
      silently:
        'It produces a design review that signs off. The controls it recommends are real controls, they are simply aimed at the wrong layer: escaping the input protects a parser that does not exist here, and encoding the output is genuinely useful but only against the rendering half. The application ships with tools, a service identity and an open write path into its corpus, and the review has already recorded that injection is handled.',
      explanation:
        'The XSS pair splits on where the payload lived on its way to a browser. The injection pair splits on who supplied the text. Those are different axes, so the mapping cannot survive: reflected XSS has a victim who is a different person, while direct injection has no third party at all, and it only matters when the model can reach more than the user can. The deeper difference is the fix. A browser parses, so encoding makes text stop being code; a model does not parse, so no transformation makes a sentence stop being a sentence. The only place ordinary output encoding applies is on the answer, where model output becomes input to a renderer, which is a separate finding and a separate lesson.',
    },

    handoff: {
      canNow: [
        'Tell direct from indirect prompt injection by who supplied the text',
        'Say why the reflected and stored XSS pair does not map onto it, and where encoding does apply',
        'Write the rule that finds an application exposed to indirect injection',
      ],
      note: 'Q2.1, Q2.3 and Q2.5 are all this lesson, and fact 12 is the one to be able to say cold. Q2.9 is the rule you just wrote.',
    },
  },
}

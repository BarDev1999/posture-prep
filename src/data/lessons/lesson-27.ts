import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L27',
  number: 27,
  topicId: 'ai-security',
  sectionId: 2,
  title: 'Tools, and what agency means',
  objective:
    'You will be able to describe how a tool call actually works, name the moment a model stops being a component and becomes an actor, and write a rule against a tool that is wider than its task.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F23', 'Q2.8', 'Q2.10', 'A#OWASP Top 10 for Agentic Applications, 2026'],

  steps: {
    vocabulary: [
      {
        term: 'tool',
        definition: 'A function the application offers the model. The model can ask for it by name with arguments; the application is what actually runs it.',
      },
      {
        term: 'tool schema',
        definition: 'The description of a tool given to the model: its name, what it does, and the arguments it takes. It is text in the context window like everything else.',
      },
      {
        term: 'agency',
        definition: 'How much a system can do without a person: which functions it holds, what permissions those run with, and how far it can go unsupervised.',
      },
      {
        term: 'actor',
        definition: 'A model that has tools, memory and the right to execute. It stops being a component of your system and becomes a participant in it.',
      },
      {
        term: 'ASI Top 10',
        definition: 'The OWASP list for agentic applications, published December 2025. It extends the LLM list rather than replacing it.',
      },
    ],

    model: {
      narrative: [
        'A tool call is less magical than it sounds, and knowing the mechanism is what makes the risk obvious.',
        '',
        'The application sends the model a list of tools with their schemas. The model replies with text that names one and gives arguments. The application parses that reply, decides whether to run it, and runs it with its own credentials. The model never touches anything: it emits a request, and something else in your code obeys it.',
        '',
        'Everything about tool security follows from that last sentence. The model is not the thing with permissions. Your code is. The question is never what the model is allowed to do, it is what your code will do when the model asks.',
        '',
        'File A puts the framing well: there is a difference between an LLM as a component and an LLM as an actor. A summariser with no tools is a component; the worst case is a bad summary. The moment it holds tools, persistent memory and the right to execute, it is an actor, and you need the agentic list as well as the LLM list. The two threads running through that whole list are identity, meaning the agent permissions, and containment, meaning limiting how far it can go.',
        '',
        'The top three of the ASI list say the same thing in order: goal hijack, tool misuse, identity and privilege abuse.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'One tool call. The model produces text; your application is what turns that text into an action, using its own credentials.',
        nodes: [
          { label: 'tools are described to the model', note: 'Names, descriptions and argument schemas, sent as text in the context window.' },
          { label: 'the model replies with a tool request', note: 'Still just text: a name and some arguments. Nothing has happened yet.' },
          {
            label: 'your code parses it and decides',
            note: 'This is the only place a decision can be enforced. Skip the decision and the next box is unconditional.',
            danger: true,
          },
          { label: 'the tool runs with your credentials', note: 'Not the model credentials, and not the user credentials unless you made it so.' },
          { label: 'the result goes back into the context', note: 'And is now untrusted content sitting in the prompt for the next turn.' },
        ],
      },
      takeaway: 'The model asks and your code acts. Agency is a property of your code, not of the model.',
    },

    worked: {
      task:
        'Question 2.8 describes a DevOps agent with one tool that runs kubectl against any cluster, using a single service account holding cluster-admin. Write the rule that finds this shape.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The agent tool manifest, the identity each tool runs as, and the effective permissions of that identity from the cloud or cluster role bindings.',
          why: 'Effective permissions rather than granted ones. A role bound to cluster-admin is one line in a manifest and unlimited in effect, and only the binding says which it is.',
          prompt: {
            question: 'Why does the rule need the identity as well as the tool list?',
            answer:
              'Because the tool name says nothing about its reach. A tool called run_kubectl could be bound to a read only service account in one namespace or to cluster-admin across every cluster. The permissions are where the blast radius lives.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A tool whose arguments are not constrained to a single task or scope, running as an identity whose effective permissions exceed what that task needs, with no per user authorisation on the call.',
          why: 'Three failures in one shape, and question 2.8 asks for three distinct ones: too much functionality, too many permissions, and no authorisation tying the call to a person.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the agent reads untrusted content anywhere in the same request path, whether the tool can act on production, and whether any of its actions are irreversible.',
          why: 'Untrusted content plus a wide tool is the attack path from the last lesson. Without it this is a standing risk rather than a reachable one, and the severity should say so.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the wide tool sits in a request path that also reads untrusted content. High when the agent is internal and reads only trusted input, because the tool is still one prompt away from misuse.',
          why: 'Even with no injection path, a model that can run any command against any cluster will eventually run the wrong one. Excessive agency is a finding on its own.',
          prompt: {
            question: 'The agent has never done anything harmful in six months. Does that lower the severity?',
            answer:
              'No. Severity is about what the configuration permits, not about what has happened. Six months without an incident is an observation about traffic, and it is exactly the argument that will be made when you file this ticket.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Break glass automation that genuinely needs wide access, allowed by an approved tag, with the identity restricted to a break glass path that is logged and alerted on every use.',
          why: 'The same shape as the over permissioned role example in file A: break glass roles are legitimate, and the exception is documented, narrow, and noisy when used.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Split the one wide tool into narrow tools per task, bind each to its own identity with only the permissions that task needs, derive permissions from the requesting user, and require approval for anything irreversible.',
          why: 'Fact 15, applied: narrow scoped tools per task, permissions derived from the specific user rather than one strong service identity, human approval for irreversible actions.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The tool schema as sent to the model, the service account and its role bindings, and one recorded tool call showing the arguments the model chose.',
          why: 'The schema shows what the model was invited to do, the bindings show what would happen if it did, and a real call shows the model choosing arguments nobody vetted.',
        },
      ],
      result:
        'A rule that finds tools wider than their task, ranked by whether anything untrusted can reach them. This is the CIEM idea applied to an agent: effective permissions against needed permissions.',
    },

    fadeLight: {
      task: 'A rule for an agent whose tool list includes a general purpose HTTP fetch tool.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The agent tool manifest and the egress configuration of the environment it runs in.',
          why: 'The tool says it can fetch; the network configuration says how far.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A tool that fetches an arbitrary URL supplied by the model, with no destination allowlist and no block on link local addresses.',
          why: 'Precise about the two missing controls rather than saying the tool is dangerous.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the agent runs inside a cloud instance with a metadata service reachable, and whether the fetched content goes back into the prompt.',
          why: 'This is SSRF with a model choosing the URL. The metadata service is the classic target and it is three lessons away in the cloud section.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the agent runs on an instance whose metadata service answers without a token, because the fetched credentials return straight into the context window.',
          why: 'Two ordinary findings compose into a credential theft path, which is what a toxic combination means.',
          choices: [
            'Critical when the agent runs on an instance whose metadata service answers without a token, because the fetched credentials return straight into the context window.',
            'Medium, because fetching a URL is a read only operation.',
            'Low, since the model has no reason to fetch an internal address.',
            'High only if the fetched page contains a known malicious signature.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'A read only tool that can read anything is not a small tool. That is the trap on this lesson, and it is the most common argument for leaving a tool wide.',
    },

    fadeHeavy: {
      task: 'A rule for an agent that can run code in a sandbox and also holds a network egress path from it.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the sandbox can reach on the network, whether it holds credentials, and whether its filesystem persists between runs.',
          why: 'A sandbox is only a boundary if something bounds it. These three questions decide whether it is one.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the sandbox has unrestricted egress and any credential in the environment. High when egress is restricted but the filesystem persists.',
          why: 'Egress is exfiltration. Persistence is a foothold that survives the request that created it.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Deny egress by default with an allowlist, mount no credentials into the sandbox, and rebuild it per request so nothing persists.',
          why: 'Containment, which is one of the two threads running through the whole ASI list. The other is identity, which is the previous row.',
          choices: [
            'Deny egress by default with an allowlist, mount no credentials into the sandbox, and rebuild it per request so nothing persists.',
            'Log everything the sandbox runs and review the logs weekly.',
            'Ask the model to explain its code before running it.',
            'Limit the sandbox to a single CPU so that mining is uneconomic.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The sandbox network policy, its mounted secrets and volumes, and one recorded run showing an outbound connection.',
          why: 'A recorded outbound connection turns an argument about design into a fact about behaviour.',
          choices: [
            'The sandbox network policy, its mounted secrets and volumes, and one recorded run showing an outbound connection.',
            'The list of packages installed in the sandbox image.',
            'A statement from the team that the sandbox is isolated.',
            'The CPU and memory limits configured on the sandbox.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Identity and containment, the two threads file A names as running through the whole agentic list. Every row you just filled was one or the other.',
    },

    parsons: {
      task:
        'Four of these belong in the rule for question 2.8, the kubectl agent. Place those four in a reading order and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the asset', code: 'the agent registers a tool that runs cluster commands' },
        { id: 'p2', label: 'too much functionality', code: 'and the tool accepts any command against any cluster' },
        { id: 'p3', label: 'too many permissions', code: 'and it runs as one service account bound to cluster-admin' },
        { id: 'p4', label: 'no authorisation', code: 'and the call is not authorised against the requesting user' },
        { id: 'd1', label: 'too much functionality', code: 'and the agent uses a model with a large context window', distractor: true },
        { id: 'd2', label: 'too many permissions', code: 'and the cluster runs more than fifty pods', distractor: true },
        { id: 'd3', label: 'no authorisation', code: 'and the agent has no rate limit on tool calls', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The three failures the question asks for are the middle three blocks: functionality, permissions, authorisation. A rate limit is a real control and it is the wrong one here: it slows a wide tool down without narrowing it, so the same command still runs, just later.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A customer support agent holds one tool, lookup_customer, which takes any customer id and returns the full record. It runs as a service account that can read every customer. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The agent tool manifest, the identity the tool runs as, and that identity effective read permissions.',
          options: [
            'The agent tool manifest, the identity the tool runs as, and that identity effective read permissions.',
            'The customer database schema and its indexes.',
            'The support ticket volume per agent per day.',
          ],
          why: 'The manifest says what the model may ask for and the effective permissions say what your code will do when it asks. Both are needed to state the reach.',
        },
        {
          part: 'condition',
          answer:
            'A tool that accepts an arbitrary record identifier and runs as an identity that can read every record, with no check that the identifier belongs to the requesting user.',
          options: [
            'A tool that accepts an arbitrary record identifier and runs as an identity that can read every record, with no check that the identifier belongs to the requesting user.',
            'A tool that returns more than ten fields per customer record.',
            'A tool whose name does not follow the naming convention for read tools.',
          ],
          why: 'This is IDOR with a model choosing the identifier: a valid request, a normal response, and no authorisation on the object. Field count and naming are not security properties.',
        },
        {
          part: 'context',
          answer:
            'Whether the agent reads any customer supplied text in the same request path, and whether the returned record includes fields classified as sensitive.',
          options: [
            'Whether the agent reads any customer supplied text in the same request path, and whether the returned record includes fields classified as sensitive.',
            'Whether the model provider stores the request for abuse monitoring.',
            'How long the tool takes to return a record.',
          ],
          why: 'Reachability and impact again: untrusted text in the path makes it exploitable by a stranger, and the classification decides what is lost when it is.',
        },
        {
          part: 'severity',
          answer:
            'Critical when customer supplied text is in the same path, since one customer can make the agent read another customer record. High otherwise.',
          options: [
            'Critical when customer supplied text is in the same path, since one customer can make the agent read another customer record. High otherwise.',
            'Medium, because reading a record does not change anything.',
            'Low, because the support team can already read every customer record anyway.',
          ],
          why: 'The last option is the argument you will actually hear. It confuses what a person may do under supervision with what an automated path may do on request from a stranger.',
        },
        {
          part: 'falsePositives',
          answer:
            'Internal analytics agents with no user in the request, allowed by an approved tag naming the job and its owner.',
          options: [
            'Internal analytics agents with no user in the request, allowed by an approved tag naming the job and its owner.',
            'Agents used only by the support team, who are trusted employees.',
            'Agents that log every lookup, since the log provides accountability after the fact.',
          ],
          why: 'A job with no user genuinely cannot derive permissions from one. Trusting the operator is not a control, and a log is detection rather than prevention.',
        },
        {
          part: 'remediation',
          answer:
            'Derive the record scope from the authenticated user in the request, and give the tool an identity that can read only the records that user may read.',
          options: [
            'Derive the record scope from the authenticated user in the request, and give the tool an identity that can read only the records that user may read.',
            'Instruct the model in the system prompt to look up only the current customer.',
            'Add a confirmation step where the model states which record it is about to read.',
          ],
          why: 'Least agency enforced in the code that runs the tool. An instruction in the prompt is a request, and a model narrating its own intention is not an authorisation check.',
        },
        {
          part: 'evidence',
          answer:
            'The tool schema, the identity role and its effective read scope, and one recorded call where the identifier did not belong to the requesting user.',
          options: [
            'The tool schema, the identity role and its effective read scope, and one recorded call where the identifier did not belong to the requesting user.',
            'The number of lookups performed in the last month.',
            'A screenshot of the agent answering a support question well.',
          ],
          why: 'One call crossing a customer boundary is the whole finding, demonstrated rather than described.',
        },
      ],
      closing:
        'Notice that the tool in this scenario is read only, and the finding is critical anyway. Read only bounds what the agent can break; it says nothing at all about what it can reach.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the customer lookup tool.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the asset', code: 'the agent registers a tool that reads customer records' },
          { id: 'f2', label: 'too much functionality', code: 'and the tool accepts any customer identifier' },
          { id: 'f3', label: 'too many permissions', code: 'and it runs as an identity that can read every customer' },
          { id: 'f4', label: 'no authorisation', code: 'and no check ties the identifier to the requesting user' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Asset, functionality, permissions, authorisation. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'ai-read-only-tool-is-safe',
      setup:
        'A review of a new agent. Someone proposes giving it a read only database tool, arguing that the risk is bounded because nothing can be written.',
      code:
        'Tool: query_database(sql)\nPermissions: SELECT on every table in the analytics warehouse\nArgument: any SQL string the model writes\nReasoning: it is read only, so the worst case is a slow query.',
      language: 'text',
      question: 'What is the worst case, actually?',
      options: [
        { text: 'A slow query, plus some wasted spend. Read only genuinely bounds it.', correct: false },
        {
          text: 'Every row in the warehouse read and returned into the context window, where it can be summarised out to whoever is talking to the agent.',
          correct: true,
        },
        { text: 'Nothing, because the model cannot write SQL well enough to reach other tables.', correct: false },
        { text: 'A schema change, since SELECT permission includes reading system tables.', correct: false },
      ],
      silently:
        'It works perfectly for the intended queries, which is what the demo shows. The exfiltration path is invisible in every ordinary conversation and appears only when someone asks for something they should not have, or when an injected instruction does. Nothing is modified, so no integrity alert fires and no backup differs; the only trace is a query in the warehouse log that looks like analytics.',
      explanation:
        'Read only bounds integrity, not confidentiality, and confidentiality is usually the thing being protected. A tool that can read anything is a tool that can exfiltrate anything, because whatever it reads lands in the context window and the model output goes to whoever is talking. The right scope is not read against write; it is the smallest set of rows the task needs, derived from the requesting user. That is what least agency means: narrow tools, permissions from the user rather than a strong service identity, and approval for anything irreversible.',
    },

    handoff: {
      canNow: [
        'Describe a tool call as text the model emits and your code obeys',
        'Say what turns a model from a component into an actor, and which OWASP list applies then',
        'Write a rule against a tool that is wider than its task',
      ],
      note: 'Q2.8 is the worked example and Q2.10 is the component against actor distinction. Fact 23 is the top three of the ASI list plus the two threads: identity and containment.',
    },
  },
}

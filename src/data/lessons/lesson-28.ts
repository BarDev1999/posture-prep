import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L28',
  number: 28,
  topicId: 'ai-security',
  sectionId: 2,
  title: 'Excessive Agency and least agency',
  objective:
    'You will be able to name the three components of Excessive Agency, give three concrete ways to enforce least agency, and write a rule that measures an agent against the task it exists for.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F14', 'F15', 'Q2.6', 'Q2.7', 'A#OWASP Top 10 for LLM Applications, 2026 edition'],

  steps: {
    vocabulary: [
      {
        term: 'Excessive Agency',
        definition: 'The model or agent holds more tools, permissions or autonomy than its task requires. It is LLM06 in the 2025 list and LLM03 in the 2026 one.',
      },
      {
        term: 'functionality',
        definition: 'Which tools exist at all. A tool nobody removed is still an option the model can choose on any turn.',
      },
      {
        term: 'permissions',
        definition: 'What those tools can reach when they run. This is decided by the identity your code uses, not by the model.',
      },
      {
        term: 'autonomy',
        definition: 'How far the system goes without a person. A confirmation step is the difference between a suggestion and an action.',
      },
      {
        term: 'least agency',
        definition: 'Granting exactly what the task needs: narrow tools per task, permissions from the requesting user, and approval before anything irreversible.',
      },
    ],

    model: {
      narrative: [
        'Excessive Agency has three components, and they are three separate questions with three separate fixes. Question 2.6 asks for the definition and question 2.7 asks for the enforcement, so it is worth being able to say both cleanly.',
        '',
        'Too much functionality: the agent holds tools its task does not need. Usually because a tool was added for one feature and never scoped back, or because one general tool was easier to write than four specific ones.',
        '',
        'Too many permissions: the identity behind the tools can reach more than the task needs. This is the CIEM question, asked about an agent instead of a human, and it is answered the same way: effective permissions against used permissions.',
        '',
        'Too much autonomy: the agent acts rather than proposes. This is the one people forget, because it feels like a product decision rather than a security control. It is both.',
        '',
        'The reason this rose to third in the 2026 OWASP list is not that it became more dangerous. It is that real incidents cluster around agentic systems, and the incident is almost never the model saying something wrong. It is the model doing something wrong, with permissions somebody granted it, in a step nobody was watching.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'One agent, whose task is to summarise findings and open a ticket. Excessive Agency is the gap between these two columns, on three axes at once.',
        left: {
          title: 'what the task needs',
          points: [
            '2 tools: read findings, create ticket.',
            'Read on one account, write on one project.',
            'A person approves the ticket text.',
          ],
        },
        right: {
          title: 'what it holds',
          points: [
            '6 tools, including delete and send mail.',
            'One identity that reads every account.',
            'No confirmation before anything.',
          ],
        },
      },
      takeaway: 'Three components: what it can do, what that can reach, and how far it goes alone. Fix them separately.',
    },

    worked: {
      task:
        'Write the rule that measures an agent against its task on all three axes, so a reviewer can see which of the three is the problem.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The agent tool manifest, the identity behind each tool with its effective permissions, the approval configuration, and the tool call history from the last ninety days.',
          why: 'The last one turns opinion into evidence. Granted permissions are an argument; permissions never used in ninety days are a fact, and file A names exactly that window for the over permissioned role example.',
          prompt: {
            question: 'Why ninety days rather than a shorter window?',
            answer:
              'Because quarterly work exists. A tool used once at the end of a quarter looks unused in a thirty day window, and a rule that keeps proposing the removal of things people need is a rule that gets switched off.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'An agent holding a tool never called in ninety days, or an identity with permissions never exercised in ninety days, or an irreversible tool with no approval step. Any one of the three fires.',
          why: 'Three separate conditions in one rule so the finding can name which axis failed. A single condition joining them with and would fire on almost nothing.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the agent is in a request path with untrusted content, whether the unused permissions include write or delete, and whether the agent is customer facing.',
          why: 'The same enrichment as the last two lessons. Unused read permissions on an internal agent and unused delete permissions on a customer facing one are not the same finding.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when an irreversible tool has no approval step and untrusted content is in the path. High for unused write permissions. Medium for unused tools and unused read permissions.',
          why: 'Ordered by what an attacker gains. Unused functionality is an option they can choose; unused write permission is what they can do with it; no approval step is what stops anyone noticing in time.',
          prompt: {
            question: 'Why is an unused tool a finding at all, if nobody has called it?',
            answer:
              'Because nobody means no legitimate user. The tool is in the schema sent to the model on every request, so it is an option on every turn, and an injected instruction chooses from the same list your users do. Removing it costs nothing precisely because nobody uses it.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Genuinely seasonal automation and break glass paths, allowed by an approved tag with an owner and an expiry, with the break glass identity alerting on every use.',
          why: 'The same exception shape as the over permissioned role in file A: documented, justified, per identity, and never a blanket exclusion for an account.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Remove the unused tools, reduce each identity to the permissions actually used, split one wide tool into narrow ones per task, derive permissions from the requesting user, and add approval before irreversible actions.',
          why: 'This is fact 15 as a checklist, and it is the answer to question 2.7. Three concrete enforcements: narrow scoped tools, permissions from the user, human approval for the irreversible.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The tool manifest against the task description, the effective against used permissions for the identity, and the approval configuration for each irreversible tool.',
          why: 'Every line is a comparison rather than a number, because that is what makes it actionable: this is what it has, this is what it needs.',
        },
      ],
      result:
        'A rule whose finding names which of the three components is wrong, which is what makes it fixable by the team that owns the agent rather than argued about with them.',
    },

    fadeLight: {
      task: 'A rule for the autonomy axis alone: an agent that takes an irreversible action with no person in the path.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The tool manifest with each tool marked reversible or not, and the approval configuration for the agent.',
          why: 'Someone has to have classified the tools. If nobody has, that is the first finding.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A tool that deletes, sends, pays, deploys or grants, callable by the model with no confirmation step between the request and the action.',
          why: 'Named verbs rather than a category, so the rule can be applied by someone who has never seen this agent before.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether untrusted content reaches the same request path, and whether the action can be undone by anyone other than the person it affected.',
          why: 'Undone by whom is the honest question. A refund the finance team can reverse next week is not reversible from the point of view of the incident.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when untrusted content is in the path. High otherwise, because a model with an unsupervised irreversible tool will eventually use it wrongly without any attacker at all.',
          why: 'The second half is the part people push back on, and it is the part worth keeping: this is a finding even with no adversary.',
          choices: [
            'Critical when untrusted content is in the path. High otherwise, because a model with an unsupervised irreversible tool will eventually use it wrongly without any attacker at all.',
            'Medium unless an incident has already occurred with this agent.',
            'Low, since the model has been reliable in testing.',
            'Critical only when the tool can affect customer data.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Autonomy is the axis that gets defended as a product decision. It is one, and it is also the control that decides whether a mistake is a draft or an incident.',
    },

    fadeHeavy: {
      task: 'A rule for the permissions axis: an agent identity that can reach far more than the agent has ever used.',
      steps: [
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the unused permissions include a privilege escalation path such as passing a role or editing a policy. High for unused write permissions, medium for unused read.',
          why: 'An unused escalation permission is not a wide agent, it is an admin agent waiting for one instruction.',
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Automation identities with a documented quarterly or annual task, allowed by tag with an expiry and reviewed when the tag expires.',
          why: 'An exception with no expiry becomes permanent, and permanent exceptions are where the next incident lives.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Rebuild the policy from the permissions actually used in the window, add a condition restricting where it can be used, and split one identity per tool rather than one for the agent.',
          why: 'Least privilege from real usage data, which is exactly the remediation file A gives for the over permissioned role.',
          choices: [
            'Rebuild the policy from the permissions actually used in the window, add a condition restricting where it can be used, and split one identity per tool rather than one for the agent.',
            'Add a rate limit to the agent so it cannot use the permissions quickly.',
            'Rotate the credentials of the identity every thirty days.',
            'Move the agent into its own account and keep the permissions as they are.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The effective permissions of the identity, the set actually used in ninety days, and the difference between the two as a list of actions.',
          why: 'The difference is the finding. Presenting it as a list of actions nobody has used makes removal an easy decision rather than a risk assessment.',
          choices: [
            'The effective permissions of the identity, the set actually used in ninety days, and the difference between the two as a list of actions.',
            'The full policy document attached to the ticket.',
            'The number of API calls the agent made last month.',
            'The name of the person who created the identity.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Effective against used is the whole CIEM idea in three words, and it works exactly the same on an agent as on a human. The only difference is that an agent can be asked to use its permissions by a stranger.',
    },

    parsons: {
      task:
        'Four of these belong in a rule for an agent whose task is to summarise findings and open a ticket. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the asset', code: 'the agent task is to summarise findings and open one ticket' },
        { id: 'p2', label: 'too much functionality', code: 'and it registers tools the task does not need, unused in ninety days' },
        { id: 'p3', label: 'too many permissions', code: 'and its identity holds permissions never exercised in that window' },
        { id: 'p4', label: 'too much autonomy', code: 'and it can take an irreversible action with no confirmation step' },
        { id: 'd1', label: 'too much functionality', code: 'and it uses a model from a third party provider', distractor: true },
        { id: 'd2', label: 'too many permissions', code: 'and its credentials have not been rotated in ninety days', distractor: true },
        { id: 'd3', label: 'too much autonomy', code: 'and it answers without asking clarifying questions', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'Credential rotation is a real control aimed at a different risk: it limits how long a stolen credential works, and does nothing about a credential being used exactly as configured. The other two distractors are not security properties at all.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A finance assistant has three tools: read invoices, draft payments and approve payments. Its task is to draft payments for a human to approve, and it runs as one identity that can do all three. Write the rule.',
      rows: [
        {
          part: 'source',
          answer:
            'The tool manifest with the stated task, the identity behind the tools and its effective permissions, and the approval configuration.',
          options: [
            'The tool manifest with the stated task, the identity behind the tools and its effective permissions, and the approval configuration.',
            'The invoice database and the payment history for the last quarter.',
            'The finance team process documentation.',
          ],
          why: 'The finding is the gap between the stated task and the granted capability, so both have to be in the data source.',
        },
        {
          part: 'condition',
          answer:
            'An agent that holds an approval tool while its task is only to draft, so the same identity can both create and approve a payment.',
          options: [
            'An agent that holds an approval tool while its task is only to draft, so the same identity can both create and approve a payment.',
            'An agent that drafts more than fifty payments per day.',
            'An agent whose payment drafts are sometimes rejected by the human reviewer.',
          ],
          why: 'One identity that can both create and approve is separation of duties broken, stated as a fact about the tool list rather than as a judgement.',
        },
        {
          part: 'context',
          answer:
            'Whether invoice text from outside the company reaches the prompt, what the payment limit on the identity is, and whether approvals are logged separately from drafts.',
          options: [
            'Whether invoice text from outside the company reaches the prompt, what the payment limit on the identity is, and whether approvals are logged separately from drafts.',
            'Which model version the assistant uses and when it was last updated.',
            'How long the finance team takes to review a draft.',
          ],
          why: 'Invoices arrive from suppliers, which makes this an indirect injection path into a payment tool. The limit bounds the loss and the logging decides whether anyone finds out.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Supplier supplied text reaches a model that can both draft and approve a payment, with no second party in the path.',
          options: [
            'Critical. Supplier supplied text reaches a model that can both draft and approve a payment, with no second party in the path.',
            'High, because a payment above the limit would still need a human.',
            'Medium, because finance reconciles all payments at the end of the month.',
          ],
          why: 'Reconciliation is detection after the money has gone, and a limit bounds the size of each loss rather than preventing any of them.',
        },
        {
          part: 'falsePositives',
          answer:
            'Assistants whose approval tool is restricted to payments below a small threshold to a supplier allowlist, tagged and reviewed monthly.',
          options: [
            'Assistants whose approval tool is restricted to payments below a small threshold to a supplier allowlist, tagged and reviewed monthly.',
            'Assistants used only by the finance team, who understand the risk.',
            'Assistants where the model has been instructed never to approve its own drafts.',
          ],
          why: 'An exception has to be a control, not a belief about the operator or a request to the model. A threshold plus an allowlist is both narrow and checkable.',
        },
        {
          part: 'remediation',
          answer:
            'Remove the approval tool from this agent, run drafting and approval as two identities, and require a human approval step before any payment leaves.',
          options: [
            'Remove the approval tool from this agent, run drafting and approval as two identities, and require a human approval step before any payment leaves.',
            'Keep the tool but instruct the model in the system prompt to never call it.',
            'Add a second model that reviews the first model drafts before approval.',
          ],
          why: 'Remove the functionality the task does not need. An instruction is not a control, and a second model is a second thing that can be argued with by the same injected text.',
        },
        {
          part: 'evidence',
          answer:
            'The tool manifest beside the stated task, the identity permissions covering both draft and approve, and one payment where both steps came from the agent.',
          options: [
            'The tool manifest beside the stated task, the identity permissions covering both draft and approve, and one payment where both steps came from the agent.',
            'A list of all payments the agent has drafted this quarter.',
            'The finance policy document describing who may approve payments.',
          ],
          why: 'The policy says what should happen and the manifest shows what can happen. The pair of them, plus one payment that went through both steps, is the whole argument.',
        },
      ],
      closing:
        'One tool too many, one identity too wide, one missing approval. Three components, three fixes, and the fix for the first one was deleting something, which is the cheapest security control there is.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the finance assistant.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the asset', code: 'the assistant task is to draft payments for a human to approve' },
          { id: 'f2', label: 'too much functionality', code: 'and it also registers a tool that approves payments' },
          { id: 'f3', label: 'too many permissions', code: 'and one identity is behind both drafting and approving' },
          { id: 'f4', label: 'too much autonomy', code: 'and no human approval stands between the draft and the payment' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Task, functionality, permissions, autonomy. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'ai-one-service-identity',
      setup:
        'An agent that answers questions about a user own data. The team points out that the user is authenticated at the front door, so the agent uses one service identity behind it for simplicity.',
      code:
        'user = authenticate(request)            # the user is verified here\nagent = Agent(tools=[read_documents])   # tools run as svc-agent\nanswer = agent.run(user.question)       # svc-agent can read every document',
      language: 'python',
      question: 'What does the front door authentication actually give you here?',
      options: [
        { text: 'Full authorisation, since only authenticated users can reach the agent at all.', correct: false },
        {
          text: 'Only the identity of the caller. Every tool call still runs with the service identity, so nothing limits which documents are read.',
          correct: true,
        },
        { text: 'Nothing at all, because the model can bypass authentication entirely.', correct: false },
        { text: 'Authorisation for read operations, but not for writes.', correct: false },
      ],
      silently:
        'Every ordinary conversation looks correct, because the model asks for the documents the user meant and the service identity happily returns them. Nothing enforces the boundary, so the moment a question is phrased to reach further, or an injected instruction asks it to, the same identity returns another user documents with no error, no denial and nothing in the log to distinguish it from a normal answer.',
      explanation:
        'Authentication tells you who is asking. Authorisation decides what that person may have, and it has to be enforced where the data is fetched, not at the front door. A single strong service identity moves every authorisation decision into the model behaviour, which is the one place in the system that can be argued with. Fact 15 says it directly: permissions derived from the specific user rather than one strong service identity. In practice that means the tool takes the user context and the query runs with a scope built from it, so a request for another user data returns nothing rather than being politely declined.',
    },

    handoff: {
      canNow: [
        'Name the three components of Excessive Agency and give the fix for each',
        'Give three concrete enforcements of least agency, as question 2.7 asks',
        'Write a rule that compares an agent capability against the task it exists for',
      ],
      note: 'Q2.6 and Q2.7 are the definition and the enforcement, and facts 14 and 15 are the pair to be able to recite. This is the highest value pair in the AI section after prompt injection.',
    },
  },
}

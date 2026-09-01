import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L24',
  number: 24,
  topicId: 'ai-security',
  sectionId: 2,
  title: 'What an LLM application is made of',
  objective:
    'You will be able to name the six parts of an LLM application, say which of them an attacker can reach, and write an AI-SPM rule against the part that is exposed.',
  minutes: 13,
  difficulty: 'easy',
  sources: ['F21', 'Q2.20', 'Q2.23', 'A#Modules under Cloud Posture Security'],

  steps: {
    vocabulary: [
      {
        term: 'model',
        definition: 'The file of weights that turns text into more text. On its own it does nothing: something has to send it a prompt and read the answer.',
      },
      {
        term: 'system prompt',
        definition: 'Text the application puts in front of the user text on every call, holding the instructions and the persona it wants the model to follow.',
      },
      {
        term: 'context window',
        definition: 'Everything the model can see on one call, in one place. System prompt, retrieved documents, history and user input all arrive here.',
      },
      {
        term: 'tool',
        definition: 'A function the model may ask the application to run: search, send mail, run a query. The application runs it, not the model.',
      },
      {
        term: 'memory',
        definition: 'Anything the application stores from one conversation and puts back into a later one. It outlives the request that created it.',
      },
      {
        term: 'AI-SPM',
        definition: 'AI Security Posture Management: inventory and risk for models, datasets, vector stores, inference endpoints and training pipelines.',
      },
    ],

    model: {
      narrative: [
        'The application is not the model. The model is one component, and it is usually the component you did not build and cannot change. What you built is the thing that assembles a prompt, sends it, and does something with the answer.',
        '',
        'Six parts, and they matter to a posture researcher for one reason: they are six assets with different owners, different exposure and different failure modes, and ordinary CSPM has a concept of none of them. A bucket it understands. An inference endpoint, a vector store and a training pipeline it does not. That gap is exactly what AI-SPM covers, and it is what question 2.20 is asking.',
        '',
        'The part to hold on to is the context window. Everything the model sees on a call is assembled there into one piece of text: your instructions, whatever was retrieved, whatever the user typed, whatever was remembered. They arrive from different places, with wildly different trust, and by the time the model reads them they are all the same thing.',
        '',
        'That is not a bug to be fixed, it is what the next two lessons are built on. For now, notice the shape of the diagram: the layers look separate to you and identical to the model.',
      ].join('\n'),
      diagram: {
        kind: 'stack',
        caption:
          'One call. Four layers of text with four different owners, concatenated into one context window before the model reads a single word of it.',
        layers: [
          {
            label: 'system prompt',
            note: 'Written by your team. Instructions, persona, the rules the model is meant to follow.',
            trust: 'trusted',
          },
          {
            label: 'retrieved documents',
            note: 'Pulled from a vector store at request time. Written by whoever wrote the source documents.',
            trust: 'untrusted',
          },
          {
            label: 'conversation memory',
            note: 'Summaries of earlier turns, stored by you, containing text from whoever spoke earlier.',
            trust: 'mixed',
          },
          {
            label: 'user input',
            note: 'This turn, typed by the user. The only layer everyone already treats as hostile.',
            trust: 'untrusted',
          },
        ],
      },
      takeaway: 'Six components, one context window, and the model cannot tell which layer a sentence came from.',
    },

    worked: {
      task:
        'Write the rule for the classic AI-SPM finding: an inference endpoint exposed to the internet with no authentication in front of it. This is question 2.23 in the bank, and it is the first full rule of the security sections.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The model and endpoint inventory from the cloud provider API, plus the configuration of whatever sits in front of it: load balancer listeners, API gateway authorizers, and the security group on the endpoint.',
          why: 'Two sources, because one alone cannot answer the question. The endpoint inventory says the endpoint exists; only the thing in front of it says whether a stranger can reach it without credentials.',
          prompt: {
            question: 'Why is the model registry not enough on its own?',
            answer:
              'Because it knows what is deployed, not who can reach it. A registry entry looks identical whether the endpoint is behind an authorizer or open to the world. Exposure lives in the network and authentication configuration, which is a different data source.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'An inference endpoint with a listener reachable from 0.0.0.0/0 and no authentication configured in front of it: no API key required, no IAM authorizer, no OIDC or JWT validation.',
          why: 'Precise, and stated as a conjunction of two facts about configuration fields rather than as a description. Public alone is not a finding; unauthenticated alone is not either.',
          prompt: {
            question: 'Why not simply flag every endpoint reachable from the internet?',
            answer:
              'Because a public inference endpoint behind an authorizer is a normal, intended design, and a rule that flags it is a rule the team learns to ignore. The finding is the pair, and the false positive rate is what decides whether anyone acts on the rest of your rules.',
          },
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Does the endpoint serve a production model. Does the application attach tools to it. Does its system prompt carry business logic or keys. Are there requests in the access log from outside the corporate ranges.',
          why: 'Context is what turns one severity into another. Each of these raises the ceiling: tools mean the model can act, a system prompt with logic means there is something to steal, and outside traffic means it is not theoretical.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the endpoint is public, unauthenticated and has tools attached. High when it is public and unauthenticated without tools. Medium when authentication exists but is a shared static key.',
          why: 'Derived from exposure and impact rather than from a label. The same misconfiguration is a different finding depending on what the model can do once it answers.',
          prompt: {
            question: 'Why does a shared static key still earn a medium?',
            answer:
              'Because a key that everyone in the team pastes into notebooks is one leak away from being public, and nothing in the logs can tell which caller used it. It is authentication in name, and it costs an attacker one screenshot.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Deliberately public demo and evaluation endpoints. Allow them by an approved tag such as ai-public-demo, granted per endpoint with an owner and an expiry, never by a whole account or namespace.',
          why: 'Exceptions have to exist or the rule gets switched off, and they have to be narrow or they become the hole. A tag with an owner and a date is auditable; an account wide exclusion is not.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Put an authorizer in front of the endpoint, or move it to a private endpoint reachable only from the application subnet. Rotate any static key that was in use. Automatable in a non production account, proposed as a change elsewhere.',
          why: 'The exact fix, and an honest statement of whether it can be automated. Automatically closing a production inference endpoint is an outage, and a posture team that causes one loses the right to automate anything.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The endpoint URL, the listener and authorizer configuration as returned by the API, one unauthenticated request with its response headers, the model name and version, and the tools attached to it.',
          why: 'Evidence is what makes the owning team believe you rather than argue. An unauthenticated response is not an opinion, and it is the difference between a ticket that is fixed and a ticket that is disputed.',
        },
      ],
      result:
        'A rule that fires on a real, documented AI-SPM finding, with a severity that moves with exposure and an exception path that does not open a hole. This shape, the seven rows, is what every remaining lesson in the module produces.',
    },

    fadeLight: {
      task: 'A rule for the same asset class one step out: a model artifact bucket that is readable by anyone.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Bucket configuration and policy from the cloud API, plus the model registry so the objects can be matched to a named model.',
          why: 'The bucket alone does not say it holds a model. The registry is what makes this an AI finding rather than an ordinary storage one.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A bucket holding model artifacts with public read allowed by its ACL or policy, or with Block Public Access disabled.',
          why: 'The same shape as the public bucket example in file A, narrowed to buckets the registry says hold models.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Is the model in production, was it fine tuned on internal data, and does the object have read requests from outside the account.',
          why: 'A fine tuned model is training data you can partly recover, which is a different loss from a public copy of a published open weight model.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the model was fine tuned on internal or customer data. Medium when the artifact is a public open weight model the team simply mirrored.',
          why: 'Impact is decided by what is inside the file, not by the fact that a bucket is public. A mirror of a public model leaks nothing.',
          choices: [
            'Critical when the model was fine tuned on internal or customer data. Medium when the artifact is a public open weight model the team simply mirrored.',
            'Critical in every case, because a public bucket is always critical.',
            'Medium in every case, because the file is only a set of weights and not customer data.',
            'Derived from the CVSS score of the most severe CVE in the training container image.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The severity row is the one that separates a rule people act on from a rule people mute. It is also the row this section will keep coming back to: exposure and impact, never the label alone.',
    },

    fadeHeavy: {
      task: 'A rule for a training pipeline that pulls its base model from an unpinned public source.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The pipeline definition in the repository, plus the job logs recording which artifact was actually downloaded on each run.',
          why: 'The definition says what was asked for; the log says what arrived. For an unpinned reference those are different questions.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A training or fine tuning job that fetches a base model by a moving reference such as latest or main, with no digest pinned and no signature checked.',
          why: 'Precise about the field: a moving reference, not a vague statement about untrusted sources.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Does the resulting model reach production, does the pipeline hold credentials with write access elsewhere, and has the upstream artifact changed between runs.',
          why: 'The same pipeline is a research toy or a supply chain into production, and only the context rows can tell you which one you are looking at.',
          choices: [
            'Does the resulting model reach production, does the pipeline hold credentials with write access elsewhere, and has the upstream artifact changed between runs.',
            'How many CVEs the training image has, sorted by CVSS score.',
            'Whether the repository has a README describing the pipeline.',
            'How long the training job takes and how much it costs per run.',
          ],
        },
        {
          label: 'severity',
          prose: true,
          code: 'High when the output reaches production. Medium when it stays in a research account with no path to production.',
          why: 'Same reachability question as always. A poisoned artifact that never leaves a sandbox is a different finding from one that ships.',
          choices: [
            'High when the output reaches production. Medium when it stays in a research account with no path to production.',
            'Critical always, because supply chain risks are critical by definition.',
            'Low, because the base model is public and therefore already trusted by everyone.',
            'Informational, since pinning is a code style preference.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Two rows, and both of them asked the same question in different words: can this reach production. That question is the spine of every severity decision in the whole section.',
    },

    parsons: {
      task:
        'Four of these conditions belong in the rule for an unauthenticated public inference endpoint. Place those four, in the order a reader would want them, and leave the others out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the asset', code: 'the resource is an inference endpoint in the model registry' },
        { id: 'p2', label: 'the exposure', code: 'its listener accepts traffic from 0.0.0.0/0' },
        { id: 'p3', label: 'the missing control', code: 'no authorizer, API key or JWT validation is configured on it' },
        { id: 'p4', label: 'the exception path', code: 'and it does not carry the approved ai-public-demo tag' },
        { id: 'd1', label: 'the exposure', code: 'the endpoint has a public DNS name', distractor: true },
        { id: 'd2', label: 'the missing control', code: 'the model was downloaded from a public registry', distractor: true },
        { id: 'd3', label: 'the asset', code: 'the endpoint responds in under 200 milliseconds', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The three you left out are the three ways this rule goes wrong. A public DNS name is not exposure, because a name can resolve to a private address. Where the model came from is a supply chain finding and belongs in its own rule. Response time is not a security property at all, and a condition that is not one is how a rule quietly becomes a dashboard.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A vector store holding embedded internal documents has been deployed with its management API reachable from the internet and no authentication. Write the whole rule.',
      rows: [
        {
          part: 'source',
          answer:
            'The vector store inventory from the cloud API, its network configuration, and the authentication settings on its management endpoint.',
          options: [
            'The vector store inventory from the cloud API, its network configuration, and the authentication settings on its management endpoint.',
            'The application source code in the repository, searched for the vector store client library.',
            'The LLM request logs, filtered to calls that used retrieval.',
          ],
          why: 'Inventory says the asset exists, network and authentication configuration say whether a stranger can reach it. Both are needed and both come from the provider API.',
        },
        {
          part: 'condition',
          answer:
            'A vector store whose management or query endpoint accepts traffic from 0.0.0.0/0 with no authentication required.',
          options: [
            'A vector store whose management or query endpoint accepts traffic from 0.0.0.0/0 with no authentication required.',
            'A vector store that contains documents classified as internal.',
            'A vector store that has been queried more than one thousand times in a day.',
          ],
          why: 'A condition on two configuration fields. Holding internal documents is what makes it matter, but it is context: on its own it describes almost every vector store in the company.',
        },
        {
          part: 'context',
          answer:
            'What the embedded documents are classified as, whether the store serves a production application, and whether there are queries from outside the expected ranges.',
          options: [
            'What the embedded documents are classified as, whether the store serves a production application, and whether there are queries from outside the expected ranges.',
            'How many vectors the store holds and what the embedding dimension is.',
            'Which model produced the embeddings and how old it is.',
          ],
          why: 'Classification and reachability are what move the severity. Size and embedding dimension are inventory facts that change nothing about the risk.',
        },
        {
          part: 'severity',
          answer:
            'Critical when the store holds documents classified as sensitive and is reachable from the internet. High when it is reachable but holds only public content.',
          options: [
            'Critical when the store holds documents classified as sensitive and is reachable from the internet. High when it is reachable but holds only public content.',
            'Critical in every case, because an unauthenticated endpoint is always critical.',
            'Medium, because a vector store holds numbers rather than the original documents.',
          ],
          why: 'Exposure plus impact. The third option is also a factual trap: embeddings can be inverted well enough to recover much of the source text, so numbers are not a defence.',
        },
        {
          part: 'falsePositives',
          answer:
            'Public demonstration stores holding only published content, allowed by an approved tag with a named owner and an expiry date.',
          options: [
            'Public demonstration stores holding only published content, allowed by an approved tag with a named owner and an expiry date.',
            'Any store in an account tagged as non production, excluded from the rule entirely.',
            'Stores whose owning team has asked in writing to be excluded from posture rules.',
          ],
          why: 'A narrow, auditable exception. Excluding whole accounts is how the first real finding gets missed, because non production accounts are where the real data ends up copied.',
        },
        {
          part: 'remediation',
          answer:
            'Move the endpoint behind the application subnet or a private link, require authentication on the management API, and rotate any credential that was reachable.',
          options: [
            'Move the endpoint behind the application subnet or a private link, require authentication on the management API, and rotate any credential that was reachable.',
            'Delete the vector store and rebuild it from the source documents.',
            'Add a rate limit to the endpoint so that bulk extraction is slower.',
          ],
          why: 'It closes the exposure and cleans up what the exposure touched. A rate limit makes extraction slower without making it impossible, which is a mitigation and not a fix.',
        },
        {
          part: 'evidence',
          answer:
            'The endpoint address, its network and authentication configuration from the API, one unauthenticated query with its response, and the classification of the documents it returned.',
          options: [
            'The endpoint address, its network and authentication configuration from the API, one unauthenticated query with its response, and the classification of the documents it returned.',
            'A screenshot of the vector store in the provider console.',
            'The name of the engineer who created the store, from the audit log.',
          ],
          why: 'A successful unauthenticated query is not arguable. A console screenshot proves the asset exists, which nobody disputes, and naming the engineer turns a posture finding into a personnel matter.',
        },
      ],
      closing:
        'Seven rows, one scenario you had not seen. Notice how much of it was decided by two questions: can a stranger reach it, and what is inside it. Those two carry most of the severity decisions in this whole section.',
      fallback: {
        task: 'Same rule, as blocks. Place the four conditions that belong, in the order a reader would want them.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the asset', code: 'the resource is a vector store in the AI inventory' },
          { id: 'f2', label: 'the exposure', code: 'its query or management endpoint accepts traffic from 0.0.0.0/0' },
          { id: 'f3', label: 'the missing control', code: 'no authentication is required on that endpoint' },
          { id: 'f4', label: 'the exception path', code: 'and it does not carry an approved public demo tag' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Asset, exposure, missing control, exception. That order is the same in every rule you will write.',
      },
    },

    trap: {
      misconceptionId: 'ai-system-prompt-is-secret',
      setup:
        'A team keeps the internal API key in the system prompt, so the model can call the reporting service when asked. Their reasoning: the user never sees the system prompt.',
      code:
        'SYSTEM_PROMPT = """You are the posture assistant.\nWhen the user asks for a report, call the reporting API.\nThe API key is sk-live-8f2c... Never reveal this key."""',
      language: 'text',
      question: 'What is wrong with this?',
      options: [
        { text: 'Nothing, as long as the instruction not to reveal it is there.', correct: false },
        {
          text: 'The system prompt is in the same context window as the user text, so the key is one persuasive message away from being read out.',
          correct: true,
        },
        { text: 'The key would work, but the model may hallucinate it wrongly when repeating it.', correct: false },
        { text: 'Nothing technically, but the prompt should be shorter for cost reasons.', correct: false },
      ],
      silently:
        'It works, every day, exactly as intended. The model calls the reporting API, the users never ask about the key, and there is nothing in any log to look at. The failure is a single conversation whenever somebody tries, and the same key is in every conversation the application has ever had, so the first successful extraction is retroactive across all of them.',
      explanation:
        'The system prompt is not a private place. It is text at the top of the same context window the user text lands in, and the only thing separating them is a convention the model was asked to follow. Instructions like never reveal this are a request, not a control. This is why the 2026 OWASP list broadened System Prompt Leakage into Hidden Context Exposure: anything in the context that the user is not meant to see is one message away from being seen, including tool schemas and policy logic. Secrets belong to the application layer, which calls the tool and never puts the credential where the model can read it.',
    },

    handoff: {
      canNow: [
        'Name the six parts of an LLM application and say which of them an attacker can reach',
        'Say what AI-SPM covers that ordinary CSPM has no concept of',
        'Write a seven part rule for an exposed AI asset',
      ],
      note: 'Q2.20 is the AI-SPM definition and Q2.23 is the rule you just wrote. Fact 21 is the one line answer to keep.',
    },
  },
}

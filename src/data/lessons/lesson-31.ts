import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L31',
  number: 31,
  topicId: 'ai-security',
  sectionId: 2,
  title: 'Memory, persistence, and the three kinds of poisoning',
  objective:
    'You will be able to separate data, context and memory poisoning by how long each one lasts, and write a rule against a memory that is written without review.',
  minutes: 13,
  difficulty: 'hard',
  sources: ['F18', 'Q2.14', 'Q2.15', 'F16'],

  steps: {
    vocabulary: [
      {
        term: 'data poisoning',
        definition: 'Hostile examples in the training set. It is baked into the weights, so it affects every user of that model until it is retrained.',
      },
      {
        term: 'context poisoning',
        definition: 'Hostile text in one request, through a retrieved chunk or the user input. It lasts exactly one call.',
      },
      {
        term: 'memory poisoning',
        definition: 'Hostile text written into something the application stores and reads back later, so it survives the conversation that planted it.',
      },
      {
        term: 'long term memory',
        definition: 'Summaries or facts the application keeps between sessions and injects into later prompts. Usually written by the model itself.',
      },
      {
        term: 'lifetime',
        definition: 'How long a poisoned instruction keeps working. It is the one axis that separates the three kinds and it decides the response.',
      },
    ],

    model: {
      narrative: [
        'Three kinds of poisoning, one question that separates them: how long does it last. Question 2.14 asks for exactly that, and it is the cleanest way to hold all three.',
        '',
        'Data poisoning lives in the weights. It affects everyone, it survives every restart, and it is fixed only by retraining or replacing the model. It is also the hardest of the three for an attacker to reach, because it needs access to the training pipeline.',
        '',
        'Context poisoning lives in one request. A hostile chunk or a hostile message changes that answer and then it is gone. It is the easiest to cause and the least durable.',
        '',
        'Memory poisoning is in between, and it is the one that gets built by accident. The application summarises a conversation, writes the summary somewhere, and pastes it into future prompts. If an instruction survives that summary, it now runs on every future conversation with that user, and often with other users too. It was written by your own system, into your own store, so nothing about it looks like an attack.',
        '',
        'Question 2.15 describes precisely this and it is worth picturing: a conversation where the attacker gets a sentence into the summary, and the summary is trusted forever after because it came from us.',
      ].join('\n'),
      diagram: {
        kind: 'stack',
        caption:
          'The same hostile sentence, planted in three places. The layers differ only in how long it stays and how many people it reaches.',
        layers: [
          {
            label: 'data poisoning: the weights',
            note: 'Everyone, every request, until the model is retrained or replaced. Hardest to reach, longest to live.',
            trust: 'mixed',
          },
          {
            label: 'memory poisoning: the store',
            note: 'This user, and often other users, on every future session until somebody deletes the entry.',
            trust: 'untrusted',
          },
          {
            label: 'context poisoning: one prompt',
            note: 'One request, one answer, then gone. Easiest to cause and easiest to survive.',
            trust: 'untrusted',
          },
        ],
      },
      takeaway: 'Data poisoning affects everyone until retraining, memory poisoning persists across sessions, context poisoning lasts one call.',
    },

    worked: {
      task:
        'Write the rule for the design in question 2.15: an application that stores conversation summaries and injects them into future prompts, with nothing between the model output and the store.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The memory write path in the application code, the schema of the stored records, and the prompt assembly showing where stored memory is inserted.',
          why: 'Memory poisoning is a loop: model output goes into a store, the store goes back into a prompt. The rule needs both ends and the fact that they are connected.',
          prompt: {
            question: 'Why is the write path the interesting half rather than the read?',
            answer:
              'Because everyone remembers to think about what goes into a prompt and almost nobody thinks about what goes into the store. The write is where model output stops being an answer and becomes durable state, and that transition happens without anyone deciding it.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'An application that writes model generated text into a persistent store and reads it back into a later prompt, with no validation, no provenance field and no expiry on the record.',
          why: 'Three missing controls, and any one of them alone would make the finding smaller. Together they make a memory nobody can audit and nothing clears.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether memory is shared between users or tenants, whether the application holds tools, and whether the memory is ever shown to a human before it is reused.',
          why: 'Shared memory turns a single conversation into a persistent influence over other people, which is the difference between a nuisance and an incident.',
          prompt: {
            question: 'Why does a memory shown in the interface score lower than one that is invisible?',
            answer:
              'Because a person can notice it. A visible profile that says the assistant thinks you prefer short answers is reviewable; an invisible summary carrying a sentence about always approving requests is not. Visibility is a real, cheap control here.',
          },
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when memory is shared across users and the application holds tools. High when memory is per user and the application holds tools. Medium when there are no tools.',
          why: 'Persistence multiplies whatever the application can do, so the tool list sets the ceiling and the sharing sets the reach.',
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Memories written from a fixed set of structured fields rather than free text, and memories displayed to the user with a way to delete them. Exceptions recorded per application with the schema attached.',
          why: 'A memory that can only hold a value from a known list cannot carry an instruction, which is the whole point. Attaching the schema makes the exception checkable later.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Store structured fields rather than free text where possible, mark memory as untrusted content in the prompt, scope it to one user, give every entry an expiry, and show the user what is remembered with a delete control.',
          why: 'Five controls that all reduce lifetime or reach. None of them tries to detect a hostile summary, for the same reason as always.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The write call taking model output, one stored record containing free text, the prompt template showing where it is inserted, and the absence of an expiry field in the schema.',
          why: 'The missing expiry field is the strongest single artefact: it shows the record was never designed to stop being trusted.',
        },
      ],
      result:
        'A rule that finds a memory loop before somebody writes into it, ranked by how far the memory reaches and what the application can do while reading it.',
    },

    fadeLight: {
      task: 'A rule for an agent whose memory is shared across every user of the workspace.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The memory store schema and the code that reads it into a prompt.',
          why: 'The scope of a memory is a field in a schema, so this is a configuration question rather than a behavioural one.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A memory record with no user or session identifier, read into prompts for every user of the workspace.',
          why: 'The absence of a scoping field is what makes it shared, and it is exactly checkable.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'How many users share the workspace, whether the agent holds tools, and who can write into memory.',
          why: 'Anything that raises the number of readers raises the value of a single successful write.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the agent holds tools, because one conversation can leave an instruction that runs for every other user afterwards.',
          why: 'This is the property that separates memory from context poisoning: one write, many future readers.',
          choices: [
            'Critical when the agent holds tools, because one conversation can leave an instruction that runs for every other user afterwards.',
            'High, because the memory only holds summaries rather than raw text.',
            'Medium, since a shared memory is a product decision the team made deliberately.',
            'Low while the workspace has fewer than ten users.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Shared memory is the version of this that reaches other people. It is also the version most teams ship first, because one store is simpler than one store per user.',
    },

    fadeHeavy: {
      task: 'A rule for a fine tuning pipeline that trains on production conversation logs.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the logs contain user supplied text, whether any filtering or review happens before training, and where the resulting model is deployed.',
          why: 'Training on your own logs means training on whatever your users wrote, which is the data poisoning path that needs no access to your pipeline.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High when the fine tuned model reaches production, because poisoned examples affect every user and survive until the model is replaced.',
          why: 'Lifetime is what makes this worse than context poisoning even though it is harder to achieve.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Review or filter the training set, exclude user supplied turns unless they are curated, keep a record of which data produced which model version, and be able to roll back to a previous model.',
          why: 'Rollback is the control that matters most once poisoning is suspected, and it only exists if versions and their data were recorded in advance.',
          choices: [
            'Review or filter the training set, exclude user supplied turns unless they are curated, keep a record of which data produced which model version, and be able to roll back to a previous model.',
            'Increase the size of the training set so poisoned examples are a smaller fraction.',
            'Train more frequently so that any poisoning is quickly overwritten.',
            'Add a system prompt instructing the model to ignore anything it learned incorrectly.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The training data selection query, one example in the set that came from a user turn, and the deployment record for the resulting model version.',
          why: 'One user written example inside the training set makes the path concrete, and the deployment record shows how far it went.',
          choices: [
            'The training data selection query, one example in the set that came from a user turn, and the deployment record for the resulting model version.',
            'The evaluation scores of the fine tuned model against the base model.',
            'The size of the training set and how long training took.',
            'The name of the team that owns the pipeline.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Two of the wrong remediations are dilution arguments, and they fail for the same reason as increasing top k in the last lesson: the model is not taking a vote.',
    },

    parsons: {
      task:
        'Four of these belong in the rule for the memory loop in question 2.15. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the loop', code: 'the application writes model generated text into a persistent store' },
        { id: 'p2', label: 'the read back', code: 'and reads that stored text into the prompt of later sessions' },
        { id: 'p3', label: 'the missing control', code: 'and the stored record carries no provenance field and no expiry' },
        { id: 'p4', label: 'the impact', code: 'and the application holds at least one tool while reading it' },
        { id: 'd1', label: 'the read back', code: 'and the stored text is longer than the context window allows', distractor: true },
        { id: 'd2', label: 'the missing control', code: 'and the store is not encrypted at rest', distractor: true },
        { id: 'd3', label: 'the impact', code: 'and the model provider retains the conversation for abuse monitoring', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'Provider retention is a privacy question and a real one, and it belongs in a different rule. Mixing it in here would produce a finding two teams both think belongs to the other.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A sales assistant keeps a running profile of every customer, written by the model after each call and read back at the start of the next one. The profile is free text, shared across the whole sales team, and the assistant can send email. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The profile write path in the code, the profile record schema, and the prompt template showing where the profile is inserted.',
          options: [
            'The profile write path in the code, the profile record schema, and the prompt template showing where the profile is inserted.',
            'The customer relationship database and its access logs.',
            'The sales team process documentation for call notes.',
          ],
          why: 'The loop is written in two places, the write and the read, and the schema says whether the record can hold an instruction at all.',
        },
        {
          part: 'condition',
          answer:
            'Model generated free text written into a shared profile record with no provenance or expiry, and read back into later prompts of an assistant that can send email.',
          options: [
            'Model generated free text written into a shared profile record with no provenance or expiry, and read back into later prompts of an assistant that can send email.',
            'A profile record that has not been updated in more than ninety days.',
            'A profile record longer than two thousand characters.',
          ],
          why: 'The condition names the loop, the missing controls and the tool. Age and length are data quality signals rather than security ones.',
        },
        {
          part: 'context',
          answer:
            'Who can influence the text that reaches the profile, how many people read it back, and whether the send email tool needs approval.',
          options: [
            'Who can influence the text that reaches the profile, how many people read it back, and whether the send email tool needs approval.',
            'How many customers are in the system and how fast the list is growing.',
            'Which model version wrote each profile entry.',
          ],
          why: 'A customer on a call can influence the summary, and the profile is then read by the whole team, which is how one conversation reaches many future ones.',
        },
        {
          part: 'severity',
          answer:
            'Critical. A customer can leave an instruction in a profile that the assistant reads back for every colleague, in a system that can send mail without approval.',
          options: [
            'Critical. A customer can leave an instruction in a profile that the assistant reads back for every colleague, in a system that can send mail without approval.',
            'High, because the profile is only a summary and the model wrote it.',
            'Medium, because sales staff read the profiles and would notice something strange.',
          ],
          why: 'The model writing it is what makes it trusted, not what makes it safe. Relying on staff noticing is a detection hope, not a control.',
        },
        {
          part: 'falsePositives',
          answer:
            'Assistants whose profile fields are structured values from a fixed list, and assistants where the profile is shown for approval before it is saved.',
          options: [
            'Assistants whose profile fields are structured values from a fixed list, and assistants where the profile is shown for approval before it is saved.',
            'Assistants used only by employees, who would not attack their own company.',
            'Assistants whose profiles are reviewed during the quarterly data audit.',
          ],
          why: 'A structured field cannot carry an instruction and an approval step puts a person in the loop. A quarterly audit is three months of the wrong behaviour.',
        },
        {
          part: 'remediation',
          answer:
            'Store structured fields rather than free text, scope profiles per team member where possible, mark the profile as untrusted content in the prompt, add an expiry, and require approval before sending email.',
          options: [
            'Store structured fields rather than free text, scope profiles per team member where possible, mark the profile as untrusted content in the prompt, add an expiry, and require approval before sending email.',
            'Ask the model to write shorter profiles so there is less room for an instruction.',
            'Add a second model that checks each profile for hostile content before saving it.',
          ],
          why: 'Reduce what the record can hold, how long it lasts and what the reader can do. A checking model is another thing that reads the same text and can be persuaded by it.',
        },
        {
          part: 'evidence',
          answer:
            'The write call taking model output into the profile, one profile containing free text about the customer preferences, the prompt template inserting it, and the email tool with no approval step.',
          options: [
            'The write call taking model output into the profile, one profile containing free text about the customer preferences, the prompt template inserting it, and the email tool with no approval step.',
            'A list of the profiles that have been written this quarter.',
            'The email logs for the assistant over the last month.',
            'A statement from the sales team that they read every profile.',
          ],
          why: 'The four artefacts trace the whole loop from write to tool. Logs would show an incident that has already happened, and this rule exists to fire before that.',
        },
      ],
      closing:
        'Every control on that remediation row cuts either the lifetime or the reach of a stored sentence. That is the entire defence against memory poisoning, and it is why the three kinds are separated by lifetime in the first place.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the sales profile memory.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the loop', code: 'the assistant writes a free text profile after each call' },
          { id: 'f2', label: 'the read back', code: 'and reads it into the prompt at the start of later calls' },
          { id: 'f3', label: 'the reach', code: 'and the profile is shared across the whole sales team' },
          { id: 'f4', label: 'the impact', code: 'and the assistant can send email without approval' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Loop, read back, reach, impact. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'ai-poisoning-is-training-only',
      setup:
        'A risk assessment for a new assistant. The team uses a hosted model they did not train, and concludes that poisoning is not in scope for them.',
      code:
        'Risk: data poisoning\nAssessment: not applicable. We do not train or fine tune any model.\nWe use a hosted model through an API.\nDecision: accept, no controls required.',
      language: 'text',
      question: 'What has this assessment missed?',
      options: [
        { text: 'Nothing, if the provider is reputable. Poisoning requires access to training.', correct: false },
        {
          text: 'The two kinds that do not need training at all: a poisoned retrieval corpus, and a memory the application writes and reads back.',
          correct: true,
        },
        { text: 'That the hosted model may have been poisoned by its provider, which is the real risk here.', correct: false },
        { text: 'Nothing about poisoning, but the assessment should still cover availability.', correct: false },
      ],
      silently:
        'The assessment is filed, the risk is closed, and the two reachable kinds of poisoning are now out of scope by decision rather than by analysis. The application then does what applications do: it adds retrieval in one sprint and conversation memory in another, and neither change reopens a risk that was already accepted. Nothing fails, so nothing prompts a review.',
      explanation:
        'Poisoning is not one risk, it is three, and they differ in lifetime rather than in mechanism. Data poisoning does need the training pipeline, and for a hosted model that is largely the provider problem. Context poisoning needs only a document your retrieval reads, which is why it is the same finding as RAG poisoning. Memory poisoning needs only that your application write model output somewhere and read it back later, which is a feature most assistants ship. The question to ask is never did we train the model; it is what does this system read that somebody else could have written, and how long does it keep it.',
    },

    handoff: {
      canNow: [
        'Separate data, context and memory poisoning by lifetime, and say who each one affects',
        'Recognise a memory loop in an application: model output written to a store and read back later',
        'Write a rule against a memory written without provenance, expiry or scope',
      ],
      note: 'Q2.14 asks for all three kinds and the difference in lifetime, and Q2.15 is the memory attack. Fact 18 is the one line answer.',
    },
  },
}

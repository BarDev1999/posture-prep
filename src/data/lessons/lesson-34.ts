import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L34',
  number: 34,
  topicId: 'ai-security',
  sectionId: 2,
  title: 'OWASP, MITRE ATLAS, NIST AI RMF, and what each is for',
  objective:
    'You will be able to say what each of the three frameworks is for in one sentence, name the OWASP LLM list and what changed in 2026, and write a rule that cites the right one.',
  minutes: 14,
  difficulty: 'medium',
  sources: ['F9', 'F10', 'F11', 'F22', 'Q2.21', 'Q2.22', 'A#MITRE ATLAS'],

  steps: {
    vocabulary: [
      {
        term: 'OWASP',
        definition: 'The Open Worldwide Application Security Project. A nonprofit that publishes ranked lists of security risks by category.',
      },
      {
        term: 'LLM Top 10',
        definition: 'The OWASP list for applications built on large language models. There is a 2025 edition and a 2026 one, and they differ in order.',
      },
      {
        term: 'MITRE ATLAS',
        definition: 'A taxonomy of attacker tactics and techniques against AI systems, with identifiers in the AML format. The parallel to ATT&CK.',
      },
      {
        term: 'NIST AI RMF',
        definition: 'A governance and risk management framework for organisations building or using AI. It is about process rather than about attacks.',
      },
      {
        term: 'ASI Top 10',
        definition: 'The OWASP list for agentic applications, published December 2025. It extends the LLM list rather than replacing it.',
      },
    ],

    model: {
      narrative: [
        'Three frameworks, three jobs, and the question in the exam is which one you reach for when.',
        '',
        'OWASP LLM Top 10 is a ranked risk list, ordered by prevalence and impact. You use it while building and while prioritising: it answers what usually goes wrong, in what rough order.',
        '',
        'MITRE ATLAS is a taxonomy of attacker behaviour, with tactics and techniques and identifiers. You use it for threat modelling and detection engineering: it answers how an attacker proceeds, step by step, and gives you a name to map a detection rule to.',
        '',
        'NIST AI RMF is governance. It answers who decides, what gets documented, and how risk is managed as a process. It has nothing to say about a specific bucket policy and everything to say about whether anyone owns the decision.',
        '',
        'Fact 22 is the sentence to have ready, and file A adds the framing that matters in an interview: they complement each other, they do not compete. A rule you write should cite the risk category from OWASP and the technique from ATLAS, because those are the two things that make it findable by other people later.',
        '',
        'The 2026 edition changes are worth knowing precisely, because knowing them shows you are current: Excessive Agency rose to third, Unbounded Consumption rose four places, System Prompt Leakage was broadened into Hidden Context Exposure, and Improper Output Handling dropped to tenth.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'Two of the three, side by side. The third, NIST AI RMF, sits above both: it decides who owns the risk and how it is documented.',
        left: {
          title: 'OWASP LLM Top 10',
          points: [
            'A ranked list of risk categories.',
            'Used while building and prioritising.',
            'Answers: what usually goes wrong.',
            'LLM01 Prompt Injection, and nine more.',
          ],
        },
        right: {
          title: 'MITRE ATLAS',
          points: [
            'A taxonomy of attacker behaviour.',
            'Used for threat modelling and detection.',
            'Answers: how an attacker proceeds.',
            'Tactics and techniques with AML identifiers.',
          ],
        },
      },
      takeaway: 'OWASP ranks risks for building, ATLAS names attacker behaviour for detecting, NIST governs the process. They complement each other.',
    },

    worked: {
      task:
        'Write a rule that is properly cited: an AI-SPM finding mapped to its OWASP category and its ATLAS technique, so that another researcher can find it and a governance report can count it.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The AI asset inventory from AI-SPM, the framework mapping table maintained beside the rules, and the existing rule catalogue so a duplicate is not written.',
          why: 'The last one is not paperwork. A catalogue nobody checks grows three rules for the same finding, each with a different severity, and the team stops trusting all three.',
          prompt: {
            question: 'Why cite two frameworks rather than picking the better one?',
            answer:
              'They answer different questions. The OWASP category tells a developer which class of mistake this is while they are building; the ATLAS technique tells a detection engineer which attacker behaviour it corresponds to. A rule with both is findable by both audiences.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'Every rule in the catalogue must name one OWASP LLM or ASI category and, where an attacker behaviour exists for it, one ATLAS technique. A rule with neither fails review.',
          why: 'The condition is about the rule rather than about a resource, which is what a governance control looks like when it is written as a rule.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which edition of the OWASP list the citation refers to, whether the rule is preventive or detective, and which exam section or product area it belongs to.',
          why: 'The edition matters because the numbers moved: Excessive Agency is LLM06 in 2025 and LLM03 in 2026, and a citation without an edition is ambiguous.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Not applicable to the rule itself. Instead, severity guidance is inherited from the risk category, and any rule whose severity disagrees with its category has to say why in one line.',
          why: 'This is the row that makes a catalogue coherent. Two rules citing the same category with opposite severities is a sign that one of them is wrong.',
          prompt: {
            question: 'Why allow disagreement at all, rather than forcing severity to follow the category?',
            answer:
              'Because context beats the category and the whole section has been saying so. A prompt injection risk in a tool free internal summariser genuinely is lower than the category suggests. What matters is that the disagreement is stated rather than silent.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Rules covering a purely operational concern, such as cost or latency, which have no OWASP category. They are tagged as operational and excluded from the security catalogue.',
          why: 'Cost control is a real rule and it is not a security rule. Keeping it out of the catalogue keeps the security numbers honest.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Add the missing citation, or retire the rule if no category applies. Review the mapping when a new edition of a list is published, and record which edition each rule was written against.',
          why: 'The review on publication is what stops a catalogue drifting into referring to numbers that have moved.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The rule definition with its citations, the mapping table entry, and a report grouping the current findings by OWASP category.',
          why: 'The grouped report is the thing a governance framework such as NIST AI RMF actually consumes, and it only exists if every rule was cited.',
        },
      ],
      result:
        'A catalogue where every rule says which risk it addresses and which attacker behaviour it detects, which is what makes a set of rules a programme rather than a pile.',
    },

    fadeLight: {
      task: 'Cite the frameworks for the indirect prompt injection rule from lesson 26.',
      steps: [
        {
          label: 'the risk category',
          prose: true,
          code: 'OWASP LLM Top 10, LLM01 Prompt Injection, in both the 2025 and 2026 editions.',
          why: 'It is first in both editions, which is the one number in this list that has not moved.',
        },
        {
          label: 'the agentic category',
          prose: true,
          code: 'OWASP ASI Top 10, ASI01 Agent Goal Hijack, where the application is an agent with tools.',
          why: 'The agentic list extends rather than replaces, so a finding in an agent usually cites one from each.',
        },
        {
          label: 'the attacker behaviour',
          prose: true,
          code: 'MITRE ATLAS, the prompt injection technique, and RAG poisoning where the path is through a retrieval corpus.',
          why: 'ATLAS is what a detection engineer searches, so this is the citation that makes the rule findable from the SOC side.',
        },
        {
          label: 'the governance hook',
          prose: true,
          code: 'NIST AI RMF, as evidence for the manage function: a named risk with an owner, a control and a review date.',
          why: 'Governance frameworks consume the fact that the rule exists and is owned, rather than its technical content.',
          choices: [
            'NIST AI RMF, as evidence for the manage function: a named risk with an owner, a control and a review date.',
            'NIST AI RMF, technique AML.T0051, which defines prompt injection.',
            'NIST AI RMF, which ranks prompt injection as the first risk for LLM applications.',
            'No governance citation is needed, since prompt injection is a technical risk.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Two of those wrong options give NIST properties that belong to the other two frameworks: a technique identifier is ATLAS, and a ranking is OWASP. Being able to keep them apart is exactly what question 2.21 is testing.',
    },

    fadeHeavy: {
      task: 'Cite the frameworks for the pickle artefact rule from lesson 32.',
      steps: [
        {
          label: 'the risk category, 2025 edition',
          prose: true,
          code: 'LLM03 Supply Chain, which in 2025 covers third party models, datasets and the components around them.',
          why: 'The 2025 numbering is the one most people know, and it is the one the exam is most likely to use.',
        },
        {
          label: 'the risk category, 2026 edition',
          prose: true,
          code: 'LLM05 Improper Supply Chain, whose primary vectors are compromised base models, unsafe serialization and rogue registries.',
          why: 'Naming both editions and their numbers is how you show the list moved without being caught out by which one someone means.',
        },
        {
          label: 'the attacker behaviour',
          prose: true,
          code: 'MITRE ATLAS, the machine learning supply chain compromise technique, covering a poisoned model artefact obtained from a public source.',
          why: 'It describes what the attacker does rather than what the developer got wrong, which is the difference between the two frameworks.',
          choices: [
            'MITRE ATLAS, the machine learning supply chain compromise technique, covering a poisoned model artefact obtained from a public source.',
            'MITRE ATLAS, LLM03, which is the supply chain entry of the ATLAS list.',
            'MITRE ATT&CK T1611 Escape to Host, since loading the artefact runs code.',
            'No ATLAS citation applies, because this is a software problem rather than an AI one.',
          ],
        },
        {
          label: 'the governance hook',
          prose: true,
          code: 'NIST AI RMF, as evidence for the map and measure functions: an inventory of third party AI components and a stated verification requirement before use.',
          why: 'An inventory and a stated requirement are exactly the artefacts a governance review asks for, and they are the output of this rule.',
          choices: [
            'NIST AI RMF, as evidence for the map and measure functions: an inventory of third party AI components and a stated verification requirement before use.',
            'NIST AI RMF, which requires all model artefacts to be in the safetensors format.',
            'NIST AI RMF, technique AML.T0010, supply chain compromise.',
            'NIST 800 53, which is the correct framework for AI supply chain risk.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'The wrong options all make the same category error in different directions: giving one framework the shape of another. A governance framework does not mandate a file format, and it does not carry technique identifiers.',
    },

    parsons: {
      task:
        'Four of these belong in a review checklist for a new AI security rule. Place those four in the order a reviewer would work through them and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the risk', code: 'the rule names one OWASP LLM or ASI category, with the edition' },
        { id: 'p2', label: 'the behaviour', code: 'and one MITRE ATLAS technique where an attacker behaviour exists' },
        { id: 'p3', label: 'the coherence', code: 'and its severity agrees with that category, or says in one line why not' },
        { id: 'p4', label: 'the governance', code: 'and it has a named owner and a review date' },
        { id: 'd1', label: 'the risk', code: 'and it cites the CVSS score of the underlying vulnerability', distractor: true },
        { id: 'd2', label: 'the behaviour', code: 'and it names the model provider the finding applies to', distractor: true },
        { id: 'd3', label: 'the coherence', code: 'and it has been approved by the model provider', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The CVSS distractor is the one to watch for. Most AI posture findings are misconfigurations rather than vulnerabilities, so there is no CVE and no score, and a checklist that demands one quietly excludes the whole category.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. Your team has forty AI security rules written over six months by four people. Nobody can say which OWASP categories are covered and which are not. Write the rule that fixes the catalogue.',
      rows: [
        {
          part: 'source',
          answer: 'The rule catalogue itself, with each rule definition, its citations, its owner and its last review date.',
          options: [
            'The rule catalogue itself, with each rule definition, its citations, its owner and its last review date.',
            'The findings each rule has produced over the last six months.',
            'The OWASP and ATLAS documentation, read end to end.',
          ],
          why: 'The subject of this rule is the catalogue, not the environment. Findings measure how often rules fire, which is a different question from what they cover.',
        },
        {
          part: 'condition',
          answer:
            'A rule with no OWASP category, or no edition on the category it cites, or no owner, or no review date within the last two quarters.',
          options: [
            'A rule with no OWASP category, or no edition on the category it cites, or no owner, or no review date within the last two quarters.',
            'A rule that has produced no findings in the last quarter.',
            'A rule written by someone who has since left the team.',
          ],
          why: 'Four checkable properties joined by or, so each fires on its own. A quiet rule may be a working control, and authorship is not a defect.',
        },
        {
          part: 'context',
          answer:
            'Which OWASP categories have no rule at all, which have several, and whether the duplicates disagree on severity.',
          options: [
            'Which OWASP categories have no rule at all, which have several, and whether the duplicates disagree on severity.',
            'How long each rule takes to evaluate against the environment.',
            'Which cloud provider each rule applies to.',
          ],
          why: 'Gaps and disagreements are what the catalogue view is for. Uncovered categories are the finding nobody can see from inside a single rule.',
        },
        {
          part: 'severity',
          answer:
            'High for an uncited or unowned rule, since neither its coverage nor its correctness can be argued. Medium for a stale review date.',
          options: [
            'High for an uncited or unowned rule, since neither its coverage nor its correctness can be argued. Medium for a stale review date.',
            'Critical for every catalogue defect, since governance failures cause incidents.',
            'Low throughout, because this is documentation rather than a control.',
          ],
          why: 'The third option is the one that usually wins the argument in real teams, and it is why catalogues rot. Coverage you cannot state is coverage you do not have.',
        },
        {
          part: 'falsePositives',
          answer: 'Operational rules covering cost, latency or quota, tagged as operational and reported separately.',
          options: [
            'Operational rules covering cost, latency or quota, tagged as operational and reported separately.',
            'Rules written before the catalogue standard existed, which are exempt.',
            'Rules owned by the platform team, which reviews its own work.',
          ],
          why: 'A real distinction, tagged and reported separately, rather than an exemption for age or for ownership. Grandfathering is how half a catalogue becomes exempt.',
        },
        {
          part: 'remediation',
          answer:
            'Add citations with the edition, assign an owner and a review date to each rule, merge duplicates, and open a gap item for every category with no rule.',
          options: [
            'Add citations with the edition, assign an owner and a review date to each rule, merge duplicates, and open a gap item for every category with no rule.',
            'Rewrite the forty rules against the 2026 edition of the list.',
            'Delete the rules that have not fired in six months.',
          ],
          why: 'Fix the metadata and surface the gaps. Rewriting everything is a project nobody will finish, and deleting quiet rules removes working preventive controls.',
        },
        {
          part: 'evidence',
          answer:
            'A table of the forty rules against the OWASP categories, showing which are covered, which are duplicated and which are empty.',
          options: [
            'A table of the forty rules against the OWASP categories, showing which are covered, which are duplicated and which are empty.',
            'The full text of all forty rules, attached to the ticket.',
            'A count of findings produced per rule this quarter.',
          ],
          why: 'One table makes coverage visible in a way that forty rule definitions cannot. The empty rows are the argument.',
        },
      ],
      closing:
        'This is the rule that makes the other forty legible, and it is the one a governance framework such as NIST AI RMF actually consumes. It is also the last rule of the AI section: from here the material is cloud, then Linux and web, then identity, and every one of them ends the same way.',
      fallback: {
        task: 'Same rule, as blocks. The four checks a rule in the catalogue must pass.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the risk', code: 'the rule cites one OWASP category with its edition' },
          { id: 'f2', label: 'the behaviour', code: 'and one ATLAS technique where one exists' },
          { id: 'f3', label: 'the ownership', code: 'and it has a named owner' },
          { id: 'f4', label: 'the freshness', code: 'and a review date within the last two quarters' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Risk, behaviour, ownership, freshness. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'ai-frameworks-compete',
      setup:
        'A planning meeting. The team has to choose a framework for the AI security programme, and someone proposes picking one to avoid duplicated effort.',
      code:
        'Proposal: standardise on MITRE ATLAS.\nIt is the most detailed of the three, it has identifiers,\nand it covers attacker behaviour end to end.\nWe will map everything to ATLAS and drop the OWASP list.',
      language: 'text',
      question: 'What does this lose?',
      options: [
        {
          text: 'The ranked view of what usually goes wrong while building, and the governance layer that says who owns each risk. ATLAS describes attacker behaviour and does neither.',
          correct: true,
        },
        { text: 'Nothing important. ATLAS is a superset of the OWASP list with more detail.', correct: false },
        { text: 'Only the OWASP numbering, which is a naming convenience.', correct: false },
        { text: 'Compliance evidence, since auditors accept only OWASP.', correct: false },
      ],
      silently:
        'The programme keeps working and the loss is invisible for two quarters. Detection engineering gets better, because ATLAS is genuinely good at that, and prioritisation quietly stops happening: without a ranked risk list, the rules written are the ones matching techniques somebody found interesting. The gap shows up as an incident in a category nobody had a rule for, and the review afterwards cannot say whether that category was considered and dismissed or never considered at all.',
      explanation:
        'The three frameworks answer three different questions, which is why fact 22 defines them by role rather than by content. OWASP is a ranked risk list for building and prioritising. ATLAS is a taxonomy of attacker tactics and techniques for threat modelling and detection. NIST AI RMF is organisational governance. File A puts it plainly: they complement each other, they do not compete. In practice a single rule cites the OWASP category so a developer can place it, the ATLAS technique so a detection engineer can find it, and feeds the governance framework by simply existing with an owner and a date.',
    },

    handoff: {
      canNow: [
        'Say what each of the three frameworks is for, in one sentence each',
        'Name the OWASP LLM Top 10 and the four changes in the 2026 edition',
        'Cite a rule properly, with the category, the edition and the technique',
      ],
      note: 'Q2.21 asks for the division of labour and Q2.22 for five risks with a control each. Facts 9 to 11 and 22 are the recall block, and four of them are on the priority list.',
    },
  },
}

import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L32',
  number: 32,
  topicId: 'ai-security',
  sectionId: 2,
  title: 'Supply chain, serialization, and why pickle executes code',
  objective:
    'You will be able to explain why loading a model file can run code, name the format that cannot, and write a rule for a pipeline that pulls an unverified artefact.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F19', 'Q2.16', 'Q2.17', 'A#OWASP Top 10 for LLM Applications, 2026 edition'],

  steps: {
    vocabulary: [
      {
        term: 'serialization',
        definition: 'Turning an object in memory into bytes that can be stored or sent. Deserialization is turning those bytes back into an object.',
      },
      {
        term: 'pickle',
        definition: 'The Python serialization format. It stores instructions for rebuilding an object, which means loading one runs code by design.',
      },
      {
        term: '__reduce__',
        definition: 'The method a Python object can define to say how it should be rebuilt. An attacker uses it to have any command run at load time.',
      },
      {
        term: 'safetensors',
        definition: 'A format that stores only tensors and their shapes. There is nothing in it that can execute, which is the reason to prefer it.',
      },
      {
        term: 'pinning',
        definition: 'Naming an exact version or content digest of an artefact, so that what you get today is what you tested yesterday.',
      },
    ],

    model: {
      narrative: [
        'A model file feels like data: a large blob of numbers. For one common format that is not what it is.',
        '',
        'Pickle does not store an object, it stores instructions for rebuilding one, and rebuilding is done by running those instructions. An object can define `__reduce__` to say how it should be rebuilt, and an attacker writes one that says: rebuild me by running this command. Loading the file executes it. There is no flag to turn that off, because it is the feature.',
        '',
        'So the sentence to keep from fact 19 is short: deserialization can execute arbitrary code via `__reduce__`, and the answer is safetensors, which cannot execute code because there is nothing in the format that could.',
        '',
        'This is the AI shaped version of a very old problem, and the 2026 OWASP list groups it that way: Improper Supply Chain, covering compromised base models, unsafe serialization and rogue registries. The 2025 edition of the web list made the same move, adding Software Supply Chain Failures as its own category at A03.',
        '',
        'For a posture researcher the practical question is never is this file safe. It is: what do we pull, from where, is it pinned, is it verified, and what does the process that loads it have access to.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'Loading a pickled artefact. The dangerous hop is the one that looks like reading a file, and it happens before any of your own code runs.',
        nodes: [
          { label: 'the pipeline fetches a model', note: 'From a registry, by a name or a moving tag rather than a digest.' },
          { label: 'the file is a pickle', note: 'It contains instructions for rebuilding an object, not just numbers.' },
          {
            label: 'load runs those instructions',
            note: 'Including anything a __reduce__ method asks for. Your code has not started yet.',
            danger: true,
          },
          { label: 'the command runs as the pipeline', note: 'With its credentials, its network access, and its secrets.' },
          { label: 'the model then loads normally', note: 'And everything works, which is why nobody looks again.' },
        ],
      },
      takeaway: 'Loading a pickle is running a program. Prefer safetensors, and treat every artefact as code you are about to execute.',
    },

    worked: {
      task:
        'Question 2.17 asks for three checks before a third party model reaches production. Turn them into a rule for a pipeline that loads an unverified artefact.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The pipeline definition and lock files in the repository, the registry configuration it pulls from, and the job logs recording the digest actually downloaded.',
          why: 'Definition and log together, because a moving tag means the two can differ. The log is the only place that says what really arrived.',
          prompt: {
            question: 'Why is the digest in the log more useful than the version in the definition?',
            answer:
              'Because a tag can be republished. Two runs of the same pipeline definition, a week apart, can pull different bytes under the same name, and only the recorded digest can show that. It is also what makes an incident investigable afterwards.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A pipeline that loads a model artefact in a pickle based format, or pulls by a moving tag with no digest pinned, or has no signature or checksum verification step before loading.',
          why: 'Three conditions joined by or, so each fires on its own. They are three separate weaknesses and a team can fix them one at a time.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the loading process can reach: its credentials, its network egress, and whether it runs in the same account as production. Also whether the artefact reaches production at all.',
          why: 'Execution at load time is only as bad as the environment it happens in. A pipeline with production credentials and open egress turns a supply chain issue into a breach.',
          prompt: {
            question: 'Two pipelines load the same unpinned pickle. One runs in an isolated account with no credentials, the other in production. Same finding?',
            answer:
              'Same condition, different severity, and that is exactly what the context rows are for. The first one executes attacker code in a box that holds nothing; the second one executes it with the keys. The rule should produce both, ranked apart.',
          },
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when an unpinned or unverified pickle artefact is loaded by a process holding production credentials or open egress. High when it is loaded in an isolated environment. Medium when the artefact is pinned and verified but still in a pickle format.',
          why: 'Ordered by what the code executed at load time can reach. The last case is a real finding with a small blast radius, which is what medium is for.',
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Artefacts built in house from a reviewed pipeline, and legacy formats where conversion is scheduled, allowed by tag with an owner and a conversion date. No exception without a date.',
          why: 'Legacy formats are real and conversion takes work. The exception exists to schedule that work rather than to end the conversation, which is what the date is for.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Convert to safetensors, pin by digest rather than by tag, verify a signature or checksum before loading, load in an isolated environment with no credentials, and scan the artefact before it is promoted.',
          why: 'Those are the three checks question 2.17 asks for, plus the two that limit the damage if all three miss something.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The pipeline line that loads the artefact, the format of the file, the digest from the last two runs showing whether they differ, and the credentials available to the loading process.',
          why: 'Two digests that differ under one tag is the single most persuasive artefact here, because it shows the artefact already changed without anyone approving it.',
        },
      ],
      result:
        'A rule that treats a model artefact as executable code, ranked by what the loading process can reach, with a remediation the team can do in stages.',
    },

    fadeLight: {
      task: 'A rule for a service that loads a user uploaded model file.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The upload endpoint, the loading code, and the runtime configuration of the process that loads it.',
          why: 'User upload plus load is the whole finding, and both ends are in the application.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A service that deserialises a file supplied by a user, in any format capable of executing code, without isolating the process that does it.',
          why: 'Stated in terms of the capability of the format rather than naming pickle alone, because the same hazard exists in several formats.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Who can upload, what credentials the loading process holds, and whether it has network egress.',
          why: 'Upload access decides who the attacker can be, and the process environment decides what they get.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical. This is remote code execution with an upload button, and the format is doing exactly what it was designed to do.',
          why: 'No exploit is needed, no vulnerability, no CVE. The feature is the finding.',
          choices: [
            'Critical. This is remote code execution with an upload button, and the format is doing exactly what it was designed to do.',
            'High, because the uploaded file still has to be a valid model to be loaded.',
            'Medium, because only authenticated users can upload.',
            'Low, unless a malicious upload has already been observed.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'A valid model is not required. The load runs the rebuild instructions first, and it never has to reach a state where anything resembles a model.',
    },

    fadeHeavy: {
      task: 'A rule for a registry configuration that allows pulling from any public source.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which artefacts have actually been pulled from outside the approved list, what the pulling process can reach, and whether pulls are logged with their source.',
          why: 'A permissive configuration with no external pulls is a smaller finding than the same configuration with twenty of them.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High when production pipelines can pull from any source. Medium when only development can, and pulls are logged.',
          why: 'Reachability again: what matters is whether an artefact from an unapproved source can end up running in production.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Restrict pulls to an internal mirror, require every external artefact to be reviewed and mirrored before use, and pin by digest in the pipeline definition.',
          why: 'A mirror turns an open pull into a reviewed import, and the digest makes the import repeatable.',
          choices: [
            'Restrict pulls to an internal mirror, require every external artefact to be reviewed and mirrored before use, and pin by digest in the pipeline definition.',
            'Block the registries known to host malicious artefacts.',
            'Scan every downloaded artefact with an antivirus product.',
            'Require a code review on any pull request that changes a model version.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The registry configuration allowing any source, the list of artefacts pulled from outside the approved list, and the digest of each.',
          why: 'The list of what has already been pulled turns a configuration finding into a concrete inventory the team can act on.',
          choices: [
            'The registry configuration allowing any source, the list of artefacts pulled from outside the approved list, and the digest of each.',
            'The number of models currently deployed in production.',
            'The registry vendor security documentation.',
            'A statement that the team only uses well known models.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Blocking known bad registries is the blocklist instinct again, one lesson later and one layer down. It is the same shape as blocking the semicolon, and it fails the same way.',
    },

    parsons: {
      task:
        'Four of these belong in the rule for an unverified model artefact reaching production. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the asset', code: 'a pipeline loads a model artefact and promotes it to production' },
        { id: 'p2', label: 'the format', code: 'and the artefact is in a format that executes code when loaded' },
        { id: 'p3', label: 'the missing pin', code: 'and it is pulled by a moving tag with no digest pinned' },
        { id: 'p4', label: 'the missing verification', code: 'and no signature or checksum is checked before it is loaded' },
        { id: 'd1', label: 'the format', code: 'and the artefact is larger than ten gigabytes', distractor: true },
        { id: 'd2', label: 'the missing pin', code: 'and the model was published less than a month ago', distractor: true },
        { id: 'd3', label: 'the missing verification', code: 'and the model licence has not been reviewed', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The licence distractor is worth a moment: it is a genuine obligation and a genuine finding, and it belongs to a different rule with a different owner. Mixing compliance and security into one rule produces a finding neither team acts on.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A notebook environment used by the data science team installs packages from a public index at runtime and loads models by name from a public hub, in an account that also holds the production data lake credentials. Write the rule.',
      rows: [
        {
          part: 'source',
          answer:
            'The notebook environment image and startup configuration, the package index settings, and the IAM role attached to the environment.',
          options: [
            'The notebook environment image and startup configuration, the package index settings, and the IAM role attached to the environment.',
            'The notebooks themselves, reviewed for suspicious code.',
            'The data science team training documentation.',
          ],
          why: 'The environment configuration and the attached role are what decide the blast radius, and both are readable from the provider API.',
        },
        {
          part: 'condition',
          answer:
            'An interactive environment that installs unpinned packages and loads model artefacts from a public source at runtime, running with a role that can read production data.',
          options: [
            'An interactive environment that installs unpinned packages and loads model artefacts from a public source at runtime, running with a role that can read production data.',
            'An environment where notebooks are stored outside version control.',
            'An environment where more than five people share one login.',
          ],
          why: 'Two supply chain paths, one identity. The other options are real hygiene problems that do not create code execution with production credentials.',
        },
        {
          part: 'context',
          answer:
            'What the attached role can reach, whether the environment has network egress, and whether any artefact loaded there is later promoted to production.',
          options: [
            'What the attached role can reach, whether the environment has network egress, and whether any artefact loaded there is later promoted to production.',
            'How many notebooks exist and how often they are run.',
            'Which Python version the environment uses.',
          ],
          why: 'Reach, exfiltration path and promotion path. Those three decide whether this is a research incident or a production one.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Code from a public index runs with a role that can read the production data lake, and there is egress to send what it reads.',
          options: [
            'Critical. Code from a public index runs with a role that can read the production data lake, and there is egress to send what it reads.',
            'High, because the environment is for research rather than production.',
            'Medium, because data scientists are trusted employees.',
          ],
          why: 'The environment purpose does not limit what the credentials reach, and the trust question is about the packages rather than about the people.',
        },
        {
          part: 'falsePositives',
          answer:
            'Environments restricted to an internal mirror with pinned packages, or environments with no credentials and no egress, verified from the role and the network policy.',
          options: [
            'Environments restricted to an internal mirror with pinned packages, or environments with no credentials and no egress, verified from the role and the network policy.',
            'Environments belonging to the machine learning platform team.',
            'Environments where the team has agreed to review what they install.',
          ],
          why: 'Both exceptions are checkable configuration. An agreement to be careful is not a control and cannot be verified from an API.',
        },
        {
          part: 'remediation',
          answer:
            'Point the environment at an internal mirror with pinned versions, remove the production role and grant access to a copied dataset, restrict egress to an allowlist, and require artefacts to be mirrored and verified before use.',
          options: [
            'Point the environment at an internal mirror with pinned versions, remove the production role and grant access to a copied dataset, restrict egress to an allowlist, and require artefacts to be mirrored and verified before use.',
            'Require the team to run a vulnerability scanner over their notebooks weekly.',
            'Move the environment to a different region so it is separated from production.',
          ],
          why: 'Narrow the supply, narrow the identity, narrow the egress. A different region is not an isolation boundary when the role still reaches across it.',
        },
        {
          part: 'evidence',
          answer:
            'The package index configuration, the attached role and its effective permissions, the egress rules, and one artefact loaded from a public hub with no pinned digest.',
          options: [
            'The package index configuration, the attached role and its effective permissions, the egress rules, and one artefact loaded from a public hub with no pinned digest.',
            'A list of every package installed across all notebooks.',
            'The data lake access logs for the last quarter.',
          ],
          why: 'Four artefacts that together show code from outside running with credentials to inside. The package list is noise; nobody reads three hundred names.',
        },
      ],
      closing:
        'The notebook is the most common version of this finding in a real company, and it is usually invisible because nobody thinks of a research environment as a production system. The attached role does not care what the environment is called.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the notebook environment.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the asset', code: 'an interactive environment used by the data science team' },
          { id: 'f2', label: 'the supply', code: 'and it installs unpinned packages and loads models from public sources' },
          { id: 'f3', label: 'the identity', code: 'and it runs with a role that can read the production data lake' },
          { id: 'f4', label: 'the exit', code: 'and it has unrestricted network egress' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Asset, supply, identity, exit. Read it back and it is an attack path. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'ai-model-file-is-data',
      setup:
        'A review of a new inference service. Someone asks whether the downloaded model should be scanned, and the answer is that it is only weights.',
      code:
        'import torch\n\n# downloaded from a public hub, by name, no digest\nmodel = torch.load("model.bin")\nmodel.eval()',
      language: 'python',
      question: 'What happens on the torch.load line if the file was built by an attacker?',
      options: [
        { text: 'It fails to load, because the weights would not match the expected architecture.', correct: false },
        {
          text: 'Anything the attacker chose runs, with the permissions of this process, before the model is used at all.',
          correct: true,
        },
        { text: 'The weights load, and the risk is that the model gives wrong answers.', correct: false },
        { text: 'Nothing, as long as the process runs as a non root user.', correct: false },
      ],
      silently:
        'The load succeeds, the service starts, and inference works exactly as expected, because a hostile artefact has every reason to also be a working model. The command ran during a line that reads like reading a file, in a process that usually holds registry credentials and network access, and the only trace is in whatever the command chose to do. Running as a non root user changes what it can reach and not whether it runs.',
      explanation:
        'Pickle based formats store instructions for rebuilding an object, and rebuilding means executing. An object can define __reduce__ to specify how it should be reconstructed, and an attacker defines one that reconstructs by running a command. That is why fact 19 pairs the risk with its answer: use safetensors, which stores tensors and shapes and has nothing in it that can execute. Everything else follows from treating an artefact as code: pin it by digest, verify a signature, mirror it internally, and load it somewhere that holds nothing worth stealing.',
    },

    handoff: {
      canNow: [
        'Explain why deserialising a model file can execute code, and name the format that cannot',
        'Give three checks before a third party model reaches production',
        'Write a rule ranked by what the loading process can reach',
      ],
      note: 'Q2.16 is the one line answer and Q2.17 asks for the three checks. Fact 19 is the sentence, and safetensors is the word to remember with it.',
    },
  },
}

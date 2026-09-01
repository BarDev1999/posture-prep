import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L35',
  number: 35,
  topicId: 'cloud',
  sectionId: 3,
  title: 'What a cloud account is: control plane versus data plane',
  objective:
    'You will be able to separate the control plane from the data plane, place a misconfiguration, a vulnerability and an exposure on the right one, and write the rule for a public bucket holding sensitive data.',
  minutes: 13,
  difficulty: 'easy',
  sources: ['F35', 'Q3.14', 'A#Three words never to confuse', 'A#Full example 1: public bucket holding sensitive data'],

  steps: {
    vocabulary: [
      {
        term: 'control plane',
        definition: 'The management layer: the API that creates, configures and deletes resources. Every action there is logged as an API call.',
      },
      {
        term: 'data plane',
        definition: 'The layer where the resource does its work: objects read from storage, packets to a database, requests to an application.',
      },
      {
        term: 'misconfiguration',
        definition: 'A wrong setting on a resource, not a bug in code. A bucket with public read, a database without encryption at rest.',
      },
      {
        term: 'vulnerability',
        definition: 'A flaw in code or in a package, usually with a CVE. An outdated library, a known bug inside an image.',
      },
      {
        term: 'exposure',
        definition: 'Whether the flaw is actually reachable and therefore exploitable. It is what turns a score into real risk.',
      },
    ],

    model: {
      narrative: [
        'A cloud account has two layers and almost every posture question is really about which one you are looking at.',
        '',
        'The control plane is the API. Create a bucket, attach a policy, change a security group, assume a role: all of it is API calls, all of it is logged, and all of it is configuration. This is where CSPM lives, and it is where most posture findings come from, because a setting is a fact you can read.',
        '',
        'The data plane is where the work happens: objects being read, queries being answered, packets arriving. A different log, often a different owner, and frequently not collected at all.',
        '',
        'The reason to keep them apart is that a control plane fact and a data plane fact answer different questions. A bucket policy allowing public read is a control plane fact and it says the door is open. A GetObject from an unknown address is a data plane fact and it says someone walked through it.',
        '',
        'The three words in file A sit on this split, and confusing them is the most common vocabulary error in the whole exam. A misconfiguration is a control plane setting. A vulnerability is a flaw in code. An exposure is whether either one is reachable, and file A is explicit that exposure is what turns a vulnerability from a CVSS number into real risk. It is the idea behind SmartScore.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'One bucket, two layers. The left column is what CSPM reads and the right column is what tells you whether anyone used it.',
        left: {
          title: 'control plane',
          points: [
            'Bucket policy, ACL, Public Access Block.',
            'Read from the provider API, agentless.',
            'Says: the door is open.',
            'Logged as management API calls.',
          ],
        },
        right: {
          title: 'data plane',
          points: [
            'GetObject, PutObject, from which address.',
            'Read from access logs, if they are on.',
            'Says: somebody walked through it.',
            'Often not collected until after an incident.',
          ],
        },
      },
      takeaway: 'Configuration is the control plane, usage is the data plane. A finding needs the first and gets its severity from the second.',
    },

    worked: {
      task:
        'Write the rule for the first full example in file A: a public bucket holding sensitive data. It is the canonical CSPM finding and every row of it is worth copying.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'S3 bucket configuration, the bucket policy, the ACL, the Public Access Block settings, and the DSPM classification results for what is inside.',
          why: 'Four control plane sources for whether it is open, and one data classification source for whether that matters. Neither half is a finding alone.',
          prompt: {
            question: 'Why does the classification belong in the data source rather than in the context row?',
            answer:
              'Because in this rule it is part of what is being detected: public plus sensitive is the finding, public alone is a different and lower one. When something changes the finding rather than its rank, it belongs in the condition and therefore in the source.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'BlockPublicAcls or BlockPublicPolicy disabled, or a bucket policy with Principal set to a wildcard and no restricting Condition.',
          why: 'Named fields rather than the phrase publicly accessible. Two buckets can both be public through different settings, and a rule that names only one of them misses half.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Did DSPM classify the contents as personal data or secrets, and is there CloudTrail GetObject activity from an external address.',
          why: 'The first is impact and the second is the data plane check: it is the difference between a door left open and a door people are walking through.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical if public and holding sensitive data. Medium if public without sensitive data.',
          why: 'Straight from file A, and it is the shape to copy: the same misconfiguration, two severities, decided by what is behind it.',
          prompt: {
            question: 'A public bucket with no sensitive data is still medium. Why not close it as noise?',
            answer:
              'Because classification is a snapshot and buckets accumulate. A bucket that is public today with public content is one upload away from being critical, and the fix is the same either way. Medium says fix it soon rather than tonight, which is a truthful thing to say.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Buckets intended to be public: a static website, a public artifact mirror. Filter by an approved tag rather than by name or by account.',
          why: 'The exception has to be something a machine can check on every scan. A naming convention drifts, and an account wide exclusion hides the bucket somebody creates next week.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Enable Public Access Block at account level, remove the offending statement, and move to presigned URLs or a CDN with origin access control where public delivery is genuinely needed.',
          why: 'Account level first, because it holds even when the next bucket is created wrongly. The last clause matters: a rule that says do not do this without saying do this instead gets argued with.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The exact policy statement, the data class DSPM found, and the external access records if there are any.',
          why: 'Three artefacts, and the third one changes the conversation from a policy debate into an incident. When it exists, it goes first.',
        },
      ],
      result:
        'The canonical CSPM rule, with a severity that moves with classification and an exception path that survives contact with a real environment.',
    },

    fadeLight: {
      task: 'A rule for a managed database with encryption at rest disabled.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The database instance configuration from the provider API, plus the DSPM classification of what it holds.',
          why: 'A control plane setting and a classification, the same pair as the bucket rule.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A database instance with storage encryption disabled, or with a customer managed key that has been scheduled for deletion.',
          why: 'The second half catches the case people forget: encryption enabled with a key that is going away is encryption ending on a date.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the database holds, whether it is publicly reachable, and whether snapshots of it are shared with other accounts.',
          why: 'A shared snapshot is the copy nobody thinks about, and it carries the same data with none of the network controls.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High when the instance holds classified data. Medium otherwise, since encryption at rest is a compliance baseline rather than an exposure on its own.',
          why: 'Honest ranking. Encryption at rest defends against a stolen disk, and if that is the only issue it is not the same as an open port.',
          choices: [
            'High when the instance holds classified data. Medium otherwise, since encryption at rest is a compliance baseline rather than an exposure on its own.',
            'Critical always, because unencrypted data is the most serious finding there is.',
            'Low, because the provider physically secures its data centres.',
            'Derived from the CVSS score of the database engine version.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Encryption at rest is a control plane setting that changes almost nothing about reachability. Saying that out loud is what makes people believe your critical findings.',
    },

    fadeHeavy: {
      task: 'A rule for a storage bucket whose access logging is disabled.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the bucket is public or shared cross account, what it holds, and whether any other log covers the same access path.',
          why: 'Logging off on a private internal bucket is a hygiene finding; logging off on a public bucket holding classified data removes the only data plane evidence you would ever have.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High when the bucket is public or cross account shared, medium otherwise, because without logs an incident here can never be scoped.',
          why: 'The severity is about the investigation you will not be able to do, which is a real cost even though nothing is exposed by it.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Enable access logging to a separate account, set a retention period, and alert on logging being disabled again.',
          why: 'A separate account is what stops an attacker with access to the bucket deleting the record of what they did.',
          choices: [
            'Enable access logging to a separate account, set a retention period, and alert on logging being disabled again.',
            'Enable access logging into the same bucket, so the records stay with the data.',
            'Rely on the provider audit trail, which already records every API call.',
            'Enable logging only for buckets that hold classified data.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The logging configuration showing it disabled, the date it was turned off from the management trail, and the classification of the bucket contents.',
          why: 'The date and the identity that disabled it are usually the most interesting part, and they are in the control plane trail even when the data plane log is gone.',
          choices: [
            'The logging configuration showing it disabled, the date it was turned off from the management trail, and the classification of the bucket contents.',
            'A list of every object in the bucket.',
            'The storage cost of the bucket for the last quarter.',
            'A statement from the owning team that the bucket is not sensitive.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'The second remediation option is the one people pick: logs into the same bucket. It is also the one that lets whoever reaches the bucket edit the record of their own visit.',
    },

    parsons: {
      task:
        'Four of these belong in the public bucket rule from file A. Place those four in a reading order and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the asset', code: 'the resource is a storage bucket' },
        { id: 'p2', label: 'the control plane fact', code: 'and its policy allows a wildcard principal with no restricting condition' },
        { id: 'p3', label: 'the impact', code: 'and classification says it holds personal data or secrets' },
        { id: 'p4', label: 'the exception path', code: 'and it does not carry the approved public content tag' },
        { id: 'd1', label: 'the control plane fact', code: 'and the bucket has a public DNS name', distractor: true },
        { id: 'd2', label: 'the impact', code: 'and the bucket is larger than one terabyte', distractor: true },
        { id: 'd3', label: 'the exception path', code: 'and the owning team has not replied to the last ticket', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'Every bucket has a name that resolves, so the DNS distractor would match everything. Size is not exposure. And an unanswered ticket is a fact about your process, not about the resource, which is exactly the sort of condition that quietly turns a security rule into a nagging tool.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A snapshot of a production database has been shared with another account outside your organisation. Write the rule.',
      rows: [
        {
          part: 'source',
          answer:
            'Snapshot configuration and its sharing attributes from the provider API, the organisation account list, and the classification of the source database.',
          options: [
            'Snapshot configuration and its sharing attributes from the provider API, the organisation account list, and the classification of the source database.',
            'The database access logs for the period the snapshot covers.',
            'The billing records showing which account pays for the snapshot storage.',
          ],
          why: 'The sharing attribute is the control plane fact, the account list says whether the target is inside the organisation, and the classification decides impact.',
        },
        {
          part: 'condition',
          answer:
            'A snapshot whose sharing list includes an account outside the organisation, or which is marked public.',
          options: [
            'A snapshot whose sharing list includes an account outside the organisation, or which is marked public.',
            'A snapshot of a database that holds classified data.',
            'A snapshot older than ninety days.',
          ],
          why: 'Shared outside is the finding. Holding classified data is context that raises it, and age is a cost question.',
        },
        {
          part: 'context',
          answer:
            'What the source database holds, whether the target account is a known vendor, and whether the snapshot is encrypted with a key that account can use.',
          options: [
            'What the source database holds, whether the target account is a known vendor, and whether the snapshot is encrypted with a key that account can use.',
            'How long the snapshot took to create and how large it is.',
            'Which region the snapshot is stored in.',
          ],
          why: 'The key question is the one people miss: a shared encrypted snapshot is only readable if the key was shared too, and that changes the finding completely.',
        },
        {
          part: 'severity',
          answer:
            'Critical when the source holds classified data and the key is usable by the target account. High when it is shared but the key is not.',
          options: [
            'Critical when the source holds classified data and the key is usable by the target account. High when it is shared but the key is not.',
            'Critical in every case, because data left the organisation boundary.',
            'Medium, because a snapshot is a copy rather than the live database.',
          ],
          why: 'A copy of production is production data. And a shared snapshot with no usable key is a real finding with a broken exploitation path, which is exactly what the second severity is for.',
        },
        {
          part: 'falsePositives',
          answer:
            'Snapshots shared with a contracted vendor account under an approved tag, with an expiry date recorded on the tag.',
          options: [
            'Snapshots shared with a contracted vendor account under an approved tag, with an expiry date recorded on the tag.',
            'Snapshots shared with accounts belonging to teams inside the company that are not yet in the organisation.',
            'Snapshots created by the database team as part of a documented migration.',
          ],
          why: 'The second option is the dangerous exception: an account not in the organisation is outside the boundary whatever the team chart says, and that is the case worth flagging rather than excusing.',
        },
        {
          part: 'remediation',
          answer:
            'Remove the external account from the sharing list, revoke the key grant, and if the data was needed, replace the share with an export of only the required fields.',
          options: [
            'Remove the external account from the sharing list, revoke the key grant, and if the data was needed, replace the share with an export of only the required fields.',
            'Rotate the database credentials and force all clients to reconnect.',
            'Delete the snapshot and take a new one that is not shared.',
          ],
          why: 'Close the share and the key, then offer the narrow alternative. Deleting the snapshot does nothing about the copy the other account may already hold.',
        },
        {
          part: 'evidence',
          answer:
            'The snapshot sharing attribute naming the external account, the key grant, the classification of the source database, and the management trail entry showing when the share was created and by whom.',
          options: [
            'The snapshot sharing attribute naming the external account, the key grant, the classification of the source database, and the management trail entry showing when the share was created and by whom.',
            'A screenshot of the snapshot list in the console.',
            'The size and creation date of the snapshot.',
          ],
          why: 'The trail entry answers the question everyone asks first, which is how long this has been true and who did it, and it is available even when the data plane logs are not.',
        },
      ],
      closing:
        'Everything you used was a control plane fact except the classification. That is the ordinary shape of a CSPM finding, and it is why agentless scanning covers so much ground: the provider API will tell you the door is open without anything being installed anywhere.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the shared snapshot.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the asset', code: 'the resource is a snapshot of a production database' },
          { id: 'f2', label: 'the control plane fact', code: 'and its sharing list includes an account outside the organisation' },
          { id: 'f3', label: 'the impact', code: 'and the source database holds classified data' },
          { id: 'f4', label: 'the exception path', code: 'and it carries no approved vendor share tag' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Asset, setting, impact, exception. The same four every CSPM rule starts from.',
      },
    },

    trap: {
      misconceptionId: 'cloud-encryption-covers-exposure',
      setup:
        'A finding is raised for a bucket with a public read policy. The owning team replies that the objects are encrypted at rest with a customer managed key, so the exposure is handled.',
      code:
        'Bucket policy: Principal "*", Action s3:GetObject, no Condition\nDefault encryption: aws:kms, customer managed key\nTeam response: contents are encrypted, closing as risk accepted.',
      language: 'text',
      question: 'Why does the encryption not help here?',
      options: [
        {
          text: 'Encryption at rest is applied by the service on the way to disk and removed on the way out, so a caller allowed by the policy receives plaintext.',
          correct: true,
        },
        { text: 'It does help, but only if the key policy also allows the anonymous principal.', correct: false },
        { text: 'It does not help because the key is customer managed rather than provider managed.', correct: false },
        { text: 'It helps for objects written after encryption was enabled, and not for older ones.', correct: false },
      ],
      silently:
        'The ticket closes, the compliance dashboard shows the bucket as encrypted, and both statements are true at the same time: it is encrypted, and anybody can read it. Nothing in the posture tooling contradicts either one, which is what makes the argument so effective in a review. The exposure remains exactly as it was, now with a documented reason for nobody to look at it again.',
      explanation:
        'Encryption at rest protects against someone obtaining the storage underneath: a stolen disk, a mislaid backup, a provider level failure. It is applied by the service on write and undone on read for any caller the access policy permits. A public policy makes the anonymous caller such a caller, so the service decrypts for them. The three words in file A are the way to keep this straight: the misconfiguration is the policy, the exposure is whether it is reachable, and encryption at rest changes neither. It is a real control against a real threat, and it is not this threat.',
    },

    handoff: {
      canNow: [
        'Separate the control plane from the data plane and say which log holds which fact',
        'Place a misconfiguration, a vulnerability and an exposure correctly, and say why exposure drives prioritisation',
        'Write the canonical public bucket rule from file A',
      ],
      note: 'Q3.14 is the vocabulary question and fact 35 is on the priority list. The public bucket rule is worth being able to reproduce from memory in an interview.',
    },
  },
}

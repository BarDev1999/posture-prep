import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L40',
  number: 40,
  topicId: 'cloud',
  sectionId: 3,
  title: 'Roles, assume role, and temporary credentials',
  objective:
    'You will be able to explain what assuming a role actually returns, describe the confused deputy problem and its fix, and write the rule for a cross account trust policy with no external id.',
  minutes: 14,
  difficulty: 'medium',
  sources: ['F33', 'Q3.10', 'Q3.13', 'F30'],

  steps: {
    vocabulary: [
      {
        term: 'role',
        definition: 'A set of permissions with no credentials of its own. Something else assumes it and receives temporary credentials for it.',
      },
      {
        term: 'trust policy',
        definition: 'The policy on a role saying who may assume it. It is the door, and the permission policy is only what is behind the door.',
      },
      {
        term: 'temporary credentials',
        definition: 'A key, a secret and a session token, valid for a limited time. They are what an assume role call actually returns.',
      },
      {
        term: 'confused deputy',
        definition: 'An intermediary acting on an attacker behalf because it cannot tell whose request it is carrying out.',
      },
      {
        term: 'external id',
        definition: 'A shared value the caller must present when assuming a role, so the role can only be assumed on behalf of the right customer.',
      },
    ],

    model: {
      narrative: [
        'A role is permissions without an owner. Nothing holds its credentials, because it has none: something assumes it, and the assume call returns a key, a secret and a session token that expire.',
        '',
        'That expiry is the whole reason roles are preferred to static keys, and question 3.13 is about the version of this for continuous integration: workload identity federation. The build system proves who it is with a short lived token from its own provider, exchanges it for temporary credentials, and no long lived secret is ever stored in a repository or a settings page.',
        '',
        'The trust policy is the interesting document. People read the permission policy and stop, but the permission policy only matters to someone who is already inside. The trust policy decides who gets in, and a role with modest permissions and an open door is usually a worse finding than a wide role that nothing can assume.',
        '',
        'Then there is the confused deputy, which is the classic cross account failure and question 3.10. You give a vendor a role in your account so their service can do a job for you. Their service holds one identity and serves thousands of customers. If your trust policy says only that their account may assume your role, then any of their customers can ask their service to act on your account, and the service cannot tell the difference. It is not compromised. It is confused.',
        '',
        'The fix is a condition on an external id: a value only you and the vendor know, which the vendor must present for your role specifically. Fact 33 adds the service to service pair as well: source account and source resource conditions.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'The confused deputy. Every hop is legitimate, and the vendor service cannot tell which customer asked, because nothing in the request says.',
        nodes: [
          { label: 'an attacker signs up with the vendor', note: 'A normal customer account, paid for and entirely legitimate.' },
          { label: 'they enter your account identifier as theirs', note: 'The vendor asks which account to manage. Nothing verifies the answer.' },
          {
            label: 'the vendor service assumes your role',
            note: 'Your trust policy allows the vendor account, and this request comes from it.',
            danger: true,
          },
          { label: 'it acts on your resources', note: 'With your role permissions, on behalf of somebody else.' },
          { label: 'your trail shows the vendor', note: 'Which is exactly what it shows when the vendor works for you.' },
        ],
      },
      takeaway: 'The trust policy is the door. Without a condition tying the assumption to you, anyone the vendor serves is on your side of it.',
    },

    worked: {
      task:
        'Write the rule for a cross account role whose trust policy names a third party account with no external id or equivalent condition.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Role trust policies, the organisation account list to tell inside from outside, and the permission policies attached to those roles.',
          why: 'The trust policy is the finding, the account list decides whether the principal is external, and the permissions decide how much the confusion is worth.',
          prompt: {
            question: 'Why not treat every cross account role as the finding?',
            answer:
              'Because cross account roles are how integrations work, and a rule that flags all of them is a rule that gets an exception per row. The finding is the missing condition, which is a small, specific, fixable difference.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A trust policy allowing sts:AssumeRole to a principal in an account outside the organisation, with no Condition on sts:ExternalId, and for service principals no Condition on the source account or source resource.',
          why: 'Named condition keys, so the rule is checkable. The service principal half matters because that is the same problem with a different actor.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the role permission policy grants, whether the external account is a known vendor, and whether the role has been assumed in the last ninety days.',
          why: 'An unused cross account role with an open door is a finding that can be closed by deletion, which is the easiest remediation there is.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the role can read classified data or modify identities. High otherwise, because the door is open regardless of what is behind it.',
          why: 'The trust gap is the same in both cases and the impact is not, so the severity follows the permission policy rather than the trust policy.',
          prompt: {
            question: 'The vendor is reputable and the integration is contractual. Does that reduce the severity?',
            answer:
              'No, and this is the argument you will hear. The risk is not vendor misbehaviour, it is any of the vendor thousands of customers naming your account. Reputability is about the vendor intentions, and the confused deputy needs none of the vendor intentions to be bad.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Trust policies restricted by an organisation identifier condition, and roles trusting a principal inside your own organisation. Both readable from the policy.',
          why: 'An organisation condition achieves the same thing as an external id for internal trusts, and it should not be reported as a gap.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Add a Condition on sts:ExternalId with a value the vendor supplies per customer, add source account and source resource conditions for service principals, and delete roles that have not been assumed in ninety days.',
          why: 'Fact 33 gives the first two, and the third is the cheapest fix in the whole section: an unused role with an open door is not a policy problem, it is litter.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The trust policy statement with no condition block, the permission policy behind it, the vendor account identifier, and the last time the role was assumed.',
          why: 'Showing the empty condition block beside a filled one from another role is the fastest way to make the fix obvious.',
        },
      ],
      result:
        'A rule that finds the missing condition rather than the integration, which is what makes it fixable in one pull request per role.',
    },

    fadeLight: {
      task: 'A rule for static access keys used where a role would do.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The identity list with their access keys and key ages, plus the identity of the systems using them.',
          why: 'A key with an age is the finding. Everything else is about what it is used for.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A long lived access key belonging to a user rather than a role, older than ninety days, or used from outside the corporate address ranges.',
          why: 'Two shapes: old, and used from somewhere unexpected. The second is a stronger signal and needs data plane records.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the key permissions allow, whether the consumer could use federation instead, and whether the key has ever appeared in a repository scan.',
          why: 'The middle one is the remediation feasibility, and it belongs in the finding: a key used by a build system can be replaced by federation today, and one used by an appliance may not be.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High for a key with broad permissions or one used from an unexpected network, medium otherwise, because a long lived secret is a standing risk rather than an exposure.',
          why: 'Honest again. Key age alone is a hygiene finding, and calling it critical everywhere is how a report becomes wallpaper.',
          choices: [
            'High for a key with broad permissions or one used from an unexpected network, medium otherwise, because a long lived secret is a standing risk rather than an exposure.',
            'Critical for every access key older than ninety days.',
            'Low, since access keys are the normal way to authenticate to a cloud API.',
            'Derived from the number of API calls the key has made.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Question 3.13 is the reason this rule matters: workload identity federation replaces the key entirely, so the remediation is not rotate it faster but stop having one.',
    },

    fadeHeavy: {
      task: 'A rule for a role that can be assumed by any principal in your own organisation.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the role grants, how many accounts are in the organisation, and whether any of those accounts allow untrusted code to run.',
          why: 'A trust that spans the organisation is only as strong as the weakest account in it, which is usually a sandbox with a permissive pipeline.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High when the role grants production access, because any principal in any account, including a compromised sandbox, can assume it.',
          why: 'The finding is the width of the door rather than a mistake in it. Organisation wide trust is a real pattern and it is almost always wider than intended.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Restrict the trust to named accounts or roles, and where a broad trust is needed add a condition on a tag both sides control.',
          why: 'Naming accounts is the ordinary fix. The tag condition is the escape hatch for platform roles that genuinely serve everyone.',
          choices: [
            'Restrict the trust to named accounts or roles, and where a broad trust is needed add a condition on a tag both sides control.',
            'Reduce the session duration so credentials expire faster.',
            'Add a permission boundary to the role.',
            'Require multi factor authentication on the assume call.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The trust policy with its organisation wide principal, the permission policy behind it, and the list of accounts that can therefore assume it.',
          why: 'The account list is the artefact that changes minds, because it usually includes several accounts nobody had thought about.',
          choices: [
            'The trust policy with its organisation wide principal, the permission policy behind it, and the list of accounts that can therefore assume it.',
            'The number of times the role has been assumed in the last month.',
            'The organisation chart showing which teams own which accounts.',
            'A statement from the platform team that only their pipelines use this role.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Two of those wrong remediations are real improvements that leave the door the same width. Shorter sessions and stronger authentication both help; neither narrows who may assume.',
    },

    parsons: {
      task:
        'Four of these belong in the cross account trust rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the door', code: 'a role trust policy allows sts:AssumeRole to an external principal' },
        { id: 'p2', label: 'the missing condition', code: 'and no Condition on sts:ExternalId or the source account is present' },
        { id: 'p3', label: 'the impact', code: 'and the role permission policy reaches classified data or identity actions' },
        { id: 'p4', label: 'the usage check', code: 'and the finding records when the role was last assumed' },
        { id: 'd1', label: 'the missing condition', code: 'and the role session duration is longer than one hour', distractor: true },
        { id: 'd2', label: 'the impact', code: 'and the vendor has not completed a security questionnaire', distractor: true },
        { id: 'd3', label: 'the usage check', code: 'and the role name does not follow the naming convention', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The questionnaire distractor is the one to think about. Vendor assurance is a real programme and it belongs to a different team with different evidence. A posture rule that depends on it produces findings your team cannot close.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A monitoring vendor has a role in twelve of your accounts. In eleven the trust policy has an external id condition; in one it does not, and that account holds the production data warehouse. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'Role trust policies across all accounts, the organisation account list, and the permission policies attached to each of those roles.',
          options: [
            'Role trust policies across all accounts, the organisation account list, and the permission policies attached to each of those roles.',
            'The vendor contract and its security appendix.',
            'The monitoring dashboards the vendor provides.',
          ],
          why: 'The rule has to read every account to notice that one differs, which is why the finding is a comparison rather than a single policy check.',
        },
        {
          part: 'condition',
          answer:
            'A trust policy allowing an external principal with no external id or source condition, where the same vendor principal is conditioned in other accounts.',
          options: [
            'A trust policy allowing an external principal with no external id or source condition, where the same vendor principal is conditioned in other accounts.',
            'A trust policy allowing a monitoring vendor to assume a role.',
            'A role that has been assumed by a vendor more than once a day.',
          ],
          why: 'The second clause is what makes this finding strong: the pattern proves the condition is possible and the team already knows how, so this is an omission rather than a design decision.',
        },
        {
          part: 'context',
          answer:
            'What the role can reach in that account, whether the account holds classified data, and when the role was created relative to the others.',
          options: [
            'What the role can reach in that account, whether the account holds classified data, and when the role was created relative to the others.',
            'How many alerts the vendor has raised from that account.',
            'Which region the account resources are in.',
          ],
          why: 'Creation time usually explains it: the odd account was onboarded by hand, before or after the pattern was standardised.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Any customer of that vendor can name this account, and the role reaches the production data warehouse.',
          options: [
            'Critical. Any customer of that vendor can name this account, and the role reaches the production data warehouse.',
            'High, because the vendor is contracted and unlikely to abuse the access.',
            'Medium, because the same vendor is correctly configured in the other eleven accounts.',
          ],
          why: 'Both wrong options measure the vendor rather than the door. The confused deputy needs nothing at all from the vendor except that it work as designed.',
        },
        {
          part: 'falsePositives',
          answer:
            'Trust policies conditioned on an organisation identifier or on a source resource, which achieve the same restriction by another key.',
          options: [
            'Trust policies conditioned on an organisation identifier or on a source resource, which achieve the same restriction by another key.',
            'Roles in accounts that are not yet in production.',
            'Roles created before the external id standard was adopted.',
          ],
          why: 'Only the first is a control. The other two are the two most common ways an exception list becomes permanent.',
        },
        {
          part: 'remediation',
          answer:
            'Add the external id condition matching the value the vendor uses for this account, and audit every other trust policy for the same omission.',
          options: [
            'Add the external id condition matching the value the vendor uses for this account, and audit every other trust policy for the same omission.',
            'Remove the vendor role from that account and rely on the other eleven.',
            'Reduce the role permissions so the missing condition matters less.',
          ],
          why: 'One condition, then the sweep. The second option loses monitoring on the most important account, and the third leaves the door open on a smaller room.',
        },
        {
          part: 'evidence',
          answer:
            'The trust policy with no condition block beside one from another account that has one, the permission policy, and the classification of the data in that account.',
          options: [
            'The trust policy with no condition block beside one from another account that has one, the permission policy, and the classification of the data in that account.',
            'The vendor documentation on how to configure the integration.',
            'The list of all twelve accounts with the vendor role.',
          ],
          why: 'Two policies side by side is the whole argument in one artefact: the same integration, configured two ways, in the same company.',
        },
      ],
      closing:
        'Notice what made this finding easy to write and easy to close: eleven accounts already showed the right answer. Comparing the same pattern across accounts is one of the highest yield things a posture researcher can do.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the missing external id.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the door', code: 'a trust policy allows an external vendor principal to assume the role' },
          { id: 'f2', label: 'the missing condition', code: 'and it carries no external id or source condition' },
          { id: 'f3', label: 'the comparison', code: 'while the same vendor principal is conditioned in other accounts' },
          { id: 'f4', label: 'the impact', code: 'and the role reaches classified production data' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Door, missing condition, comparison, impact. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'cloud-external-id-optional',
      setup:
        'A review of a vendor integration. The trust policy names the vendor account explicitly, and the reviewer concludes that an external id would add nothing.',
      code:
        '"Principal": { "AWS": "arn:aws:iam::999988887777:root" },\n"Action": "sts:AssumeRole"\n// no Condition block\n// review note: only the vendor account can assume this, so we are fine',
      language: 'json',
      question: 'What does naming the vendor account fail to establish?',
      options: [
        { text: 'Nothing. Naming the account is a complete restriction on who can assume the role.', correct: false },
        {
          text: 'Which of the vendor customers the request is for. Their service holds one identity for everyone, so any of their customers can name your account.',
          correct: true,
        },
        { text: 'Whether the vendor account still exists, since account identifiers can be recycled.', correct: false },
        { text: 'Whether the assume call used multi factor authentication.', correct: false },
      ],
      silently:
        'The integration works, the vendor dashboards fill with your data, and every assume call in your trail comes from the vendor account exactly as expected. If another customer of that vendor ever names your account, the calls look identical: same principal, same role, same pattern. There is no anomaly to detect because the deputy is behaving normally, which is the defining property of this problem.',
      explanation:
        'The trust policy answers who is calling and not on whose behalf. A vendor service serving thousands of customers has one identity, so restricting to that identity restricts nothing between customers. The external id is a value you and the vendor agree on for your account specifically, presented on the assume call, and it is what makes the request attributable. Fact 33 names the fix and adds the service to service version: conditions on the source account and the source resource, for the case where the intermediary is a cloud service rather than a vendor.',
    },

    handoff: {
      canNow: [
        'Say what an assume role call returns and why that is preferable to a static key',
        'Describe the confused deputy problem and name the condition that fixes it',
        'Write a rule for a cross account trust policy with a missing condition',
      ],
      note: 'Q3.10 is the confused deputy and Q3.13 is workload identity federation. Fact 33 is the one to have ready, including the service to service half.',
    },
  },
}

import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L38',
  number: 38,
  topicId: 'cloud',
  sectionId: 3,
  title: 'IAM: principals, policies, actions, resources, conditions',
  objective:
    'You will be able to read an IAM policy statement field by field, say what an identity policy, a resource policy and a permission boundary each do, and write the rule for a wildcard policy.',
  minutes: 14,
  difficulty: 'medium',
  sources: ['F32', 'Q3.11', 'Q3.9', 'A#Full example 2: over permissioned role'],

  steps: {
    vocabulary: [
      {
        term: 'principal',
        definition: 'Who is acting: a user, a role, or a service. Every request carries one, and every decision is made about it.',
      },
      {
        term: 'action',
        definition: 'What is being attempted, named as a service and an operation, such as s3:GetObject. A wildcard here means every operation.',
      },
      {
        term: 'resource',
        definition: 'What is being acted on, named by its full identifier. A wildcard here means every resource of every service.',
      },
      {
        term: 'condition',
        definition: 'An extra test the request must pass: a source address, a tag, an external id, whether multi factor authentication was used.',
      },
      {
        term: 'permission boundary',
        definition: 'A policy that grants nothing and caps what an identity may ever be given. The maximum, not the grant.',
      },
    ],

    model: {
      narrative: [
        'An IAM policy statement answers four questions: who, what action, on what resource, and under what conditions. Read them in that order and any policy becomes legible.',
        '',
        'The three kinds of policy differ in which of the four they fix. An identity policy is attached to a principal and says what that principal may do. A resource policy is attached to a thing and says who may reach it, and it is the only one that can grant access across accounts without assuming a role. A permission boundary is attached to a principal and grants nothing at all: it caps the maximum, so the effective permission is the overlap between the boundary and the grant.',
        '',
        'That is question 3.11, and the example it asks for is the boundary: an identity policy allowing s3:* attached to a user whose boundary allows only s3:GetObject can read and cannot write. The grant says yes, the cap says no, and the cap wins.',
        '',
        'Then there is the wildcard. Action star with Resource star is the shape file A names in its second full example, and it is the single most common serious IAM finding. It is worth being precise about why it is bad: not because wildcards are untidy, but because the permissions it grants include the ones that grant more permissions.',
        '',
        'Conditions are the part people skip, and they are where the real work is. A policy with a condition on source address, or on a tag, or on an external id, is a different policy from the same statement without one.',
      ].join('\n'),
      diagram: {
        kind: 'stack',
        caption:
          'The three kinds of policy on one request. The boundary and any organisation guardrail cap the grant; only the overlap survives.',
        layers: [
          {
            label: 'organisation guardrail, if any',
            note: 'Applies to every principal in the account. Nothing below it can exceed it.',
            trust: 'trusted',
          },
          {
            label: 'permission boundary on the principal',
            note: 'Grants nothing. Caps the maximum this principal can ever be given.',
            trust: 'trusted',
          },
          {
            label: 'identity policy attached to the principal',
            note: 'The grant: actions on resources, with conditions. This is the part people read.',
            trust: 'mixed',
          },
          {
            label: 'resource policy on the target',
            note: 'Who may reach this thing. The only one that grants across accounts without assuming a role.',
            trust: 'mixed',
          },
        ],
      },
      takeaway: 'Identity says what a principal may do, resource says who may reach a thing, and a boundary grants nothing and caps everything.',
    },

    worked: {
      task:
        'Write the rule for the over permissioned role, following the second full example in file A: a policy with Action and Resource wildcards, or with specific dangerous permissions.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'IAM policies and their attachments, and real usage data from an access analyzer or from the management trail.',
          why: 'Policies alone produce a list nobody can act on. Usage is what turns it into a proposal: these permissions have not been used in ninety days.',
          prompt: {
            question: 'Why is usage data in the source rather than in the context?',
            answer:
              'Because it changes what the finding says, not just how it ranks. Without usage the finding is this policy is broad, which is arguable; with usage it is these fourteen actions have never been used, which is a change request the team can approve in a minute.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A statement with Effect Allow, Action wildcard and Resource wildcard. Or specific dangerous permissions: iam:PassRole, iam:CreatePolicyVersion, broad sts:AssumeRole, lambda:UpdateFunctionCode.',
          why: 'Straight from file A. The second half matters because a narrow looking policy holding one of those four is more dangerous than a wide looking one without them.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Is the role assumable by an externally reachable identity, and were the permissions actually used in the last ninety days.',
          why: 'Assumable from outside is reachability. Ninety days of usage is the evidence for the remediation, and file A names both.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical if a privilege escalation path exists to an admin level identity.',
          why: 'The severity is not about the width of the policy but about where it leads. A wide role that cannot escalate is a smaller finding than a narrow one that can.',
          prompt: {
            question: 'How would you know whether an escalation path exists?',
            answer:
              'By following the graph rather than reading the policy. Can this role pass a stronger role to something it can create, can it edit its own policy, can it assume a role that can do either. That is attack path analysis, and it is what the posture lesson at the end of this topic is about.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Break glass roles and automation roles. Documented, justified exceptions only, with an owner and a review date.',
          why: 'File A is deliberately narrow here. Break glass roles exist and are legitimate, and the exception is the documentation rather than the role.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Reduce to least privilege based on actual usage, add a Condition, and split the role per task.',
          why: 'Three moves in increasing order of effort. The condition is the cheapest real improvement: the same actions, restricted to a source, a tag or an account.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The full path: who can assume the role, what it grants, and which asset it reaches.',
          why: 'A path rather than a policy. It is what makes the finding legible to someone who does not read IAM policies for a living.',
        },
      ],
      result:
        'The canonical CIEM finding, with usage data turning it from an argument about style into a specific proposal.',
    },

    fadeLight: {
      task: 'A rule for a resource policy that grants access to a principal outside the organisation.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Resource policies on buckets, queues, keys and functions, plus the organisation account list.',
          why: 'A resource policy is where cross account access is granted, so it is where cross account exposure is found.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A resource policy with a Principal naming an account outside the organisation, or a wildcard principal with no condition restricting it.',
          why: 'Two shapes: an explicit external account, and the wildcard that means everyone.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the resource holds, whether the external account is a known vendor, and whether any condition restricts the access.',
          why: 'A wildcard principal with a condition on an organisation identifier is a normal, safe pattern and should not be reported as an open door.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical for a wildcard principal with no condition on a resource holding classified data. High for a named external account with no expiry.',
          why: 'The wildcard with no condition is the one that means anyone at all, which is a different finding from a deliberate share with a vendor.',
          choices: [
            'Critical for a wildcard principal with no condition on a resource holding classified data. High for a named external account with no expiry.',
            'Critical for any resource policy naming an account outside the organisation.',
            'Medium, because resource policies still require the caller to have an identity policy allowing the action.',
            'Low, since cross account access is a normal integration pattern.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The third option contains a true statement leading to a wrong conclusion: the caller does need their own identity policy, and they control that side of it entirely.',
    },

    fadeHeavy: {
      task: 'A rule for a permission boundary that has been removed from an identity.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the identity policy grants without the cap, who removed the boundary and when, and whether the identity is human or automation.',
          why: 'Removing a boundary changes nothing visible until the identity uses something the boundary was blocking, so the change event is the signal.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High. The grant is now unconstrained, and the identity policy was written on the assumption that a cap existed.',
          why: 'The dangerous part is the assumption: policies written under a boundary are often broader than they look, because the boundary was doing the narrowing.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Reattach the boundary, and separately narrow the identity policy so it is correct on its own rather than only correct under a cap.',
          why: 'Two independent fixes, because relying on one layer is what created the surprise.',
          choices: [
            'Reattach the boundary, and separately narrow the identity policy so it is correct on its own rather than only correct under a cap.',
            'Reattach the boundary and close the finding.',
            'Delete the identity and recreate it with a narrower policy.',
            'Add a deny statement to the identity policy for the actions the boundary used to block.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The management trail entry removing the boundary, the identity policy as it now stands, and the list of actions newly permitted.',
          why: 'The list of newly permitted actions is the finding in one artefact, and it is computable from the two policies.',
          choices: [
            'The management trail entry removing the boundary, the identity policy as it now stands, and the list of actions newly permitted.',
            'The full text of the boundary policy that was removed.',
            'The identity console page showing no boundary attached.',
            'The list of every identity in the account that has a boundary.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'The last wrong option, adding denies to mimic the boundary, is worth noticing: it works, and it puts the cap in the same document as the grant, where the next person to widen the grant will remove it.',
    },

    parsons: {
      task:
        'Four of these belong in the over permissioned role rule from file A. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the grant', code: 'a policy statement has Effect Allow with Action and Resource wildcards' },
        { id: 'p2', label: 'or the dangerous specifics', code: 'or grants iam:PassRole, iam:CreatePolicyVersion or broad sts:AssumeRole' },
        { id: 'p3', label: 'the reachability', code: 'and the role is assumable by an externally reachable identity' },
        { id: 'p4', label: 'the usage evidence', code: 'and the granted permissions were not used in the last ninety days' },
        { id: 'd1', label: 'the grant', code: 'and the policy is longer than one hundred lines', distractor: true },
        { id: 'd2', label: 'the reachability', code: 'and the role has no multi factor authentication condition', distractor: true },
        { id: 'd3', label: 'the usage evidence', code: 'and the role was created more than a year ago', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The multi factor distractor is the closest to being right, which is what makes it useful: a condition requiring it is a genuine improvement, and its absence is not what makes a wildcard policy dangerous. Keep one finding to one idea.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A deployment role holds a policy with Action s3:* on Resource star, no conditions, and it is assumable by a continuous integration system that builds pull requests from forks. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The role policy and its trust policy, the identity that can assume it, and usage data for the granted actions.',
          options: [
            'The role policy and its trust policy, the identity that can assume it, and usage data for the granted actions.',
            'The deployment pipeline definition and its recent runs.',
            'The bucket inventory for the account.',
          ],
          why: 'The trust policy is half the finding: what the role grants matters less than who can become it.',
        },
        {
          part: 'condition',
          answer:
            'A role granting a service wildcard on a resource wildcard with no conditions, whose trust policy allows a principal that runs untrusted code.',
          options: [
            'A role granting a service wildcard on a resource wildcard with no conditions, whose trust policy allows a principal that runs untrusted code.',
            'A role granting a service wildcard on a resource wildcard.',
            'A role that is assumable by a continuous integration system.',
          ],
          why: 'Either half alone is common and mostly benign. The pair of them is the finding, and stating it as a pair is what keeps the rule actionable.',
        },
        {
          part: 'context',
          answer:
            'Whether builds from forks run with this role, what the buckets in scope hold, and whether the actions granted have been used.',
          options: [
            'Whether builds from forks run with this role, what the buckets in scope hold, and whether the actions granted have been used.',
            'How many pipelines exist in the organisation.',
            'How long a typical build takes to run.',
          ],
          why: 'Fork builds are the reachability question: they mean the code running with this role was written by a stranger.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Untrusted code can assume a role with full access to every bucket in the account, including the ones holding classified data.',
          options: [
            'Critical. Untrusted code can assume a role with full access to every bucket in the account, including the ones holding classified data.',
            'High, because the role is limited to a single service.',
            'Medium, because a fork build has to be approved by a maintainer before it runs.',
          ],
          why: 'A single service wildcard is still every bucket in the account. Approval before running is a control that exists in some configurations and not in others, which is exactly what the context row is for.',
        },
        {
          part: 'falsePositives',
          answer:
            'Roles whose trust policy restricts assumption to a specific repository and branch, and whose policy is scoped to named buckets, verified from both documents.',
          options: [
            'Roles whose trust policy restricts assumption to a specific repository and branch, and whose policy is scoped to named buckets, verified from both documents.',
            'Roles used only by the platform team pipelines.',
            'Roles that have existed since before the current policy standard.',
          ],
          why: 'Both halves have to be narrowed for the exception to hold, and both are readable from the API. Age and ownership are not properties of the grant.',
        },
        {
          part: 'remediation',
          answer:
            'Scope the policy to the named buckets and prefixes the pipeline writes, restrict the trust policy to the repository and branch, and add a condition so the role cannot be assumed from a fork build.',
          options: [
            'Scope the policy to the named buckets and prefixes the pipeline writes, restrict the trust policy to the repository and branch, and add a condition so the role cannot be assumed from a fork build.',
            'Rotate the credentials the pipeline uses to assume the role.',
            'Require a maintainer to approve every fork build before it runs.',
          ],
          why: 'Narrow both documents and add the condition. Approval is a useful process control and it depends on a person being careful every time, which is why it is not the primary fix.',
        },
        {
          part: 'evidence',
          answer:
            'The policy statement with its wildcards, the trust policy naming the pipeline principal, and the usage data showing which actions have actually been used.',
          options: [
            'The policy statement with its wildcards, the trust policy naming the pipeline principal, and the usage data showing which actions have actually been used.',
            'A list of every bucket the role could reach.',
            'The pipeline configuration file from the repository.',
          ],
          why: 'The usage data is what turns this into a proposal the team can accept, because it shows how much of the grant nobody is using.',
        },
      ],
      closing:
        'Every row here except severity was decided by reading two documents: the policy and the trust policy. Reading both, every time, is most of what CIEM work actually is.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the deployment role.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the grant', code: 'the role policy allows a service wildcard on a resource wildcard' },
          { id: 'f2', label: 'the missing condition', code: 'and no condition restricts where or by whom it can be used' },
          { id: 'f3', label: 'the trust', code: 'and its trust policy allows a principal that runs code from outside the company' },
          { id: 'f4', label: 'the impact', code: 'and the resources in scope include classified data' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Grant, missing condition, trust, impact. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'cloud-boundary-grants-access',
      setup:
        'A developer asks for S3 access. An administrator attaches a permission boundary allowing s3:* and tells them it is done. The developer reports that nothing works.',
      code:
        'Identity policy on the user: (none)\nPermission boundary on the user: Allow s3:* on *\nResult: every S3 call is denied.',
      language: 'text',
      question: 'Why is everything still denied?',
      options: [
        { text: 'The boundary needs a matching resource policy on each bucket to take effect.', correct: false },
        {
          text: 'A boundary grants nothing. It caps the maximum, and with no identity policy there is no grant for it to cap.',
          correct: true,
        },
        { text: 'Boundaries apply only to roles, not to users.', correct: false },
        { text: 'The boundary has to be attached to the account rather than to the user.', correct: false },
      ],
      silently:
        'Nothing about this is silent while it is broken, and that is the lucky version. The dangerous version is the same misunderstanding in the other direction: an administrator who believes a boundary grants access also believes that attaching one is a way to give permissions, and will happily attach a broad boundary alongside a broad identity policy, thinking the two are the same kind of thing. The cap then permits everything the grant asks for, and the control that was supposed to limit the identity is doing nothing at all.',
      explanation:
        'Fact 32 separates the three: an identity policy says what an identity can do, a resource policy says who can reach a resource and is the only one granting cross account access without assuming a role, and a boundary grants nothing, it caps the maximum. The effective permission is the intersection of the grant and every cap that applies. That is why a boundary is such a useful control for delegated administration: you can let a team create roles freely, knowing that nothing they create can exceed the cap, precisely because the cap never grants anything itself.',
    },

    handoff: {
      canNow: [
        'Read a policy statement as principal, action, resource and condition',
        'Say what an identity policy, a resource policy and a permission boundary each do',
        'Write the over permissioned role rule with usage data behind the remediation',
      ],
      note: 'Q3.11 asks for the three kinds with an example where one blocks despite another allowing. Fact 32 is the one line version.',
    },
  },
}

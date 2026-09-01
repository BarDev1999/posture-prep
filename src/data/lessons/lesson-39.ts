import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L39',
  number: 39,
  topicId: 'cloud',
  sectionId: 3,
  title: 'Policy evaluation order, and the layers that can deny',
  objective:
    'You will be able to state the evaluation order in one sentence, name the five layers that can deny despite an Allow, and write a rule for a guardrail that is missing.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F24', 'F25', 'Q3.7', 'Q3.9', 'F32'],

  steps: {
    vocabulary: [
      {
        term: 'explicit deny',
        definition: 'A statement with Effect Deny that matches the request. It wins over everything, in every layer, always.',
      },
      {
        term: 'explicit allow',
        definition: 'A statement with Effect Allow that matches. Required for anything to work, because nothing is permitted by default.',
      },
      {
        term: 'implicit deny',
        definition: 'The default answer when no statement allows the request. No policy has to say no for the answer to be no.',
      },
      {
        term: 'SCP',
        definition: 'A service control policy at organisation level. It grants nothing and caps what every principal in an account may do.',
      },
      {
        term: 'session policy',
        definition: 'A policy passed when a role is assumed, capping that session only. Another cap that can deny while the role policy allows.',
      },
    ],

    model: {
      narrative: [
        'The order is short enough to memorise and question 3.7 asks for it directly: explicit deny wins over everything, then an explicit allow is required, and no allow means implicit deny.',
        '',
        'That is fact 24. The part that catches people is fact 25, which is the list of layers that can produce a deny even when the identity policy says Allow: an organisation service control policy, a permission boundary, a resource based policy, a VPC endpoint policy, and a session policy.',
        '',
        'Five layers, and they are not alternatives. Every one of them applies to the same request, and the answer is yes only if every layer that can cap agrees. This is why an identity with an administrator policy can still be refused, and why reading one policy is never an answer to the question can this principal do this.',
        '',
        'The practical consequence for a researcher is that granted permissions and effective permissions are different numbers, and only the second one matters. A finding that says this role can delete every bucket, based on its identity policy, is wrong if an organisation guardrail blocks deletion. A finding that says this role is fine, based on a guardrail, is wrong if the guardrail is attached to a different account.',
        '',
        'So the useful rules in this lesson are not about a single identity at all. They are about whether the guardrails you believe are in place actually apply where you believe they do.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'One request, evaluated once. Any single deny ends it, and an allow has to survive every layer to arrive.',
        nodes: [
          { label: 'is there an explicit deny anywhere?', note: 'In any policy, in any layer. If yes, the answer is no and evaluation stops.', danger: true },
          { label: 'does an organisation guardrail permit it?', note: 'An SCP grants nothing and caps everything below it.' },
          { label: 'does the permission boundary permit it?', note: 'Another cap, on the principal, granting nothing itself.' },
          { label: 'is there an explicit allow for it?', note: 'From an identity policy, or from a resource policy on the target.' },
          { label: 'allowed', note: 'Only if every cap agreed and something granted it. Otherwise implicit deny.' },
        ],
      },
      takeaway: 'Explicit deny beats everything, an explicit allow is required, and five separate layers can each say no.',
    },

    worked: {
      task:
        'Write the rule for a missing guardrail: an account that is not covered by the organisation service control policies your company believes are universal.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The organisation structure with its organisational units, the service control policies and where each is attached, and the full account list.',
          why: 'A guardrail is only as wide as its attachment point. The finding is a set difference between the accounts you have and the accounts a policy reaches.',
          prompt: {
            question: 'Why is this a posture finding rather than an administrative detail?',
            answer:
              'Because every other IAM finding is ranked on the assumption that the guardrails hold. An account outside them invalidates that assumption for every principal in it at once, and nothing inside the account looks any different.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'An account that is not attached, directly or through an organisational unit, to the baseline service control policies, or an account attached to an organisational unit whose policy set differs from the baseline.',
          why: 'Two shapes: an account nobody attached, and an account attached somewhere with a different policy set. The second is more common and much harder to see.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the account holds, whether it is production, who its administrators are, and whether it was created recently or moved between organisational units.',
          why: 'A recently created or recently moved account is the usual cause, and saying so in the finding is what gets the process fixed rather than just the account.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical for a production account holding classified data. High for any account with human administrators. Medium for a sandbox with no production connectivity.',
          why: 'Missing guardrails are a multiplier on everything else in the account, so the severity follows what else is in there.',
          prompt: {
            question: 'The account has no findings of its own. Is this still critical?',
            answer:
              'Yes, and that is the point worth making in the ticket. Guardrails are preventive: they stop findings from being possible. An account outside them has no findings yet, which is a statement about time rather than about safety.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Accounts deliberately excluded for a documented reason, such as a security tooling account that needs an action the baseline denies, listed by account identifier with an owner and a review date.',
          why: 'These exceptions are real and they are exactly the accounts an attacker wants, so listing them by identifier rather than by pattern is the point.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Attach the baseline policies at the organisational unit, move the account into the correct unit, and make attachment part of account creation so the next one cannot be created outside it.',
          why: 'The third clause is the durable fix. A rule that finds this repeatedly is describing a process gap rather than a configuration one.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The organisation tree with the account position, the policies attached at each level above it, and one action that the baseline denies and that this account currently permits.',
          why: 'The last artefact is what makes it undeniable: a specific action, permitted here and denied everywhere else in the company.',
        },
      ],
      result:
        'A rule about the layer everyone assumes, which is the layer nobody checks. It is also the rule that makes every other IAM severity in the account meaningful.',
    },

    fadeLight: {
      task: 'A rule for a resource policy that grants access an organisation guardrail would otherwise deny.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Resource policies, the organisation service control policies, and the account each resource lives in.',
          why: 'The interesting cases are where two layers disagree, so both have to be read together.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A resource policy granting an action to a principal in an account where the baseline guardrail denies that action for its own principals.',
          why: 'This is the asymmetry worth knowing: a guardrail caps the principals in its accounts, and a resource policy in one of those accounts can still grant access to a principal elsewhere.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which account the granted principal belongs to, whether that account is inside the organisation, and what the resource holds.',
          why: 'A grant to a principal in another organisation is the case that matters, and it is invisible from the guardrail side.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High. The guardrail creates a belief that the action is impossible in this account, and the resource policy makes it possible for someone outside it.',
          why: 'The finding is about a false belief as much as about the access, which is why it ranks above an ordinary cross account share.',
          choices: [
            'High. The guardrail creates a belief that the action is impossible in this account, and the resource policy makes it possible for someone outside it.',
            'Low, because a service control policy overrides any resource policy in its accounts.',
            'Medium, because the caller still needs their own identity policy to allow the action.',
            'Informational, since resource policies are the intended way to share.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The second option is the trap on this lesson turned around: a guardrail caps the principals in its accounts, and it does not follow the resource.',
    },

    fadeHeavy: {
      task: 'A rule for a VPC endpoint policy that allows more than the network was meant to.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which service the endpoint fronts, which principals and resources its policy names, and whether the subnets using it hold sensitive workloads.',
          why: 'An endpoint policy is a cap on traffic through that endpoint, so its width decides what a workload in the subnet can reach.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Medium to high depending on the service: an endpoint for object storage with a wildcard resource lets a workload reach any bucket in any account it has credentials for.',
          why: 'The endpoint is often the only control between a private subnet and the whole of a provider service, and a wildcard policy removes it.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Restrict the endpoint policy to the accounts and resources the workloads legitimately use, and add a condition on the organisation identifier.',
          why: 'The organisation condition is the cheap, high value control here: it stops a workload from using the endpoint to reach a bucket in someone else account entirely.',
          choices: [
            'Restrict the endpoint policy to the accounts and resources the workloads legitimately use, and add a condition on the organisation identifier.',
            'Remove the endpoint so traffic goes through the NAT gateway instead.',
            'Add a security group rule limiting which workloads can reach the endpoint.',
            'Enable logging on the endpoint and review it monthly.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The endpoint policy with its wildcards, the subnets routed to it, and one resource outside the organisation that a workload could reach through it.',
          why: 'Naming one reachable resource outside the organisation is what turns a policy width argument into a demonstrated path.',
          choices: [
            'The endpoint policy with its wildcards, the subnets routed to it, and one resource outside the organisation that a workload could reach through it.',
            'The endpoint traffic volume for the last month.',
            'The list of every VPC endpoint in the account.',
            'The provider documentation on endpoint policies.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Removing the endpoint is the wrong direction and worth naming: it sends the same traffic over the NAT gateway, which is the open egress path from two lessons ago.',
    },

    parsons: {
      task:
        'Order these four into the evaluation order a request actually goes through. All four belong; the distractors are wrong statements about the order.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'first', code: 'any explicit Deny that matches ends the evaluation with a refusal' },
        { id: 'p2', label: 'second', code: 'then every cap must permit it: organisation policy, boundary, endpoint policy, session policy' },
        { id: 'p3', label: 'third', code: 'then an explicit Allow must exist, from an identity policy or a resource policy' },
        { id: 'p4', label: 'otherwise', code: 'and with no Allow the answer is an implicit deny' },
        { id: 'd1', label: 'first', code: 'the most specific matching statement wins, whether Allow or Deny', distractor: true },
        { id: 'd2', label: 'second', code: 'the most recently attached policy takes precedence', distractor: true },
        { id: 'd3', label: 'third', code: 'a resource policy overrides an identity policy in the same account', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'All three distractors are how other systems work, which is why they are plausible. Specificity ordering is firewall thinking, recency is not a concept here at all, and the resource against identity precedence question is answered by the caps rather than by a winner between the two.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. An engineer with an administrator identity policy reports that they cannot delete an object. The bucket has a resource policy with an explicit Deny for their role, and the organisation has no guardrail on storage. Write the rule that would have found this before they hit it.',
      rows: [
        {
          part: 'source',
          answer: 'Identity policies, resource policies, and the effective permission calculation across both.',
          options: [
            'Identity policies, resource policies, and the effective permission calculation across both.',
            'The management trail entries for denied API calls.',
            'The support tickets raised by engineers about access problems.',
          ],
          why: 'Effective permissions are the answer to what can this principal do, and they need both documents. Denied calls are a symptom and they arrive after the fact.',
        },
        {
          part: 'condition',
          answer:
            'A principal whose granted permissions differ from its effective permissions, because an explicit Deny in another layer removes part of the grant.',
          options: [
            'A principal whose granted permissions differ from its effective permissions, because an explicit Deny in another layer removes part of the grant.',
            'A principal with an administrator identity policy.',
            'A bucket with a resource policy containing an explicit Deny.',
            'A principal whose API calls have been denied more than five times.',
          ],
          why: 'The finding is the gap between granted and effective. Either half on its own is a normal configuration that appears thousands of times.',
        },
        {
          part: 'context',
          answer:
            'Which layer produced the deny, whether the deny was intended, and whether the principal role is used by automation that will fail silently.',
          options: [
            'Which layer produced the deny, whether the deny was intended, and whether the principal role is used by automation that will fail silently.',
            'How long the principal has held the administrator policy.',
            'Which team the engineer belongs to.',
          ],
          why: 'Automation is the reason this is a posture finding rather than a helpdesk one: a human reports a denial, and a nightly job just stops working.',
        },
        {
          part: 'severity',
          answer:
            'Low as a security finding and medium as an operational one: the deny is doing its job, and the risk is a grant nobody understands and automation that fails without explanation.',
          options: [
            'Low as a security finding and medium as an operational one: the deny is doing its job, and the risk is a grant nobody understands and automation that fails without explanation.',
            'Critical, because an administrator policy is being blocked, which means the permission model is broken.',
            'High, because an explicit Deny in a resource policy can be removed by whoever owns the bucket.',
          ],
          why: 'This is the case where the controls worked. Reporting it as critical would teach the environment that your severities do not mean anything.',
        },
        {
          part: 'falsePositives',
          answer:
            'Deliberate denies used as guardrails, such as a bucket that denies deletion from every role except a break glass one, listed with the intent recorded.',
          options: [
            'Deliberate denies used as guardrails, such as a bucket that denies deletion from every role except a break glass one, listed with the intent recorded.',
            'Any difference between granted and effective permissions, since some difference always exists.',
            'Principals belonging to the security team, whose policies are managed centrally.',
          ],
          why: 'The second option would exclude the whole rule. The first names the pattern that is intended, which is what an exception is for.',
        },
        {
          part: 'remediation',
          answer:
            'Narrow the identity policy so the grant matches reality, and document the deny where the automation owner will find it rather than removing it.',
          options: [
            'Narrow the identity policy so the grant matches reality, and document the deny where the automation owner will find it rather than removing it.',
            'Remove the explicit Deny from the resource policy so the administrator policy works as expected.',
            'Add an exception to the resource policy for this specific role.',
          ],
          why: 'The deny is the control. Fix the misleading grant instead, which is the direction that reduces permissions rather than increasing them.',
        },
        {
          part: 'evidence',
          answer:
            'The identity policy grant, the resource policy deny, the effective permission for that action, and the denied API call from the trail.',
          options: [
            'The identity policy grant, the resource policy deny, the effective permission for that action, and the denied API call from the trail.',
            'The engineer description of what they were trying to do.',
            'The bucket contents and their classification.',
          ],
          why: 'Four artefacts that show grant, cap, result and observation. The denied call is the confirmation that the calculation matches reality.',
        },
      ],
      closing:
        'This is the friendliest finding in the section and it is worth writing anyway. Every serious IAM rule you write depends on granted and effective being different numbers, and this is the rule that proves your tooling knows the difference.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the granted against effective gap.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the grant', code: 'an identity policy allows an action on a resource' },
          { id: 'f2', label: 'the cap', code: 'and another layer contains an explicit Deny that matches it' },
          { id: 'f3', label: 'the gap', code: 'so the effective permission is narrower than the granted one' },
          { id: 'f4', label: 'the consumer', code: 'and something automated depends on that action succeeding' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Grant, cap, gap, consumer. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'sec-allow-overrides-scp-deny',
      setup:
        'A team needs one action that the organisation guardrail denies. They attach a targeted identity policy allowing exactly that action, arguing that the more specific policy should win.',
      code:
        'SCP on the organisational unit: Deny s3:DeleteBucket on *\nIdentity policy on the role: Allow s3:DeleteBucket on arn:aws:s3:::build-cache\nExpectation: the specific Allow overrides the broad Deny.',
      language: 'text',
      question: 'What actually happens?',
      options: [
        { text: 'The specific Allow wins, because the most specific matching statement takes precedence.', correct: false },
        {
          text: 'The call is denied. An explicit Deny wins over any Allow, and a service control policy grants nothing that could be overridden.',
          correct: true,
        },
        { text: 'It depends on the order the policies were attached.', correct: false },
        { text: 'The Allow wins for that one bucket and the Deny applies to the rest.', correct: false },
      ],
      silently:
        'Nothing is silent about the failure, which makes this the least dangerous of the eight documented misconceptions and still worth its place. What is silent is the workaround it leads to. The team, having concluded that the policy model is broken, moves the workload to an account outside the organisational unit where the guardrail does not apply, and that account then holds a production workload with no guardrails at all, created for a reason that is documented nowhere.',
      explanation:
        'Fact 24 gives the order: explicit Deny wins over everything, then an explicit Allow is required, and no Allow means implicit deny. Specificity does not enter into it and neither does attachment order. Fact 25 lists the layers that can deny despite an identity policy Allow, and a service control policy is the first of them: it grants nothing at all, it only caps, so there is nothing in it for an Allow to override. When a guardrail genuinely blocks legitimate work, the fix is to change the guardrail with a narrow exception at the organisation level, where the change is visible, rather than to route around it.',
    },

    handoff: {
      canNow: [
        'State the evaluation order and say why specificity does not decide it',
        'Name the five layers that can deny despite an identity policy Allow',
        'Write a rule for a missing guardrail, and one for the gap between granted and effective permissions',
      ],
      note: 'Q3.7 is the order and Q3.9 is the policy reading question. Facts 24 and 25 are a pair and both are worth reciting.',
    },
  },
}

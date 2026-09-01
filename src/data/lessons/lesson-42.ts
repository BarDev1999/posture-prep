import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L42',
  number: 42,
  topicId: 'cloud',
  sectionId: 3,
  title: 'Privilege escalation paths: PassRole and policy self modification',
  objective:
    'You will be able to explain how PassRole and policy editing turn a limited identity into an administrator, and write the CIEM rule that finds both.',
  minutes: 14,
  difficulty: 'hard',
  sources: ['F30', 'F31', 'Q3.9', 'Q3.12', 'A#Full example 2: over permissioned role'],

  steps: {
    vocabulary: [
      {
        term: 'privilege escalation',
        definition: 'Turning the permissions you have into permissions you were not given, using nothing but the permissions you have.',
      },
      {
        term: 'iam:PassRole',
        definition: 'The permission to attach a role to something you create, such as a function or an instance, so that thing runs as the role.',
      },
      {
        term: 'iam:CreatePolicyVersion',
        definition: 'The permission to publish a new version of a policy document. On your own policy it rewrites your own permissions.',
      },
      {
        term: 'escalation path',
        definition: 'A chain of individually reasonable permissions whose end state is more access than the start state.',
      },
      {
        term: 'CIEM',
        definition: 'Cloud Infrastructure Entitlement Management: identity risk, effective against granted permissions, and finding paths like these.',
      },
    ],

    model: {
      narrative: [
        'Escalation is not a bug and it is not an exploit. It is a permission being used exactly as documented, in a direction nobody thought about.',
        '',
        'Take PassRole. A developer who can create a function needs to attach a role to it, and PassRole is the permission that allows attaching. Now give that developer PassRole with a wildcard resource: they can attach any role, including an administrator role, to a function whose code they write. They then run their own code as an administrator. Every step is permitted, and the audit trail shows a developer creating a function.',
        '',
        'Fact 30 states the requirement that follows: PassRole always needs a condition restricting which roles may be passed.',
        '',
        'Then policy self modification. An identity with CreatePolicyVersion on the policy attached to itself can publish a new version of that policy saying anything at all, and set it as the default. Fact 31 calls it full privilege escalation in one call, and that is not an exaggeration: one API call turns a narrow role into an administrator, and the trail shows a policy version being created, which is a normal operation.',
        '',
        'This is what a CIEM tool is for, and it is what question 3.12 asks you to write. The finding is never a single permission: it is a path, and the value is in naming the hop whose removal breaks it.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'The PassRole path. Four permitted steps, one of them the escalation, and the trail shows a developer doing developer things.',
        nodes: [
          { label: 'the identity can create a function', note: 'A normal developer permission on a serverless platform.' },
          {
            label: 'and holds iam:PassRole on *',
            note: 'The escalation hop. It can attach any role, not only its own team roles.',
            danger: true,
          },
          { label: 'it creates a function with an admin role attached', note: 'Both calls are allowed, so nothing is denied and nothing alerts.' },
          { label: 'the function runs code the identity wrote', note: 'Under the administrator role, not under the developer identity.' },
          { label: 'the identity is now effectively an administrator', note: 'Granted permissions unchanged. Effective permissions unlimited.' },
        ],
      },
      takeaway: 'PassRole with a wildcard is administrator by proxy, and CreatePolicyVersion on your own policy is administrator in one call.',
    },

    worked: {
      task:
        'Question 3.12: a function role is granted iam:CreatePolicyVersion on itself. Explain why that is critical and write the CIEM rule that detects it.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'IAM policies with their attachments, resolved so that each statement resource is compared against the policies attached to the same principal, plus usage data for those actions.',
          why: 'The finding needs the join between what the statement names and what the principal already has. A CreatePolicyVersion grant on somebody else policy is a different, smaller finding.',
          prompt: {
            question: 'Why does resolving the resource matter so much here?',
            answer:
              'Because the same action is unremarkable or catastrophic depending on which policy it names. Granted on a specific policy the principal does not hold, it is delegated administration. Granted on the policy attached to itself, it is a loop, and the loop is the escalation.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A principal holding iam:CreatePolicyVersion or iam:SetDefaultPolicyVersion or iam:PutRolePolicy or iam:AttachRolePolicy where the resource resolves to a policy attached to that same principal, or to a wildcard.',
          why: 'Four actions, not one. Publishing a version, making it default, adding an inline policy and attaching a managed one are four ways to reach the same state, and a rule that names only the first misses three.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the principal is reachable from outside, whether the actions have been used in ninety days, and what an administrator level identity in this account could reach.',
          why: 'The last one is the impact statement: this finding is worth exactly what full administration in this account is worth.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical. One API call converts this identity into an administrator, and the call itself is an ordinary IAM operation that no anomaly rule will flag.',
          why: 'There is no version of this that is not critical, which is unusual in this section and is why fact 31 states it flatly.',
          prompt: {
            question: 'The role has never used that permission. Does the ninety day usage data lower this?',
            answer:
              'It strengthens the remediation rather than lowering the severity. Nobody has used it, so nothing breaks when it is removed, which turns a critical finding into a five minute change. Usage data is an argument for the fix, not a discount on the risk.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Identity administration roles whose job is managing policies, restricted by a permission boundary that excludes their own policy, listed by name with an owner.',
          why: 'Somebody has to manage policies. The exception is the boundary that stops them managing their own, which is a control rather than a promise.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Remove the action, or restrict its resource to specific policies that are not attached to this principal, and add a permission boundary that denies IAM write actions on the principal own policies.',
          why: 'Restrict then cap. The boundary is what makes the fix survive the next person who widens the identity policy.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The statement granting the action, the policy attachment showing the resource is the principal own policy, the usage data for that action, and what an administrator in this account can reach.',
          why: 'The attachment is the artefact that proves it is a loop. Without it the reviewer sees a policy management permission and moves on.',
        },
      ],
      result:
        'A CIEM rule that finds a one call escalation, with the remediation supported by the fact that nobody has ever used the permission.',
    },

    fadeLight: {
      task: 'A rule for PassRole granted with a wildcard resource, which is the second half of question 3.9.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Identity policies granting iam:PassRole, the compute creation permissions held by the same principals, and the roles available to be passed.',
          why: 'PassRole alone does nothing. It becomes an escalation when the same principal can create something to attach the role to.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A principal with iam:PassRole on a wildcard resource, or with no condition on iam:PassedToService, that also holds a create permission for a compute service.',
          why: 'Both halves in one condition, because either alone is a normal grant that appears everywhere.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which roles could be passed and what the strongest of them can reach, and whether the principal is human or automation.',
          why: 'The finding is worth what the strongest passable role is worth, so the enrichment has to look at the whole set.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when an administrator level role is among those that could be passed. High otherwise, since the principal can still run code as any service role in the account.',
          why: 'The ceiling is set by the best role in reach, which is why the wildcard is the problem rather than the action.',
          choices: [
            'Critical when an administrator level role is among those that could be passed. High otherwise, since the principal can still run code as any service role in the account.',
            'Medium, because PassRole does not grant the permissions of the role to the principal itself.',
            'Low, since creating a function is a normal developer action.',
            'High only when the principal is a human user rather than automation.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The second option is the trap on this lesson, and it is technically true: PassRole does not give the principal those permissions directly. It gives them a machine that has them.',
    },

    fadeHeavy: {
      task: 'A rule for an escalation path across two hops: an identity that can update the code of a function running as a stronger role.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which functions the identity can update, what roles those functions run as, and what those roles can reach.',
          why: 'This is the same shape as PassRole with the order reversed: instead of attaching a role to new code, it puts new code under an existing role.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when any reachable function runs as a role that can modify identities or read classified data.',
          why: 'lambda:UpdateFunctionCode is on the file A list of specific dangerous permissions for exactly this reason.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Restrict the update permission to functions the team owns, separate deployment identities from the roles the functions run as, and require the code to arrive through a pipeline rather than by direct update.',
          why: 'The pipeline is the durable fix: it puts a review between an identity and the code that runs under a stronger role.',
          choices: [
            'Restrict the update permission to functions the team owns, separate deployment identities from the roles the functions run as, and require the code to arrive through a pipeline rather than by direct update.',
            'Enable versioning on the functions so old code can be restored.',
            'Add an alarm on function code updates and review it weekly.',
            'Shorten the function timeout so malicious code has less time to run.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The update permission with its resource scope, the list of functions in scope with the roles they run as, and the effective permissions of the strongest of those roles.',
          why: 'Naming the strongest reachable role is what converts a permission list into a single sentence a manager can act on.',
          choices: [
            'The update permission with its resource scope, the list of functions in scope with the roles they run as, and the effective permissions of the strongest of those roles.',
            'The source code of the functions in scope.',
            'The deployment history for the last quarter.',
            'The names of the developers who hold the permission.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Two hops is the normal case in a real account, and it is why file A describes evidence as the full path: who can assume the role, what it grants, and which asset it reaches.',
    },

    parsons: {
      task:
        'Four of these belong in the policy self modification rule from question 3.12. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the principal', code: 'a principal holds an IAM write action such as CreatePolicyVersion' },
        { id: 'p2', label: 'the loop', code: 'and the resource resolves to a policy attached to that same principal' },
        { id: 'p3', label: 'the reach', code: 'and administrator level access in this account reaches classified data' },
        { id: 'p4', label: 'the usage evidence', code: 'and the action has not been used in the last ninety days' },
        { id: 'd1', label: 'the loop', code: 'and the policy has more than five statements', distractor: true },
        { id: 'd2', label: 'the reach', code: 'and the principal has no multi factor authentication configured', distractor: true },
        { id: 'd3', label: 'the usage evidence', code: 'and the policy was last modified more than a year ago', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The multi factor distractor is the most tempting and the most wrong: this escalation is performed by a role or an identity through an API call, and a second factor at login has no bearing on an API call made with credentials that already exist.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A continuous integration role can create instance profiles, pass any role, and run instances. It is assumable by the build system, which builds pull requests. Write the rule.',
      rows: [
        {
          part: 'source',
          answer:
            'The role identity policy, its trust policy, the list of roles it could pass, and the effective permissions of the strongest of those.',
          options: [
            'The role identity policy, its trust policy, the list of roles it could pass, and the effective permissions of the strongest of those.',
            'The build logs for the last month of pipeline runs.',
            'The instance inventory for the account.',
          ],
          why: 'Identity policy plus trust policy plus the reachable set. The path is only visible when all three are read together.',
        },
        {
          part: 'condition',
          answer:
            'A principal holding iam:PassRole with no resource restriction together with a compute create permission, whose trust policy allows a system that runs untrusted code.',
          options: [
            'A principal holding iam:PassRole with no resource restriction together with a compute create permission, whose trust policy allows a system that runs untrusted code.',
            'A principal holding iam:PassRole.',
            'A build system that can assume a role in a production account.',
          ],
          why: 'Three parts: the escalation permission, the thing to attach it to, and who can become the principal. Each alone is common and mostly harmless.',
        },
        {
          part: 'context',
          answer:
            'Whether pull requests from forks are built, which roles are passable, and whether the account holds production data.',
          options: [
            'Whether pull requests from forks are built, which roles are passable, and whether the account holds production data.',
            'How long builds take and how often they fail.',
            'Which programming languages the repository uses.',
          ],
          why: 'Fork builds decide whether the untrusted code is written by a stranger or a colleague, which is the difference between critical and high.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Code from a pull request can start an instance with an administrator role attached and run anything under it.',
          options: [
            'Critical. Code from a pull request can start an instance with an administrator role attached and run anything under it.',
            'High, because the build system is internal infrastructure.',
            'Medium, because starting an instance is visible in the billing and would be noticed.',
          ],
          why: 'Billing noticing an instance a few hours later is not a control, and the internal position of the build system is exactly what the attacker is borrowing.',
        },
        {
          part: 'falsePositives',
          answer:
            'Roles where PassRole is conditioned on a specific role path or on iam:PassedToService, verified from the policy conditions.',
          options: [
            'Roles where PassRole is conditioned on a specific role path or on iam:PassedToService, verified from the policy conditions.',
            'Roles used by the platform team pipelines, which are trusted.',
            'Roles that have existed since before the account was moved into the organisation.',
          ],
          why: 'The condition is the control and it is readable. The other two are the two standard ways an exception outlives its reason.',
        },
        {
          part: 'remediation',
          answer:
            'Condition PassRole on a specific role path and on the service it may be passed to, restrict the trust policy to protected branches, and split the deployment role from the build role.',
          options: [
            'Condition PassRole on a specific role path and on the service it may be passed to, restrict the trust policy to protected branches, and split the deployment role from the build role.',
            'Require a maintainer to approve fork builds before they run.',
            'Rotate the build system credentials weekly.',
          ],
          why: 'Narrow the escalation, narrow the door, split the identity. Approval helps and depends on a person being careful every time.',
        },
        {
          part: 'evidence',
          answer:
            'The PassRole statement with its wildcard resource, the create permission beside it, the trust policy naming the build system, and the strongest role that could be passed.',
          options: [
            'The PassRole statement with its wildcard resource, the create permission beside it, the trust policy naming the build system, and the strongest role that could be passed.',
            'A proof of concept pipeline that performs the escalation.',
            'The list of all roles in the account.',
          ],
          why: 'Four artefacts, no exploitation needed. A proof of concept is occasionally worth building and it should never be the only evidence, because it invites a conversation about your test rather than their configuration.',
        },
      ],
      closing:
        'Look at what made this critical: not one permission, but three ordinary ones that meet. That is what an attack path is, and finding those meetings is the whole job of the next lesson.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the build role escalation.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the escalation permission', code: 'the role holds iam:PassRole with no resource restriction' },
          { id: 'f2', label: 'the vehicle', code: 'and it can create compute to attach a passed role to' },
          { id: 'f3', label: 'the door', code: 'and its trust policy allows a build system that runs untrusted code' },
          { id: 'f4', label: 'the impact', code: 'and an administrator level role is among those it could pass' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Permission, vehicle, door, impact. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'cloud-passrole-is-harmless',
      setup:
        'A permission review. A developer role holds iam:PassRole on a wildcard resource. The reviewer argues it is low risk because PassRole grants nothing by itself.',
      code:
        'Statement: Allow iam:PassRole on "*"\nAlso held: lambda:CreateFunction, ec2:RunInstances\nReview note: PassRole does not grant the role permissions to the developer, low risk.',
      language: 'text',
      question: 'Why is the review note wrong in effect, even though it is right in words?',
      options: [
        {
          text: 'The developer can attach a stronger role to compute they create and run their own code under it, which is the same access by another route.',
          correct: true,
        },
        { text: 'PassRole does grant the role permissions directly, so the note is simply mistaken.', correct: false },
        { text: 'It is only wrong if the developer also holds iam:CreateRole.', correct: false },
        { text: 'It is wrong because PassRole allows assuming the role from the console.', correct: false },
      ],
      silently:
        'Nothing about the use of this looks unusual. The trail records a function being created and a function being invoked, which is what a developer role does all day, and the permissions used inside the function belong to the role that was passed rather than to the developer, so a report of the developer effective permissions built by reading their own policies shows nothing wrong. The escalation is only visible to a tool that follows the graph rather than reading the policy.',
      explanation:
        'PassRole is an unusual permission because its risk is entirely in what else the principal holds. Alone it does nothing; with a create permission it is administrator by proxy, because code the principal writes runs under a role the principal chose. Fact 30 gives the rule: it always needs a condition restricting which roles may be passed, and in practice that means a role path plus a condition on the service it may be passed to. This is also the clearest example of why granted permissions are the wrong number to report: the developer granted permissions never change, and their effective permissions become unlimited.',
    },

    handoff: {
      canNow: [
        'Explain the PassRole path and the one call policy rewrite',
        'Name the four IAM write actions that reach the same escalation, not just the obvious one',
        'Write a CIEM rule that reports a path rather than a permission',
      ],
      note: 'Q3.9 is the policy reading question and Q3.12 asks for this rule directly. Facts 30 and 31 are the pair.',
    },
  },
}

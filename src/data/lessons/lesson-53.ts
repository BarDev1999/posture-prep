import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L53',
  number: 53,
  topicId: 'identity',
  sectionId: 5,
  title: 'Authentication versus authorization',
  objective:
    'You will be able to separate proving who you are from deciding what you may do, give a failure example of each, and write the rule for a system that treats the first as the second.',
  minutes: 12,
  difficulty: 'easy',
  sources: ['Q4.8', 'F44', 'F58'],

  steps: {
    vocabulary: [
      {
        term: 'authentication',
        definition: 'Proving who is making the request. It answers one question and never answers what they may do.',
      },
      {
        term: 'authorization',
        definition: 'Deciding whether this identity may perform this action on this object. It is a decision per request, not a state.',
      },
      {
        term: 'principal',
        definition: 'The identity a request is made as, once authentication has resolved it. Everything authorised is authorised for a principal.',
      },
      {
        term: 'privilege',
        definition: 'A permission granted to a principal. Holding one says nothing about whether it should be used on this particular object.',
      },
      {
        term: 'session',
        definition: 'The state that carries an authentication result forward, so later requests do not have to prove identity again.',
      },
    ],

    model: {
      narrative: [
        'This is the shortest lesson in the module and it is the one everything else in this topic stands on. Question 4.8 asks for both definitions and a failure example of each, and it is worth being able to give them without hedging.',
        '',
        'Authentication answers who. A password, a token, an assertion from an identity provider, a certificate. Its failure mode is somebody being accepted as a person they are not: a stolen password, a replayed token, a forged assertion.',
        '',
        'Authorization answers whether. It happens per request, on a specific object, for a specific action. Its failure mode is a legitimate person reaching something that is not theirs, which is the entire broken access control category and every IDOR you have already written a rule for.',
        '',
        'The mistake that joins them is treating the first as though it answered the second. A logged in user is not an authorised one, and the moment a system starts to behave as though they are, the authorisation decision moves from the code into a hope about who reaches the endpoint.',
        '',
        'This split is also what separates the two disciplines at the end of this topic. CIEM asks who holds permissions they do not need, which is an authorisation question. ITDR asks whether the identity making this request is really that identity, which is an authentication question, and only the second one catches a session token being replayed by somebody else.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'Two questions, two failure modes. Almost every identity finding in this section is one column or the other, and confusing them is the third.',
        left: {
          title: 'authentication',
          points: [
            'Question: who is making this request?',
            'Answered once, carried by a session.',
            'Failure: somebody is accepted as another person.',
            'Examples: stolen password, replayed token, forged assertion.',
          ],
        },
        right: {
          title: 'authorization',
          points: [
            'Question: may this principal do this, to this object?',
            'Answered per request, per object.',
            'Failure: a real user reaches what is not theirs.',
            'Examples: IDOR, a missing role check, a wildcard policy.',
          ],
        },
      },
      takeaway: 'Authentication answers who, once. Authorization answers whether, every time, for every object.',
    },

    worked: {
      task:
        'Write the rule for an endpoint that authenticates and then never authorises, which is the most common shape of the confusion.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The route definitions with their middleware, the handler code, and the identity model saying what objects belong to whom.',
          why: 'Middleware is where authentication usually lives, and its presence is what makes people believe the route is protected. The handler is where authorisation is missing.',
          prompt: {
            question: 'Why is the presence of authentication middleware part of the finding rather than a mitigation?',
            answer:
              'Because it is what creates the belief. A route with no authentication at all is obviously open and gets fixed. A route with a login check and no ownership check looks protected in every review, and the reviewer stops at the middleware.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A route with an authentication requirement, whose handler acts on an object identified in the request without any check tying that object to the authenticated principal.',
          why: 'The two halves are what make it detectable: something enforces identity, and nothing enforces ownership.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Who can obtain an account, what the object contains, whether the action writes, and whether identifiers are guessable.',
          why: 'On a platform where anyone can register, requiring authentication is not a meaningful barrier, and the severity should say so.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when accounts are self service and the action writes or exposes another user data. High when accounts are provisioned internally.',
          why: 'Self service registration turns any authenticated user into anyone at all, which removes the only thing that was limiting the attack.',
          prompt: {
            question: 'Why does internally provisioned still rate high rather than medium?',
            answer:
              'Because the population is every employee, every contractor and every compromised laptop belonging to one of them. It is a smaller set than the internet and it is not a small set, and treating an employee account as a control is how internal tools end up with none.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Routes acting only on objects derived from the session rather than from the request, and genuinely shared resources with a documented sharing model.',
          why: 'A handler that reads the principal own record from the session is correct by construction, and the rule has to recognise that shape or it fires on every profile page.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Add an ownership predicate to the query rather than a check after the fetch, and make the default for a new route a denial until a check is declared.',
          why: 'Predicate in the query, not a check afterwards, which is the same principle as authorising before retrieval. The default deny is what stops the next route repeating this.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The route with its authentication middleware, the handler line fetching by identifier alone, and one request from a second account reaching the first account object.',
          why: 'The middleware and the missing predicate side by side is the whole finding, and it explains why nobody noticed.',
        },
      ],
      result:
        'A rule for the gap between the two questions, which is where most real access control failures live.',
    },

    fadeLight: {
      task: 'A rule for an administrative action available to any authenticated user.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The route definitions with any role requirements, and the role model of the application.',
          why: 'The absence of a role requirement is the finding, so the route table is the source.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A route performing an administrative action with an authentication requirement and no role or permission requirement.',
          why: 'Precisely stated: authentication present, authorisation absent, action privileged.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the action does, whether it is reachable from the public interface, and whether the path appears in a client bundle.',
          why: 'A path in the client bundle is public knowledge, which removes the only thing hiding the route.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the action changes permissions, deletes data or affects other accounts, because any user of the system can perform it.',
          why: 'Actions that change permissions are the worst case: one call turns an ordinary user into an administrator, which is the identity version of policy self modification.',
          choices: [
            'Critical when the action changes permissions, deletes data or affects other accounts, because any user of the system can perform it.',
            'High, because the attacker must first hold a valid account.',
            'Medium, because administrative routes are not linked in the interface.',
            'Low, since the action is logged with the acting user.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Being unlinked is not a control, and logging is a record of what happened rather than a decision about whether it should have.',
    },

    fadeHeavy: {
      task: 'A rule for a service that trusts a user identifier passed in a header.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the header is set by a gateway that strips incoming copies, whether the service is reachable directly, and what it does with the identity.',
          why: 'The pattern is safe only when something upstream both sets the header and removes any version the caller sent, and both halves are needed.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the service is reachable without passing through the gateway, since a caller can name any user they like.',
          why: 'Direct reachability turns a trusted header into an authentication bypass with one request.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Verify a signed token in the service itself, and configure the gateway to strip the header from incoming requests as defence in depth.',
          why: 'Verify locally rather than trusting a hop, and keep the strip as a second layer rather than as the control.',
          choices: [
            'Verify a signed token in the service itself, and configure the gateway to strip the header from incoming requests as defence in depth.',
            'Restrict the service to the gateway address range with a network policy.',
            'Rename the header to something an attacker is unlikely to guess.',
            'Log every request where the header does not match the session.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The code reading the header, the gateway configuration showing whether it strips it, the network path to the service, and one direct request with a chosen identifier.',
          why: 'One direct request naming another user is the demonstration, and it takes a single command from inside the network.',
          choices: [
            'The code reading the header, the gateway configuration showing whether it strips it, the network path to the service, and one direct request with a chosen identifier.',
            'The gateway access logs for the last day.',
            'The list of services behind the same gateway.',
            'A statement that only the gateway can reach the service.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'A network restriction is a real second layer and it is the answer people reach for first. It leaves the service trusting whatever reaches it, which is a bet on the network staying exactly as it is today.',
    },

    parsons: {
      task:
        'Four of these belong in the authenticate but never authorise rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the identity check', code: 'the route requires an authenticated session' },
        { id: 'p2', label: 'the object', code: 'and its handler acts on an object named in the request' },
        { id: 'p3', label: 'the missing check', code: 'with no condition tying that object to the authenticated principal' },
        { id: 'p4', label: 'the reachability', code: 'and any user of the platform can obtain an account' },
        { id: 'd1', label: 'the identity check', code: 'and the session cookie has no HttpOnly flag', distractor: true },
        { id: 'd2', label: 'the missing check', code: 'and the handler does not log the access', distractor: true },
        { id: 'd3', label: 'the reachability', code: 'and the route responds in under one hundred milliseconds', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The cookie flag is a real finding from lesson 46 and it belongs to its own rule. Two findings in one condition means the ticket is closed when either half is fixed.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. An internal reporting tool authenticates through the company identity provider and then shows every report in the system, on the reasoning that only employees can log in. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The route and handler code, the report ownership model, and the identity provider group membership available in the session.',
          options: [
            'The route and handler code, the report ownership model, and the identity provider group membership available in the session.',
            'The reports themselves and their contents.',
            'The identity provider authentication logs.',
          ],
          why: 'The handler is where the check is missing and the group membership is what the check would have used.',
        },
        {
          part: 'condition',
          answer:
            'A route that authenticates the caller and lists or serves objects with no filter on ownership, department or group membership.',
          options: [
            'A route that authenticates the caller and lists or serves objects with no filter on ownership, department or group membership.',
            'A tool that authenticates through the company identity provider.',
            'A tool that shows reports to employees.',
          ],
          why: 'The missing filter is the finding. Federated authentication is the thing that made everyone comfortable, not the defect.',
        },
        {
          part: 'context',
          answer:
            'What the reports contain, how many employees can log in, whether contractors and former staff retain access, and whether group membership is available in the assertion.',
          options: [
            'What the reports contain, how many employees can log in, whether contractors and former staff retain access, and whether group membership is available in the assertion.',
            'How many reports are generated each month.',
            'Which reporting library the tool uses.',
          ],
          why: 'The contractor question is the one that changes minds: everyone who can log in is a larger set than everyone who should see finance reports.',
        },
        {
          part: 'severity',
          answer:
            'High. Every employee and contractor with a directory account can read every report, including ones about people and pay.',
          options: [
            'High. Every employee and contractor with a directory account can read every report, including ones about people and pay.',
            'Critical, because authentication is the only control present.',
            'Low, because everyone with access is an employee under contract.',
          ],
          why: 'Honest ranking: this is an internal over exposure rather than an external breach, and it is serious. The last option is the argument this rule exists to answer.',
        },
        {
          part: 'falsePositives',
          answer:
            'Tools whose entire content is deliberately company wide, such as a policy library, recorded as such with the owner named.',
          options: [
            'Tools whose entire content is deliberately company wide, such as a policy library, recorded as such with the owner named.',
            'Tools used only by the finance team, since they see the data anyway.',
            'Tools behind the company network, since outsiders cannot reach them.',
          ],
          why: 'Deliberately public within the company is a real category. Used only by is a habit rather than a control, and network position is not authorisation.',
        },
        {
          part: 'remediation',
          answer:
            'Filter every query by the group membership in the session, and default a report with no owner or group to nobody rather than to everybody.',
          options: [
            'Filter every query by the group membership in the session, and default a report with no owner or group to nobody rather than to everybody.',
            'Add a banner asking employees not to view reports that are not theirs.',
            'Restrict the tool to the corporate network.',
          ],
          why: 'The default matters as much as the filter: the unowned report is the one that leaks, and choosing nobody as its audience is the fail closed decision.',
        },
        {
          part: 'evidence',
          answer:
            'The handler query with no ownership filter, the group membership available in the session and unused, and one report visible to an account that should not see it.',
          options: [
            'The handler query with no ownership filter, the group membership available in the session and unused, and one report visible to an account that should not see it.',
            'A list of the most sensitive reports in the system.',
            'The number of employees with access to the tool.',
          ],
          why: 'Showing that the membership was already in the session and unused is what makes the fix obviously small.',
        },
      ],
      closing:
        'Everything in this topic from here is about the first column: how identity is proved across organisations, what can be forged, and what has to be validated. This lesson is the reminder that proving identity correctly still authorises nothing.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the reporting tool.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the identity check', code: 'the tool authenticates every caller through the identity provider' },
          { id: 'f2', label: 'the missing filter', code: 'and serves reports with no filter on ownership or group' },
          { id: 'f3', label: 'the population', code: 'and every employee and contractor can authenticate' },
          { id: 'f4', label: 'the impact', code: 'and the reports include personal and financial data' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Identity check, missing filter, population, impact. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'identity-authn-implies-authz',
      setup:
        'A design review for an internal service. The team explains that every request is authenticated by the gateway, so the service does not need its own permission checks.',
      code:
        'Gateway: validates the session and rejects anonymous requests\nService: trusts every request that reaches it\nReview note: authentication is centralised, so authorisation is covered.',
      language: 'text',
      question: 'What is missing from that reasoning?',
      options: [
        {
          text: 'Authentication says who is calling. Nothing yet decides whether that caller may have this particular object or perform this action.',
          correct: true,
        },
        { text: 'Nothing, provided the gateway cannot be bypassed on the network.', correct: false },
        { text: 'Only an audit trail, since the service cannot log which user acted.', correct: false },
        { text: 'Nothing for read operations, and writes would need their own checks.', correct: false },
      ],
      silently:
        'Every request is genuinely authenticated, so the logs are complete, the sessions are valid and nothing about the traffic looks wrong. Any authenticated user can read anything the service holds, and because the callers are real employees with real sessions, there is no anomaly to detect: the access pattern of somebody reading other people data looks exactly like somebody reading their own.',
      explanation:
        'The two questions are separate and the second one has to be answered per request, on the specific object, using the identity the first one established. Centralising authentication is good practice and it is a completely different control from authorisation, which cannot be centralised in the same way because only the service knows what its objects are and who they belong to. This is also the split that fact 58 uses at the end of this topic: CIEM asks who holds permissions they do not need, and ITDR asks whether the identity making the request is genuinely that identity.',
    },

    handoff: {
      canNow: [
        'Define both terms and give a failure example of each',
        'Spot the shape where authentication is present and authorisation is absent',
        'Explain why centralising authentication does not centralise authorisation',
      ],
      note: 'Q4.8 asks for both definitions with a failure example each. It is an easy question and the definitions have to be crisp, because everything else in section 5 assumes them.',
    },
  },
}

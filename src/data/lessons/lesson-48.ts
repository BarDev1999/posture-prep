import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L48',
  number: 48,
  topicId: 'linux-web-containers',
  sectionId: 4,
  title: 'Broken access control, IDOR, and SSRF',
  objective:
    'You will be able to say why access control is the first OWASP category, explain why scanners miss IDOR, and write the rules for an unauthorised object reference and a server side fetch.',
  minutes: 14,
  difficulty: 'hard',
  sources: ['F42', 'F44', 'F45', 'Q4.11', 'Q4.12'],

  steps: {
    vocabulary: [
      {
        term: 'access control',
        definition: 'Deciding whether this caller may perform this action on this object. It is the first OWASP category and the hardest to test automatically.',
      },
      {
        term: 'IDOR',
        definition: 'Insecure direct object reference: reaching a resource by its identifier without a check that the caller is authorised for that identifier.',
      },
      {
        term: 'horizontal escalation',
        definition: 'Reaching another user data at the same privilege level. This is what IDOR usually gives.',
      },
      {
        term: 'SSRF',
        definition: 'Server side request forgery: making the server issue a request to an address the attacker chose. Folded into A01 in the 2025 list.',
      },
      {
        term: 'allowlist',
        definition: 'A list of what is permitted, with everything else refused. The opposite of a blocklist, and the only version that holds.',
      },
    ],

    model: {
      narrative: [
        'Broken access control stays first in the OWASP list because it is the category that automated tools are worst at, and question 4.11 asks exactly why.',
        '',
        'The request is valid. The path is a real path, the identifier is a real identifier, the session is a real session, and the response is a normal 200 with well formed data. Nothing in the syntax is wrong. What is wrong is that this caller should not have had that object, and knowing who should is business knowledge rather than syntax knowledge. A scanner has no way to know that invoice 1042 belongs to another customer.',
        '',
        'That is also why the fix cannot be a filter. It has to be a check at the point where the object is fetched, using the identity from the session and never an identifier from the request.',
        '',
        'The 2025 list folded SSRF into this same category, and once you see why, it is obvious: SSRF is a request the server makes on behalf of a caller who was not authorised to make it. The attacker cannot reach the metadata service, or the internal admin page, or the database port, and the server can. The access control failure is that the server lends its position to whoever asks.',
        '',
        'Fact 45 gives the full path for the cloud case, and the controls: enforce version two of the metadata service, allowlist outbound destinations and block link local ranges, and check again after every redirect.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'Two failures in one category. Both are a caller reaching something they were not authorised for, using nothing but a valid request.',
        left: {
          title: 'IDOR',
          points: [
            'GET /invoices/1042 with a valid session.',
            'The object belongs to another customer.',
            'Response: 200, well formed, correct data.',
            'Missing: a check tying 1042 to the session.',
          ],
        },
        right: {
          title: 'SSRF',
          points: [
            'POST /preview with url=http://169.254.169.254/...',
            'The caller cannot reach that address. The server can.',
            'Response: 200, with whatever the server fetched.',
            'Missing: an allowlist on where the server will go.',
          ],
        },
      },
      takeaway: 'Both are valid requests reaching things the caller was not authorised for. Check at the fetch, using the session identity.',
    },

    worked: {
      task:
        'Write the rule for an unauthorised object reference, the finding question 4.11 is about, in a form a posture team can actually run.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The route definitions with their path parameters, the data access code behind each route, and the ownership model of the objects being fetched.',
          why: 'The route says an identifier is accepted, the data access code says whether ownership is checked, and the ownership model says what the check would have to compare.',
          prompt: {
            question: 'Why is this rule about code rather than about traffic?',
            answer:
              'Because in traffic every one of these requests looks correct. The absence of a check is only visible where the check would have been, which is in the data access path. Traffic can confirm exploitation and cannot find the defect.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A route that takes an object identifier as a path or query parameter, whose data access fetches by that identifier alone, with no predicate on the authenticated user or their organisation.',
          why: 'Fetches by identifier alone is the detectable shape: a query with a single where clause on the primary key, in a handler that has a session available.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether identifiers are sequential or guessable, what the object contains, whether the route is reachable by any authenticated user, and whether the response includes fields beyond the summary.',
          why: 'Sequential identifiers turn a possibility into a script. Guessable and sensitive is the pairing that decides severity.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when identifiers are sequential and the object holds personal or financial data. High when identifiers are random. Always at least high for a write operation, whatever the identifiers look like.',
          why: 'Random identifiers are obscurity and they do reduce exploitability, which is worth saying honestly while refusing to treat them as the control.',
          prompt: {
            question: 'The identifiers are random and long. Is the finding closed?',
            answer:
              'No, and this is the argument to be ready for. Identifiers leak: in emails, in referrer headers, in exported reports, in support tickets, in shared links. A random identifier means an attacker needs one to arrive rather than counting to it, and that happens all the time.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Genuinely public objects, and routes where the ownership predicate is applied in a shared data layer rather than in the handler, verified by reading that layer.',
          why: 'The second is common in well built applications and a rule that cannot see the shared layer will report every route in them.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Fetch with a predicate on both the identifier and the authenticated user, so an unauthorised identifier returns nothing rather than being fetched and then checked, and return the same not found response either way.',
          why: 'This is the same authorise before retrieval principle as the RAG lesson, in the place it came from. The identical response is what stops the endpoint confirming which identifiers exist.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The route, the data access line with its single predicate, the ownership model showing what should have been compared, and one request for an object belonging to another account.',
          why: 'The single predicate query is the finding in one line. The request is the demonstration, and in a test account it costs nothing.',
        },
      ],
      result:
        'A rule for the category scanners cannot cover, expressed as a shape in code, which is the only place the missing check is visible.',
    },

    fadeLight: {
      task: 'A rule for a server side fetch of a user supplied URL, which is question 4.12.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The code paths making outbound requests from a caller supplied address, and the egress controls of the environment they run in.',
          why: 'The feature is in the code and the reach is in the network, and the finding needs both.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'An outbound request whose destination comes from a request parameter, with no destination allowlist, no block on link local and private ranges, and no revalidation after redirects.',
          why: 'Three missing controls named separately, because a team often has one of them and believes it has all three.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the response body or an error containing it is returned to the caller, what internal services are reachable from that network position, and whether the platform metadata service requires a token.',
          why: 'Returning the body is exfiltration. The reachable set is the impact, and it is usually much larger than anyone expects.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the response is returned and the metadata service answers without a token, since that is the complete path from a form field to cloud credentials.',
          why: 'This is fact 45 stated as a severity, and it is the reason SSRF moved into the access control category rather than staying a curiosity.',
          choices: [
            'Critical when the response is returned and the metadata service answers without a token, since that is the complete path from a form field to cloud credentials.',
            'High, because the attacker can only reach services that trust the network position.',
            'Medium, because the fetch is a read operation.',
            'Low if the URL is validated to be a well formed HTTPS address.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The last option is worth remembering as a specific trap: a well formed HTTPS URL can point at a link local address, and validating the shape of a URL says nothing about its destination.',
    },

    fadeHeavy: {
      task: 'A rule for an administrative endpoint protected only by the absence of a link to it.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the endpoint appears in any client bundle or API schema, what it can do, and whether any authentication is required at all.',
          why: 'A path that appears in a JavaScript bundle is public knowledge, and most of them do.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the endpoint performs an administrative action with no authorisation check, because knowing the path is the only requirement.',
          why: 'This is forced browsing, which is the oldest item in the access control category and still the most common one in internal tools.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Require authentication and an explicit role check on the endpoint itself, and add a default deny so a new route without a check is refused rather than open.',
          why: 'The default deny is the durable half: it changes the cost of forgetting from an exposure to a broken deployment.',
          choices: [
            'Require authentication and an explicit role check on the endpoint itself, and add a default deny so a new route without a check is refused rather than open.',
            'Move the endpoint to a path that is harder to guess.',
            'Restrict the endpoint by source address at the load balancer.',
            'Remove the endpoint from the API documentation.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The route definition with no authorisation decorator or middleware, the action it performs, and a request to it from an unauthenticated session.',
          why: 'One unauthenticated request that succeeds is the whole finding, and no scanner needed to find it once the route list is in hand.',
          choices: [
            'The route definition with no authorisation decorator or middleware, the action it performs, and a request to it from an unauthenticated session.',
            'The list of all routes in the application.',
            'The client bundle where the path appears.',
            'A statement from the team that the endpoint is internal only.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Restricting by source address at the edge is a real control and it belongs in the context rather than the remediation: it reduces who can reach the endpoint and leaves it unauthorised for everyone who can.',
    },

    parsons: {
      task:
        'Four of these belong in the unauthorised object reference rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the route', code: 'a route accepts an object identifier from the caller' },
        { id: 'p2', label: 'the fetch', code: 'and the data access fetches by that identifier alone' },
        { id: 'p3', label: 'the missing predicate', code: 'with no condition tying the object to the authenticated user' },
        { id: 'p4', label: 'the impact', code: 'and the object holds data belonging to another customer' },
        { id: 'd1', label: 'the fetch', code: 'and the identifier is a sequential integer', distractor: true },
        { id: 'd2', label: 'the missing predicate', code: 'and the endpoint has no rate limiting', distractor: true },
        { id: 'd3', label: 'the impact', code: 'and the response includes more fields than the interface displays', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'Sequential identifiers and over wide responses both belong in the context rows, where they raise the severity. Putting sequential in the condition would exclude every application that switched to random identifiers and kept the missing check, which is the majority of them.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A document sharing feature lets a user pass a document identifier and an email address, and it sends that document to that address. The identifier is checked for existence, and the email is not checked against anything. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The route definition, the data access and send code behind it, and the ownership model for documents.',
          options: [
            'The route definition, the data access and send code behind it, and the ownership model for documents.',
            'The mail server logs for the sharing feature.',
            'The document storage bucket policy.',
          ],
          why: 'The defect is a missing predicate in code, and the ownership model is what the predicate would have compared against.',
        },
        {
          part: 'condition',
          answer:
            'A route that fetches a document by identifier with no predicate on the authenticated user, and sends it to an address supplied in the same request.',
          options: [
            'A route that fetches a document by identifier with no predicate on the authenticated user, and sends it to an address supplied in the same request.',
            'A route that sends documents by email.',
            'A route whose identifier parameter is not validated as a UUID.',
          ],
          why: 'The two halves together are what make this worse than an ordinary object reference: the attacker chooses both what is read and where it goes.',
        },
        {
          part: 'context',
          answer:
            'Whether identifiers are guessable, what documents contain, whether the destination address is restricted to the account domain, and whether sends are logged with both identifiers.',
          options: [
            'Whether identifiers are guessable, what documents contain, whether the destination address is restricted to the account domain, and whether sends are logged with both identifiers.',
            'How many documents each user typically shares.',
            'Which email provider the platform uses.',
          ],
          why: 'The address restriction is the control that would contain this even with the missing predicate, and the logging decides whether past abuse is findable.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Any authenticated user can read and exfiltrate any document in the system, and the exfiltration channel is a legitimate feature.',
          options: [
            'Critical. Any authenticated user can read and exfiltrate any document in the system, and the exfiltration channel is a legitimate feature.',
            'High, because the attacker must be an authenticated user of the platform.',
            'Medium, because the send is recorded in the mail logs.',
          ],
          why: 'Requiring authentication is a low bar on a platform anyone can sign up to, and a log records the theft rather than preventing it.',
        },
        {
          part: 'falsePositives',
          answer:
            'Routes where the fetch predicate includes the authenticated user and the destination is restricted to verified addresses on the account.',
          options: [
            'Routes where the fetch predicate includes the authenticated user and the destination is restricted to verified addresses on the account.',
            'Routes used by the support team to share documents with customers.',
            'Routes where the identifier is a long random value.',
          ],
          why: 'Both controls named and both checkable. A support workflow needing this power is a reason to build it deliberately with its own audit, not an exception to the rule.',
        },
        {
          part: 'remediation',
          answer:
            'Fetch with a predicate on the identifier and the authenticated user, restrict destinations to verified addresses on the account, and log both the document and the destination.',
          options: [
            'Fetch with a predicate on the identifier and the authenticated user, restrict destinations to verified addresses on the account, and log both the document and the destination.',
            'Validate that the identifier is a well formed UUID before use.',
            'Add a confirmation step where the user re enters the destination address.',
          ],
          why: 'Fix the predicate, bound the destination, record both. A confirmation step asks the attacker to type the address twice.',
        },
        {
          part: 'evidence',
          answer:
            'The data access line with its single predicate, the send call taking the address from the request, and one send of another account document to an external address in a test environment.',
          options: [
            'The data access line with its single predicate, the send call taking the address from the request, and one send of another account document to an external address in a test environment.',
            'A list of documents belonging to other accounts.',
            'The mail logs showing legitimate shares.',
          ],
          why: 'Two lines of code and one demonstration in a test environment. Enumerating other accounts documents to build a list is exactly the action the finding says is possible, and doing it makes you the incident.',
        },
      ],
      closing:
        'This is the shape worth carrying out of the lesson: an object reference with no ownership predicate, plus a feature that moves data outward. Neither half is exotic, and every application has both somewhere.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the document sharing feature.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the route', code: 'the route takes a document identifier and a destination address' },
          { id: 'f2', label: 'the fetch', code: 'and fetches the document by identifier alone' },
          { id: 'f3', label: 'the missing predicate', code: 'with no condition tying the document to the authenticated user' },
          { id: 'f4', label: 'the channel', code: 'and sends it to an address chosen in the same request' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Route, fetch, missing predicate, channel. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'web-idor-found-by-scanners',
      setup:
        'A security review. The team notes that the application is scanned nightly by an automated tool with no access control findings, and asks whether manual review of the object references is necessary.',
      code:
        'Nightly scan: 0 access control findings\nCoverage: all authenticated routes crawled with a valid session\nTeam question: the scanner covers A01, so why review the handlers by hand?',
      language: 'text',
      question: 'Why does a clean scan say so little here?',
      options: [
        {
          text: 'Every IDOR request is syntactically valid and returns a normal response. Knowing who should be authorised is business knowledge the scanner does not have.',
          correct: true,
        },
        { text: 'Because the scanner needs two sessions to test access control, and configuring that is usually skipped.', correct: false },
        { text: 'Because scanners cannot crawl routes that require a session at all.', correct: false },
        { text: 'It says a great deal. A clean scan is good evidence that access control is correct.', correct: false },
      ],
      silently:
        'The scan report is genuinely clean and it is used as evidence in the review, which is the expensive part: a clean result is read as absence of the defect rather than absence of the ability to detect it. The application keeps working correctly for every legitimate user, so no support ticket, no error rate and no anomaly ever points at the handler with the missing predicate.',
      explanation:
        'Fact 44 gives the reason and it is worth being able to say cleanly: the request is valid, the response is a normal 200 with well formed data, and detecting the defect requires knowing who should be authorised, which is business knowledge rather than syntax knowledge. The second option in that list is a real technique, and even with two sessions a scanner only finds the cases where it can guess another valid identifier. That is why OWASP keeps this category first, and why the useful posture rule looks for the shape in the code rather than the symptom in the traffic.',
    },

    handoff: {
      canNow: [
        'Say why broken access control is first and why automated tools are weak at it',
        'Write the missing predicate rule for an object reference, and the three controls for a server side fetch',
        'Explain why SSRF was folded into the access control category',
      ],
      note: 'Q4.11 and Q4.12 are both here, and facts 42, 44 and 45 cover the category change, the scanner question and the credential theft path. Two of them are on the priority list.',
    },
  },
}

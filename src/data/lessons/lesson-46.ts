import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L46',
  number: 46,
  topicId: 'linux-web-containers',
  sectionId: 4,
  title: 'HTTP: requests, responses, and sessions',
  objective:
    'You will be able to describe what a request and a response carry, explain how a session turns stateless requests into a logged in user, and write the rule for an authorisation check that fails open.',
  minutes: 13,
  difficulty: 'easy',
  sources: ['F41', 'F43', 'F47', 'Q4.7', 'Q4.14'],

  steps: {
    vocabulary: [
      {
        term: 'request',
        definition: 'A method, a path, headers and sometimes a body. Everything the server knows about who is asking arrives in it.',
      },
      {
        term: 'response',
        definition: 'A status code, headers and a body. The headers are where most of the security controls live.',
      },
      {
        term: 'session',
        definition: 'A value the server issues and the browser returns on every later request, standing for a user who has already authenticated.',
      },
      {
        term: 'stateless',
        definition: 'HTTP remembers nothing between requests. Every request has to carry its own proof of who is asking.',
      },
      {
        term: 'fail open',
        definition: 'Allowing the request when a security check errors. The opposite, and the correct default, is fail closed: deny on error.',
      },
    ],

    model: {
      narrative: [
        'HTTP is simpler than it looks and its simplicity is the source of most web vulnerabilities.',
        '',
        'A request carries a method, a path, headers and possibly a body. That is all. The server has no memory of the previous request, so anything it knows about the caller has to be in this one: a session cookie, a token in a header, or nothing at all.',
        '',
        'A session is how that is patched. The user authenticates once, the server issues a value, and the browser returns it automatically on every later request. From then on, the session value is the user, which is why stealing it is as good as knowing the password and why so much of web security is about keeping it from being read or sent by someone else.',
        '',
        'The web section of this exam is built on the 2025 OWASP list, and two things about it are worth knowing precisely. SSRF is no longer its own category: it was folded into A01 Broken Access Control, which says something about how OWASP now thinks of it. And there are two new categories, A03 Software Supply Chain Failures and A10 Mishandling of Exceptional Conditions.',
        '',
        'A10 is the one this lesson ends on, because it is the failure that hides inside correct looking code: a security check that answers yes when it errors. Fact 47 is the rule, and it is short: for any security decision, the default on error must be deny.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'One authenticated request. The session cookie is the only thing tying it to a user, and the authorisation check is the only thing tying the user to the object.',
        nodes: [
          { label: 'GET /invoices/1042', note: 'A method and a path. Nothing here says who is asking.' },
          { label: 'Cookie: session=abc123', note: 'The browser attaches it automatically. This is the whole of the identity.' },
          { label: 'the server resolves the session to a user', note: 'Authentication. It answers who, and nothing else.' },
          {
            label: 'the server checks the user may see invoice 1042',
            note: 'Authorisation. If this errors and the code allows the request, everything after it is wrong.',
            danger: true,
          },
          { label: '200 with the invoice', note: 'Indistinguishable from a legitimate response, whichever way the check went.' },
        ],
      },
      takeaway: 'Every request carries its own identity, and every security decision must deny when it cannot decide.',
    },

    worked: {
      task:
        'Question 4.14: write the rule for the classic A10 failure, an authorisation call wrapped in a try block that returns true when it fails.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The application source in the repository, specifically the exception handling around authorisation and authentication calls, plus the error rate of the authorisation service.',
          why: 'The pattern is in code and the exploitability is in the error rate: a check that fails open matters much more if the service behind it is unreliable.',
          prompt: {
            question: 'Why is the error rate part of the data source rather than the context?',
            answer:
              'Because it decides whether this is a design flaw or an active exposure. A dependency that errors under load means the fail open path runs whenever the site is busy, which is exactly when nobody is reading logs.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'An exception handler around an authorisation or authentication call whose handling path returns true, returns a permissive default, or continues past the check rather than denying.',
          why: 'Three shapes of the same mistake. The third is the one that is hardest to see, because there is no return value at all: the code simply carries on.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the protected operation does, whether the failure path is logged, whether the dependency times out under load, and whether the endpoint is reachable without authentication.',
          why: 'An unlogged fail open is invisible forever. Logging it does not fix it and it does decide whether you would ever find out.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the protected operation writes or exposes data belonging to other users. High when it is read only within one tenant. Always at least high, because the failure is silent and reachable by causing an error.',
          why: 'The floor matters here: an attacker who can make the dependency error, by load or by a malformed input, chooses when the check fails.',
          prompt: {
            question: 'How would an attacker cause the authorisation service to error deliberately?',
            answer:
              'Load is the crude way. The precise way is an input the check cannot handle: an identifier of the wrong type, a very long value, a unicode character in a lookup key. If a malformed request makes the check throw, the fail open path is not a rare accident, it is an endpoint.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Handlers that catch a specific expected exception and then deny, and non security code paths where a permissive default is correct, such as a feature flag lookup.',
          why: 'A feature flag defaulting to on is fine and lives in the same shape of code, so the rule has to distinguish by what the call is rather than by the syntax.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Deny on every path where the decision could not be made, log the failure with the reason, and add a test that asserts a denial when the authorisation dependency throws.',
          why: 'The test is what stops it coming back. The behaviour is invisible in normal operation, so only an assertion keeps it fixed.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The handler with its return, the endpoints reachable through it, the error rate of the dependency, and one request where the failure path ran.',
          why: 'A real request through the failure path is the artefact that ends the discussion about likelihood.',
        },
      ],
      result:
        'A rule for a defect that no scanner finds and no user reports, because from outside a fail open response is identical to a legitimate one.',
    },

    fadeLight: {
      task: 'A rule for a session cookie without the flags that protect it.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The response headers of the login endpoint, and the session configuration in the application framework.',
          why: 'The header is what the browser acts on, and the configuration is where it comes from.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A session cookie set without HttpOnly, without Secure, or with SameSite set to none and no other cross site protection.',
          why: 'Three flags, three different attacks: script access, plain text transmission, and cross site submission.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the site has any place that renders user content, whether it is served only over TLS, and how long the session lives.',
          why: 'The first is the link to cross site scripting: HttpOnly matters most exactly where an injected script could read the cookie.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High for a missing HttpOnly on a site that renders user content, since any script injection becomes session theft. Medium for the others.',
          why: 'The flags are not equally urgent, and ranking them by what they combine with is more useful than a single compliance score.',
          choices: [
            'High for a missing HttpOnly on a site that renders user content, since any script injection becomes session theft. Medium for the others.',
            'Critical for any missing cookie flag.',
            'Low, because cookie flags are hardening rather than vulnerabilities.',
            'High only when the site is served over plain HTTP.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Cookie flags are the cheapest control in web security and the easiest to leave off, and they only matter in combination with something else, which is why they are so often deferred.',
    },

    fadeHeavy: {
      task: 'A rule for an endpoint that returns a different error for an existing and a non existing account.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the endpoint is reachable without authentication, whether it is rate limited, and whether the difference is in the status code, the body or the timing.',
          why: 'A timing difference is a real signal and much harder to fix, so knowing which kind it is decides the remediation.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Medium. It is an information disclosure that turns a list of email addresses into a list of accounts, and it is a step in an attack rather than an attack.',
          why: 'Honest ranking again. Account enumeration is real, well known, and not the thing to lead a report with.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Return the same response for both cases, including the same status code and a comparable response time, and rate limit the endpoint.',
          why: 'Comparable timing is the part usually skipped, and it is what makes the fix actually hold against a patient attacker.',
          choices: [
            'Return the same response for both cases, including the same status code and a comparable response time, and rate limit the endpoint.',
            'Return a generic error message while keeping the different status codes.',
            'Add a CAPTCHA to the endpoint.',
            'Block the addresses that make repeated failed attempts.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'Two requests, one for a known account and one for a random address, with their status codes, bodies and response times side by side.',
          why: 'Two requests side by side is the entire finding, and it takes thirty seconds to produce.',
          choices: [
            'Two requests, one for a known account and one for a random address, with their status codes, bodies and response times side by side.',
            'A list of accounts enumerated from the endpoint.',
            'The authentication service source code.',
            'The rate limiting configuration for the site.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Enumerating a list of real accounts to prove the point is the wrong evidence. It works, and it turns your finding into a data handling question about the list you now hold.',
    },

    parsons: {
      task:
        'Four of these belong in the fail open rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the call', code: 'an authorisation or authentication check is made in a request path' },
        { id: 'p2', label: 'the handler', code: 'and it is wrapped in an exception handler' },
        { id: 'p3', label: 'the default', code: 'whose failure path allows the request rather than denying it' },
        { id: 'p4', label: 'the impact', code: 'and the operation behind it exposes or modifies data belonging to other users' },
        { id: 'd1', label: 'the handler', code: 'and the exception is caught as a generic exception type', distractor: true },
        { id: 'd2', label: 'the default', code: 'and the failure is not written to the application log', distractor: true },
        { id: 'd3', label: 'the impact', code: 'and the endpoint has no rate limiting', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'Catching a broad exception type and not logging the failure are both real problems and both belong in the context rows: they make this worse, and neither is what makes it a finding. Keeping the condition to the defect itself is what stops a rule drifting into a code style checker.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A billing endpoint calls an entitlement service to decide whether the caller may download an invoice. When the service times out, the code logs a warning and serves the invoice. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The billing service source around the entitlement call, the entitlement service error and timeout rates, and the endpoint route definitions.',
          options: [
            'The billing service source around the entitlement call, the entitlement service error and timeout rates, and the endpoint route definitions.',
            'The invoices themselves and their access logs.',
            'The billing database schema.',
          ],
          why: 'The code holds the defect and the timeout rate says how often the defective path runs.',
        },
        {
          part: 'condition',
          answer:
            'An entitlement or authorisation call whose timeout or error path continues to serve the protected resource rather than returning a denial.',
          options: [
            'An entitlement or authorisation call whose timeout or error path continues to serve the protected resource rather than returning a denial.',
            'An endpoint that calls an external service before serving a response.',
            'An endpoint whose dependency times out more than once a day.',
          ],
          why: 'The defect is the behaviour on the error path. Calling a dependency and having it time out are both normal.',
        },
        {
          part: 'context',
          answer:
            'What an invoice contains, whether the endpoint is reachable by any authenticated user, and whether an attacker can cause the timeout deliberately.',
          options: [
            'What an invoice contains, whether the endpoint is reachable by any authenticated user, and whether an attacker can cause the timeout deliberately.',
            'How many invoices the system stores.',
            'Which payment provider the invoices reference.',
          ],
          why: 'Deliberate causation is the difference between an occasional leak and an endpoint anyone can drive.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Any authenticated user can read any invoice whenever the entitlement service is slow, and load is something a caller can influence.',
          options: [
            'Critical. Any authenticated user can read any invoice whenever the entitlement service is slow, and load is something a caller can influence.',
            'High, because the failure only happens when the dependency is unavailable.',
            'Medium, because a warning is logged every time it occurs.',
          ],
          why: 'Only happening under failure is not rare when the failure is inducible, and a log line is a record of the leak rather than a control against it.',
        },
        {
          part: 'falsePositives',
          answer:
            'Paths where the fallback is itself a deny, and non security lookups such as a display preference where a permissive default is correct.',
          options: [
            'Paths where the fallback is itself a deny, and non security lookups such as a display preference where a permissive default is correct.',
            'Services with a high availability target, which rarely time out.',
            'Endpoints that require authentication, since the caller is already known.',
          ],
          why: 'Authentication is not authorisation, and an availability target is a promise rather than a control. The first option is the only real exception.',
        },
        {
          part: 'remediation',
          answer:
            'Deny on timeout and on error, return a clear failure to the caller, add a retry with a short budget, and add a test asserting the denial when the dependency throws.',
          options: [
            'Deny on timeout and on error, return a clear failure to the caller, add a retry with a short budget, and add a test asserting the denial when the dependency throws.',
            'Increase the timeout so the call succeeds more often.',
            'Cache the last known entitlement answer and use it when the service is unavailable.',
          ],
          why: 'A longer timeout narrows the window without changing the behaviour in it. A cached answer is defensible and is a design decision with its own risk, not a fix for a fail open path.',
        },
        {
          part: 'evidence',
          answer:
            'The error handling code that serves the invoice, the timeout rate of the entitlement service, and one log line showing the warning followed by a served invoice.',
          options: [
            'The error handling code that serves the invoice, the timeout rate of the entitlement service, and one log line showing the warning followed by a served invoice.',
            'A test that downloads another user invoice by forcing a timeout.',
            'The entitlement service architecture diagram.',
          ],
          why: 'The log line proves it has already happened in production. Forcing a timeout to prove it is a denial of service against a live dependency, which is not a test to run without agreement.',
        },
      ],
      closing:
        'A10 exists as a category because this failure is invisible from outside and passes every functional test. The only way it is found is by reading the error path, which is the part of the code nobody reads.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the billing endpoint.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the call', code: 'the endpoint calls an entitlement service before serving an invoice' },
          { id: 'f2', label: 'the error path', code: 'and on timeout the code logs a warning and continues' },
          { id: 'f3', label: 'the default', code: 'so the invoice is served with no entitlement decision made' },
          { id: 'f4', label: 'the impact', code: 'and invoices belong to other customers' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Call, error path, default, impact. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'web-fail-open-is-safer',
      setup:
        'A reliability review. The authorisation service caused an outage last quarter, so the team adds a fallback: when it is unreachable, requests proceed. The change is described as removing a single point of failure.',
      code:
        'try:\n    allowed = entitlements.check(user, invoice_id)\nexcept EntitlementServiceError:\n    logger.warning("entitlement service unavailable, allowing")\n    allowed = True\n\nif allowed:\n    return serve(invoice_id)',
      language: 'python',
      question: 'What has this change actually removed?',
      options: [
        {
          text: 'The authorisation decision. When the dependency is down, every caller is authorised for everything the endpoint can serve.',
          correct: true,
        },
        { text: 'Nothing important. The service is rarely down, and the warning is logged.', correct: false },
        { text: 'Only the audit trail, since the decision is no longer recorded.', correct: false },
        { text: 'The single point of failure, at the cost of slower responses during an outage.', correct: false },
      ],
      silently:
        'Availability improves, the outage does not recur, and the change is remembered as a success. The failure is invisible in every way that matters: the response looks identical, the status code is 200, and the only trace is a warning line in a log nobody reads during an incident because the site is up. Whether anybody exploited it is unanswerable afterwards, because the logs record that the check was skipped and not who received what.',
      explanation:
        'Fail open trades a security property for an availability one, and the trade is almost never stated in those terms when it is made. Fact 47 gives the rule: fail closed denies on error, fail open allows, and for any security decision the default on error must be deny. The classic bug is exactly this shape, a try block around an authorisation call returning true on failure, which is why the 2025 OWASP list added A10 Mishandling of Exceptional Conditions as a category of its own. When availability genuinely matters, the answer is to make the decision fast and local, not to skip it.',
    },

    handoff: {
      canNow: [
        'Describe what a request and a response carry, and how a session stands in for a user',
        'Name the two new categories in the 2025 OWASP list and what happened to SSRF',
        'Write a rule for a security check that allows when it cannot decide',
      ],
      note: 'Q4.7 is the SSRF question and Q4.14 is fail open. Facts 41, 43 and 47 cover the list and the category, and 41 is on the priority list.',
    },
  },
}

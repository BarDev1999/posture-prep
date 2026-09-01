import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L55',
  number: 55,
  topicId: 'identity',
  sectionId: 5,
  title: 'The SAML flow, step by step',
  objective:
    'You will be able to walk the service provider initiated flow in order, say who signs what and where the assertion travels, and write the rule for a flow that skips a step.',
  minutes: 14,
  difficulty: 'medium',
  sources: ['F51', 'Q5.2', 'F52'],

  steps: {
    vocabulary: [
      {
        term: 'SP initiated',
        definition: 'The flow that starts at the application. The user asks for a page, is redirected to the identity provider, and comes back with an assertion.',
      },
      {
        term: 'AuthnRequest',
        definition: 'The message the service provider sends to start the flow. It names itself and carries an identifier the response must echo.',
      },
      {
        term: 'assertion consumer service',
        definition: 'The service provider endpoint that receives the response. Its address is in the configuration and in the request, and the response says which one it was for.',
      },
      {
        term: 'InResponseTo',
        definition: 'The field in the response echoing the request identifier. It is what ties a response to a request the service provider actually made.',
      },
      {
        term: 'IdP initiated',
        definition: 'A flow with no request at all: the identity provider posts an assertion to the application unprompted. Convenient, and it removes the request to tie back to.',
      },
    ],

    model: {
      narrative: [
        'Question 5.2 asks for the flow step by step including who signs what, so here it is in order.',
        '',
        'The user asks the service provider for a protected page. The service provider has no session, so it builds an AuthnRequest with a fresh identifier and redirects the browser to the identity provider. The identity provider authenticates the user however it likes, including a second factor. It then builds a response containing an assertion, signs it with its private key, and returns it to the browser. The browser posts it to the assertion consumer service endpoint at the service provider. The service provider validates it and creates its own local session.',
        '',
        'Two details in that sequence matter more than the rest.',
        '',
        'First, the assertion travels through the browser. It is not a back channel call between two servers: the user agent carries it, which means whoever controls the browser holds a valid assertion in their hands for a moment. That is why replay protection is not optional and why the next lesson exists.',
        '',
        'Second, the identity provider signs and the service provider validates. There is no negotiation, no callback, no check with the identity provider afterwards. Once the assertion is accepted, the identity provider is out of the picture entirely, which is the property the last lesson of this topic turns into an attack.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'The service provider initiated flow. Note where the assertion is: in the browser, twice, on its way to an endpoint that will accept it.',
        nodes: [
          { label: 'the user requests a protected page', note: 'No session at the service provider yet.' },
          { label: 'the SP redirects with an AuthnRequest', note: 'It names itself and includes a fresh request identifier.' },
          { label: 'the IdP authenticates the user', note: 'Password, second factor, device posture. All of it happens here and only here.' },
          {
            label: 'the IdP signs an assertion and returns it through the browser',
            note: 'The browser now holds a valid credential for that application.',
            danger: true,
          },
          { label: 'the browser posts it to the assertion consumer service', note: 'The service provider validates the signature and every field.' },
          { label: 'the SP creates a local session', note: 'From here the identity provider is not consulted again.' },
        ],
      },
      takeaway: 'The IdP signs, the SP validates, and the assertion crosses the browser on the way. Everything after acceptance is local.',
    },

    worked: {
      task:
        'Write the rule for a flow with the replay protections missing: no request identifier echoed, and no single use enforcement on the assertion identifier.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The service provider federation settings, the assertion consumer service implementation or its library configuration, and whether IdP initiated flows are enabled.',
          why: 'The protections are implemented in the consumer, and the setting that turns them off is often a single flag in a library configuration.',
          prompt: {
            question: 'Why does enabling IdP initiated flows weaken replay protection?',
            answer:
              'Because there is no request to echo. Without an AuthnRequest there is no identifier for InResponseTo to match, so the service provider has to accept an unsolicited assertion, and one of its strongest checks is unavailable by construction.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A service provider that does not require InResponseTo to match a request it issued, or does not enforce one time use of the assertion identifier, or accepts unsolicited assertions with no compensating control.',
          why: 'Three conditions joined by or, because each removes a different protection and any one of them makes replay easier.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the application holds, whether assertions are logged with their identifiers, how long the validity window is, and whether the endpoint is reachable from the internet.',
          why: 'The validity window is the replay window. A five minute window with no single use enforcement is five minutes in which a captured assertion works repeatedly.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High. An assertion captured from a browser, a log, a proxy or a referrer can be replayed until the window closes, and with no single use enforcement it works more than once.',
          why: 'Not critical, because capturing it requires a position, and high because the position is often available: a shared machine, a browser extension, a logging proxy.',
          prompt: {
            question: 'Where would an assertion realistically be captured, if not by an attacker on the network?',
            answer:
              'The everyday answers are all local: browser history and the back button on a shared machine, a corporate proxy that logs request bodies, a crash or error report that includes the posted form, and a browser extension with permission to read page content. None of them requires a network position at all.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Service providers using a maintained library with these checks on by default, verified from the library version and configuration rather than from documentation.',
          why: 'Most of these checks are correct by default in maintained libraries, so the rule should confirm the version rather than reimplement the audit.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Require the request identifier to match, record assertion identifiers and reject repeats, keep the validity window short, and disable unsolicited flows unless a specific application needs them.',
          why: 'Four small changes, all in the consumer, and each of them is a line in a configuration rather than a project.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The consumer configuration for each check, the validity window, and one assertion replayed successfully in a test environment.',
          why: 'A replay in a test environment is a clean demonstration: it needs no attacker, only the same assertion posted twice.',
        },
      ],
      result:
        'A rule over four small checks in the one place where the flow can be attacked without touching the identity provider at all.',
    },

    fadeLight: {
      task: 'A rule for an assertion consumer endpoint reachable over plain HTTP.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The registered assertion consumer service URLs and the transport configuration of that endpoint.',
          why: 'The registered URL is what the identity provider will post to, so the finding is in the registration as much as in the server.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'An assertion consumer service URL registered with an unencrypted scheme, or a service accepting posts over plain HTTP.',
          why: 'Two halves: what is registered and what is accepted, because either one is enough to put an assertion on the wire in clear text.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the endpoint is internet facing, whether the assertion is encrypted as well as signed, and what the application holds.',
          why: 'Encryption of the assertion body changes this materially, and it is often not enabled because signing is mistaken for confidentiality.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the endpoint is internet facing and the assertion is not encrypted, since anyone on the path holds a usable credential.',
          why: 'A signed assertion is readable by anyone who sees it. Signing proves who wrote it and hides nothing.',
          choices: [
            'Critical when the endpoint is internet facing and the assertion is not encrypted, since anyone on the path holds a usable credential.',
            'High, because the signature prevents the assertion from being modified in transit.',
            'Medium, because the assertion is only valid for a few minutes.',
            'Low, since most corporate traffic is on a private network anyway.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The second option is true and irrelevant: modification is not the attack. Reading and reusing is, and a signature does nothing about either.',
    },

    fadeHeavy: {
      task: 'A rule for a validity window that is too long.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'The configured window, whether single use is enforced, whether the clock skew allowance is separate, and what the application holds.',
          why: 'A long window with single use enforcement is a smaller finding than a short window without it, so the two have to be read together.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Medium on its own, and high when single use is not enforced, because the window is then the replay window.',
          why: 'The two settings multiply rather than adding, which is why they belong in one finding.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Shorten the window to a few minutes, keep the clock skew allowance separate and small, and enforce single use of assertion identifiers.',
          why: 'Separating skew from validity is the detail that lets you shorten the window without breaking logins on a host with a drifting clock.',
          choices: [
            'Shorten the window to a few minutes, keep the clock skew allowance separate and small, and enforce single use of assertion identifiers.',
            'Extend the window so that logins never fail during clock drift.',
            'Validate the window only for administrative accounts.',
            'Rely on the session timeout at the application instead.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The configured validity and skew values, whether identifiers are recorded, and a successful replay inside the window in a test environment.',
          why: 'The replay inside the window is the artefact that makes the two settings feel like one finding rather than two preferences.',
          choices: [
            'The configured validity and skew values, whether identifiers are recorded, and a successful replay inside the window in a test environment.',
            'The average time between login and first page load.',
            'The identity provider clock synchronisation configuration.',
            'A list of applications with the same window setting.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'The session timeout at the application is a different clock entirely: it governs how long the local session lasts after acceptance, not how long the assertion can be used to obtain one.',
    },

    parsons: {
      task:
        'Order the six steps of the service provider initiated flow, which is question 5.2. Two of the blocks describe things that do not happen.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the trigger', code: 'the user requests a protected page and the SP finds no session' },
        { id: 'p2', label: 'the request', code: 'the SP redirects the browser to the IdP with a signed AuthnRequest' },
        { id: 'p3', label: 'the authentication', code: 'the IdP authenticates the user, including any second factor' },
        { id: 'p4', label: 'the assertion', code: 'the IdP signs an assertion and returns it through the browser' },
        { id: 'p5', label: 'the consumption', code: 'the browser posts it to the assertion consumer service, which validates it' },
        { id: 'p6', label: 'the session', code: 'the SP creates its own local session and the IdP is not consulted again' },
        {
          id: 'd1',
          label: 'the verification',
          code: 'the SP calls the IdP over a back channel to confirm the assertion',
          distractor: true,
        },
        {
          id: 'd2',
          label: 'the session',
          code: 'the SP asks the IdP to confirm the session on every later request',
          distractor: true,
        },
      ],
      solution: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
      closing:
        'Both distractors invent a conversation between the two servers. There is none in this flow, and that absence is exactly what makes the signature the whole of the trust, and what makes the attack in lesson 58 invisible to the identity provider.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. An application supports IdP initiated login so that users can start from the company portal. It accepts unsolicited assertions, does not record assertion identifiers, and has a ten minute validity window. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The assertion consumer configuration, the flow settings including unsolicited support, and the validity and single use settings.',
          options: [
            'The assertion consumer configuration, the flow settings including unsolicited support, and the validity and single use settings.',
            'The company portal configuration and its link list.',
            'The application session store.',
          ],
          why: 'Every one of the missing protections is a setting on the consumer side, which is where the rule has to look.',
        },
        {
          part: 'condition',
          answer:
            'A service provider accepting unsolicited assertions with no single use enforcement and a validity window longer than a few minutes.',
          options: [
            'A service provider accepting unsolicited assertions with no single use enforcement and a validity window longer than a few minutes.',
            'A service provider that supports IdP initiated login.',
            'A service provider with a ten minute validity window.',
          ],
          why: 'Support for the flow is a product decision. The finding is that flow with none of the compensating protections.',
        },
        {
          part: 'context',
          answer:
            'What the application holds, whether assertions appear in logs or proxies, whether the portal is used on shared machines, and how many users the flow serves.',
          options: [
            'What the application holds, whether assertions appear in logs or proxies, whether the portal is used on shared machines, and how many users the flow serves.',
            'How often users start from the portal rather than the application.',
            'Which identity provider product the company uses.',
          ],
          why: 'Where the assertion might be captured is the exposure, and shared machines and logging proxies are the two everyday answers.',
        },
        {
          part: 'severity',
          answer:
            'High. A captured assertion can be replayed repeatedly for ten minutes against an endpoint that cannot tell a replay from a first use.',
          options: [
            'High. A captured assertion can be replayed repeatedly for ten minutes against an endpoint that cannot tell a replay from a first use.',
            'Critical, because unsolicited assertions are always critical.',
            'Medium, because capturing an assertion requires access to the browser.',
          ],
          why: 'Capture requires a position and the positions are ordinary, which is why this sits at high rather than at either extreme.',
        },
        {
          part: 'falsePositives',
          answer:
            'Applications where unsolicited flows are supported but identifiers are recorded and reused assertions are rejected, verified from the configuration.',
          options: [
            'Applications where unsolicited flows are supported but identifiers are recorded and reused assertions are rejected, verified from the configuration.',
            'Applications whose users are all internal employees.',
            'Applications behind a virtual private network.',
          ],
          why: 'The compensating control is single use enforcement. Network position does not stop a replay from the same browser that captured it.',
        },
        {
          part: 'remediation',
          answer:
            'Record assertion identifiers and reject repeats, shorten the validity window, and prefer service provider initiated flows so the request identifier can be checked.',
          options: [
            'Record assertion identifiers and reject repeats, shorten the validity window, and prefer service provider initiated flows so the request identifier can be checked.',
            'Disable the portal links so users always start at the application.',
            'Encrypt the assertion so it cannot be read in transit.',
          ],
          why: 'Single use first, then the window, then the flow. Encryption helps against capture in transit and not against capture at the browser.',
        },
        {
          part: 'evidence',
          answer:
            'The configuration showing unsolicited assertions accepted, no identifier store, the ten minute window, and a replay succeeding twice in a test environment.',
          options: [
            'The configuration showing unsolicited assertions accepted, no identifier store, the ten minute window, and a replay succeeding twice in a test environment.',
            'A captured assertion from a production login.',
            'The portal usage statistics.',
          ],
          why: 'Two successful posts of the same assertion is the whole demonstration. Capturing a production assertion means holding somebody live credential, which is not evidence you want in a ticket.',
        },
      ],
      closing:
        'The flow itself is worth being able to recite, because the next lesson is a list of what the last step has to validate, and it only makes sense once you can see where each field came from.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the unsolicited flow.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the flow', code: 'the service provider accepts unsolicited assertions' },
          { id: 'f2', label: 'the missing tie', code: 'so there is no request identifier to match against' },
          { id: 'f3', label: 'the missing single use', code: 'and assertion identifiers are not recorded or rejected on reuse' },
          { id: 'f4', label: 'the window', code: 'and the validity window is long enough to replay in' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Flow, missing tie, missing single use, window. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'identity-browser-is-trusted-channel',
      setup:
        'A threat model review. Somebody asks whether an assertion could be stolen, and the answer given is that it travels between the identity provider and the application over a server to server channel.',
      code:
        'Claim: the assertion goes from the IdP directly to the SP.\nTherefore: it cannot be captured by the user or by anything on their device.\nConclusion: replay protection is unnecessary.',
      language: 'text',
      question: 'Where does the assertion actually travel?',
      options: [
        {
          text: 'Through the browser. The IdP returns it to the user agent, which posts it to the service provider, so anything with access to the browser sees it.',
          correct: true,
        },
        { text: 'Directly between the two servers, over a mutually authenticated channel.', correct: false },
        { text: 'Through the browser, but encrypted so that only the service provider can read it.', correct: false },
        { text: 'Directly between the two servers for SP initiated flows and through the browser only for IdP initiated ones.', correct: false },
      ],
      silently:
        'The threat model records that capture is impossible, so the replay protections are never implemented and never missed. The flow works, logins succeed, and the assertion sits in the browser history, in a proxy log, in a crash report and on the screen of a shared machine, in a form that any of those can post again. Nothing detects the reuse, because the service provider has no record of which assertions it has already seen.',
      explanation:
        'In the browser based flows the user agent carries the assertion in both directions, which is why the standard defines InResponseTo, a validity window and one time use of the assertion identifier at all. Fact 52 lists those as fields the service provider must validate, and they exist precisely because the channel is not private to the two servers. The third option is worth noting as well: assertion encryption is available and often not enabled, because signing is mistaken for confidentiality, and a signed assertion is perfectly readable by whoever holds it.',
    },

    handoff: {
      canNow: [
        'Walk the service provider initiated flow in order, naming who signs and who validates',
        'Say where the assertion travels and why that makes replay protection necessary',
        'Write a rule for the three replay protections and say what each one ties down',
      ],
      note: 'Q5.2 asks for the flow step by step including who signs what. It is a mark you either have or do not, so recite it once out loud before moving on.',
    },
  },
}

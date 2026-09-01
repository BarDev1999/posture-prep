import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L56',
  number: 56,
  topicId: 'identity',
  sectionId: 5,
  title: 'What the SP must validate, and what breaks if it does not',
  objective:
    'You will be able to list the fields a service provider must validate in an assertion, say what each one prevents, and write the rule for the one that is most often missed.',
  minutes: 14,
  difficulty: 'hard',
  sources: ['F52', 'F53', 'Q5.6', 'F51'],

  steps: {
    vocabulary: [
      {
        term: 'Issuer',
        definition: 'Who minted the assertion. It has to be one of the issuers this service provider trusts, and the signature has to match that issuer certificate.',
      },
      {
        term: 'Audience',
        definition: 'Who the assertion was minted for. It has to name this service provider, or an assertion for another application is accepted here.',
      },
      {
        term: 'NotBefore and NotOnOrAfter',
        definition: 'The validity window. Outside it the assertion must be refused, which is what keeps an old one from working forever.',
      },
      {
        term: 'Destination',
        definition: 'The endpoint the response was intended for. It has to match the endpoint that received it.',
      },
      {
        term: 'one time use',
        definition: 'Recording the assertion identifier and refusing it a second time, so a captured assertion works at most once.',
      },
    ],

    model: {
      narrative: [
        'Question 5.6 asks for four fields and what breaks if one is not checked. Fact 52 gives the full list, and it is short enough to memorise: the signature, Issuer, Audience, NotBefore and NotOnOrAfter, Destination, and InResponseTo plus one time use of the identifier.',
        '',
        'Each one prevents a specific thing, and it is the pairing that makes them worth remembering rather than the list.',
        '',
        'The signature stops forgery: without it anyone can write an assertion. Issuer stops a valid signature from the wrong issuer being accepted. Audience stops an assertion minted for another service provider being replayed here, which fact 53 names directly as token replay across services. The validity window stops an old assertion working. Destination stops a response for one endpoint being posted to another. InResponseTo ties it to a request this service provider made, and one time use stops the same assertion being used twice.',
        '',
        'Audience is the one worth dwelling on, and it is the one question 5.6 is fishing for. Every other check is about forgery or timing. Audience is about scope: a user who legitimately logs in to a low value application receives a genuine, correctly signed, in date assertion, and if a second application does not check Audience, that same assertion logs them in there too.',
        '',
        'So the honest summary of validation is: a valid signature tells you the assertion is real. It does not tell you it was for you.',
      ].join('\n'),
      diagram: {
        kind: 'stack',
        caption:
          'The checks, and the attack each one refuses. Skip any single layer and the assertion is still signed, still in date, and accepted somewhere it should not be.',
        layers: [
          { label: 'signature valid for a trusted issuer', note: 'Refuses forgery and assertions from issuers this SP does not trust.', trust: 'trusted' },
          { label: 'Audience names this service provider', note: 'Refuses an assertion minted for another application. This is the one most often skipped.', trust: 'mixed' },
          { label: 'NotBefore and NotOnOrAfter', note: 'Refuses an assertion outside its window, which is what stops one working forever.', trust: 'mixed' },
          { label: 'Destination matches this endpoint', note: 'Refuses a response intended for a different consumer endpoint.', trust: 'mixed' },
          { label: 'InResponseTo and one time use', note: 'Refuses an unsolicited or repeated assertion.', trust: 'mixed' },
        ],
      },
      takeaway: 'A valid signature says the assertion is real. Audience is what says it was for you.',
    },

    worked: {
      task:
        'Write the rule for a service provider that validates the signature and not the Audience, which is the most consequential single omission in this list.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The assertion consumer implementation or its library configuration, the registered entity identifier for this service provider, and the list of applications sharing the same identity provider.',
          why: 'The last one is the impact: the risk is proportional to how many other applications the same identity provider serves, because each of them is a source of usable assertions.',
          prompt: {
            question: 'Why does the number of other applications decide the severity?',
            answer:
              'Because each one issues assertions for the same users, signed by the same trusted issuer. If Audience is not checked, every application anyone can legitimately log in to becomes a place to obtain an assertion that works here. One is a curiosity; forty is an authentication bypass with a queue of entry points.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A service provider that accepts an assertion without comparing its Audience against its own entity identifier, or that compares it to a list including identifiers it does not own.',
          why: 'Both shapes: not checking at all, and checking against a list somebody widened during an integration.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'How many applications share the identity provider, which of them are low value or self service, what this application holds, and whether the other checks are present.',
          why: 'A low value application with the same issuer is the cheapest place to obtain an assertion, and that is the path an attacker uses.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when other applications share the issuer, because a genuine assertion from any of them logs the user in here. High when this is the only application on that issuer.',
          why: 'This is not a hardening gap: with a shared issuer it is an authentication bypass using nothing but a legitimate login somewhere else.',
          prompt: {
            question: 'Why is it still high when this is the only application on the issuer?',
            answer:
              'Because sole occupancy is a fact about today. The next application onboarded to the same identity provider makes this critical with no change to this application and no review of it, so the finding is a standing exposure to a decision somebody else will make.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Deliberate multi audience configurations for a family of applications under one entity identifier, verified from the identity provider configuration rather than from the code comment.',
          why: 'This exists and is legitimate in some product suites. Verifying from the identity provider side is what distinguishes it from an accidental omission.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Compare Audience against this service provider own entity identifier and refuse anything else, and add the remaining checks from the list at the same time.',
          why: 'The rest of the list is the same file and the same afternoon, so a finding on one is the moment to fix all of them.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The validation code or configuration with the missing comparison, the entity identifier, the list of applications on the same issuer, and one assertion from another application accepted here in a test environment.',
          why: 'An assertion from a different application accepted here is unarguable, and in a test environment it costs one login.',
        },
      ],
      result:
        'A rule for the check that separates real from mine, and a severity that depends on how many other applications are sitting behind the same issuer.',
    },

    fadeLight: {
      task: 'A rule for a service provider that does not validate the validity window.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The validation configuration for the time fields, and the clock synchronisation of the receiving host.',
          why: 'The clock matters because a host with a drifting clock is the usual reason somebody widened or disabled the check.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A service provider that ignores NotBefore or NotOnOrAfter, or allows a clock skew measured in hours.',
          why: 'Ignoring and effectively ignoring, since a large skew allowance is the same outcome by a friendlier name.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether single use is enforced, whether assertions appear in logs, and what the application holds.',
          why: 'Single use enforcement is the compensating control: without a window, the identifier store is the only thing stopping indefinite reuse.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High. An assertion captured at any point in the past keeps working, so a single old capture from a log or a shared machine is a permanent credential.',
          why: 'Permanence is what makes this worse than an ordinary replay window: nothing expires it.',
          choices: [
            'High. An assertion captured at any point in the past keeps working, so a single old capture from a log or a shared machine is a permanent credential.',
            'Medium, because the assertion still has to be captured first.',
            'Low, because the application session will expire anyway.',
            'Critical, because any missing validation is critical.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The application session expiring is beside the point: a working assertion obtains a new session whenever the holder wants one.',
    },

    fadeHeavy: {
      task: 'A rule for a service provider that accepts an assertion signed by any certificate in a trust store.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Which certificates are in the store, whether any is a public certificate authority, and whether the expected issuer fingerprint is pinned anywhere.',
          why: 'A public certificate authority in the store is the worst case: anybody who can obtain a certificate from it can mint assertions.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the trust store includes a public certificate authority, since the signature check no longer identifies the issuer at all.',
          why: 'The check passes, the Issuer field can say anything, and the trust has been reduced to knowing that somebody bought a certificate.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Pin the expected certificate or its fingerprint per issuer, and validate the Issuer field against that specific pairing rather than against a store.',
          why: 'Pinning per issuer is the model this protocol assumes, and a general trust store is a habit borrowed from transport security where it belongs.',
          choices: [
            'Pin the expected certificate or its fingerprint per issuer, and validate the Issuer field against that specific pairing rather than against a store.',
            'Remove expired certificates from the trust store and review it quarterly.',
            'Require assertions to be encrypted as well as signed.',
            'Enable certificate revocation checking on the trust store.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The trust store contents, the validation code showing no per issuer pinning, and an assertion signed by an unrelated certificate from the store being accepted in a test environment.',
          why: 'One accepted assertion from an unrelated certificate demonstrates that the signature check identifies nobody in particular.',
          choices: [
            'The trust store contents, the validation code showing no per issuer pinning, and an assertion signed by an unrelated certificate from the store being accepted in a test environment.',
            'The list of certificate authorities in the operating system store.',
            'The identity provider certificate and its expiry date.',
            'A statement that only the identity provider certificate is used in practice.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Every wrong option improves the hygiene of the trust store and leaves the underlying problem: the check answers is this signed by something we trust, and the question is was this signed by the issuer we expect.',
    },

    parsons: {
      task:
        'Four of these belong in the missing Audience rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the validation gap', code: 'the service provider does not compare Audience against its own entity identifier' },
        { id: 'p2', label: 'the shared issuer', code: 'and other applications accept assertions from the same issuer' },
        { id: 'p3', label: 'the cheap source', code: 'and at least one of those applications is low value or self service' },
        { id: 'p4', label: 'the impact', code: 'and this application holds data or actions worth reaching' },
        { id: 'd1', label: 'the shared issuer', code: 'and the issuer certificate expires within ninety days', distractor: true },
        { id: 'd2', label: 'the cheap source', code: 'and the other applications are hosted by third parties', distractor: true },
        { id: 'd3', label: 'the impact', code: 'and the application has no rate limiting on the consumer endpoint', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'Third party hosting is the closest to relevant and still belongs in context rather than the condition: what matters is that an assertion can be obtained, not who runs the application it came from.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A company has forty applications behind one identity provider. One is a self service internal wiki that any employee can log in to. An administrative application on the same issuer validates the signature and the validity window, and nothing else. Write the rule.',
      rows: [
        {
          part: 'source',
          answer:
            'The administrative application validation configuration, its entity identifier, and the list of applications sharing the same issuer.',
          options: [
            'The administrative application validation configuration, its entity identifier, and the list of applications sharing the same issuer.',
            'The wiki access logs and its user list.',
            'The identity provider sign in logs for the last month.',
          ],
          why: 'The gap is in the administrative application, and the shared issuer list is what turns the gap into a path.',
        },
        {
          part: 'condition',
          answer:
            'A service provider validating the signature and the window but not Audience, Destination, InResponseTo or one time use, on an issuer shared with other applications.',
          options: [
            'A service provider validating the signature and the window but not Audience, Destination, InResponseTo or one time use, on an issuer shared with other applications.',
            'A service provider that validates only the signature.',
            'An identity provider serving more than thirty applications.',
          ],
          why: 'Naming the specific missing checks is what makes the finding fixable, and the shared issuer is what makes it urgent.',
        },
        {
          part: 'context',
          answer:
            'Which of the shared applications are self service, what the administrative application can do, and whether any of the missing checks is present in a shared library rather than this code.',
          options: [
            'Which of the shared applications are self service, what the administrative application can do, and whether any of the missing checks is present in a shared library rather than this code.',
            'How many employees use the wiki each week.',
            'Which SAML library version the wiki uses.',
          ],
          why: 'The shared library question is worth asking before filing: the check may exist one layer down, and the finding then changes to a configuration flag.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Any employee can log in to the wiki, capture their own genuine assertion, and post it to the administrative application, which will accept it.',
          options: [
            'Critical. Any employee can log in to the wiki, capture their own genuine assertion, and post it to the administrative application, which will accept it.',
            'High, because the attacker must already be an employee with a valid account.',
            'Medium, because the assertion is only valid for a few minutes.',
          ],
          why: 'The attacker uses their own credential and their own browser, so there is nothing to steal and nothing to detect. The window is long enough to post it once.',
        },
        {
          part: 'falsePositives',
          answer:
            'Applications deliberately sharing one entity identifier as a suite, verified from the identity provider service provider registration.',
          options: [
            'Applications deliberately sharing one entity identifier as a suite, verified from the identity provider service provider registration.',
            'Applications where all users are trusted employees.',
            'Applications where the missing checks are documented as accepted risk.',
          ],
          why: 'A documented acceptance is a decision about the finding rather than a reason it does not apply, and this is a decision worth revisiting with the severity in front of it.',
        },
        {
          part: 'remediation',
          answer:
            'Validate Audience against the entity identifier, add Destination, InResponseTo and one time use, and separate the administrative application onto its own issuer or application group if the platform allows.',
          options: [
            'Validate Audience against the entity identifier, add Destination, InResponseTo and one time use, and separate the administrative application onto its own issuer or application group if the platform allows.',
            'Require a second factor for the administrative application.',
            'Remove the wiki from the shared identity provider.',
          ],
          why: 'Fix the validation first. A second factor at the identity provider is a good control and it is bypassed entirely by an assertion the application accepts without checking who it was for.',
        },
        {
          part: 'evidence',
          answer:
            'The validation code showing which checks run, the entity identifier, the shared issuer list, and a wiki assertion accepted by the administrative application in a test environment.',
          options: [
            'The validation code showing which checks run, the entity identifier, the shared issuer list, and a wiki assertion accepted by the administrative application in a test environment.',
            'A captured assertion from a production wiki login.',
            'The list of administrators of the administrative application.',
          ],
          why: 'The cross application acceptance in a test environment is the whole finding demonstrated with your own account and nobody credential at risk.',
        },
      ],
      closing:
        'Fact 53 is one sentence and this is what it means in practice: an assertion minted for a different service provider is accepted, which is token replay across services, and the only thing that would have stopped it is one string comparison.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the missing Audience check.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the validation gap', code: 'the administrative application does not check Audience' },
          { id: 'f2', label: 'the shared issuer', code: 'and it shares an assertion issuer with forty other applications' },
          { id: 'f3', label: 'the cheap source', code: 'and one of those is a self service wiki any employee can use' },
          { id: 'f4', label: 'the impact', code: 'and the administrative application performs privileged actions' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Gap, shared issuer, cheap source, impact. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'identity-signature-is-enough',
      setup:
        'A code review of an assertion consumer. The signature validation is correct and thorough, against a pinned certificate, and the reviewer approves on that basis.',
      code:
        'if not verify_signature(assertion, EXPECTED_CERT):\n    raise Unauthorized()\n\nuser = assertion.subject          # accepted\nsession = create_session(user)    # logged in',
      language: 'python',
      question: 'What has the signature check established, and what has it not?',
      options: [
        {
          text: 'That the assertion is genuine and unmodified. Not that it was minted for this application, that it is still in date, or that it has not already been used.',
          correct: true,
        },
        { text: 'Everything necessary. A valid signature from the expected certificate is sufficient.', correct: false },
        { text: 'Nothing useful, since the certificate could have been replaced in the configuration.', correct: false },
        { text: 'That the user authenticated recently, since the identity provider signs only fresh assertions.', correct: false },
      ],
      silently:
        'This code is correct in the part everybody looks at, which is why it is approved. Logins work, forged assertions are rejected, and the certificate is pinned rather than trusted from a store. Assertions minted for other applications on the same issuer are accepted, old ones keep working, and the same one can be used repeatedly, and none of that produces an error, a log line or a failed request.',
      explanation:
        'A signature answers who wrote this and was it modified. It cannot answer who it was for, when it was valid, where it was meant to be posted, or whether this is the second time. Fact 52 lists the fields precisely because each one answers a question the signature does not: Issuer, Audience, NotBefore and NotOnOrAfter, Destination, and InResponseTo with one time use of the identifier. Fact 53 names the consequence of skipping Audience, which is token replay across services, and it is the omission with the largest consequence in any company running one identity provider behind many applications.',
    },

    handoff: {
      canNow: [
        'List the fields a service provider must validate, and say what each one prevents',
        'Explain why Audience is the one with the largest consequence',
        'Write the rule and rank it by how many applications share the issuer',
      ],
      note: 'Q5.6 asks for four fields and what breaks if one is unchecked. Facts 52 and 53 are the pair, and 52 is on the priority list.',
    },
  },
}

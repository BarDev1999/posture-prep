import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L54',
  number: 54,
  topicId: 'identity',
  sectionId: 5,
  title: 'Why federation exists, and what an IdP and an SP are',
  objective:
    'You will be able to say what problem federation solves, name who issues and who consumes an assertion, and write the rule for a service provider that trusts more issuers than it should.',
  minutes: 12,
  difficulty: 'easy',
  sources: ['F51', 'Q5.1', 'Q5.3'],

  steps: {
    vocabulary: [
      {
        term: 'federation',
        definition: 'Letting one system vouch for a user to another, so the second never sees the credential and does not have to store one.',
      },
      {
        term: 'identity provider',
        definition: 'The system that authenticates the user and issues a signed statement about them. Written IdP.',
      },
      {
        term: 'service provider',
        definition: 'The application the user wants to reach. It consumes the statement and decides whether to accept it. Written SP.',
      },
      {
        term: 'assertion',
        definition: 'The signed statement itself: who the user is, who it was issued for, and when it is valid. In SAML it is XML.',
      },
      {
        term: 'trust relationship',
        definition: 'The configuration on the service provider naming which issuer it accepts and with which certificate. It is the whole of the trust.',
      },
    ],

    model: {
      narrative: [
        'Federation exists because the alternative is worse. Without it, every application stores its own passwords, every one of them is a place a password can leak, and revoking access when somebody leaves means finding all of them.',
        '',
        'With it, one system authenticates the user and every application accepts a signed statement about the result. The application never sees the password, never stores one, and access ends when the identity provider says it does.',
        '',
        'Question 5.1 asks who issues and who consumes, and it is worth being exact: the identity provider authenticates the user and signs the assertion, and the service provider consumes it and validates the signature against the certificate it expects. Those are the two roles, and everything in the next three lessons is about what the consumer has to check.',
        '',
        'The property that makes this work is the certificate. The service provider trusts assertions signed by a specific key belonging to a specific issuer, and that trust relationship is configuration on the service provider side. Which is why the interesting posture questions here are about that configuration: how many issuers are trusted, with which certificates, and who can add another one.',
        '',
        'The password never travels. That is the point people get wrong, and it is the trap on this lesson.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'What federation moves and what it does not. The credential stays with the identity provider; only a signed statement about it travels.',
        nodes: [
          { label: 'the user authenticates at the IdP', note: 'Password, second factor, device check. This happens once, in one place.' },
          { label: 'the IdP signs an assertion', note: 'Who the user is, which service it is for, and how long it is valid.' },
          { label: 'the assertion travels to the SP', note: 'Through the browser, which is the part that matters in the next lesson.' },
          {
            label: 'the SP validates the signature',
            note: 'Against the certificate for the issuer it expects. This is the entire trust.',
            danger: true,
          },
          { label: 'the SP creates its own session', note: 'From here the user is logged in locally, and the IdP is not consulted again.' },
        ],
      },
      takeaway: 'The identity provider authenticates and signs, the service provider validates and accepts. The password never reaches the application.',
    },

    worked: {
      task:
        'Write the rule for a service provider whose trust configuration accepts more than it should: extra issuers, extra certificates, or a certificate nobody is tracking.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The service provider federation configuration: the trusted issuers, the certificates for each, their expiry dates, and the change history of that configuration.',
          why: 'This is a small, high value configuration that almost nobody scans. The change history matters because an added issuer is an event rather than a state.',
          prompt: {
            question: 'Why is an added issuer more interesting than an added user?',
            answer:
              'Because an issuer can mint any user. Adding a user grants one account; adding a trusted issuer grants the ability to assert every account, including the administrators, and it looks like an integration rather than a privilege change.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A service provider trusting more than one issuer without a documented reason, or holding a signing certificate that is expired, self signed by an unknown party, or not present in the identity provider current metadata.',
          why: 'Three shapes: extra issuers, stale certificates, and certificates that no longer correspond to anything the identity provider is publishing.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'What the application holds, who can change the federation configuration, whether the extra issuer is a known partner, and when each certificate was added.',
          why: 'Who can change the configuration is the real question. In many products it is a tenant administrator, which is a lower bar than anyone expects.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical for an unexplained trusted issuer, since it can assert any identity. High for a stale certificate that is still accepted. Medium for an expired certificate that is now failing closed.',
          why: 'Ranked by what an attacker gains: minting identities, using an old key, or nothing at all beyond a broken login.',
          prompt: {
            question: 'Why is an expired certificate a finding at all, if it can no longer be used?',
            answer:
              'Because of what happens next. An expired certificate means federated login is broken, and the fix is made in a hurry by whoever is on call, which is exactly the situation in which a second issuer gets added or signature validation gets loosened. It is medium because the exposure is the response rather than the state.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Deliberate multi issuer configurations for partners or for a migration, recorded with the partner name, the certificate fingerprint and an end date.',
          why: 'Migrations genuinely need two issuers for a while, and the end date is what stops the temporary state becoming permanent.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Remove issuers with no documented owner, pin the expected certificate fingerprint, alert on any change to the federation configuration, and restrict who may change it.',
          why: 'Alerting on the change is the durable control here, because the configuration is read rarely and changed even more rarely, so a change is always worth a look.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The trust configuration with each issuer and fingerprint, the identity provider published metadata for comparison, and the change history showing who added what and when.',
          why: 'Comparing the configured fingerprint against the published metadata is the check nobody runs, and it takes one request to the metadata endpoint.',
        },
      ],
      result:
        'A rule over a configuration that is small, rarely read, and able to grant the ability to be anybody. Those three properties together are why it is worth a rule.',
    },

    fadeLight: {
      task: 'A rule for an application still holding local passwords after federation was introduced.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The application authentication configuration and its user store, plus the federation configuration.',
          why: 'The finding is the coexistence of two paths, so both have to be read.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'An application with federation configured that also accepts local password authentication for accounts that exist in the identity provider.',
          why: 'The overlap is the finding: a second door for the same people, outside every control on the first one.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the local passwords are subject to the same policy, whether the second factor applies to them, and whether local logins are logged in the same place.',
          why: 'The local path usually escapes the second factor, which is the part that makes it worth finding.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High. The local path bypasses the identity provider controls, including multi factor authentication and conditional access, for accounts that appear protected.',
          why: 'Every control the company believes it has on these accounts lives on the other path.',
          choices: [
            'High. The local path bypasses the identity provider controls, including multi factor authentication and conditional access, for accounts that appear protected.',
            'Medium, because local passwords are also strong and rotated.',
            'Low, because only administrators know the local login page exists.',
            'Critical, because any application storing passwords is critical.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'A second authentication path is the identity equivalent of an account outside the organisation guardrails: everything you believe about the population is true on one path and not the other.',
    },

    fadeHeavy: {
      task: 'A rule for a signing certificate approaching expiry.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'How many service providers trust this certificate, whether the identity provider rotates automatically, and how the rotation is communicated.',
          why: 'A manual certificate replacement across many service providers is an operational event, and it is the moment mistakes are made.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Medium as a security finding and high as an availability one, since expiry breaks every federated login at once.',
          why: 'Honest again: expiry fails closed, so the risk is an outage rather than an exposure, and the security risk is what people do in a hurry to end it.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Schedule the rotation, update each service provider from published metadata rather than by hand, and alert at sixty and thirty days before expiry.',
          why: 'Updating from metadata is what stops a fingerprint being pasted wrongly into one of twenty configurations during an outage.',
          choices: [
            'Schedule the rotation, update each service provider from published metadata rather than by hand, and alert at sixty and thirty days before expiry.',
            'Extend the certificate validity period to ten years.',
            'Disable signature validation temporarily during the rotation.',
            'Add a second trusted issuer as a fallback during the rotation.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The certificate with its expiry, the list of service providers configured with it, and whether each one reads metadata automatically or holds a pasted copy.',
          why: 'The list of service providers with pasted copies is the work item, and it is usually longer than anyone expects.',
          choices: [
            'The certificate with its expiry, the list of service providers configured with it, and whether each one reads metadata automatically or holds a pasted copy.',
            'The certificate chain and its issuer.',
            'The number of logins per day through this identity provider.',
            'A screenshot of the certificate details from the console.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'The third wrong option is the one that happens at three in the morning during an outage, and it turns an availability incident into the trap this whole topic ends on.',
    },

    parsons: {
      task:
        'Four of these belong in the trusted issuer rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the configuration', code: 'the service provider trusts one or more assertion issuers' },
        { id: 'p2', label: 'the extra trust', code: 'and one of them has no documented owner or business reason' },
        { id: 'p3', label: 'the certificate', code: 'or its certificate does not appear in the identity provider current metadata' },
        { id: 'p4', label: 'the change', code: 'and the configuration was changed without an approved record' },
        { id: 'd1', label: 'the extra trust', code: 'and the issuer name does not match the company domain', distractor: true },
        { id: 'd2', label: 'the certificate', code: 'and the certificate uses a key shorter than four thousand bits', distractor: true },
        { id: 'd3', label: 'the change', code: 'and the configuration has not been reviewed in a year', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The domain distractor would flag every legitimate partner federation, which is common and correct. Key length is a real hygiene item with its own rule, and an unreviewed configuration is a process finding rather than a property of the trust.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. An internal application was federated to the company identity provider, and during a proof of concept last year a second issuer was added for a vendor demonstration. It is still there. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The application federation configuration with each trusted issuer and certificate, and the change history for that configuration.',
          options: [
            'The application federation configuration with each trusted issuer and certificate, and the change history for that configuration.',
            'The application login logs for the past year.',
            'The vendor contract and its expiry date.',
          ],
          why: 'The configuration is the exposure and the history says when and by whom it arrived.',
        },
        {
          part: 'condition',
          answer:
            'An application trusting an issuer with no current business relationship, or one added for a temporary purpose with no end date recorded.',
          options: [
            'An application trusting an issuer with no current business relationship, or one added for a temporary purpose with no end date recorded.',
            'An application trusting more than one issuer.',
            'An application that was part of a proof of concept.',
          ],
          why: 'Multiple issuers is a legitimate configuration. The finding is one with no owner and no end date.',
        },
        {
          part: 'context',
          answer:
            'What the application holds, who controls the vendor issuer today, whether any login has arrived through it, and who may edit the trust configuration.',
          options: [
            'What the application holds, who controls the vendor issuer today, whether any login has arrived through it, and who may edit the trust configuration.',
            'How many users the application has.',
            'Which version of the SAML standard the application supports.',
          ],
          why: 'Who controls the vendor issuer today is the question nobody asks: a demonstration tenant may have been deleted, transferred or left with a shared administrator password.',
        },
        {
          part: 'severity',
          answer:
            'Critical. Whoever controls that issuer can assert any user of this application, including administrators, with no password and no second factor.',
          options: [
            'Critical. Whoever controls that issuer can assert any user of this application, including administrators, with no password and no second factor.',
            'High, because the vendor is a reputable company under contract.',
            'Medium, because no login has ever arrived through that issuer.',
          ],
          why: 'The absence of past logins says nothing about future ones, and the reputation of the vendor is not the question when nobody knows who holds the tenant now.',
        },
        {
          part: 'falsePositives',
          answer:
            'Partner federations with a named owner, a recorded business reason and a review date, verified from the configuration record rather than from memory.',
          options: [
            'Partner federations with a named owner, a recorded business reason and a review date, verified from the configuration record rather than from memory.',
            'Issuers added by the identity team, who follow the standard process.',
            'Issuers that have not been used in the last ninety days.',
          ],
          why: 'The last option inverts the risk: an unused trusted issuer is the most suspicious kind, not the safest.',
        },
        {
          part: 'remediation',
          answer:
            'Remove the issuer, and require every trust addition to carry an owner, a reason and an end date, with an alert on any change to the configuration.',
          options: [
            'Remove the issuer, and require every trust addition to carry an owner, a reason and an end date, with an alert on any change to the configuration.',
            'Ask the vendor to confirm they no longer use the integration.',
            'Restrict the issuer to a subset of users in the application.',
          ],
          why: 'Remove it and fix the process that let it persist. Asking the vendor makes the decision depend on somebody else memory of a demonstration.',
        },
        {
          part: 'evidence',
          answer:
            'The trust configuration listing both issuers, the change record showing when the second was added and by whom, and the absence of any owner or end date for it.',
          options: [
            'The trust configuration listing both issuers, the change record showing when the second was added and by whom, and the absence of any owner or end date for it.',
            'The vendor security questionnaire from the proof of concept.',
            'The list of users who could be asserted through the issuer.',
          ],
          why: 'Three artefacts, all from the configuration, and the missing owner is the strongest of them because nobody can defend what nobody owns.',
        },
      ],
      closing:
        'Trust configurations are small, rarely read and quietly powerful, which is exactly the profile of the findings worth automating. The next lesson walks the flow that this configuration authorises.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the leftover issuer.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the configuration', code: 'the application trusts two assertion issuers' },
          { id: 'f2', label: 'the extra trust', code: 'and the second was added for a temporary demonstration' },
          { id: 'f3', label: 'the missing record', code: 'and it carries no owner, reason or end date' },
          { id: 'f4', label: 'the impact', code: 'and that issuer can assert any user, including administrators' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Configuration, extra trust, missing record, impact. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'identity-federation-shares-passwords',
      setup:
        'A vendor review. Someone asks whether federating with a partner means the partner application will receive employee passwords, and proposes rejecting the integration on that basis.',
      code:
        'Question: if we federate, does the partner SP get our passwords?\nProposed answer: yes, so we should not federate.\nAlternative proposed: give the partner a separate local account instead.',
      language: 'text',
      question: 'What does the service provider actually receive?',
      options: [
        {
          text: 'A signed assertion stating who the user is and when it is valid. The password stays at the identity provider and never travels.',
          correct: true,
        },
        { text: 'A hash of the password, which it verifies against its own copy.', correct: false },
        { text: 'The password itself, encrypted in transit, which is why the certificate matters.', correct: false },
        { text: 'Nothing about the user at all, only a yes or no answer to an authentication query.', correct: false },
      ],
      silently:
        'The proposed alternative is the damaging part. Rejecting federation and issuing local accounts to partner users produces exactly the situation federation exists to avoid: another password store, outside the identity provider, with no second factor, no conditional access and no way to revoke access when somebody leaves the partner company. The decision is made for security reasons and lowers security in every dimension that matters.',
      explanation:
        'Fact 51 gives the roles: the identity provider authenticates the user and signs the assertion, and the service provider consumes it and validates the signature against the expected certificate. The credential never leaves the identity provider, which is precisely why federation is preferable: one place holds secrets, one place enforces the second factor, and one place ends access. The last wrong option is worth noticing too, because the assertion carries attributes as well as an outcome, and which attributes it carries is often the interesting design question.',
    },

    handoff: {
      canNow: [
        'Say what federation solves and what actually travels between the two parties',
        'Name who issues an assertion and who validates it',
        'Write a rule over a trust configuration, and say why an unused trusted issuer is the suspicious one',
      ],
      note: 'Q5.1 is the two roles and it is an easy mark. Fact 51 is one sentence and the next three lessons all depend on it.',
    },
  },
}

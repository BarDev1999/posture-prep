import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L58',
  number: 58,
  topicId: 'identity',
  sectionId: 5,
  title: 'Golden SAML, and ITDR versus CIEM',
  objective:
    'You will be able to describe what a Golden SAML attacker needs, say why multi factor authentication does not help and why the identity provider logs are empty, and write the detection logic.',
  minutes: 15,
  difficulty: 'hard',
  sources: ['F55', 'F58', 'Q5.7', 'Q5.8', 'Q5.9'],

  steps: {
    vocabulary: [
      {
        term: 'Golden SAML',
        definition: 'An attack where somebody with admin on the identity provider steals the token signing certificate and private key, then mints valid assertions for any user.',
      },
      {
        term: 'token signing key',
        definition: 'The private key the identity provider signs assertions with. Holding it is the ability to be anybody at every service provider that trusts it.',
      },
      {
        term: 'ITDR',
        definition: 'Identity Threat Detection and Response: real time detection at the identity layer, including token theft, MFA fatigue and federation abuse.',
      },
      {
        term: 'CIEM',
        definition: 'Cloud Infrastructure Entitlement Management: posture at the identity layer, asking who holds permissions they do not need.',
      },
      {
        term: 'service provider side evidence',
        definition: 'Sign in records held by the application rather than by the identity provider. In this attack they are the only records that exist.',
      },
    ],

    model: {
      narrative: [
        'This is the last lesson and it is the one that ties the topic together, because it is an attack on the trust model rather than on any implementation.',
        '',
        'What the attacker needs is narrow and specific: administrative access to the identity provider, and from there the token signing certificate and its private key. Question 5.7 asks for exactly that.',
        '',
        'With the key they mint assertions themselves. Any user, any group membership, any validity window, correctly signed by the certificate every service provider is configured to trust. No password, no session theft, no exploit at the application.',
        '',
        'Two consequences follow, and they are the reason this attack is famous. Multi factor authentication does not help, because authentication never happens: nobody logs in to the identity provider, so nothing prompts for a second factor. And the identity provider logs show nothing, because the identity provider was never involved: it did not issue this assertion and has no record that one exists.',
        '',
        'Which is why fact 55 ends where it does: evidence exists only on the service provider side. The application recorded a sign in; the identity provider recorded no corresponding authentication. That gap is the detection, and it is the answer to question 5.8.',
        '',
        'It is also the cleanest illustration of fact 58. CIEM would tell you that too many people hold admin on the identity provider, which is the posture finding that prevents this. ITDR is what notices the assertion that nobody authenticated for, which is the detection that catches it. Two disciplines, two moments, and only the second one sees a valid credential being misused.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'Golden SAML. Every hop is legitimate from the service provider point of view, and the identity provider is absent from all of them after the first.',
        nodes: [
          { label: 'admin access on the identity provider', note: 'The prerequisite. Everything else follows from it, which is why CIEM is the prevention.' },
          {
            label: 'export the token signing certificate and private key',
            note: 'One export. From here the attacker no longer needs the identity provider at all.',
            danger: true,
          },
          { label: 'mint an assertion for any user', note: 'Any identity, any groups, any window. Signed by the key every SP trusts.' },
          { label: 'post it to a service provider', note: 'It validates perfectly: correct signature, correct issuer, correct audience.' },
          { label: 'a session at the application', note: 'Recorded there as a normal federated sign in, with no matching authentication anywhere.' },
        ],
      },
      takeaway: 'The key is the identity. No authentication happens, so MFA is irrelevant and the IdP logs are empty by construction.',
    },

    worked: {
      task:
        'Question 5.8: write the detection logic for Golden SAML. Name the log sources, the correlation condition, and the legitimate case it will catch.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'Service provider sign in records for federated logins, identity provider authentication records, and the identity provider audit log for exports of the signing certificate or changes to it.',
          why: 'Three sources for three moments: the sign in that happened, the authentication that should have preceded it, and the export that made it possible.',
          prompt: {
            question: 'Why is the certificate export in the data source rather than being the whole detection?',
            answer:
              'Because it is the strongest single signal and it is the one an attacker with admin can most easily hide or perform outside the audited path. The correlation catches the use even when the theft was never recorded, which is the case you have to plan for.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A federated sign in recorded at a service provider with no corresponding authentication event at the identity provider within the assertion validity window, for the same user and the same application.',
          why: 'The correlation is the detection: an assertion consumed with no authentication behind it. Everything else in this rule is enrichment.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the assertion carried unusual group memberships, whether it came from an unexpected address, whether any certificate export or identity provider admin change happened recently, and which applications saw the same pattern.',
          why: 'The group memberships are often the tell: a minted assertion frequently claims more groups than the real user has, because that is why it was minted.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical. A confirmed match means somebody can be any user at every service provider that trusts the certificate, and rotating the key is the only remedy.',
          why: 'There is no partial version of this. The compromise is of the trust anchor rather than of any account.',
          prompt: {
            question: 'What does containment look like once this is confirmed?',
            answer:
              'Rotate the token signing key and push the new certificate to every service provider, which is why the certificate rotation lesson mattered. Then revoke existing sessions at each application, because sessions created from minted assertions live on locally. Then investigate the identity provider admin path, because that is where it started.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Legitimate cases where no authentication event exists: single sign on from an existing identity provider session, cached or long lived sessions, and applications whose sign in records are delayed or incomplete.',
          why: 'The single sign on case is the honest answer to the question, and it is why this rule needs a tolerance window and a per application understanding of what gets logged.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Reduce who holds identity provider admin, protect the signing key in a hardware module so it cannot be exported, alert on any certificate change, and shorten assertion validity so minted assertions have a smaller window.',
          why: 'The first two are the prevention and they are CIEM work. Only the alerting is detection, which is the division fact 58 describes.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The service provider sign in record with its assertion identifier and claimed groups, the absence of a matching identity provider authentication, and the identity provider audit entries for certificate access.',
          why: 'The pairing of a sign in with an absence is the whole finding, and it only exists if both sources are collected, which is the point worth making before an incident rather than after one.',
        },
      ],
      result:
        'A correlation rule whose signal is an absence, with an honest false positive list, and a containment plan that starts with rotating the trust anchor.',
    },

    fadeLight: {
      task: 'A rule for the prevention side: too many principals holding identity provider administration.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The identity provider role assignments, the accounts holding them, and their authentication methods.',
          why: 'This is ordinary CIEM work applied to the one system whose compromise defeats every other control.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'More than a documented minimum of principals holding a role that can read or export the token signing key, or any such principal without phishing resistant authentication.',
          why: 'Two conditions: how many, and how well protected. The second is what turns a count into a risk.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the key is exportable at all, whether any of those accounts is used for daily work, and how many service providers trust the certificate.',
          why: 'A non exportable key held in a hardware module changes this finding fundamentally, and it should be the first thing checked.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the signing key is exportable and any administrator lacks phishing resistant authentication, since one phished administrator is Golden SAML.',
          why: 'The whole attack has one prerequisite, and this rule is about that prerequisite.',
          choices: [
            'Critical when the signing key is exportable and any administrator lacks phishing resistant authentication, since one phished administrator is Golden SAML.',
            'High, because identity provider administrators are trusted staff.',
            'Medium, because the attack also requires knowledge of the SAML protocol.',
            'Low while the identity provider has no known vulnerabilities.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'This is the finding that prevents the attack, and it is a permission count. That is what fact 58 means by CIEM being posture: the question is who holds what, asked before anything happens.',
    },

    fadeHeavy: {
      task: 'A rule for sessions that survive an identity provider revocation.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'How long each application local session lasts, whether any of them revalidate with the identity provider, and whether a central revocation reaches them.',
          why: 'This is the second half of containment: once an assertion has been accepted, the application session is local and the identity provider cannot end it.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'High. Disabling an account at the identity provider does not end existing sessions, so a minted or stolen session continues until it expires locally.',
          why: 'It is the gap between believing access has been revoked and access actually ending, which is exactly the gap an incident lives in.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Shorten local session lifetimes for sensitive applications, adopt a revocation or continuous evaluation mechanism where the platform supports it, and document the manual revocation path per application.',
          why: 'The documented manual path is the part that matters at two in the morning, because most applications will not have the automatic one.',
          choices: [
            'Shorten local session lifetimes for sensitive applications, adopt a revocation or continuous evaluation mechanism where the platform supports it, and document the manual revocation path per application.',
            'Rely on the assertion validity window, which limits how long access lasts.',
            'Require re authentication once a day for every application.',
            'Rotate the signing certificate whenever an account is disabled.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The session lifetime configuration per application, whether any revalidation happens, and one session that remained valid after the account was disabled in a test environment.',
          why: 'The demonstration is the artefact people remember, and it takes one test account and one disable.',
          choices: [
            'The session lifetime configuration per application, whether any revalidation happens, and one session that remained valid after the account was disabled in a test environment.',
            'The list of currently active sessions across all applications.',
            'The identity provider account disable audit entry.',
            'The support runbook for offboarding.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'The first wrong option confuses the two clocks one final time: the assertion window governs how long it can be used to obtain a session, and the session lifetime governs how long that session lasts.',
    },

    parsons: {
      task:
        'Four of these belong in the Golden SAML detection rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the observed event', code: 'a service provider records a federated sign in for a user' },
        { id: 'p2', label: 'the absence', code: 'and no authentication event exists at the identity provider in that window' },
        { id: 'p3', label: 'the enrichment', code: 'and the assertion claimed group memberships the user does not hold' },
        { id: 'p4', label: 'the prerequisite signal', code: 'or an export of the token signing key was recorded recently' },
        { id: 'd1', label: 'the absence', code: 'and the sign in came from an address outside the corporate ranges', distractor: true },
        { id: 'd2', label: 'the enrichment', code: 'and the user did not complete multi factor authentication', distractor: true },
        { id: 'd3', label: 'the prerequisite signal', code: 'or the identity provider reported a failed login for that user', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The multi factor distractor is the misconception itself, dressed as a detection: there is no authentication event at all, so there is no second factor step to be missing from. And a failed login at the identity provider is evidence of somebody trying the front door, which is the one thing this attacker does not do.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. Your company runs one identity provider for forty applications. Six people hold identity provider administration, the signing key is exportable, and only service provider sign in logs are collected. Write the rule.',
      rows: [
        {
          part: 'source',
          answer:
            'Identity provider role assignments and key configuration, the identity provider authentication log, and service provider sign in records for every federated application.',
          options: [
            'Identity provider role assignments and key configuration, the identity provider authentication log, and service provider sign in records for every federated application.',
            'The network flow logs between the applications and the identity provider.',
            'The endpoint detection telemetry for the administrator laptops.',
          ],
          why: 'The detection needs both sides of the correlation, and the finding starts with the fact that only one side is collected.',
        },
        {
          part: 'condition',
          answer:
            'An environment where the signing key is exportable, more than a minimum number of principals can reach it, and identity provider authentication events are not correlated with service provider sign ins.',
          options: [
            'An environment where the signing key is exportable, more than a minimum number of principals can reach it, and identity provider authentication events are not correlated with service provider sign ins.',
            'An identity provider with six administrators.',
            'An identity provider serving forty applications.',
          ],
          why: 'Three parts: the key can be taken, several people can take it, and nothing would notice the result. The other options are facts rather than findings.',
        },
        {
          part: 'context',
          answer:
            'How many applications trust the certificate, whether administrators use phishing resistant authentication, and whether each application sign in log records the assertion identifier.',
          options: [
            'How many applications trust the certificate, whether administrators use phishing resistant authentication, and whether each application sign in log records the assertion identifier.',
            'How many users each application has.',
            'Which vendor supplies the identity provider.',
          ],
          why: 'The assertion identifier in the sign in log is what makes correlation and single use enforcement possible at all, and it is frequently absent.',
        },
        {
          part: 'severity',
          answer:
            'Critical. One phished administrator yields the ability to be any user at forty applications, and nothing currently collected would show it.',
          options: [
            'Critical. One phished administrator yields the ability to be any user at forty applications, and nothing currently collected would show it.',
            'High, because there is no evidence the attack has occurred.',
            'Medium, because the administrators are a small trusted group.',
          ],
          why: 'The absence of evidence is the finding rather than a mitigation: the detection that would produce the evidence does not exist.',
        },
        {
          part: 'falsePositives',
          answer:
            'Environments where the key is held in a hardware module and cannot be exported, and where administration is limited to break glass accounts with phishing resistant authentication.',
          options: [
            'Environments where the key is held in a hardware module and cannot be exported, and where administration is limited to break glass accounts with phishing resistant authentication.',
            'Environments where no incident has been reported.',
            'Environments where the identity provider is a managed cloud service.',
          ],
          why: 'A managed service can still hold an exportable key and several administrators, so the vendor is not the control. The first option names both controls that remove the prerequisite.',
        },
        {
          part: 'remediation',
          answer:
            'Move the signing key to a hardware module so it cannot be exported, reduce administration to a minimum with phishing resistant authentication, collect identity provider authentication events, and correlate them against service provider sign ins.',
          options: [
            'Move the signing key to a hardware module so it cannot be exported, reduce administration to a minimum with phishing resistant authentication, collect identity provider authentication events, and correlate them against service provider sign ins.',
            'Require multi factor authentication for every application login.',
            'Rotate the signing certificate every ninety days.',
          ],
          why: 'Prevention, then the detection that would catch what prevention misses. Multi factor authentication on the applications is precisely the control this attack goes around.',
        },
        {
          part: 'evidence',
          answer:
            'The key configuration showing it is exportable, the list of principals who can reach it, and the absence of identity provider authentication events in the collected log set.',
          options: [
            'The key configuration showing it is exportable, the list of principals who can reach it, and the absence of identity provider authentication events in the collected log set.',
            'A minted assertion demonstrating the attack against a production application.',
            'The list of forty applications and their owners.',
          ],
          why: 'Three configuration facts. Minting an assertion to prove it means creating a forged credential for production, which is not a demonstration to run.',
        },
      ],
      closing:
        'That is the module. The last rule you wrote is the one that protects every other rule, because everything in the other four sections assumes that the identity making a request is the identity it claims to be.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the Golden SAML exposure.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the key', code: 'the token signing key is exportable from the identity provider' },
          { id: 'f2', label: 'the reach', code: 'and several principals hold a role that can export it' },
          { id: 'f3', label: 'the blast radius', code: 'and forty service providers trust the certificate' },
          { id: 'f4', label: 'the blind spot', code: 'and no correlation exists between IdP authentications and SP sign ins' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Key, reach, blast radius, blind spot. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'sec-mfa-stops-golden-saml',
      setup:
        'A tabletop exercise. Golden SAML is raised as a scenario, and the response is that the company enforces multi factor authentication on every application, so a forged assertion would fail at the second factor.',
      code:
        'Control claimed: MFA enforced for all users, all applications\nScenario: attacker holds the IdP token signing key\nConclusion: the attacker cannot complete authentication, so the risk is mitigated.',
      language: 'text',
      question: 'Why does the second factor never come into play?',
      options: [
        {
          text: 'Because no authentication happens. The attacker mints a signed assertion directly, and the service provider accepts it without any interaction with the identity provider.',
          correct: true,
        },
        { text: 'Because the attacker can mint an assertion claiming the second factor was already completed, which the service provider trusts.', correct: false },
        { text: 'Because multi factor authentication only applies to interactive logins and not to federated ones.', correct: false },
        { text: 'It does come into play, so the conclusion is correct as long as the second factor is phishing resistant.', correct: false },
      ],
      silently:
        'The exercise concludes that the scenario is covered, so the two controls that would actually help are never funded: protecting the signing key from export, and correlating identity provider authentications against service provider sign ins. The company keeps a genuine and useful control, enforced everywhere, aimed at a step this attacker skips entirely, and the sign in records show ordinary federated logins for real users.',
      explanation:
        'The second option is close enough to be worth separating out. It is true that a minted assertion can claim anything, including an authentication context stating that a second factor was used, and that is a real part of why this works. But the deeper reason is simpler: the attacker never talks to the identity provider at all, so there is no login attempt to challenge. Fact 55 states all three consequences together: multi factor authentication does not help because authentication never happens, the attack is invisible in identity provider logs because the identity provider was never involved, and evidence exists only on the service provider side.',
    },

    handoff: {
      canNow: [
        'Say what a Golden SAML attacker needs and what they can then do',
        'Explain why multi factor authentication does not help and why the IdP logs are empty',
        'Write the detection as a correlation, and name the prevention that belongs to CIEM instead',
      ],
      note: 'Q5.7, Q5.8 and Q5.9 are the three hardest identity questions and they are all in this lesson. Facts 55 and 58 are the pair, and 55 is on the priority list.',
    },
  },
}

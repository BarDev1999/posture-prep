import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L57',
  number: 57,
  topicId: 'identity',
  sectionId: 5,
  title: 'OAuth 2.0 and OIDC, and how they differ from SAML',
  objective:
    'You will be able to say what OAuth authorises and what OIDC adds, name three structural differences from SAML, and write the rule for an authorisation flow missing its protections.',
  minutes: 14,
  difficulty: 'medium',
  sources: ['F54', 'F56', 'F57', 'Q5.3', 'Q5.4', 'Q5.5'],

  steps: {
    vocabulary: [
      {
        term: 'OAuth 2.0',
        definition: 'A delegated authorisation protocol. It lets an application act on a resource on the user behalf, and it says nothing about who the user is.',
      },
      {
        term: 'OIDC',
        definition: 'OpenID Connect: an identity layer on top of OAuth, adding an id_token that states who the user is, as a signed JWT.',
      },
      {
        term: 'state',
        definition: 'A value the client sends and checks on return. It is cross site request forgery protection for the authorisation flow.',
      },
      {
        term: 'nonce',
        definition: 'An OIDC value embedded in the id_token. It protects against replay of a token that was issued for a different request.',
      },
      {
        term: 'PKCE',
        definition: 'Proof Key for Code Exchange: a challenge sent up front and a verifier at the exchange, preventing interception of the authorisation code.',
      },
    ],

    model: {
      narrative: [
        'The single most useful sentence in this lesson: OAuth authorises, OIDC identifies. Everything else follows from it.',
        '',
        'OAuth was designed so that an application could act on a resource for you without holding your password: it obtains an access token scoped to what it may do. Nothing in that flow tells the application who you are, which is why using OAuth alone as a login mechanism is a category error and the trap on this lesson.',
        '',
        'OIDC adds the missing half: an id_token, a signed JWT stating who the user is, which the client validates like any other signed statement.',
        '',
        'Question 5.3 wants three structural differences from SAML, and they are worth having ready. SAML is XML with XML Signature; OIDC is a layer on OAuth using signed JWTs. SAML is browser and web oriented; OIDC also serves APIs, mobile applications and single page applications. SAML covers authentication; OIDC adds identity on top of an authorisation protocol. And the bonus in fact 54 is a good one to add: OIDC rotates keys automatically through a published key set, while SAML certificates are replaced by hand.',
        '',
        'Then three parameters that keep coming up. State is cross site request forgery protection for the flow, nonce protects the id_token against replay, and PKCE prevents interception of the authorisation code. Fact 57 adds that OAuth 2.1 requires PKCE for all client types, not only public ones.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'The two protocols side by side. The third row is the one people get wrong, and the fourth is the operational difference that decides who gets paged at midnight.',
        left: {
          title: 'SAML',
          points: [
            'XML, with XML Signature.',
            'Browser and web oriented.',
            'Authentication, through a signed assertion.',
            'Certificates replaced by hand.',
          ],
        },
        right: {
          title: 'OAuth 2.0 and OIDC',
          points: [
            'JSON, with signed JWTs.',
            'Also APIs, mobile and single page applications.',
            'OAuth authorises; OIDC adds identity on top.',
            'Keys rotate automatically through a published key set.',
          ],
        },
      },
      takeaway: 'OAuth authorises, OIDC identifies. State protects the flow, nonce protects the token, PKCE protects the code.',
    },

    worked: {
      task:
        'Write the rule for an authorisation code flow missing its protections: no state, no PKCE, and no nonce where OIDC is in use.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The client configuration at the identity provider, the application authorisation request code, and the redirect URIs registered for the client.',
          why: 'The request is built by the application and constrained by the registration, so a complete picture needs both sides.',
          prompt: {
            question: 'Why are the registered redirect URIs part of this rule?',
            answer:
              'Because a loose registration is what makes an intercepted code useful. A wildcard or an overly broad redirect lets an attacker have the code delivered somewhere they control, and PKCE is then the only thing standing between them and a token.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'An authorisation request with no state parameter, or no code challenge, or in an OIDC flow no nonce, or a client whose registered redirect URIs include a wildcard or a non exact match.',
          why: 'Four conditions joined by or, because each protects a different step and any one being absent is independently reportable.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the client is public or confidential, what scopes it requests, whether the tokens reach a browser, and what the resource holds.',
          why: 'Scopes are the impact half: an intercepted code for a read only scope and one for a full mailbox scope are the same defect with different consequences.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical for a public client with no code challenge and a loose redirect registration. High for a missing state on any client. Medium for a missing nonce where the rest is present.',
          why: 'Ranked by what an attacker can complete: a token, an unwanted account link, or a replayed identity token in a narrower situation.',
          prompt: {
            question: 'Why is a missing state parameter high rather than critical?',
            answer:
              'Because the attack it enables is different in kind: it lets an attacker complete an authorisation flow in a victim browser, which typically links the victim account to something the attacker controls rather than handing over a token. Serious, and not the same as taking the account.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Clients using a framework that adds state and the code challenge automatically, verified from the outgoing request rather than from the documentation, and machine to machine flows with no user and no redirect.',
          why: 'Client credential flows genuinely have no state or PKCE because there is no browser and no user, and a rule that flags them will be muted.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Send and verify state, use PKCE for every client type as OAuth 2.1 requires, send and check a nonce in OIDC flows, and register exact redirect URIs with no wildcards.',
          why: 'Fact 57 is explicit that PKCE is now required for all client types, which removes the old public against confidential argument from this conversation.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'One authorisation request as sent, with its parameters, the client registration with its redirect URIs, and the token response scopes.',
          why: 'The request as actually sent is the artefact. Configuration and intention are frequently different, and only the request settles it.',
        },
      ],
      result:
        'A rule over four parameters, each of which is a few characters in a request, and each of which is the difference between a flow that can be hijacked and one that cannot.',
    },

    fadeLight: {
      task: 'A rule for an application treating an OAuth access token as proof of identity.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The application login code, the token it inspects, and the scopes it requests from the provider.',
          why: 'The finding is which token the application reads and what it concludes from it.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'An application that establishes a user session from an access token or from a user information response, without validating an id_token issued for itself.',
          why: 'Both common shapes: reading the access token, and calling a user information endpoint and trusting whatever comes back.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the provider issues id_tokens at all, whether the audience of the token is checked, and whether the application accepts tokens from more than one client.',
          why: 'Audience again, in its OIDC form. The same failure as the last lesson, with a JWT instead of an assertion.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the application accepts a token issued for a different client, since a token obtained by any other application can log a user in here.',
          why: 'This is the token substitution attack, and it is the OAuth version of the missing Audience check from lesson 56.',
          choices: [
            'Critical when the application accepts a token issued for a different client, since a token obtained by any other application can log a user in here.',
            'High, because the access token still had to be issued by the trusted provider.',
            'Medium, because access tokens are short lived.',
            'Low, since the user information endpoint requires a valid token anyway.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'Every wrong option repeats the same mistake in a different accent: a genuine token from a trusted issuer, without an audience check, says nothing about which application it was for.',
    },

    fadeHeavy: {
      task: 'A rule for a client registration with a permissive redirect URI.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the registration uses a wildcard or a prefix match, whether the domain allows user controlled content, and whether PKCE is in use.',
          why: 'A wildcard on a domain hosting user pages is the worst case: the attacker chooses the exact redirect target.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when a wildcard registration is combined with no code challenge, since a code delivered to an attacker controlled path can be exchanged directly.',
          why: 'The pairing is the finding. With PKCE the intercepted code is far less useful, which is why the two are ranked together.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Register exact redirect URIs, remove wildcards and prefix matching, and require PKCE so an intercepted code cannot be exchanged.',
          why: 'Exact registration plus PKCE is the pair the standard now assumes, and either one alone leaves a usable gap.',
          choices: [
            'Register exact redirect URIs, remove wildcards and prefix matching, and require PKCE so an intercepted code cannot be exchanged.',
            'Shorten the lifetime of the authorisation code to thirty seconds.',
            'Validate the redirect URI in the application before redirecting.',
            'Move the flow to the implicit grant so no code is issued.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The client registration with its redirect patterns, one authorisation request showing whether a code challenge is present, and any user controlled paths on the registered domain.',
          why: 'Naming a specific user controlled path on the registered domain turns a pattern discussion into a demonstrated delivery target.',
          choices: [
            'The client registration with its redirect patterns, one authorisation request showing whether a code challenge is present, and any user controlled paths on the registered domain.',
            'The token endpoint logs for the client.',
            'The list of every client registered at the provider.',
            'The provider documentation on redirect URI matching.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'The implicit grant is the last wrong option for a reason: it removes the code by putting the token straight in the browser, which is why it was deprecated.',
    },

    parsons: {
      task:
        'Four of these belong in the authorisation flow rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the flow', code: 'the application uses the authorisation code flow with a browser redirect' },
        { id: 'p2', label: 'the missing CSRF protection', code: 'and it sends no state parameter, or does not verify it on return' },
        { id: 'p3', label: 'the missing code protection', code: 'and it sends no code challenge, so PKCE is not in use' },
        { id: 'p4', label: 'the loose registration', code: 'and its registered redirect URIs are not exact matches' },
        { id: 'd1', label: 'the missing CSRF protection', code: 'and the application does not use a client secret', distractor: true },
        { id: 'd2', label: 'the missing code protection', code: 'and the access token lifetime is longer than one hour', distractor: true },
        { id: 'd3', label: 'the loose registration', code: 'and the provider supports the implicit grant', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The client secret distractor is worth thinking about: a public client legitimately has no secret, which is exactly why PKCE exists and why OAuth 2.1 requires it everywhere rather than only where a secret is missing.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A mobile application logs users in with OAuth, reads the user identifier from the user information endpoint, and creates a session from it. There is no id_token, no nonce and no PKCE. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The mobile client authorisation request and token handling code, and the client registration at the provider.',
          options: [
            'The mobile client authorisation request and token handling code, and the client registration at the provider.',
            'The mobile application store listing and its permissions.',
            'The backend session store.',
          ],
          why: 'The request shows the missing parameters and the registration shows what the provider will accept.',
        },
        {
          part: 'condition',
          answer:
            'A public client using an authorisation flow with no code challenge, establishing identity from an access token or user information response rather than a validated id_token.',
          options: [
            'A public client using an authorisation flow with no code challenge, establishing identity from an access token or user information response rather than a validated id_token.',
            'A mobile application that uses OAuth for login.',
            'A client that calls a user information endpoint.',
          ],
          why: 'Two defects in one condition because they compound: a public client with no PKCE, using a protocol that never claimed to identify anybody.',
        },
        {
          part: 'context',
          answer:
            'What the session grants, whether the provider issues id_tokens, whether the access token audience is checked, and whether other applications share the provider.',
          options: [
            'What the session grants, whether the provider issues id_tokens, whether the access token audience is checked, and whether other applications share the provider.',
            'Which mobile platforms the application supports.',
            'How many users install the application each month.',
          ],
          why: 'Shared provider plus no audience check is the token substitution path, and whether id_tokens exist decides how big the remediation is.',
        },
        {
          part: 'severity',
          answer:
            'Critical. A token obtained by any other application on the same provider can be presented here, and with no code challenge an intercepted code can be exchanged directly.',
          options: [
            'Critical. A token obtained by any other application on the same provider can be presented here, and with no code challenge an intercepted code can be exchanged directly.',
            'High, because mobile applications are harder to intercept than browsers.',
            'Medium, because the user still has to authenticate at the provider.',
          ],
          why: 'The user authenticating is what produces the token the attacker then uses somewhere else, which is the whole shape of token substitution.',
        },
        {
          part: 'falsePositives',
          answer:
            'Clients that validate an id_token with the correct audience and nonce and use PKCE, verified from the outgoing request and the token validation code.',
          options: [
            'Clients that validate an id_token with the correct audience and nonce and use PKCE, verified from the outgoing request and the token validation code.',
            'Clients built with the provider official software development kit.',
            'Clients that have passed the provider certification programme.',
          ],
          why: 'Official kits and certifications help and are not evidence about this configuration, which is what the request itself shows.',
        },
        {
          part: 'remediation',
          answer:
            'Use OIDC with an id_token, validate its issuer, audience, expiry and nonce, and add PKCE to the flow as OAuth 2.1 requires.',
          options: [
            'Use OIDC with an id_token, validate its issuer, audience, expiry and nonce, and add PKCE to the flow as OAuth 2.1 requires.',
            'Verify the access token against the provider introspection endpoint before creating a session.',
            'Pin the provider certificate in the mobile application.',
          ],
          why: 'Introspection tells you the token is valid, not that it was issued for this client, so it fixes the wrong half. Pinning protects the transport and nothing about identity.',
        },
        {
          part: 'evidence',
          answer:
            'The authorisation request as sent, the code creating a session from the user information response, and the absence of an id_token in the token response.',
          options: [
            'The authorisation request as sent, the code creating a session from the user information response, and the absence of an id_token in the token response.',
            'A token from another application accepted by this one in production.',
            'The provider list of supported flows.',
          ],
          why: 'Three artefacts from the client. Demonstrating substitution in production means using somebody real token, which is not evidence worth collecting that way.',
        },
      ],
      closing:
        'The same failure has now appeared three times in this topic in three costumes: a missing Audience in SAML, a missing audience check on a JWT, and an access token treated as identity. All three are the question of who this was for.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the mobile client.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the flow', code: 'a public mobile client uses an authorisation code flow' },
          { id: 'f2', label: 'the missing code protection', code: 'and sends no code challenge, so PKCE is not in use' },
          { id: 'f3', label: 'the wrong token', code: 'and it establishes identity from an access token rather than a validated id_token' },
          { id: 'f4', label: 'the shared provider', code: 'and other applications obtain tokens from the same provider' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Flow, missing protection, wrong token, shared provider. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'identity-oauth-is-authentication',
      setup:
        'A login feature built on OAuth. The user returns from the provider with an access token, the application fetches the profile with it, and creates a session for whoever the profile names.',
      code:
        'token = exchange_code(request.args["code"])\nprofile = get("https://provider/userinfo", token=token)\nsession = create_session(user_id=profile["sub"])\n# the user came back from the provider, so they are logged in',
      language: 'python',
      question: 'What has the application actually established?',
      options: [
        {
          text: 'That somebody holds a token the provider will accept. Not that this token was issued for this application, nor that the person in this browser is its subject.',
          correct: true,
        },
        { text: 'That the user authenticated at the provider just now, which is enough for a login.', correct: false },
        { text: 'Nothing at all, because access tokens are opaque and cannot be used this way.', correct: false },
        { text: 'Everything needed, provided the token is transmitted over an encrypted connection.', correct: false },
      ],
      silently:
        'Login works perfectly for every real user, because a real user really did just authenticate and the profile really is theirs. The gap is that an access token from anywhere else on the same provider, obtained by any other application the victim uses, is equally acceptable here. There is no error, no anomaly and no log entry distinguishing the two cases, because from the application point of view both are a valid token producing a valid profile.',
      explanation:
        'OAuth is a delegated authorisation protocol and it never claimed to identify the user to the client. An access token is a bearer credential for a resource: it says the holder may do something, and it does not say who the holder is or which application it was issued to. OIDC exists to fill that gap with an id_token, a signed JWT whose audience names the client and whose nonce ties it to this request. Fact 54 places the difference structurally, and the practical rule is short: authenticate with an id_token you validate, and use access tokens only for the resource calls they were issued for.',
    },

    handoff: {
      canNow: [
        'Say what OAuth authorises and what OIDC adds, in one sentence each',
        'Give three structural differences from SAML, plus the key rotation one',
        'Explain what state, nonce and PKCE each protect, and write the rule for a flow missing them',
      ],
      note: 'Q5.3, Q5.4 and Q5.5 are the three questions and facts 54, 56 and 57 are the three answers. This lesson is the last one before Golden SAML.',
    },
  },
}

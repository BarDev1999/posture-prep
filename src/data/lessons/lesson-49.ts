import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L49',
  number: 49,
  topicId: 'linux-web-containers',
  sectionId: 4,
  title: 'XSS, three kinds',
  objective:
    'You will be able to separate stored, reflected and DOM based cross site scripting by their data flow, name the control for each, and write the rule for the one a proxy cannot see.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F46', 'Q4.13', 'F41'],

  steps: {
    vocabulary: [
      {
        term: 'XSS',
        definition: 'Cross site scripting: attacker controlled text ending up in a page where the browser parses it as markup or script.',
      },
      {
        term: 'stored',
        definition: 'The payload is saved on the server and served to everyone who views the page afterwards. No link needed.',
      },
      {
        term: 'reflected',
        definition: 'The payload travels in the request and comes back in that same response, so the victim has to be persuaded to follow a link.',
      },
      {
        term: 'DOM based',
        definition: 'The payload never reaches the server. Client side code reads it from the URL or storage and writes it into the page.',
      },
      {
        term: 'content security policy',
        definition: 'A response header restricting where scripts may come from and whether inline script runs. A second layer, not a fix.',
      },
    ],

    model: {
      narrative: [
        'The three kinds differ in where the payload travels, and question 4.13 asks for the data flow rather than the definitions, because the flow is what decides the control.',
        '',
        'Stored: the text goes to the server, is saved, and is served to every viewer afterwards. One submission, many victims, no interaction needed.',
        '',
        'Reflected: the text goes to the server in a request and comes straight back in the response. The attacker needs the victim to make that request, usually by following a crafted link.',
        '',
        'DOM based: the text never reaches the server at all. It sits in the fragment of a URL, or in local storage, and client side code reads it and writes it into the page. The server logs show a request for an ordinary page, because that is what happened.',
        '',
        'That last one is the reason this lesson exists in a posture module. Fact 46 puts it plainly: DOM based never reaches the server, so a proxy or a web application firewall cannot see it. Any control that inspects traffic at the edge is structurally blind to it, which means the rule has to look at the client code instead.',
        '',
        'The controls follow the flow. Encode on output for the server rendered kinds, use safe sink APIs in client code for the DOM kind, and add a content security policy underneath all three as a second layer that limits what a successful injection can do.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption:
          'Where the payload goes. The middle column is what a proxy at the edge can inspect, and the third kind never crosses it.',
        left: {
          title: 'stored and reflected',
          points: [
            'The payload is in the request to the server.',
            'It comes back in a response the server built.',
            'A proxy sees both directions.',
            'Control: encode on output, per context.',
          ],
        },
        right: {
          title: 'DOM based',
          points: [
            'The payload sits in the URL fragment or storage.',
            'Client code reads it and writes it into the page.',
            'The server never receives it, so no proxy sees it.',
            'Control: safe sinks in the client code itself.',
          ],
        },
      },
      takeaway: 'Stored serves everyone, reflected needs a click, and DOM based never reaches the server at all.',
    },

    worked: {
      task:
        'Write the rule for DOM based cross site scripting, the kind no edge control can see, which means it has to be found in the client code.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The client side source in the repository, plus the built bundle, looking for sinks that write markup and sources that read attacker controllable input.',
          why: 'Both, because a framework can introduce a sink that is not in the source you wrote, and the bundle is what actually runs in the browser.',
          prompt: {
            question: 'Why scan the built bundle as well as the source?',
            answer:
              'Because dependencies are client code too. A component library that writes a prop into inner HTML creates the same sink, and it appears in the bundle rather than in the file the team wrote. Scanning only your own source finds the ones you can already see in review.',
          },
        },
        {
          label: 'condition',
          prose: true,
          code: 'A path from a source such as the URL fragment, a query parameter read in the client, local storage or a postMessage handler, into a sink such as inner HTML, document write, or a framework property that bypasses escaping.',
          why: 'Source to sink is the shape. Naming the specific sinks is what makes the rule mechanical rather than a judgement about risky code.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the page holds a session cookie readable by script, whether a content security policy restricts inline script, and whether the page performs privileged actions.',
          why: 'A strict policy turns a successful injection into a much smaller event, and it belongs in the enrichment rather than being assumed absent.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the page holds a session cookie without HttpOnly and no policy restricts inline script. High otherwise, because the injection still runs in the user context.',
          why: 'Session theft is the outcome that turns this from defacement into account takeover, and the two enrichments decide whether it is available.',
          prompt: {
            question: 'The application has a strict content security policy. Does the finding go away?',
            answer:
              'No, it drops. A policy that blocks inline script and restricts sources genuinely prevents most payloads, and it is a second layer over a defect that is still there. Report it as high with the policy named as the compensating control, and fix the sink.',
          },
        },
        {
          label: 'false positives and exceptions',
          prose: true,
          code: 'Sinks fed only by literals or by values from a trusted server response that is already encoded, and sanitiser calls from a maintained library applied immediately before the sink.',
          why: 'A maintained sanitiser is a real control and the rule has to recognise it, or teams that did the right thing get the same ticket as teams that did nothing.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Use a text assignment rather than a markup one, or a framework binding that escapes by default. Where markup is genuinely needed, sanitise with a maintained library at the sink. Add a content security policy underneath.',
          why: 'Text instead of markup is the fix that removes the class. Sanitising is second best and correct where rich content is a requirement.',
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The source line, the sink line, the path between them, and a benign demonstration such as an image tag rendering into the page.',
          why: 'A benign tag is enough to prove the sink is live, and it avoids attaching a working payload to a ticket that will be pasted into a chat.',
        },
      ],
      result:
        'A rule for the kind of injection that never reaches the server, expressed as a source to sink path in code, which is the only place it exists.',
    },

    fadeLight: {
      task: 'A rule for stored cross site scripting in a server rendered page.',
      steps: [
        {
          label: 'data source',
          prose: true,
          code: 'The server side templates and rendering code, and the fields that hold user submitted content.',
          why: 'Stored means the value came from the database, so the rule follows the fields rather than the request.',
        },
        {
          label: 'condition',
          prose: true,
          code: 'A user submitted field rendered into a page with escaping disabled or through a raw markup helper.',
          why: 'One shape, and it is greppable in every template language.',
        },
        {
          label: 'context and enrichment',
          prose: true,
          code: 'How many users see the page, whether it is behind authentication, and whether the field is rendered in an administrative view.',
          why: 'An administrative view is the highest value target, because the payload runs in the session of somebody with more privileges than the author.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Critical when the field is rendered in a view seen by administrators, since one submission runs script in a privileged session.',
          why: 'Stored plus a privileged viewer is the combination that turns a comment box into account takeover.',
          choices: [
            'Critical when the field is rendered in a view seen by administrators, since one submission runs script in a privileged session.',
            'High, because the attacker needs the victim to visit the page.',
            'Medium, because the content is only visible to authenticated users.',
            'Low, since modern browsers block most inline script.',
          ],
        },
      ],
      blanks: 1,
      closing:
        'The second option describes reflected, which is exactly the confusion question 4.13 tests: stored needs no persuasion at all, because the victim visits the page for their own reasons.',
    },

    fadeHeavy: {
      task: 'A rule for a missing or permissive content security policy.',
      steps: [
        {
          label: 'context and enrichment',
          prose: true,
          code: 'Whether the site renders user content, whether inline script is allowed by the policy, and whether any known injection sinks exist in the code.',
          why: 'A permissive policy on a site with no user content is a hygiene finding, and on a site with a known sink it is the missing second layer.',
        },
        {
          label: 'severity',
          prose: true,
          code: 'Medium alone, and high when the same application also has an unfixed injection sink, since the policy is the control that would have contained it.',
          why: 'Compensating controls cut both ways: their absence raises the severity of the defect they would have contained.',
        },
        {
          label: 'remediation',
          prose: true,
          code: 'Set a policy that blocks inline script and restricts sources to your own origins, and report violations to an endpoint so the policy can be tightened with evidence.',
          why: 'Reporting first is how a policy gets deployed at all: it turns a breaking change into a list of things to fix.',
          choices: [
            'Set a policy that blocks inline script and restricts sources to your own origins, and report violations to an endpoint so the policy can be tightened with evidence.',
            'Set a policy allowing scripts from any HTTPS origin.',
            'Rely on the framework default escaping instead.',
            'Add the policy only to pages that render user content.',
          ],
        },
        {
          label: 'evidence',
          prose: true,
          code: 'The response headers with the policy or its absence, the pages rendering user content, and any known sink in the same application.',
          why: 'Pairing the missing header with a live sink is what moves this from a checklist item to a finding.',
          choices: [
            'The response headers with the policy or its absence, the pages rendering user content, and any known sink in the same application.',
            'A browser console screenshot showing no policy errors.',
            'The list of third party scripts the site loads.',
            'The framework version and its escaping defaults.',
          ],
        },
      ],
      blanks: 2,
      closing:
        'Allowing any HTTPS origin is the policy people ship to make the errors stop. It permits a script from anywhere on the internet, which is the thing the policy was for.',
    },

    parsons: {
      task:
        'Four of these belong in the DOM based rule. Place those four and leave the rest out.',
      language: 'text',
      blocks: [
        { id: 'p1', label: 'the source', code: 'client code reads a value from the URL fragment, a query parameter or storage' },
        { id: 'p2', label: 'the sink', code: 'and writes it into the page through a markup sink such as inner HTML' },
        { id: 'p3', label: 'the missing control', code: 'with no sanitiser from a maintained library applied at the sink' },
        { id: 'p4', label: 'the impact', code: 'and the page holds a session cookie readable by script' },
        { id: 'd1', label: 'the source', code: 'and the value is not escaped by the server before it is sent', distractor: true },
        { id: 'd2', label: 'the missing control', code: 'and the web application firewall has no rule for this parameter', distractor: true },
        { id: 'd3', label: 'the impact', code: 'and the page is served over plain HTTP', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The first two distractors both assume the server saw the value, and in this kind it never does. That is the entire point of separating the three: a control at the edge cannot act on data that never crosses it.',
    },

    produce: {
      kind: 'rule',
      task:
        'New scenario. A single page application reads a redirect target from the URL fragment after login and writes a link into the page using inner HTML so the user can continue. Write the rule.',
      rows: [
        {
          part: 'source',
          answer: 'The client source and built bundle, the login redirect handling code, and the response headers for the application.',
          options: [
            'The client source and built bundle, the login redirect handling code, and the response headers for the application.',
            'The web server access logs for the login endpoint.',
            'The identity provider configuration.',
          ],
          why: 'The defect is entirely client side, and the headers say whether a policy would contain it.',
        },
        {
          part: 'condition',
          answer:
            'Client code reading a value from the URL fragment and writing it into the page through a markup sink, with no sanitisation.',
          options: [
            'Client code reading a value from the URL fragment and writing it into the page through a markup sink, with no sanitisation.',
            'A login flow that supports a redirect target.',
            'An application that uses inner HTML anywhere in its code.',
          ],
          why: 'Source to sink, both named. Redirect support is a feature and inner HTML on a literal is harmless.',
        },
        {
          part: 'context',
          answer:
            'Whether the session cookie is readable by script, whether a content security policy blocks inline script, and what the page can do once authenticated.',
          options: [
            'Whether the session cookie is readable by script, whether a content security policy blocks inline script, and what the page can do once authenticated.',
            'Which single page framework the application uses.',
            'How many users log in per day.',
          ],
          why: 'These three decide the impact of a successful injection, and this page is the one the user reaches immediately after authenticating.',
        },
        {
          part: 'severity',
          answer:
            'Critical. The payload runs on the page the user lands on right after login, and the fragment never reaches the server so nothing at the edge inspects it.',
          options: [
            'Critical. The payload runs on the page the user lands on right after login, and the fragment never reaches the server so nothing at the edge inspects it.',
            'High, because the victim must be persuaded to follow a crafted link.',
            'Medium, because the fragment is not sent to the server and therefore cannot be logged.',
          ],
          why: 'The third option treats the invisibility as a mitigation. It is the opposite: it removes both the edge control and the forensic record.',
        },
        {
          part: 'falsePositives',
          answer:
            'Code paths where the value is passed to a text assignment or a framework binding that escapes, or sanitised with a maintained library at the sink.',
          options: [
            'Code paths where the value is passed to a text assignment or a framework binding that escapes, or sanitised with a maintained library at the sink.',
            'Applications with a content security policy, since the policy blocks the payload.',
            'Applications where the redirect target is validated to be a relative path.',
            'Single page applications, since the framework escapes everything by default.',
          ],
          why: 'A policy is a compensating control that lowers severity and does not make the sink safe. A relative path check helps with open redirect and not with markup in the value.',
        },
        {
          part: 'remediation',
          answer:
            'Set the link text and target through safe APIs rather than building markup, validate the target against an allowlist of paths, and add a content security policy blocking inline script.',
          options: [
            'Set the link text and target through safe APIs rather than building markup, validate the target against an allowlist of paths, and add a content security policy blocking inline script.',
            'Escape angle brackets in the fragment value before writing it.',
            'Move the redirect target from the fragment to a query parameter so the server can validate it.',
          ],
          why: 'The third option is interesting and half right: moving it to a query parameter makes it visible to server controls, and the sink in the client is still there.',
        },
        {
          part: 'evidence',
          answer:
            'The line reading the fragment, the line writing it into the page, and a benign demonstration rendering an image tag from a crafted fragment.',
          options: [
            'The line reading the fragment, the line writing it into the page, and a benign demonstration rendering an image tag from a crafted fragment.',
            'A working payload that steals the session cookie.',
            'The access logs showing requests to the login page.',
          ],
          why: 'Two lines and a benign demonstration. A working session stealing payload in a ticket is a liability rather than evidence.',
        },
      ],
      closing:
        'Notice the last evidence row in both this rule and the worked example: benign proof. It is a habit worth forming, because a ticket is copied into chats, screenshots and mail, and a working payload travels with it.',
      fallback: {
        task: 'Same rule, as blocks. The four conditions for the login redirect sink.',
        language: 'text',
        blocks: [
          { id: 'f1', label: 'the source', code: 'client code reads the redirect target from the URL fragment' },
          { id: 'f2', label: 'the sink', code: 'and writes it into the page as markup' },
          { id: 'f3', label: 'the missing control', code: 'with no sanitisation and no escaping binding' },
          { id: 'f4', label: 'the impact', code: 'and the page is the one reached immediately after authentication' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Source, sink, missing control, impact. Now write all seven rows.',
      },
    },

    trap: {
      misconceptionId: 'web-waf-sees-all-xss',
      setup:
        'A risk acceptance. The team has a known markup sink in their client code and argues that the web application firewall in front of the site will block any payload before it arrives.',
      code:
        'Sink: element.innerHTML = decodeURIComponent(location.hash.slice(1))\nControl claimed: WAF rules for cross site scripting on all inbound requests\nDecision: accept, the WAF blocks the payload.',
      language: 'javascript',
      question: 'Why does the firewall not help here?',
      options: [
        {
          text: 'The fragment is never sent to the server, so no inbound request contains the payload for the firewall to inspect.',
          correct: true,
        },
        { text: 'It would help if the firewall rules were tuned for this parameter name.', correct: false },
        { text: 'It helps for the first request and not for subsequent ones served from cache.', correct: false },
        { text: 'It does help. The claim is correct and the risk acceptance is reasonable.', correct: false },
      ],
      silently:
        'Everything about the deployment looks defended. The firewall dashboard shows blocked cross site scripting attempts every day, which are real and are the reflected ones, and that evidence is used to support the acceptance. The DOM based sink is untouched by all of it, and there is no record of exploitation either, because the payload never appeared in a request anyone logged.',
      explanation:
        'Fact 46 separates the three by data flow for exactly this reason, and the sentence to keep is that DOM based never reaches the server, so a firewall cannot see it. Browsers do not send the fragment part of a URL to the server, and a payload in local storage or from a postMessage never travels either. Edge controls are useful and they are structurally blind to this kind, which means the control has to live in the client code: a text assignment instead of a markup one, or a maintained sanitiser at the sink, with a content security policy underneath as a second layer.',
    },

    handoff: {
      canNow: [
        'Separate the three kinds by where the payload travels rather than by definition',
        'Name the control for each, and say which one an edge device cannot help with',
        'Write a source to sink rule for the client side kind',
      ],
      note: 'Q4.13 asks for the data flow and the control for each. Fact 46 is the one line version and it is worth being able to say all three in order.',
    },
  },
}

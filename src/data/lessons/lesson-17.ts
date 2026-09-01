import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L17',
  number: 17,
  topicId: 'python',
  sectionId: 1,
  title: 'Comprehensions with several conditions, and dict comprehensions',
  objective:
    'You will be able to write one comprehension that applies several conditions at once, and build a dict rather than a list when the answer needs to be looked up later.',
  minutes: 14,
  difficulty: 'medium',
  sources: ['Q1.20', 'Q1.21', 'B#1D. Python, filtering lists and dicts'],

  steps: {
    vocabulary: [
      {
        term: 'and',
        definition: 'Both sides have to be true. Python stops at the first false side and never looks at the rest.',
      },
      {
        term: 'in',
        definition: 'A membership test. Asks whether a value is one of the values in a collection.',
      },
      {
        term: 'set literal',
        definition: 'Values in curly brackets with no keys, such as {"critical", "high"}. Membership in one is fast whatever its size.',
      },
      {
        term: 'dict comprehension',
        definition: 'The same idea as a list comprehension, but the front is a key and a value separated by a colon, so it builds a dict.',
      },
      {
        term: '.items()',
        definition: 'Walks a dict as pairs, so one pass gives you the key and the value together instead of the key alone.',
      },
      {
        term: 'any()',
        definition: 'True when at least one item of a collection passes a test. It stops at the first one that does.',
      },
    ],

    model: {
      narrative: [
        'Two things change in this lesson, and neither of them changes the shape you already know.',
        '',
        'The first is that the test can be more than one condition. `and` joins them, and it is lazy: if the left side is false, the right side is never evaluated. That matters more than it sounds. Put the cheap, likely to fail condition first and the expensive one second, and most rows never pay for the expensive one.',
        '',
        'The second is that the front of a comprehension can be a pair. Write `key: value` there and you get a dict instead of a list. That is what you want whenever the answer will be looked up later: a list of risky resources has to be searched, a dict of them can be asked directly.',
        '',
        'One more piece, because posture data is nested: `any()`. A resource holds a list of CVEs, and the question is usually about the resource, not the CVE. `any(...)` collapses the inner list down to one true or false so the outer comprehension can decide about the resource.',
      ].join('\n'),
      diagram: {
        kind: 'pipeline',
        caption:
          'Three resources with their CVE lists, filtered by: has at least one CVE scoring over 8.0 with an exploit available. The inner any() collapses each list to one answer.',
        stages: [
          { label: 'inventory.items()', note: 'three resources, each with a list of CVEs', rows: 3 },
          { label: 'any(score > 8.0 and exploit)', note: 'res-02 tops out at 7.5, so it is dropped', rows: 2 },
          { label: '{rid: cves ...}', note: 'res-01 and res-03, each keeping its whole CVE list', rows: 2 },
        ],
      },
      takeaway: 'and is lazy, in is a membership test, and a colon at the front of a comprehension makes it a dict.',
    },

    worked: {
      task:
        'Return every finding that is open and whose severity is critical or high. Then build a dict of resource id to CVE list, keeping only resources with at least one exploitable CVE over 8.0.',
      steps: [
        {
          label: 'express the severity test as membership',
          code: 'finding.get("severity") in {"critical", "high"}',
          why: 'Two equality tests joined by or would do the same job. Membership in a set says the intent more directly, and it stays one line when the list of severities grows.',
          prompt: {
            question: 'Why a set, {"critical", "high"}, rather than a list, ["critical", "high"]?',
            answer:
              'Both work. A set answers a membership question in one step whatever its size, while a list checks its items one by one. With two values it makes no measurable difference; the answer key uses a set because the habit is right when the collection is large.',
          },
        },
        {
          label: 'join the conditions with and',
          code: 'if finding.get("status") == "open" and finding.get("severity") in {"critical", "high"}',
          why: 'Both have to hold. Status first because it drops the most rows for the least work, and because and never evaluates the right side once the left is false.',
        },
        {
          label: 'assemble the whole filter',
          code: 'open_serious = [\n    finding\n    for finding in findings\n    if finding.get("status") == "open"\n    and finding.get("severity") in {"critical", "high"}\n]',
          why: 'Spread over lines it reads as four decisions: what comes out, what is walked, and two tests. Python does not care about the line breaks inside the brackets.',
          prompt: {
            question: 'This is Q1.20 from the bank. What is it actually testing?',
            answer:
              'Whether you can hold two conditions and a membership test in one expression, and whether you reach for .get() rather than brackets on data you did not write. The answer key adds one more thing: use a set for the membership test.',
          },
        },
        {
          label: 'collapse a nested list with any()',
          code: 'risky = {\n    rid: cves\n    for rid, cves in inventory.items()\n    if any(c["cvss_score"] > 8.0 and c["exploit_available"] for c in cves)\n}',
          why: 'The front is a pair, so this builds a dict. The test is about the resource, but the data is per CVE, and any() is what turns a list of answers into the single answer the outer filter needs.',
          prompt: {
            question: 'Why does any() short circuit matter here?',
            answer:
              'A resource with 300 CVEs where the second one qualifies stops at the second. Without any(), the obvious loop version checks all 300 and then still has to remember that it found one.',
          },
        },
      ],
      trace: {
        caption: 'Two conditions, one and. Watch the second condition never run on the first pass.',
        language: 'python',
        code: [
          'findings = [{"severity": "critical", "status": "resolved"},',
          '            {"severity": "high", "status": "open"}]',
          'keep = []',
          'for f in findings:',
          '    if f["severity"] in {"critical", "high"} and f["status"] == "open":',
          '        keep.append(f)',
          'print(len(keep))',
        ],
        predict: {
          question: 'Before you step through it: what does this print?',
          options: [
            { text: '1', correct: true },
            { text: '2', correct: false },
            { text: '0', correct: false },
            { text: 'True', correct: false },
          ],
        },
        frames: [
          {
            line: 2,
            vars: { findings: '[{critical, resolved}, {high, open}]' },
            note: 'Two findings. One is serious but closed, the other is serious and open.',
          },
          { line: 3, vars: { keep: '[]' }, note: 'The accumulator.' },
          {
            line: 4,
            vars: { keep: '[]', f: '{"severity": "critical", "status": "resolved"}' },
            note: 'First pass.',
          },
          {
            line: 5,
            vars: { keep: '[]', f: '{"severity": "critical", "status": "resolved"}' },
            note: 'critical is in the set, so the left side is true and Python goes on to the right side. Status is resolved, so the whole test is false.',
          },
          {
            line: 4,
            vars: { keep: '[]', f: '{"severity": "high", "status": "open"}' },
            note: 'Second pass. Line 6 never ran.',
          },
          {
            line: 5,
            vars: { keep: '[]', f: '{"severity": "high", "status": "open"}' },
            note: 'high is in the set and the status is open. Both sides true.',
          },
          {
            line: 6,
            vars: { keep: '[{"severity": "high", "status": "open"}]', f: '{"severity": "high", "status": "open"}' },
            note: 'The one finding that passed both tests.',
          },
          {
            line: 7,
            vars: { keep: '[{"severity": "high", "status": "open"}]' },
            output: '1',
            note: 'One of two. Swap the conditions round and the answer is the same, but more rows pay for the second test.',
          },
        ],
        conclusion:
          'Both conditions had to hold for one finding to survive. Notice what and did on the first pass: it evaluated the left side, found it true, and only then looked right. Had the left side been false it would not have looked right at all.',
      },
      result:
        'A list of the open serious findings, and a dict holding two of the three resources, each still carrying its whole CVE list.',
    },

    fadeLight: {
      task: 'One comprehension: the resource ids of resources that are public and sit in a production account.',
      steps: [
        {
          label: 'decide what comes out',
          code: 'public_prod_ids = [resource["resource_id"]',
          why: 'The id alone, because the caller acts on ids.',
        },
        {
          label: 'decide what is walked',
          code: 'for resource in resources',
          why: 'One resource per pass.',
        },
        {
          label: 'join both tests with and',
          code: 'if resource.get("is_public") is True and resource.get("environment") == "prod"]',
          why: 'Two conditions, both required. The explicit is True test from the last lesson stays, because the source of that flag has not become more trustworthy.',
          accept: ['if resource.get("environment") == "prod" and resource.get("is_public") is True]'],
        },
      ],
      blanks: 1,
      closing:
        'Either order of the two conditions gives the same list. The one written here drops more rows sooner, which is the only reason to prefer it.',
    },

    fadeHeavy: {
      task: 'A dict of resource id to severity, holding only the findings that are open.',
      steps: [
        {
          label: 'open the dict comprehension',
          code: 'severity_by_resource = {',
          why: 'Curly brackets, so the result is a dict rather than a list.',
        },
        {
          label: 'put a pair at the front',
          code: 'finding["resource_id"]: finding["severity"]',
          why: 'Key on the left of the colon, value on the right. This is the only real difference from a list comprehension.',
          accept: ['finding["resource_id"] : finding["severity"]'],
        },
        {
          label: 'decide what is walked',
          code: 'for finding in findings',
          why: 'A list of findings in, a dict out. The input does not have to be a dict for the output to be one.',
        },
        {
          label: 'keep only the open ones, and close it',
          code: 'if finding.get("status") == "open"}',
          why: 'The closing bracket has to match the opening one: curly for a dict, square for a list.',
        },
      ],
      blanks: 2,
      closing:
        'Two findings on the same resource and the second one wins, silently, because a dict holds one value per key. If that matters, the value has to be a list rather than a single severity, which is exactly the shape the worked example built with any().',
    },

    parsons: {
      task: 'Order the blocks into a dict comprehension: resource id to CVE list, keeping only resources with at least one CVE over 8.0 that has an exploit available.',
      language: 'python',
      blocks: [
        { id: 'p1', label: 'name it and open the dict', code: 'risky = {' },
        { id: 'p2', label: 'the pair that comes out', code: 'rid: cves', indent: 1 },
        { id: 'p3', label: 'walk the dict as pairs', code: 'for rid, cves in inventory.items()', indent: 1 },
        {
          id: 'p4',
          label: 'collapse the inner list to one answer',
          code: 'if any(c["cvss_score"] > 8.0 and c["exploit_available"] for c in cves)',
          indent: 1,
        },
        { id: 'p5', label: 'close the dict', code: '}' },
        { id: 'd1', label: 'walk the dict as pairs', code: 'for rid, cves in inventory', indent: 1, distractor: true },
        {
          id: 'd2',
          label: 'collapse the inner list to one answer',
          code: 'if cves["cvss_score"] > 8.0 and cves["exploit_available"]',
          indent: 1,
          distractor: true,
        },
      ],
      solution: ['p1', 'p2', 'p3', 'p4', 'p5'],
      closing:
        'Both blocks you left out treat a collection as if it were a single item. Walking a dict without .items() gives you keys only, so cves would be a string. Subscripting the CVE list rather than one CVE raises a TypeError, because a list is indexed by position and not by field name.',
    },

    produce: {
      kind: 'python',
      task:
        'You have two names in scope: resources, a list of resource dicts, and accounts, a list of account ids. Fill in the blanks to build a dict of account id to public resource count, holding only the accounts that have at least one.',
      template:
        'public_per_account = {\n    account_id: len([\n        r for r in resources\n        if r.get("account_id") == account_id\n        [[1]] r.get("is_public") is True\n    ])\n    for account_id in [[2]]\n    if any(r.get("account_id") == account_id and r.get("is_public") [[3]] True for r in resources)\n}',
      blanks: [
        {
          answer: 'and',
          hint: 'Join the two conditions so that both have to hold. Three letters, lower case.',
        },
        {
          answer: 'accounts',
          hint: 'The collection of account ids being walked, named in the task. One word, no quotes.',
          accept: ['account_ids'],
        },
        {
          answer: 'is',
          hint: 'The explicit boolean test from the last lesson, the one that refuses the number one.',
        },
      ],
      closing:
        'A comprehension inside a comprehension is legal and occasionally the clearest thing to write, but notice how quickly it stops being readable. When the nesting reaches this depth, a loop with a good name for the inner result is the better answer, and knowing when to stop is part of knowing the tool.',
      fallback: {
        task: 'Same problem, as blocks. Count the public resources per account, keeping only accounts that have at least one.',
        language: 'python',
        blocks: [
          { id: 'f1', label: 'start an empty dict', code: 'public_per_account = {}' },
          { id: 'f2', label: 'walk the resources', code: 'for r in resources:' },
          { id: 'f3', label: 'keep only the public ones', code: 'if r.get("is_public") is True:', indent: 1 },
          { id: 'f4', label: 'read the key to count under', code: 'account_id = r.get("account_id")', indent: 2 },
          {
            id: 'f5',
            label: 'add one, starting from zero',
            code: 'public_per_account[account_id] = public_per_account.get(account_id, 0) + 1',
            indent: 2,
          },
        ],
        solution: ['f1', 'f2', 'f3', 'f4', 'f5'],
        closing:
          'This is the loop the comprehension replaces, and it is honestly the clearer one here. Note .get(account_id, 0): the same default trick as lesson 15, used to avoid a KeyError on the first resource of each account.',
      },
    },

    trap: {
      misconceptionId: 'py-loop-instead-of-comprehension',
      setup:
        'The task asked for a dict of resource id to CVE list, keeping resources with at least one exploitable CVE over 8.0. This loop was offered as the same thing, written more plainly.',
      code: 'risky = {}\nfor rid, cves in inventory.items():\n    for c in cves:\n        if c["cvss_score"] > 8.0 and c["exploit_available"]:\n            risky[rid] = c',
      language: 'python',
      question: 'It picks out the same resources as the comprehension. What is different?',
      options: [
        { text: 'Nothing. It is the same dict, built more slowly.', correct: false },
        {
          text: 'The value is one CVE, the last matching one, instead of the whole CVE list the task asked for.',
          correct: true,
        },
        { text: 'It raises a KeyError the first time it meets a resource with no CVEs.', correct: false },
        { text: 'It keeps only the first matching CVE per resource.', correct: false },
      ],
      silently:
        'The keys are right, which is what anyone checking will look at first. The values changed shape from a list of dicts to a single dict, and everything downstream that treats the value as a list keeps working: len() returns the number of fields in the CVE rather than the number of CVEs, and iterating it walks key names instead of records. A report built on this says res-01 has 2 CVEs when it has 2 keys.',
      explanation:
        'A loop is not wrong as a construct, and rewriting one as a comprehension for its own sake is not the lesson here. The point is that this loop is a different program: the inner loop leaves the assignment inside itself, so the value is whatever matched last rather than the collection the task named. The comprehension form makes that mistake hard to write, because the value at the front is written once, next to the key, where you can see what it is. When the task names the output shape, write the shape down first and let the filter come second.',
    },

    handoff: {
      canNow: [
        'Join several conditions in one comprehension, and order them so the cheap test runs first',
        'Build a dict from a comprehension by putting a key and a value at the front',
        'Use any() to answer a question about a record from a list nested inside it',
      ],
      note: 'Q1.21 is the worked example almost exactly, and Q1.20 is the two condition filter. Both are in the bank at medium.',
    },
  },
}

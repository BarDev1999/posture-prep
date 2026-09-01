import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L18',
  number: 18,
  topicId: 'python',
  sectionId: 1,
  title: 'Functions and return values',
  objective:
    'You will be able to wrap a filter in a function that takes its data as a parameter and hands back a value, and to say what a function returns when you never wrote return.',
  minutes: 12,
  difficulty: 'easy',
  sources: ['Q1.20', 'Q1.22', 'B#1D. Python, filtering lists and dicts'],

  steps: {
    vocabulary: [
      {
        term: 'def',
        definition: 'The keyword that names a function. Everything indented under it is the body, and none of it runs until the function is called.',
      },
      {
        term: 'parameter',
        definition: 'A name in the definition line. Inside the body it holds whatever the caller passed in for it.',
      },
      {
        term: 'argument',
        definition: 'The actual value passed at the call. The parameter is the label, the argument is the thing.',
      },
      {
        term: 'return',
        definition: 'Ends the function immediately and hands one value back to the caller. Everything after it in that function is skipped.',
      },
      {
        term: 'None',
        definition: 'The value that means nothing here. It is what a function hands back when it finishes without a return.',
      },
    ],

    model: {
      narrative: [
        'A function is a named piece of work with a hole in it. The hole is the parameter, and the caller fills it. That is the whole idea, and it is what makes the same filter usable against a test file, a live API result and a mock exam question without being rewritten.',
        '',
        'Two things get confused early and are worth separating now.',
        '',
        '`print` shows a value to a human. `return` hands a value to the rest of the program. A function that prints its answer has not produced one: the caller receives None and cannot do anything further with it. Every function in a posture rule returns; printing belongs at the very edge, if anywhere.',
        '',
        '`return` also ends the function. That is not a side effect, it is the tool: a check that has already failed can return False on line two rather than being nested inside four levels of if.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption: 'One call. The caller waits, the body runs, return sends one value back, and the local names disappear.',
        nodes: [
          { label: 'ids = open_ids(findings)', note: 'The caller evaluates the argument and hands it over.' },
          { label: 'def open_ids(findings):', note: 'findings now names the caller value. It exists only inside.' },
          { label: 'the body runs', note: 'result is built. Nothing outside the function can see it.' },
          { label: 'return result', note: 'The function ends here, whatever comes after it.' },
          { label: 'ids holds the returned list', note: 'result and findings are gone. The value they built is not.' },
        ],
      },
      takeaway: 'print shows, return hands back. A function with no return hands back None, silently.',
    },

    worked: {
      task: 'Wrap the open findings filter in a function so it can run against any list of findings, and hand back the ids.',
      steps: [
        {
          label: 'name the work and its hole',
          code: 'def open_ids(findings):',
          why: 'The name says what comes back, not what happens inside. findings is the hole: the function no longer refers to any particular list.',
          prompt: {
            question: 'What is the difference between this findings and the findings in the module above it?',
            answer:
              'Nothing except scope, and that is enough. Inside the function, findings means whatever was passed in. A function that reaches out to a variable defined outside it works until the day it is called from somewhere else, and then it silently filters the wrong data.',
          },
        },
        {
          label: 'do the work on the parameter',
          code: 'return [f["resource_id"] for f in findings if f.get("status") == "open"]',
          why: 'The comprehension from the last two lessons, unchanged. It reads the parameter, which is what makes the function reusable.',
        },
        {
          label: 'end early when there is nothing to do',
          code: 'if not findings:\n    return []',
          why: 'A guard clause. It returns the same shape as the real answer, an empty list rather than None, so the caller never has to ask which kind of nothing it got.',
          prompt: {
            question: 'Why return an empty list rather than None?',
            answer:
              'Because the caller almost certainly loops over the result. Looping over an empty list does nothing; looping over None raises a TypeError. A function should return one shape, always, whatever happened inside it.',
          },
        },
        {
          label: 'call it, and use what comes back',
          code: 'ids = open_ids(findings)\nprint(len(ids))',
          why: 'The value is stored, then used. Had the function printed instead of returning, ids would be None and len(ids) would raise.',
          prompt: {
            question: 'The function does not print anything. Is that a missing feature?',
            answer:
              'No, it is the design. Printing inside means the function can only ever be used one way. Returning means the caller decides: print it, count it, feed it into the next rule, or write it to a file.',
          },
        },
      ],
      trace: {
        caption: 'One call, one return. Watch the jump at line 8, and the jump back.',
        language: 'python',
        code: [
          'def open_ids(findings):',
          '    result = []',
          '    for f in findings:',
          '        if f.get("status") == "open":',
          '            result.append(f["resource_id"])',
          '    return result',
          '',
          'ids = open_ids([{"resource_id": "res-01", "status": "open"}])',
          'print(ids)',
        ],
        predict: {
          question: 'Before you step through it: what does this print?',
          options: [
            { text: "['res-01']", correct: true },
            { text: 'res-01', correct: false },
            { text: 'None', correct: false },
            { text: "[{'resource_id': 'res-01', 'status': 'open'}]", correct: false },
          ],
        },
        frames: [
          {
            line: 1,
            vars: { open_ids: '<function>' },
            note: 'The def line runs, but the body does not. All it does is bind the name.',
          },
          {
            line: 8,
            vars: { open_ids: '<function>' },
            note: 'The call. The list is built first, then handed over, and the program jumps into the function.',
          },
          {
            line: 2,
            vars: { findings: '[{"resource_id": "res-01", "status": "open"}]', result: '[]' },
            note: 'Inside now. findings is the parameter, holding what the caller passed.',
          },
          {
            line: 3,
            vars: { findings: '[1 finding]', result: '[]', f: '{"resource_id": "res-01", "status": "open"}' },
            note: 'One item, so one pass.',
          },
          { line: 4, vars: { result: '[]', f: '{"resource_id": "res-01", "status": "open"}' }, note: 'The test is true.' },
          {
            line: 5,
            vars: { result: '["res-01"]', f: '{"resource_id": "res-01", "status": "open"}' },
            note: 'The id, not the whole finding. That is what the front of the comprehension decided.',
          },
          {
            line: 6,
            vars: { result: '["res-01"]' },
            note: 'The loop is finished, so return runs. This is where the function ends.',
          },
          {
            line: 8,
            vars: { ids: '["res-01"]' },
            note: 'Back at the call. findings, result and f no longer exist; the list they built does.',
          },
          { line: 9, vars: { ids: '["res-01"]' }, output: "['res-01']", note: 'A list printed as a list.' },
        ],
        conclusion:
          'The names inside the function were gone by the last line, and the value survived because it was returned. Delete the return and every one of those steps still runs, in the same order, and ids ends up holding None.',
      },
      result: 'A list holding one id. The function can now be pointed at any list of findings, including the one in the exam question.',
    },

    fadeLight: {
      task: 'Write a function that returns the number of resources that are public.',
      steps: [
        {
          label: 'name the work and its hole',
          code: 'def count_public(resources):',
          why: 'One parameter, because one collection goes in.',
        },
        {
          label: 'guard the empty case',
          code: 'if not resources:\n    return 0',
          why: 'Zero, not None, so the caller can add it to something without checking.',
        },
        {
          label: 'do the work and hand it back',
          code: 'return len([r for r in resources if r.get("is_public") is True])',
          why: 'Filter first, then count what survived. len of the filtered list is the count.',
          accept: ['return len([r for r in resources if r.get("is_public") is True ])'],
        },
      ],
      blanks: 1,
      closing: 'One function, one job, one shape of answer. This is what every rule in the security sections will be built out of.',
    },

    fadeHeavy: {
      task: 'Write a function that returns True when a resource is both public and in production, and False otherwise.',
      steps: [
        {
          label: 'name the work and its hole',
          code: 'def is_exposed(resource):',
          why: 'A name that reads as a question, because the answer is a boolean.',
        },
        {
          label: 'read the two fields safely',
          code: 'public = resource.get("is_public")\nenvironment = resource.get("environment")',
          why: 'Two lookups on data you did not write, so .get() on both. Naming them makes the return line readable.',
        },
        {
          label: 'hand back the answer itself, not a branch',
          code: 'return public is True and environment == "prod"',
          why: 'The expression is already True or False, so there is nothing to wrap it in. Writing if that: return True else: return False says the same thing four lines longer.',
          accept: ['return environment == "prod" and public is True'],
        },
      ],
      blanks: 2,
      closing:
        'A function whose name is a question should return a boolean and nothing else. Not the field it read, not a string, not None on some paths and a boolean on others, which is the bug the trap on this lesson is built from.',
    },

    parsons: {
      task: 'Order the blocks into a function that returns the ids of the findings that are open and critical, with a guard for an empty input.',
      language: 'python',
      blocks: [
        { id: 'p1', label: 'name the work and its hole', code: 'def open_critical_ids(findings):' },
        { id: 'p2', label: 'guard the empty case', code: 'if not findings:', indent: 1 },
        { id: 'p3', label: 'return the same shape as the real answer', code: 'return []', indent: 2 },
        {
          id: 'p4',
          label: 'do the work and hand it back',
          code: 'return [f["resource_id"] for f in findings\n        if f.get("status") == "open"\n        and f.get("severity") == "critical"]',
          indent: 1,
        },
        { id: 'd1', label: 'guard the empty case', code: 'if findings == None:', indent: 1, distractor: true },
        { id: 'd2', label: 'show the answer', code: 'print(open_critical_ids(findings))', indent: 1, distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'One block you left out compares to None with == rather than checking emptiness, so an empty list would sail past the guard and the function would work anyway, by luck. The other prints from inside the function, which both fails to return anything and calls the function from inside itself.',
    },

    produce: {
      kind: 'python',
      task: 'Fill in the blanks so this function hands back a list of the ids of every finding that is open, and an empty list when there are none.',
      template:
        'def open_ids(findings):\n    if [[1]] findings:\n        return []\n    [[2]] [\n        finding["resource_id"]\n        for finding in [[3]]\n        if finding.get("status") == "open"\n    ]',
      blanks: [
        {
          answer: 'not',
          hint: 'The word that makes the guard fire on an empty list. Three letters.',
        },
        {
          answer: 'return',
          hint: 'The keyword that hands the value to the caller rather than showing it to a human.',
        },
        {
          answer: 'findings',
          hint: 'The parameter, so the function works on whatever was passed in rather than on one particular list.',
        },
      ],
      closing:
        'Note what blank 3 is really testing. Writing any other name there would make the function work in the file where it was written and fail everywhere else, and that failure would be a NameError pointing at the comprehension rather than at the mistake.',
      fallback: {
        task: 'Same problem, as blocks. A function returning the ids of the open findings, with a guard.',
        language: 'python',
        blocks: [
          { id: 'f1', label: 'name the work and its hole', code: 'def open_ids(findings):' },
          { id: 'f2', label: 'guard the empty case', code: 'if not findings:', indent: 1 },
          { id: 'f3', label: 'return the same shape', code: 'return []', indent: 2 },
          {
            id: 'f4',
            label: 'do the work and hand it back',
            code: 'return [f["resource_id"] for f in findings if f.get("status") == "open"]',
            indent: 1,
          },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Define, guard, return. Now write it out with the blanks filled.',
      },
    },

    trap: {
      misconceptionId: 'py-truthiness',
      setup:
        'A helper that answers whether a resource is public, and the loop that uses it. The inventory holds is_public as the text "true" or "false" for resources imported from an older collector.',
      code: 'def is_public(resource):\n    return resource.get("is_public")\n\nfor r in resources:\n    if is_public(r):\n        report_as_public(r)',
      language: 'python',
      question: 'What happens to a resource whose is_public field holds the text "false"?',
      options: [
        { text: 'It is skipped, because "false" is a false value.', correct: false },
        { text: 'It is reported as public, because any non empty text is truthy.', correct: true },
        { text: 'It raises a TypeError, because if needs a boolean.', correct: false },
        { text: 'It is skipped, because the function returned a string rather than True.', correct: false },
      ],
      silently:
        'Every resource imported by the old collector is reported as public, including the ones explicitly marked as not public. Nothing raises, nothing logs, and the report looks fuller rather than wrong. A resource with no is_public field at all is handled correctly by accident, because .get() returns None and None is falsy, which makes the bug even harder to spot from a sample.',
      explanation:
        'The function is named as a question but does not answer one: it hands back whatever the field held, which might be True, "false", 1, None or a missing key. The if then applies truthiness, and truthiness accepts any non empty string. A function whose name starts with is_ owes the caller a real boolean, so it should end in a comparison: return resource.get("is_public") is True. That is the same explicit test as lesson 16, moved to the place where it belongs, at the boundary where a value stops being data and becomes a decision.',
    },

    handoff: {
      canNow: [
        'Write a function that takes its data as a parameter rather than reaching outside itself',
        'Return a value instead of printing it, and return one shape on every path',
        'Explain what a function hands back when it has no return statement',
      ],
      note: 'Q1.20 asks for exactly this: a function, a list of dicts in, a filtered list out. It is the last question of the bank you can answer without classes.',
    },
  },
}

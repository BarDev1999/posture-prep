import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L15',
  number: 15,
  topicId: 'python',
  sectionId: 1,
  title: 'Lists and dicts, and .get() versus bracket access',
  objective:
    'You will be able to read a list of dicts, pull a field out of each one, and choose between brackets and .get() on purpose rather than by habit.',
  minutes: 12,
  difficulty: 'easy',
  sources: ['Q1.20', 'Q1.22', 'B#SCHEMA for the SQL questions'],

  steps: {
    vocabulary: [
      {
        term: 'list',
        definition: 'An ordered collection, written in square brackets. Things stay in the order you put them in and can repeat.',
      },
      {
        term: 'dict',
        definition: 'A collection of labelled values, written in curly brackets. You reach a value by its label rather than by its position.',
      },
      {
        term: 'key',
        definition: 'The label in a dict. In this app the keys are the column names that came back from a query.',
      },
      {
        term: 'finding["severity"]',
        definition: 'Bracket access. It demands that the key is there and stops the program if it is not.',
      },
      {
        term: 'finding.get("severity")',
        definition: 'The same lookup, but it hands back None when the key is missing instead of stopping. A second argument sets what comes back instead.',
      },
      {
        term: 'KeyError',
        definition: 'The error Python raises when you ask a dict for a key it does not hold. It ends the program unless something catches it.',
      },
    ],

    model: {
      narrative: [
        'One row of a query result is one dict. A whole result set is a list of them. That is the shape almost every piece of security tooling hands you, and it is the shape this whole Python block works in.',
        '',
        'A dict looks like a row until you ask it for a column that is not there. A database row always has every column, even if the value is NULL. A dict does not: a missing key is not an empty value, it is nothing at all, and asking for it with brackets stops the program.',
        '',
        'This is not a detail. Real posture data is ragged: the API returns the severity field only once a rule has scored the finding, so a list of 400 findings can hold 12 without one. Bracket access turns those 12 into a crash, and a crash in a scanning job means the other 388 never got checked either.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption: 'The same lookup, two behaviours. The difference only shows up on the data you did not write yourself.',
        left: {
          title: 'finding["severity"]',
          points: [
            'Key there: hands back the value.',
            'Key missing: raises KeyError and the program stops.',
            'Right when a missing key means your data is broken and you want to know.',
          ],
        },
        right: {
          title: 'finding.get("severity")',
          points: [
            'Key there: hands back the value.',
            'Key missing: hands back None, or the default you passed.',
            'Right when a missing key is normal and you have something sensible to do about it.',
          ],
        },
      },
      takeaway: 'Brackets say this key must exist. .get() says it might not, and here is what to do then.',
    },

    worked: {
      task: 'Print the resource id and the severity of every finding in a list, where one of the findings has no severity field at all.',
      steps: [
        {
          label: 'build the data you were handed',
          code: 'first = {"resource_id": "res-01", "severity": "critical"}\nsecond = {"resource_id": "res-02"}\nfindings = [first, second]',
          why: 'Two dicts with different keys in one list. Nothing stops that in Python, and nothing warns you about it either.',
        },
        {
          label: 'walk the list one item at a time',
          code: 'for finding in findings:',
          why: 'The name after for is yours to choose. It is bound to each item in turn, so inside the loop finding is one dict, never the whole list.',
          prompt: {
            question: 'How many times will the lines under this one run?',
            answer: 'Twice, once per item in the list. The loop does not know or care what is inside the items; it counts them.',
          },
        },
        {
          label: 'read the field that might be missing',
          code: 'severity = finding.get("severity", "unknown")',
          why: 'The second argument is what comes back when the key is not there. Without it you would get None, which then has to be handled further down.',
          prompt: {
            question: 'Why not write finding["severity"] here and handle the error later?',
            answer:
              'Because the error ends the loop. The second finding would stop the program before the third, fourth and four hundredth were ever looked at. A missing field on one record is not a reason to stop reading the rest.',
          },
        },
        {
          label: 'read the field that must be there',
          code: 'print(finding["resource_id"], severity)',
          why: 'Brackets here, on purpose. Every finding has a resource id; if one does not, the data is broken and stopping is the honest outcome.',
          prompt: {
            question: 'Two lookups, two different styles, in the same loop. Is that inconsistent?',
            answer:
              'No, it is the point. Each lookup states what you believe about the data: this key is guaranteed, that one is optional. Using .get() everywhere hides broken data, and using brackets everywhere crashes on normal data.',
          },
        },
      ],
      trace: {
        caption: 'Nine steps, six lines. Watch severity change on the second pass without the program stopping.',
        language: 'python',
        code: [
          'first = {"resource_id": "res-01", "severity": "critical"}',
          'second = {"resource_id": "res-02"}',
          'findings = [first, second]',
          'for finding in findings:',
          '    severity = finding.get("severity", "unknown")',
          '    print(finding["resource_id"], severity)',
        ],
        predict: {
          question: 'Before you step through it: what does this program print?',
          options: [
            { text: 'res-01 critical\nres-02 unknown', correct: true },
            { text: 'res-01 critical\nthen it stops with a KeyError', correct: false },
            { text: 'res-01 critical\nres-02 None', correct: false },
            { text: 'Nothing. .get() with two arguments is not valid Python.', correct: false },
          ],
        },
        frames: [
          {
            line: 1,
            vars: { first: '{"resource_id": "res-01", "severity": "critical"}' },
            note: 'A dict with two keys. Nothing has been read out of it yet.',
          },
          {
            line: 2,
            vars: {
              first: '{"resource_id": "res-01", "severity": "critical"}',
              second: '{"resource_id": "res-02"}',
            },
            note: 'The second dict has one key. This is the ragged data the lesson is about.',
          },
          {
            line: 3,
            vars: { findings: '[first, second]' },
            note: 'The list holds the two dicts. first and second still exist; they are the same objects.',
          },
          {
            line: 4,
            vars: { findings: '[first, second]', finding: '{"resource_id": "res-01", "severity": "critical"}' },
            note: 'First pass. finding is bound to the first dict.',
          },
          {
            line: 5,
            vars: { finding: '{"resource_id": "res-01", "severity": "critical"}', severity: '"critical"' },
            note: 'The key is there, so .get() behaves exactly like brackets would.',
          },
          {
            line: 6,
            vars: { finding: '{"resource_id": "res-01", "severity": "critical"}', severity: '"critical"' },
            output: 'res-01 critical',
            note: 'print puts a space between the two values.',
          },
          {
            line: 4,
            vars: { finding: '{"resource_id": "res-02"}', severity: '"critical"' },
            note: 'Back to the top. finding is rebound; severity still holds the old value for one more line.',
          },
          {
            line: 5,
            vars: { finding: '{"resource_id": "res-02"}', severity: '"unknown"' },
            note: 'No severity key. This is the line that would have raised KeyError with brackets.',
          },
          {
            line: 6,
            vars: { finding: '{"resource_id": "res-02"}', severity: '"unknown"' },
            output: 'res-02 unknown',
            note: 'resource_id is read with brackets and it is there, so nothing stops.',
          },
        ],
        conclusion:
          'The loop finished. The missing key produced a value you chose rather than an error, and the guaranteed key was read in the way that would have told you loudly if it were ever missing.',
      },
      result: 'Two lines: res-01 critical, then res-02 unknown. No error, and no silent None further down the program.',
    },

    fadeLight: {
      task: 'Collect the resource ids of every finding whose status is open. Some findings have no status field.',
      steps: [
        {
          label: 'start an empty list to collect into',
          code: 'open_ids = []',
          why: 'The result has to exist before the loop can add to it.',
        },
        {
          label: 'walk the findings',
          code: 'for finding in findings:',
          why: 'One dict per pass.',
        },
        {
          label: 'read the optional field with a default',
          code: 'status = finding.get("status", "unknown")',
          why: 'A finding with no status is not open, and it is not a crash either.',
        },
        {
          label: 'keep the ones that match, and only those',
          code: 'if status == "open":\n    open_ids.append(finding["resource_id"])',
          why: 'The comparison is against the value you read, not against the dict. append adds to the end of the list.',
          accept: ['if status == "open":\n  open_ids.append(finding["resource_id"])'],
        },
      ],
      blanks: 1,
      closing:
        'Three lines of setup and one line of decision. That shape, collect then walk then test then append, is the loop you are about to replace with a comprehension in the next lesson.',
    },

    fadeHeavy: {
      task: 'Build a dict mapping each resource id to its severity, using unknown where the severity field is missing.',
      steps: [
        {
          label: 'start an empty dict to collect into',
          code: 'by_resource = {}',
          why: 'Curly brackets with nothing inside is an empty dict, not an empty set.',
        },
        {
          label: 'walk the findings',
          code: 'for finding in findings:',
          why: 'Same loop as before. Only what happens inside it changes.',
        },
        {
          label: 'read the key that is guaranteed',
          code: 'resource_id = finding["resource_id"]',
          why: 'Brackets, because a finding with no resource id is broken data and you want to hear about it.',
        },
        {
          label: 'store the optional key under it',
          code: 'by_resource[resource_id] = finding.get("severity", "unknown")',
          why: 'Assigning to a key that does not exist yet creates it. Assigning to one that does overwrites it, which is worth knowing before you meet duplicate ids.',
        },
      ],
      blanks: 2,
      closing:
        'Note what the last line quietly does to duplicates: two findings on the same resource, and the second one wins. Nothing warns you. That is the same class of silent overwrite as the SQL fan out you met in lesson 14.',
    },

    parsons: {
      task: 'Order the blocks to count how many findings are critical, treating a finding with no severity as not critical.',
      language: 'python',
      blocks: [
        { id: 'p1', label: 'start the counter', code: 'critical_count = 0' },
        { id: 'p2', label: 'walk the findings', code: 'for finding in findings:' },
        { id: 'p3', label: 'read the optional field', code: 'severity = finding.get("severity")', indent: 1 },
        { id: 'p4', label: 'test the value you read', code: 'if severity == "critical":', indent: 1 },
        { id: 'p5', label: 'count it', code: 'critical_count += 1', indent: 2 },
        {
          id: 'd1',
          label: 'read the optional field',
          code: 'severity = finding["severity"]',
          indent: 1,
          distractor: true,
        },
        {
          id: 'd2',
          label: 'test the value you read',
          code: 'if finding == "critical":',
          indent: 1,
          distractor: true,
        },
      ],
      solution: ['p1', 'p2', 'p3', 'p4', 'p5'],
      closing:
        'The two blocks you left out are the two mistakes this lesson exists to prevent. One reads the optional key with brackets and stops on the first finding that lacks it. The other compares the whole dict to a string, which is never true and never an error either: it just quietly counts zero.',
    },

    produce: {
      kind: 'python',
      task: 'Fill in the blanks so this function returns a list of the resource ids of every finding whose severity is high, treating a missing severity as not high.',
      template:
        'def high_severity_ids(findings):\n    result = []\n    for finding in findings:\n        severity = finding.[[1]]\n        if severity [[2]] "high":\n            result.append(finding[[[3]]])\n    return result',
      blanks: [
        {
          answer: 'get("severity")',
          hint: 'Read the severity field in the way that survives a finding which does not have one.',
          accept: ['get("severity", None)', "get('severity')", 'get("severity", "unknown")'],
        },
        {
          answer: '==',
          hint: 'Compare the value you just read against the text on the right. Not assignment, and not is.',
        },
        {
          answer: '"resource_id"',
          hint: 'The key that every finding is guaranteed to carry, quoted as a string.',
          accept: ["'resource_id'"],
        },
      ],
      closing:
        'You have now written the loop version of a filter. It works, it is readable, and in the next lesson you will write the same thing in one line and see why the one line version is what people ask for.',
      fallback: {
        task: 'Same problem, as blocks. Return the resource ids of every finding whose severity is high.',
        language: 'python',
        blocks: [
          { id: 'f1', label: 'start an empty list', code: 'result = []' },
          { id: 'f2', label: 'walk the findings', code: 'for finding in findings:' },
          { id: 'f3', label: 'read the optional field', code: 'severity = finding.get("severity")', indent: 1 },
          { id: 'f4', label: 'test the value you read', code: 'if severity == "high":', indent: 1 },
          { id: 'f5', label: 'collect the guaranteed field', code: 'result.append(finding["resource_id"])', indent: 2 },
          { id: 'f6', label: 'hand the list back', code: 'return result' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
        closing: 'Collect, walk, test, append, return. Now write it out with the blanks filled.',
      },
    },

    trap: {
      misconceptionId: 'py-bracket-access-missing-key',
      setup:
        'This ran perfectly against the two findings in the test file. It runs against the live API result, which holds 400 findings, and 12 of them have not been scored yet.',
      code: 'severities = []\nfor finding in findings:\n    severities.append(finding["severity"])\nprint(len(severities))',
      language: 'python',
      question: 'What happens on the live data?',
      options: [
        { text: 'It prints 388, because the 12 unscored findings are skipped.', correct: false },
        { text: 'It stops with a KeyError at the first unscored finding, and prints nothing.', correct: true },
        { text: 'It prints 400, with None in the list for the 12 unscored ones.', correct: false },
        { text: 'It prints 400. Python fills a missing key with an empty string.', correct: false },
      ],
      silently:
        'Nothing about this is silent at the moment it fails, which is exactly why it passed review: an exception is loud. What is silent is everything before it. The findings already appended are thrown away, the print never runs, and if this is a scanning job the log shows a stack trace with no partial result, so the 388 findings that were fine are just as unreported as the 12 that were not.',
      explanation:
        'The key is in the dict because it was in the example. Test data is written by the person writing the test, and it is complete because they typed it. Data from an API is ragged because it was produced by a system with its own timing: a field appears once something has computed it. Decide per lookup: brackets when a missing key means the data is broken, .get() with a default when a missing key is a normal state you can describe.',
    },

    handoff: {
      canNow: [
        'Read a field out of a dict, and say which of the two ways you meant',
        'Walk a list of dicts and collect from it into a list or a dict',
        'Explain why ragged data crashes a loop written against test data',
      ],
      note: 'Q1.20 in the bank is this lesson, one level up: a filter over a list of dicts, written as a function. Attempt it as a loop first.',
    },
  },
}

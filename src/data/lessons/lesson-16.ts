import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L16',
  number: 16,
  topicId: 'python',
  sectionId: 1,
  title: 'Filtering with a loop, then as a comprehension',
  objective:
    'You will be able to write a filter as a loop, rewrite it as a list comprehension, and read either one back as the same three decisions.',
  minutes: 13,
  difficulty: 'easy',
  sources: ['Q1.20', 'Q1.22', 'B#1D. Python, filtering lists and dicts'],

  steps: {
    vocabulary: [
      {
        term: 'filter',
        definition: 'Keeping some items of a collection and dropping the rest, without changing the ones you keep.',
      },
      {
        term: 'append',
        definition: 'Adding one item to the end of a list. The list changes; nothing new is created.',
      },
      {
        term: 'list comprehension',
        definition: 'One expression that builds a whole list: what to keep, what to walk, and which items qualify, in that order.',
      },
      {
        term: 'is True',
        definition: 'A test that passes only for the boolean True itself. Unlike == True it does not accept the number 1.',
      },
      {
        term: 'truthy',
        definition: 'Anything Python treats as true in an if, which includes any non empty text and any number that is not zero.',
      },
    ],

    model: {
      narrative: [
        'A filter is three decisions and never more: what you walk, which items qualify, and what you keep from each one. Both forms below make exactly those three decisions. They differ in how much room the decisions are given, not in what they are.',
        '',
        'The loop spreads them over five lines, with an accumulator you have to create, remember to append to, and remember to return. The comprehension puts them on one line in a fixed order: keep, walk, test.',
        '',
        'The reason to learn the comprehension is not that it is shorter. It is that the loop has three places to make a mistake that the comprehension does not have: forgetting to create the list, appending inside the wrong block, and returning the wrong name. The exam asks for a comprehension for the same reason: it shows you can hold the whole filter in your head at once.',
        '',
        'Read a comprehension from the middle outwards. Find `for` first, because that is the input; then the `if`, which is the test; then the front, which is what comes out.',
      ].join('\n'),
      diagram: {
        kind: 'compare',
        caption: 'The same three decisions, twice. The comprehension has no accumulator, so it cannot get the accumulator wrong.',
        left: {
          title: 'the loop',
          points: [
            'result = []  creates the accumulator',
            'for finding in findings:  walks',
            'if ...:  tests',
            'result.append(...)  keeps',
            'return result  hands it back',
          ],
        },
        right: {
          title: 'the comprehension',
          points: [
            '[finding  keeps',
            'for finding in findings  walks',
            'if ...]  tests',
            'No accumulator at all.',
            'The list is the value of the expression.',
          ],
        },
      },
      takeaway: 'Keep, walk, test. A comprehension is a filter with the accumulator taken away.',
    },

    worked: {
      task: 'Return every finding whose status is open, first as a loop, then as the comprehension that replaces it.',
      steps: [
        {
          label: 'create the accumulator',
          code: 'result = []',
          why: 'The loop has nowhere to put anything until this exists. This is the line people forget, and the error it gives, a NameError on result, points at the append rather than at the missing line.',
        },
        {
          label: 'walk, test, keep',
          code: 'for finding in findings:\n    if finding.get("status") == "open":\n        result.append(finding)',
          why: 'Three lines, three decisions. The append is indented twice: once because it is inside the loop, once more because it is inside the if.',
          prompt: {
            question: 'What changes if the append is indented once instead of twice?',
            answer:
              'Every finding is kept, whatever its status, because the append is then inside the loop but outside the test. It still runs, still returns a list, and is silently wrong. Indentation in Python is not layout, it is the program.',
          },
        },
        {
          label: 'the same filter as one expression',
          code: 'result = [finding for finding in findings if finding.get("status") == "open"]',
          why: 'Keep, walk, test, in that order. Nothing was added and nothing was removed: the accumulator simply has no name any more.',
          prompt: {
            question: 'Why does finding appear twice?',
            answer:
              'The second one, after for, is the name being bound on each pass, exactly as in the loop. The first one is what goes into the new list. They are the same thing here, but they do not have to be: put finding["resource_id"] at the front and you keep the id rather than the whole dict.',
          },
        },
        {
          label: 'keep the field, not the row',
          code: 'open_ids = [finding["resource_id"] for finding in findings if finding.get("status") == "open"]',
          why: 'Only the front changed. This is the version a posture rule usually wants: a list of ids to act on, rather than a list of whole records to walk again.',
          prompt: {
            question: 'The test uses .get() and the front uses brackets. Deliberate?',
            answer:
              'Yes, and it is the same decision as the last lesson. Status may be missing, so a missing one has to mean not open rather than a crash. The resource id is guaranteed, so if it is ever missing you want to know immediately.',
          },
        },
      ],
      trace: {
        caption: 'The loop form, stepped. Watch result grow only on the passes where the test is true.',
        language: 'python',
        code: [
          'findings = [{"status": "open"}, {"status": "resolved"}, {"status": "open"}]',
          'result = []',
          'for finding in findings:',
          '    if finding.get("status") == "open":',
          '        result.append(finding)',
          'print(len(result))',
        ],
        predict: {
          question: 'Before you step through it: what does this print?',
          options: [
            { text: '2', correct: true },
            { text: '3', correct: false },
            { text: '1', correct: false },
            { text: 'It raises a KeyError on the second finding.', correct: false },
          ],
        },
        frames: [
          {
            line: 1,
            vars: { findings: '[{"status": "open"}, {"status": "resolved"}, {"status": "open"}]' },
            note: 'Three dicts, two of them open.',
          },
          { line: 2, vars: { result: '[]' }, note: 'The accumulator. Empty, but it exists.' },
          {
            line: 3,
            vars: { result: '[]', finding: '{"status": "open"}' },
            note: 'First pass.',
          },
          { line: 4, vars: { result: '[]', finding: '{"status": "open"}' }, note: 'The test is true.' },
          {
            line: 5,
            vars: { result: '[{"status": "open"}]', finding: '{"status": "open"}' },
            note: 'append changed the existing list. Nothing was reassigned.',
          },
          {
            line: 3,
            vars: { result: '[{"status": "open"}]', finding: '{"status": "resolved"}' },
            note: 'Second pass.',
          },
          {
            line: 4,
            vars: { result: '[{"status": "open"}]', finding: '{"status": "resolved"}' },
            note: 'The test is false, so line 5 does not run at all.',
          },
          {
            line: 3,
            vars: { result: '[{"status": "open"}]', finding: '{"status": "open"}' },
            note: 'Third pass.',
          },
          {
            line: 5,
            vars: { result: '[{"status": "open"}, {"status": "open"}]', finding: '{"status": "open"}' },
            note: 'Second append. The list now holds two dicts.',
          },
          {
            line: 6,
            vars: { result: '[{"status": "open"}, {"status": "open"}]' },
            output: '2',
            note: 'len counts the items in the list, not the keys in the dicts.',
          },
        ],
        conclusion:
          'Ten steps to keep two of three items. The comprehension does the same three things in one line, and the only thing it removes is the accumulator you had to remember to create and append to.',
      },
      result: 'A list of the two open findings. As a comprehension it is one line, and it is the answer Q1.20 is asking for.',
    },

    fadeLight: {
      task: 'As a comprehension: every resource whose region is us-east-1.',
      steps: [
        {
          label: 'decide what comes out',
          code: '[resource',
          why: 'The whole dict this time, so the front is just the loop name.',
        },
        {
          label: 'decide what is walked',
          code: 'for resource in resources',
          why: 'This is the part to write first when you are reading one, even though it is written second.',
        },
        {
          label: 'decide which ones qualify',
          code: 'if resource.get("region") == "us-east-1"]',
          why: 'The test closes the bracket. A comprehension with no if keeps everything, which is a map rather than a filter.',
          accept: ['if resource.get("region") == "us-east-1" ]'],
        },
      ],
      blanks: 1,
      closing: 'Keep, walk, test. Three parts, always in that order, whatever the filter is about.',
    },

    fadeHeavy: {
      task: 'As a comprehension: the resource id of every resource that is not public, where is_public may be missing.',
      steps: [
        {
          label: 'name the result',
          code: 'private_ids = [',
          why: 'A name that says what is inside it. ids, not resources, because that is what comes out.',
        },
        {
          label: 'decide what comes out',
          code: 'resource["resource_id"]',
          why: 'The id alone. Brackets, because every resource has one.',
        },
        {
          label: 'decide what is walked',
          code: 'for resource in resources',
          why: 'One dict per pass, same as the loop.',
        },
        {
          label: 'decide which ones qualify',
          code: 'if resource.get("is_public") is not True]',
          why: 'Not public means anything that is not exactly True: False, and missing as well. Writing it this way makes the missing case a deliberate decision rather than an accident.',
          accept: ['if resource.get("is_public") is not True ]'],
        },
      ],
      blanks: 2,
      closing:
        'This is the Python echo of lesson 4. In SQL, is_public != TRUE silently dropped the unknown rows; in Python, .get() plus is not True deliberately keeps them. Same question, opposite default, and both of them have to be decided rather than assumed.',
    },

    parsons: {
      task: 'Order the blocks into a comprehension, written over several lines, that keeps the resource id of every open finding.',
      language: 'python',
      blocks: [
        { id: 'p1', label: 'name the result and open the bracket', code: 'open_ids = [' },
        { id: 'p2', label: 'what comes out', code: 'finding["resource_id"]', indent: 1 },
        { id: 'p3', label: 'what is walked', code: 'for finding in findings', indent: 1 },
        { id: 'p4', label: 'which ones qualify', code: 'if finding.get("status") == "open"', indent: 1 },
        { id: 'p5', label: 'close the bracket', code: ']' },
        { id: 'd1', label: 'which ones qualify', code: 'if finding.get("status") == "open":', indent: 1, distractor: true },
        { id: 'd2', label: 'what is walked', code: 'for finding in findings:', indent: 1, distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4', 'p5'],
      closing:
        'The two blocks you left out end in a colon. A colon opens a block in Python, and there are no blocks inside a comprehension: it is one expression spread over several lines. That colon is the single most common syntax error when people first move from the loop to the comprehension.',
    },

    produce: {
      kind: 'python',
      task: 'Fill in the blanks so this returns a list of the resources that are public, using the explicit boolean test rather than a truthy one.',
      template:
        'def get_public(resources):\n    return [\n        resource\n        [[1]] resource in resources\n        if resource.[[2]] [[3]] True\n    ]',
      blanks: [
        {
          answer: 'for',
          hint: 'The keyword that says what is being walked. One word, no colon.',
        },
        {
          answer: 'get("is_public")',
          hint: 'Read the public flag in the way that survives a resource where the cloud API did not return that field.',
          accept: ["get('is_public')", 'get("is_public", None)'],
        },
        {
          answer: 'is',
          hint: 'The comparison that accepts the boolean itself and refuses the number one. Two letters.',
        },
      ],
      closing:
        'That is Q1.22 from the bank, fixed. The answer key gives exactly this: .get() rather than brackets, and is True rather than == True, because in a security rule you want an explicit decision instead of a coercion.',
      fallback: {
        task: 'Same problem, as blocks. Return the resources that are public, tested explicitly.',
        language: 'python',
        blocks: [
          { id: 'f1', label: 'define the function', code: 'def get_public(resources):' },
          { id: 'f2', label: 'return the comprehension', code: 'return [', indent: 1 },
          { id: 'f3', label: 'what comes out', code: 'resource', indent: 2 },
          { id: 'f4', label: 'what is walked', code: 'for resource in resources', indent: 2 },
          { id: 'f5', label: 'which ones qualify', code: 'if resource.get("is_public") is True', indent: 2 },
          { id: 'f6', label: 'close the bracket', code: ']', indent: 1 },
        ],
        solution: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
        closing: 'Keep, walk, test, and the test is the explicit one. Now write it with the blanks filled.',
      },
    },

    trap: {
      misconceptionId: 'py-equals-true',
      setup:
        'A rule that flags public resources. The inventory holds is_public as True for some resources, as the number 1 for others, and as the text "true" for a third group, because three different collectors wrote it.',
      code: 'public = [r for r in resources if r["is_public"] == True]',
      language: 'python',
      question: 'What does this actually keep, and what does it do to the rest?',
      options: [
        {
          text: 'It keeps True and 1, misses "true", and stops with a KeyError on the first resource with no is_public field.',
          correct: true,
        },
        { text: 'It keeps True, 1 and "true", because Python compares them all as truthy.', correct: false },
        { text: 'It keeps only True. The other two are different types, so they are skipped.', correct: false },
        { text: 'It raises a TypeError, because you cannot compare a string to a boolean.', correct: false },
      ],
      silently:
        'Two silent failures in one line. The number 1 equals True in Python, so those rows are kept by accident rather than on purpose, and the text "true" is not equal to True, so those resources are quietly reported as private. The KeyError is the only part that is loud, and it is the part that stops the whole scan on the first ragged record.',
      explanation:
        'Writing == True feels like the careful, explicit version, which is why it survives review. It is the opposite: it is a value comparison, and Python treats True as equal to 1 and to 1.0. What you meant was identity, which is is True, and that accepts nothing but the boolean itself. In a security rule the distinction is the whole point: a field that holds the string "true" is not a boolean you can trust, it is a data quality problem you want reported, not silently coerced into an answer.',
    },

    handoff: {
      canNow: [
        'Write a filter as a loop and as a comprehension, and move between them',
        'Read a comprehension by finding the for first, then the if, then the front',
        'Say why is True and == True are different tests in a security rule',
      ],
      note: 'Q1.22 is this lesson exactly, and Q1.20 is the same shape one step harder: two conditions instead of one, which is the next lesson.',
    },
  },
}

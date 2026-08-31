import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L4',
  number: 4,
  topicId: 'sql',
  sectionId: 1,
  title: 'NULL as unknown, and three valued logic',
  objective:
    'You will be able to write a filter that handles unknown values on purpose, instead of dropping them without noticing.',
  minutes: 14,
  difficulty: 'medium',
  sources: ['F3', 'Q1.3', 'Q1.4', 'Q1.6'],
  practice: { questionIds: ['Q1.3', 'Q1.4', 'Q1.6'], factIds: ['F3'] },

  steps: {
    vocabulary: [
      {
        term: 'NULL',
        definition: 'A marker meaning the value is not known. It is not zero, not FALSE, and not empty text.',
      },
      {
        term: 'unknown',
        definition: 'The third answer a test can give. A test against a missing value is neither true nor false.',
      },
      {
        term: 'three valued logic',
        definition: 'The rule that a SQL test comes out true, false or unknown, rather than only true or false.',
      },
      {
        term: 'IS NULL',
        definition: 'The only test that asks whether a value is missing. It always answers true or false.',
      },
      {
        term: 'IS NOT NULL',
        definition: 'The opposite test: this row has a value, whatever that value happens to be.',
      },
    ],

    model: {
      narrative: [
        'The scanner could not read the public setting on 8 of the 40 resources. Those cells hold NULL, and NULL means the scanner does not know, not that the answer is no.',
        '',
        'Now the important part. When you compare anything to a missing value, SQL does not answer false. It answers unknown, because it genuinely does not have enough information to answer. `is_public = TRUE` on a NULL row is unknown. `is_public = FALSE` on the same row is also unknown. Even `is_public != TRUE` is unknown.',
        '',
        '**WHERE keeps a row only when the test comes out true.** Unknown is not true, so those rows disappear, and they disappear with no error and no warning. That is the whole mechanism, and almost every NULL bug you will ever write is this one sentence.',
      ].join('\n'),
      diagram: {
        kind: 'buckets',
        caption: 'WHERE is_public != TRUE keeps 21 of the 40 rows. The 8 unknown ones vanish.',
        buckets: [
          { label: 'is_public is TRUE', count: 11, note: 'test answers false', kept: false },
          { label: 'is_public is FALSE', count: 21, note: 'test answers true', kept: true },
          { label: 'is_public is NULL', count: 8, note: 'test answers unknown', kept: false },
        ],
      },
      takeaway: 'WHERE keeps only what is true. Unknown is dropped exactly like false, and looks identical afterwards.',
    },

    worked: {
      task: 'Return every resource that is not public. The scanner could not read 8 of them, and unknown is a risk of its own, so those have to come back too.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM resources',
          why: 'is_public is a column on resources.',
        },
        {
          label: 'keep the rows that are known not to be public',
          code: 'WHERE is_public = FALSE',
          why: 'True for 21 rows. False for the 11 public ones. Unknown for the 8 the scanner could not read, so those are dropped along with the public ones.',
          prompt: {
            question: 'Those 8 rows are certainly not TRUE. Why does is_public = FALSE not keep them?',
            answer:
              'Because on those rows the test does not answer false, it answers unknown, and WHERE keeps a row only when the answer is true. False and unknown both lead to the same place, which is why they are impossible to tell apart by looking at the result.',
          },
        },
        {
          label: 'add the rows where the value is missing',
          code: 'OR is_public IS NULL',
          why: 'IS NULL is the only test that works on a missing value. It is a different question from equals, and it always has an answer.',
          prompt: {
            question: 'Why IS NULL rather than = NULL?',
            answer:
              'Equals asks whether two values are the same. NULL is not a value, it is the absence of one, so the question has nothing to compare and SQL answers unknown. = NULL therefore matches nothing at all, not even another NULL. IS NULL asks a different question, is this one missing, and that question can always be answered.',
          },
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT * FROM resources WHERE is_public = FALSE OR is_public IS NULL;',
          why: 'Two conditions joined by OR: a row is kept if either one is true. The answer now says out loud what it does with unknown, which is the point.',
        },
      ],
      result:
        '29 rows: the 21 known to be private, plus the 8 the scanner could not read. Writing IS NOT TRUE instead of both conditions gives the same 29 rows.',
    },

    fadeLight: {
      task: 'Return the id and the name of every identity that has never been used.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM identities',
          why: 'last_used_at is a column on identities, and it is empty when the identity has never been used.',
        },
        {
          label: 'keep only the rows with no value',
          code: 'WHERE last_used_at IS NULL',
          why: 'Never used is recorded as a missing date, not as an old one, so this is an IS NULL question rather than a comparison.',
        },
        {
          label: 'choose the columns you want back',
          code: 'SELECT identity_id, name',
          why: 'Enough to name the identity and look it up again.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT identity_id, name FROM identities WHERE last_used_at IS NULL;',
          why: 'Three parts, same order as always.',
          accept: ['SELECT identity_id, name FROM identities WHERE last_used_at IS NULL'],
        },
      ],
      blanks: 1,
      closing:
        '5 rows. Five identities in these accounts have never once been used, and an unused identity with permissions is a standing risk.',
    },

    fadeHeavy: {
      task: 'Return the id and the name of every resource whose public setting the scanner could not read.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM resources',
          why: 'Back to the resources table and its 8 unreadable rows.',
        },
        {
          label: 'keep only the rows with no value',
          code: 'WHERE is_public IS NULL',
          why: 'This time the unknown rows are the answer rather than an accident.',
        },
        {
          label: 'choose the columns you want back',
          code: 'SELECT resource_id, name',
          why: 'Two columns, enough to go and look at the resource.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT resource_id, name FROM resources WHERE is_public IS NULL;',
          why: 'The whole lesson in one line.',
          accept: ['SELECT resource_id, name FROM resources WHERE is_public IS NULL'],
        },
      ],
      blanks: 2,
      closing:
        '8 rows, mostly roles and functions, where being public does not really apply. That is a fair reason for the value to be missing, and it is still worth knowing which ones they are.',
    },

    parsons: {
      task: 'Build the query that returns the name and the last used date of every identity that has been used at least once.',
      blocks: [
        { id: 'p1', label: 'ask for columns', code: 'SELECT name, last_used_at' },
        { id: 'p2', label: 'name the table', code: 'FROM identities' },
        { id: 'p3', label: 'keep only the ones that have a value', code: 'WHERE last_used_at IS NOT NULL;' },
        { id: 'd1', label: 'keep only the ones that have a value', code: 'WHERE last_used_at != NULL;', distractor: true },
        {
          id: 'd2',
          label: 'keep only the ones that have a value',
          code: "WHERE last_used_at IS NOT 'NULL';",
          distractor: true,
        },
      ],
      solution: ['p1', 'p2', 'p3'],
      closing:
        '15 rows. The first block you left out compares to NULL with an operator, so it answers unknown on every row and returns nothing. The second looks for the four letter word NULL as text.',
    },

    produce: {
      kind: 'sql',
      task: 'Return the id and the name of every resource that is not known to be public. The 8 the scanner could not read belong in the answer.',
      starter: 'SELECT',
      referenceSql: 'SELECT resource_id, name FROM resources WHERE is_public = FALSE OR is_public IS NULL;',
      closing:
        '29 rows. IS NOT TRUE gives the same answer in one condition, and either is fine: the grader compares the rows you got, not the words you used.',
      fallback: {
        task: 'Same problem, as blocks. Every resource not known to be public, including the unknown ones.',
        blocks: [
          { id: 'f1', label: 'ask for columns', code: 'SELECT resource_id, name' },
          { id: 'f2', label: 'name the table', code: 'FROM resources' },
          { id: 'f3', label: 'the ones known to be private', code: 'WHERE is_public = FALSE' },
          { id: 'f4', label: 'and the ones nobody could read', code: '   OR is_public IS NULL;' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Two conditions, joined by OR. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-not-equal-drops-null',
      setup:
        'This is meant to list every resource that is not public. The table holds 11 public rows, 21 that are not public, and 8 the scanner could not read.',
      code: 'SELECT resource_id, name FROM resources WHERE is_public != TRUE;',
      question: 'How many rows come back?',
      options: [
        { text: '21', correct: true },
        { text: '29', correct: false },
        { text: '40', correct: false },
        { text: '11', correct: false },
      ],
      silently:
        'Twenty-one rows and no error. The 8 resources nobody could read are simply not in the answer, and nothing on screen mentions them. In a posture report those 8 are the ones most worth looking at, because unknown is not the same as safe, and here they have quietly been counted as safe.',
      explanation:
        'Not equal reads in English like everything else, so it feels complete. It is not: a comparison against a missing value answers unknown, and WHERE treats unknown exactly like false. The fix is to say what you want done with unknown rather than leaving it to the operator. Either add OR is_public IS NULL, or use IS NOT TRUE, which is the one form of the test that treats unknown as not true rather than as no answer.',
    },

    handoff: {
      canNow: [
        'Say what NULL means and why a comparison against it answers unknown',
        'Test for a missing value with IS NULL and IS NOT NULL',
        'Write a filter that decides on purpose whether unknown rows belong in the answer',
      ],
      note: 'Three questions in the bank test exactly this, and Q1.4 is the trap you just saw. Practice is blocked to those while you are inside the SQL topic.',
    },
  },
}

import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L11',
  number: 11,
  topicId: 'sql',
  sectionId: 1,
  title: 'GROUP BY: collapsing many rows into one',
  objective:
    'You will be able to collapse many rows into one row per distinct value, and say exactly which rows went into each one.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F1', 'Q1.13', 'Q1.16'],

  steps: {
    vocabulary: [
      {
        term: 'GROUP BY',
        definition: 'A stage that gathers rows into piles, one pile per distinct value of the columns you name.',
      },
      {
        term: 'group',
        definition: 'One of those piles. Every row in it holds the same value in the grouping columns.',
      },
      {
        term: 'grouping column',
        definition: 'A column named after GROUP BY. Its value is what decides which pile a row lands in.',
      },
      {
        term: 'one row per group',
        definition: 'The rule that fixes the shape of the result. Eighty rows in, four piles, four rows out.',
      },
      {
        term: 'distinct value',
        definition: 'One of the different values a column actually holds. severity holds four of them.',
      },
    ],

    model: {
      narrative: [
        'Everything so far has kept rows as rows. `GROUP BY` is the first thing that changes what a row **is**.',
        '',
        'It gathers the rows into piles, one pile per distinct value of the column you name, and then hands back one row per pile. `SELECT severity FROM findings` gives 80 rows with a great deal of repetition. Add `GROUP BY severity` and you get four.',
        '',
        'The rows are not deleted. They are inside the piles, and you have simply stopped being able to see them one at a time. That is why the only column you can sensibly ask for is the one you grouped by: it is the only thing every row in a pile agrees about. Asking a pile for a resource id is asking a question that has 20 different answers, and the trap at the end of this lesson is what a database does when you ask it anyway.',
        '',
        'Grouping happens at stage three of lesson 6, after `WHERE`. So a filter shrinks the input before the piles are built, and that is usually what you want.',
      ].join('\n'),
      diagram: {
        kind: 'pipeline',
        caption:
          'Eighty findings, forty nine of them open, gathered into four piles by severity. Each pile becomes one row.',
        stages: [
          { label: 'FROM findings', note: 'every finding arrives', rows: 80 },
          { label: "WHERE status = 'open'", note: 'filtered before any pile exists', rows: 49 },
          { label: 'GROUP BY severity', note: 'one row out per distinct severity', rows: 4 },
        ],
      },
      takeaway: 'One row out per group. The rows that went in are still there, you just cannot see them any more.',
    },

    worked: {
      task: 'Return the distinct severities that appear on the open findings.',
      steps: [
        {
          label: 'name the table',
          code: 'FROM findings',
          why: 'All 80 findings arrive at stage one.',
        },
        {
          label: 'cut the rows down before they are grouped',
          code: "WHERE status = 'open'",
          why: 'WHERE runs before GROUP BY, so this decides which rows go into the piles at all. 49 of the 80 survive.',
          prompt: {
            question: 'What would change in the result if this line were left out?',
            answer:
              'Nothing you could see. The piles would be built from all 80 rows instead of 49, you would still get four rows, and they would still read critical, high, medium and low. Only the rows hidden inside the piles would be different. That is the shape almost every grouping bug takes: the result looks identical and means something else.',
          },
        },
        {
          label: 'gather the surviving rows into piles',
          code: 'GROUP BY severity',
          why: 'One pile per distinct severity. There are four distinct severities, so four rows come out.',
        },
        {
          label: 'choose the column that names each pile',
          code: 'SELECT severity',
          why: 'The grouping column is the only thing every row in a pile agrees on, so it is the only column that has a single honest answer here.',
          prompt: {
            question: 'The result has four rows. Where did the other 45 go?',
            answer:
              'Nowhere. They are inside the piles. GROUP BY does not delete rows, it stops showing them one at a time. Lesson 12 is how you ask a question about what is in a pile without unpacking it.',
          },
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT severity FROM findings WHERE status = 'open' GROUP BY severity;",
          why: 'Written SELECT, FROM, WHERE, GROUP BY. Run FROM, WHERE, GROUP BY, SELECT.',
        },
      ],
      result: '4 rows: critical, high, medium and low.',
    },

    fadeLight: {
      task: 'Return the distinct regions that hold at least one resource.',
      steps: [
        {
          label: 'name the table',
          code: 'FROM resources',
          why: 'region is a column on resources.',
        },
        {
          label: 'gather the rows into piles',
          code: 'GROUP BY region',
          why: 'One pile per distinct region. A region with no resources cannot appear, because no row would ever land in that pile.',
        },
        {
          label: 'choose the column that names each pile',
          code: 'SELECT region',
          why: 'The grouping column, and nothing else.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT region FROM resources GROUP BY region;',
          why: 'No filter this time, so all forty rows go into the piles.',
          accept: ['SELECT region FROM resources GROUP BY region'],
        },
      ],
      blanks: 1,
      closing: '8 rows. The forty resources are spread across eight regions.',
    },

    fadeHeavy: {
      task: 'Return every combination of severity and status that actually occurs in the findings table.',
      steps: [
        {
          label: 'name the table',
          code: 'FROM findings',
          why: 'All 80 findings, unfiltered.',
        },
        {
          label: 'gather the rows into piles',
          code: 'GROUP BY severity, status',
          why: 'Two grouping columns means finer piles: a row lands in a pile only if it matches on both. More columns always means more piles and more rows out.',
        },
        {
          label: 'choose the columns that name each pile',
          code: 'SELECT severity, status',
          why: 'Both grouping columns can be selected, because every row in a pile agrees on both.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT severity, status FROM findings GROUP BY severity, status;',
          why: 'The grouping list and the column list match exactly, which is the safe shape.',
          accept: ['SELECT severity, status FROM findings GROUP BY severity, status'],
        },
      ],
      blanks: 2,
      closing:
        '11 rows, not 12. Four severities times three statuses would be twelve possible combinations, and one of them simply never happens. Grouping tells you what is there, not what could be.',
    },

    parsons: {
      task: 'Build the query that returns the distinct resource types found in production accounts.',
      blocks: [
        { id: 'p1', label: 'choose the column that names each pile', code: 'SELECT resource_type' },
        { id: 'p2', label: 'name the table', code: 'FROM resources' },
        {
          id: 'p3',
          label: 'cut the rows down before they are grouped',
          code: "WHERE account_id IN (SELECT account_id FROM cloud_accounts WHERE environment = 'prod')",
        },
        { id: 'p4', label: 'gather the survivors into piles', code: 'GROUP BY resource_type;' },
        { id: 'd1', label: 'gather the survivors into piles', code: 'GROUP BY resource_type, name;', distractor: true },
        {
          id: 'd2',
          label: 'cut the rows down before they are grouped',
          code: "WHERE environment = 'prod'",
          distractor: true,
        },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'One block you left out groups by resource_type and name. Every resource has its own name, so every pile would hold exactly one row and grouping would achieve nothing. The other filters on environment, which is not a column on resources at all.',
    },

    produce: {
      kind: 'sql',
      task: 'Return the distinct identity types that appear in the identities table.',
      starter: 'SELECT',
      referenceSql: 'SELECT identity_type FROM identities GROUP BY identity_type;',
      closing: '3 rows: user, role and service_account. Twenty identities, three kinds.',
      fallback: {
        task: 'Same problem, as blocks. The distinct identity types.',
        blocks: [
          { id: 'f1', label: 'choose the column that names each pile', code: 'SELECT identity_type' },
          { id: 'f2', label: 'name the table', code: 'FROM identities' },
          { id: 'f3', label: 'gather the rows into piles', code: 'GROUP BY identity_type;' },
        ],
        solution: ['f1', 'f2', 'f3'],
        closing: 'Column, table, grouping. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-grouping-column-omitted',
      setup:
        'This is meant to answer: which severities appear, and what status are they in? It runs without complaint and returns four tidy rows, every one of them saying open.',
      code: 'SELECT severity, status\nFROM findings\nGROUP BY severity;',
      question: 'There are 11 real combinations of severity and status in this table. What are these four rows actually showing?',
      options: [
        { text: 'The four combinations that really occur.', correct: false },
        {
          text: 'One row per severity, with the status taken from whichever row in the pile the database happened to reach first.',
          correct: true,
        },
        { text: 'An error, because status is neither grouped nor aggregated.', correct: false },
        { text: 'The most common status within each severity.', correct: false },
      ],
      silently:
        'Four rows, no error, and every one of them reports open. That is not a fact about the data, it is whichever row each pile happened to hand over. Load the same rows in a different order and the answers change, with nothing on screen ever hinting that a choice was being made on your behalf. Stricter databases refuse this query outright, which is by far the kinder outcome.',
      explanation:
        'This is the documented omission: a column selected that is neither in GROUP BY nor wrapped in an aggregate. A pile of rows agrees on its grouping columns and on nothing else, so any other column has no single value to report and the database picks one. You have two honest options. Add the column to GROUP BY, which makes finer piles and gives the 11 rows the heavy fade produced. Or ask a question about the pile as a whole, which is the next lesson.',
    },

    handoff: {
      canNow: [
        'Collapse many rows into one row per distinct value',
        'Say which rows went into a given pile, and why you can no longer see them',
        'Explain why only the grouping columns can be selected on their own',
      ],
      note: 'F1 in the deck places GROUP BY in the execution order, between WHERE and HAVING. The next lesson gives you something to ask each pile.',
    },
  },
}

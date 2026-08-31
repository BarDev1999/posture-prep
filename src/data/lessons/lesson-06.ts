import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L6',
  number: 6,
  topicId: 'sql',
  sectionId: 1,
  title: 'The execution order model',
  objective:
    'You will be able to name the order the database runs a query in, and say which stage removed which rows.',
  minutes: 15,
  difficulty: 'medium',
  sources: ['F1', 'F2', 'Q1.15', 'Q1.16'],

  steps: {
    vocabulary: [
      {
        term: 'clause',
        definition: 'One named part of a query: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT.',
      },
      {
        term: 'written order',
        definition: 'The order you type the clauses in. SELECT is written first.',
      },
      {
        term: 'execution order',
        definition: 'The order the database actually runs them in. FROM runs first and SELECT runs fifth.',
      },
      {
        term: 'stage',
        definition: 'One step of that order. Each stage takes rows in, does one job, and hands rows on.',
      },
      {
        term: 'GROUP BY and HAVING',
        definition: 'Two stages you have not used yet. They come after WHERE and before SELECT, and they are lessons 11 and 13.',
      },
    ],

    model: {
      narrative: [
        'You have been writing three and four clause queries. Every one of them ran in an order that was not the order you typed.',
        '',
        'The full order, and this is a fact worth being able to recite: **FROM and JOIN, then WHERE, then GROUP BY, then HAVING, then SELECT, then ORDER BY, then LIMIT.**',
        '',
        'Read the diagram as a pipe with rows flowing through it. Notice how few stages change the count: WHERE drops rows that fail its test, LIMIT cuts the tail off, and every other stage passes the same number through.',
        '',
        'Two things fall straight out of this order, and they explain most of the confusing error messages you will meet:',
        '',
        '- WHERE runs before SELECT, so a name you invent in SELECT with AS does not exist yet when WHERE runs.',
        '- WHERE runs before GROUP BY, so WHERE cannot ask a question about a group. That job belongs to HAVING, which runs after.',
      ].join('\n'),
      diagram: {
        kind: 'pipeline',
        caption: 'The five newest open findings, stage by stage. Only WHERE and LIMIT change the row count.',
        stages: [
          { label: 'FROM findings', note: 'every finding arrives', rows: 80 },
          { label: "WHERE status = 'open'", note: 'rows that fail the test are dropped', rows: 49 },
          { label: 'GROUP BY', note: 'not used here, lesson 11', rows: 49 },
          { label: 'HAVING', note: 'not used here, lesson 13', rows: 49 },
          { label: 'SELECT finding_id, severity', note: 'columns chosen, no row touched', rows: 49 },
          { label: 'ORDER BY first_seen DESC', note: 'the same rows, now in order', rows: 49 },
          { label: 'LIMIT 5', note: 'everything past the fifth row is cut', rows: 5 },
        ],
      },
      takeaway: 'You write SELECT first. The database runs it fifth.',
    },

    worked: {
      task: 'Return the id and the severity of the 5 newest open findings, with severity headed level.',
      steps: [
        {
          label: 'stage one: name the table',
          code: 'FROM findings',
          why: 'All 80 rows arrive here. No later clause can add to them.',
        },
        {
          label: 'stage two: drop the rows that fail the test',
          code: "WHERE status = 'open'",
          why: 'The only stage in this query that removes rows on purpose. 49 of the 80 survive.',
          prompt: {
            question: 'Could you write WHERE level = \'open\' if you had labelled status AS level in the SELECT?',
            answer:
              'No. WHERE runs at stage two and SELECT at stage five, so at the moment WHERE is evaluated the label does not exist yet. The error says there is no column called level, which sounds like a typo and is really a timing problem. This is the everyday consequence of the execution order.',
          },
        },
        {
          label: 'stage five: choose and label the columns',
          code: 'SELECT finding_id, severity AS level',
          why: 'The 49 rows were settled three stages ago. This only decides how wide each one is and what the headings say.',
        },
        {
          label: 'stages six and seven: order, then cut',
          code: 'ORDER BY first_seen DESC LIMIT 5',
          why: 'In that order, always. LIMIT runs last, and that is exactly what makes it safe: it cuts an ordered list rather than a raw one.',
          prompt: {
            question: 'If LIMIT ran before ORDER BY, what would you get?',
            answer:
              'Five arbitrary rows, then sorted. The result would look ordered and be wrong, and there would be nothing on the screen to show it. LIMIT running last is the whole reason a top N answer means anything.',
          },
        },
        {
          label: 'assemble, in written order',
          code: "SELECT finding_id, severity AS level FROM findings WHERE status = 'open' ORDER BY first_seen DESC LIMIT 5;",
          why: 'Written SELECT, FROM, WHERE, ORDER BY, LIMIT. Run FROM, WHERE, SELECT, ORDER BY, LIMIT. Same query, two orders, and you now hold both.',
        },
      ],
      result: '5 rows, 2 columns, newest first, taken from the 49 open findings.',
    },

    fadeLight: {
      task: 'Return the name and the region of the 3 oldest resources in us-east-1.',
      steps: [
        {
          label: 'stage one: name the table',
          code: 'FROM resources',
          why: '40 rows arrive.',
        },
        {
          label: 'stage two: drop the rows that fail the test',
          code: "WHERE region = 'us-east-1'",
          why: '7 rows survive. Everything after this stage works on 7 rows, not 40.',
        },
        {
          label: 'stage five: choose the columns',
          code: 'SELECT name, region',
          why: 'Two columns, no effect on the count.',
        },
        {
          label: 'stages six and seven: order, then cut',
          code: 'ORDER BY created_at ASC LIMIT 3',
          why: 'Oldest first, then take three.',
        },
        {
          label: 'assemble, in written order',
          code: "SELECT name, region FROM resources WHERE region = 'us-east-1' ORDER BY created_at ASC LIMIT 3;",
          why: 'Five clauses, written in SQL order, running in a different one.',
          accept: ["SELECT name, region FROM resources WHERE region = 'us-east-1' ORDER BY created_at ASC LIMIT 3"],
        },
      ],
      blanks: 1,
      closing: '3 rows. Two stages removed rows here: WHERE took 40 down to 7, LIMIT took 7 down to 3.',
    },

    fadeHeavy: {
      task: 'Return the id and the status of the 4 findings first seen most recently, out of the critical ones only.',
      steps: [
        {
          label: 'stage one: name the table',
          code: 'FROM findings',
          why: '80 rows arrive.',
        },
        {
          label: 'stage two: drop the rows that fail the test',
          code: "WHERE severity = 'critical'",
          why: 'Critical only, whatever their status.',
        },
        {
          label: 'stage five: choose the columns',
          code: 'SELECT finding_id, status',
          why: 'Two columns.',
        },
        {
          label: 'stages six and seven: order, then cut',
          code: 'ORDER BY first_seen DESC LIMIT 4',
          why: 'Most recently seen first, then four.',
          accept: ['ORDER BY first_seen DESC LIMIT 4;'],
        },
        {
          label: 'assemble, in written order',
          code: "SELECT finding_id, status FROM findings WHERE severity = 'critical' ORDER BY first_seen DESC LIMIT 4;",
          why: 'By now you should be able to write this from the shape alone.',
          accept: ["SELECT finding_id, status FROM findings WHERE severity = 'critical' ORDER BY first_seen DESC LIMIT 4"],
        },
      ],
      blanks: 2,
      closing: '4 rows. Some of them will be resolved or suppressed, because this filter never asked about status.',
    },

    parsons: {
      task: 'Put the clauses in the order SQL requires: the id and severity of the 5 newest open findings.',
      blocks: [
        { id: 'p1', label: 'choose the columns', code: 'SELECT finding_id, severity' },
        { id: 'p2', label: 'name the table', code: 'FROM findings' },
        { id: 'p3', label: 'keep only the open ones', code: "WHERE status = 'open'" },
        { id: 'p4', label: 'newest first', code: 'ORDER BY first_seen DESC' },
        { id: 'p5', label: 'take the top five', code: 'LIMIT 5;' },
        { id: 'd1', label: 'keep only the open ones', code: "HAVING status = 'open'", distractor: true },
        { id: 'd2', label: 'take the top five', code: 'LIMIT 5 ORDER BY first_seen DESC;', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4', 'p5'],
      closing:
        'The first block you left out filters rows with HAVING. HAVING runs after grouping and asks questions about groups, so it is the wrong stage for a test on a single row. The second puts the cut before the order.',
    },

    produce: {
      kind: 'sql',
      task: 'Return the name and the type of the 3 resources created longest ago in the account acc-101.',
      starter: 'SELECT',
      referenceSql: "SELECT name, resource_type FROM resources WHERE account_id = 'acc-101' ORDER BY created_at ASC LIMIT 3;",
      closing:
        '3 rows. Trace it once out loud: 40 rows in, 9 after WHERE, still 9 after SELECT, still 9 after ORDER BY, 3 after LIMIT.',
      fallback: {
        task: 'Same problem, as blocks. The 3 oldest resources in acc-101, name and type.',
        blocks: [
          { id: 'f1', label: 'choose the columns', code: 'SELECT name, resource_type' },
          { id: 'f2', label: 'name the table', code: 'FROM resources' },
          { id: 'f3', label: 'keep one account', code: "WHERE account_id = 'acc-101'" },
          { id: 'f4', label: 'oldest first', code: 'ORDER BY created_at ASC' },
          { id: 'f5', label: 'take three', code: 'LIMIT 3;' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4', 'f5'],
        closing: 'Five clauses in written order. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-where-after-group-by',
      setup:
        'GROUP BY is lesson 11 and you have not used it yet. You do not need to know what it does to answer this: you only need the order.',
      code: "SELECT account_id, region\nFROM resources\nGROUP BY account_id\nWHERE region = 'us-east-1';",
      question: 'What is wrong with it?',
      options: [
        { text: 'Nothing. The clauses can be written in any order.', correct: false },
        {
          text: 'WHERE has to come before GROUP BY. It filters rows, and rows are filtered before they are grouped.',
          correct: true,
        },
        { text: 'GROUP BY has to come after ORDER BY.', correct: false },
        { text: 'The query is missing a LIMIT.', correct: false },
      ],
      silently:
        'This particular one does not run at all, and that is the lucky outcome: the parser catches the clause order and says so. The belief underneath it is what does the damage. Someone who thinks clauses run in the order they are written will next put a test on a group into WHERE, where the order is legal, and get an answer that runs, looks right, and counts the wrong things. That is lesson 13.',
      explanation:
        'A query is read top to bottom by you and is not run top to bottom by the database. WHERE always runs at stage two, on single rows, before any grouping exists to ask about. Once you hold the order, FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT, you can place any clause without guessing, and you can explain why an alias from SELECT is invisible to WHERE.',
    },

    handoff: {
      canNow: [
        'Recite the order the database runs the clauses in',
        'Say which stage removed which rows in any query you have written',
        'Explain why a name invented in SELECT cannot be used in WHERE',
      ],
      note: 'F1 and F2 are the two facts to keep drilling from here, and Q1.15 is the trap you just saw in its original form. This is the last lesson before joins.',
    },
  },
}

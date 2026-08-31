import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L5',
  number: 5,
  topicId: 'sql',
  sectionId: 1,
  title: 'ORDER BY and LIMIT',
  objective:
    'You will be able to put a result in an order you chose and take the top few, and say why the two always travel together.',
  minutes: 13,
  difficulty: 'easy',
  sources: ['F1', 'Q1.2', 'Q1.14'],

  steps: {
    vocabulary: [
      {
        term: 'ORDER BY',
        definition: 'The part of a query that puts the result in an order you choose, using one or more columns.',
      },
      {
        term: 'ASC',
        definition: 'Ascending: smallest first, oldest first, A before Z. This is what you get if you write nothing.',
      },
      {
        term: 'DESC',
        definition: 'Descending: largest first, newest first, Z before A.',
      },
      {
        term: 'LIMIT',
        definition: 'Keeps the first few rows of the result and throws the rest away.',
      },
      {
        term: 'tie',
        definition: 'Two rows holding the same value in the column you ordered by. Which of them comes first is still not promised.',
      },
    ],

    model: {
      narrative: [
        'These two clauses run at the very end, and in this order: the rows are chosen, then they are sorted, then the list is cut.',
        '',
        '`LIMIT` does not search and it does not sort. It takes the first few rows of whatever order it was handed. So `LIMIT 5` on an ordered result means the top five; `LIMIT 5` on an unordered result means five rows chosen by nothing at all.',
        '',
        'That is why a top N question is always two decisions and not one. First the order that makes a row belong at the top, then the cut. Leave out the order and the query still runs, still returns five rows, and answers a different question.',
        '',
        'The last row of the diagram is the part worth staring at. Two resources are the same age, so a cut of four has to split them, and nothing decides which one is in.',
      ].join('\n'),
      diagram: {
        kind: 'rows',
        caption: 'ORDER BY created_at DESC, then LIMIT 4. Two rows are tied at 95 days, so the cut lands inside a tie.',
        columns: ['name', 'days old'],
        rows: [
          ['data-dev-loader', '80'],
          ['research-notebook', '90'],
          ['data-dev-etl', '95'],
          ['data-dev-role', '95'],
          ['data-dev-landing', '100'],
        ],
        keepFirst: 4,
        keepLabel: 'LIMIT 4',
      },
      takeaway: 'LIMIT takes the first N of the order you asked for. Ask for no order and it takes any N.',
    },

    worked: {
      task: 'Return every open finding whose severity is critical or high, newest first.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM findings',
          why: 'All 80 findings arrive, open or not.',
        },
        {
          label: 'keep the rows the question asks for',
          code: "WHERE status = 'open' AND severity IN ('critical', 'high')",
          why: 'AND means both tests have to be true on the same row. IN is a shorter way of writing severity equals critical OR severity equals high, and it stays readable when the list grows.',
          prompt: {
            question: 'Why IN rather than two conditions joined by OR?',
            answer:
              'They do the same job here. IN is shorter, and it removes the risk of getting the brackets wrong once AND and OR are mixed in one clause. Either is correct; pick the one that reads clearly at the size you will read it.',
          },
        },
        {
          label: 'put the surviving rows in the order the question asks for',
          code: 'ORDER BY first_seen DESC',
          why: 'Newest first means the largest date first, and largest first is DESC. Without this line the rows arrive in whatever order the database found them, and newest first would be a hope rather than an instruction.',
          prompt: {
            question: 'The question said newest first. What would you get if you left DESC off?',
            answer:
              'The oldest first. ASC is what SQL assumes when you write neither, so leaving DESC off does not give you no order, it silently gives you the opposite of the one asked for.',
          },
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT * FROM findings WHERE status = 'open' AND severity IN ('critical', 'high') ORDER BY first_seen DESC;",
          why: 'Columns, table, filter, order. ORDER BY always comes after WHERE, both in how it is written and in when it runs.',
        },
      ],
      result: '32 rows, newest first. Of the 49 open findings, 32 are critical or high.',
    },

    fadeLight: {
      task: 'Return the name and the created date of the 5 newest resources.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM resources',
          why: 'created_at is a column on resources.',
        },
        {
          label: 'choose the order that puts the answer at the top',
          code: 'ORDER BY created_at DESC',
          why: 'Newest means the largest date, so DESC. Decide this before you decide how many you want.',
        },
        {
          label: 'cut the ordered list',
          code: 'LIMIT 5',
          why: 'Five rows off the top of an order that now means something.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT name, created_at FROM resources ORDER BY created_at DESC LIMIT 5;',
          why: 'ORDER BY then LIMIT, always in that order and never the other way round.',
          accept: ['SELECT name, created_at FROM resources ORDER BY created_at DESC LIMIT 5'],
        },
      ],
      blanks: 1,
      closing: '5 rows, newest first. The newest resource in the sandbox is about 80 days old.',
    },

    fadeHeavy: {
      task: 'Return the id and the severity of the 3 findings that were first seen longest ago.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM findings',
          why: 'first_seen is a column on findings.',
        },
        {
          label: 'choose the order that puts the answer at the top',
          code: 'ORDER BY first_seen ASC',
          why: 'Longest ago means the smallest date, so ascending. Writing ASC out loud is worth it here even though it is the default, because the question turns on it.',
        },
        {
          label: 'cut the ordered list',
          code: 'LIMIT 3',
          why: 'Three rows off the top.',
          accept: ['LIMIT 3;'],
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT finding_id, severity FROM findings ORDER BY first_seen ASC LIMIT 3;',
          why: 'Same two clauses, same order, opposite direction.',
          accept: [
            'SELECT finding_id, severity FROM findings ORDER BY first_seen ASC LIMIT 3',
            'SELECT finding_id, severity FROM findings ORDER BY first_seen LIMIT 3;',
          ],
        },
      ],
      blanks: 2,
      closing: '3 rows. These are the findings that have been sitting open or unlooked at the longest.',
    },

    parsons: {
      task: 'Build the query that returns the 5 identities used most recently, with their last used date.',
      blocks: [
        { id: 'p1', label: 'ask for columns', code: 'SELECT name, last_used_at' },
        { id: 'p2', label: 'name the table', code: 'FROM identities' },
        { id: 'p3', label: 'most recent first', code: 'ORDER BY last_used_at DESC' },
        { id: 'p4', label: 'take the top five', code: 'LIMIT 5;' },
        { id: 'd1', label: 'most recent first', code: 'ORDER BY last_used_at ASC', distractor: true },
        { id: 'd2', label: 'take the top five', code: 'LIMIT 5 ORDER BY last_used_at DESC;', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'One block you left out sorts the wrong way, which would have given the five oldest. The other puts LIMIT before ORDER BY, which SQL refuses to parse, and that refusal is the only reason this particular mistake is not silent.',
    },

    produce: {
      kind: 'sql',
      task: 'Return the name and the region of the 5 resources created longest ago, oldest first.',
      starter: 'SELECT',
      referenceSql: 'SELECT name, region FROM resources ORDER BY created_at ASC LIMIT 5;',
      closing:
        'Note what you just did: you ordered by created_at without selecting it. The order is decided on the full row, not on the columns you kept.',
      fallback: {
        task: 'Same problem, as blocks. The 5 oldest resources, name and region, oldest first.',
        blocks: [
          { id: 'f1', label: 'ask for columns', code: 'SELECT name, region' },
          { id: 'f2', label: 'name the table', code: 'FROM resources' },
          { id: 'f3', label: 'oldest first', code: 'ORDER BY created_at ASC' },
          { id: 'f4', label: 'take the top five', code: 'LIMIT 5;' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Order first, cut second. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-missing-order-by',
      setup: 'This is meant to answer: which are the five newest resources?',
      code: 'SELECT name, created_at FROM resources LIMIT 5;',
      question: 'What does it actually return?',
      options: [
        { text: 'The five newest resources.', correct: false },
        { text: 'Five resources, picked by whatever order the database happened to read them in.', correct: true },
        { text: 'An error, because LIMIT requires ORDER BY.', correct: false },
        { text: 'The five oldest resources.', correct: false },
      ],
      silently:
        'Five rows come back, each with a name and a date, and it looks exactly like an answer. On a small untouched table they will usually be the first five rows ever inserted, which here are among the oldest resources, the opposite of what was asked. Nobody checks a result that has the right number of rows and the right columns.',
      explanation:
        'Missing ORDER BY on a top N question is one of the most common omissions in novice SQL, and it never announces itself. LIMIT does not sort; it truncates. Top N is two decisions: the order that makes a row belong at the top, then the cut. And when the column you order by has ties, as created_at does here, even a correct query leaves the rows inside the tie unpromised. If a tie at the boundary would matter, order by a second column to break it.',
    },

    handoff: {
      canNow: [
        'Put a result in ascending or descending order on any column',
        'Take the top few rows of that order with LIMIT',
        'Explain why a top N answer without ORDER BY is not an answer',
      ],
      note: 'Q1.2 in the bank is the worked example almost word for word, so it is the right thing to attempt next.',
    },
  },
}

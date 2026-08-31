import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L2',
  number: 2,
  topicId: 'sql',
  sectionId: 1,
  title: 'SELECT and FROM',
  objective: 'You will be able to return exactly the columns you need from one table, and rename one for the reader.',
  minutes: 12,
  difficulty: 'easy',
  sources: ['Q1.1', 'B#SCHEMA for the SQL questions'],
  practice: { questionIds: [], factIds: [] },

  steps: {
    vocabulary: [
      {
        term: 'SELECT',
        definition: 'The word a query starts with. What follows it is the list of columns you want back.',
      },
      {
        term: 'FROM',
        definition: 'The word that names the table those columns are read from.',
      },
      {
        term: 'column list',
        definition: 'The names written after SELECT, separated by commas, in the order you want them.',
      },
      {
        term: 'star',
        definition: 'The symbol * written in place of a column list. It means every column this table has.',
      },
      {
        term: 'alias',
        definition: 'A different heading for a column in the result, written with AS. It changes the label, not the data.',
      },
    ],

    model: {
      narrative: [
        'Two decisions, and they are separate.',
        '',
        '`FROM` decides **which rows exist at all**. Name `resources` and you are working with 40 rows. There is no way to get a 41st, and no column you list can bring one in.',
        '',
        '`SELECT` decides **how wide each row is**. Ask for two columns instead of seven and you get a narrower result with exactly the same number of rows.',
        '',
        'Beginners often expect a shorter column list to mean less data in every sense. It does not. Rows are removed by a different clause, and that is the next lesson.',
      ].join('\n'),
      diagram: {
        kind: 'pipeline',
        caption: 'Choosing columns never changes the row count.',
        stages: [
          { label: 'FROM resources', note: 'the whole table arrives, 7 columns wide', rows: 40 },
          { label: 'SELECT name, region', note: 'two columns kept, every row survives', rows: 40 },
        ],
      },
      takeaway: 'FROM decides which rows exist. SELECT decides how wide each one is.',
    },

    worked: {
      task: 'Return the name and the region of every resource, with the region column headed location.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM resources',
          why: 'One row per resource, which is what the question is counting in.',
        },
        {
          label: 'list the columns you actually need',
          code: 'name, region',
          why: 'Two instead of seven. A narrow result is easier to read on a phone, cheaper for the database, and it forces you to decide what the question really needs.',
          prompt: {
            question: 'You asked for two columns instead of seven. How many rows come back now?',
            answer:
              'Forty, exactly as before. SELECT changes the width of a result, never its length. Rows are removed by WHERE, which is the next lesson.',
          },
        },
        {
          label: 'rename one column for the reader',
          code: 'region AS location',
          why: 'AS puts a different heading on the column in the result. It is worth doing when the column name is short and the reader is not you.',
          prompt: {
            question: 'Does AS change anything in the table itself?',
            answer:
              'No. It changes one heading on one result set and nothing else. Every query in these lessons only reads; none of them writes.',
          },
        },
        {
          label: 'put it together, columns first',
          code: 'SELECT name, region AS location FROM resources;',
          why: 'Written columns first, table second. That is the order SQL wants, even though you worked out the table first.',
        },
      ],
      result: '40 rows, 2 columns. The second one is headed location.',
    },

    fadeLight: {
      task: 'Return the id and the severity of every finding, with severity headed level.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM findings',
          why: 'One row per finding.',
        },
        {
          label: 'list the columns you actually need',
          code: 'finding_id, severity',
          why: 'Two of the seven columns findings has.',
        },
        {
          label: 'rename one column for the reader',
          code: 'severity AS level',
          why: 'Severity and level mean the same thing to a reader; the heading is the only change.',
        },
        {
          label: 'put it together, columns first',
          code: 'SELECT finding_id, severity AS level FROM findings;',
          why: 'The same shape as the worked example, on a different table.',
          accept: ['SELECT finding_id, severity AS level FROM findings'],
        },
      ],
      blanks: 1,
      closing: '80 rows, 2 columns. Every finding in the sandbox, open or not.',
    },

    fadeHeavy: {
      task: 'Return the account id and the provider of every cloud account, with provider headed cloud.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM cloud_accounts',
          why: 'One row per account.',
        },
        {
          label: 'list the columns you actually need',
          code: 'account_id, provider',
          why: 'Two of the four columns.',
        },
        {
          label: 'rename one column for the reader',
          code: 'provider AS cloud',
          why: 'The column holds aws, azure or gcp, so cloud reads better than provider.',
          accept: ['provider as cloud'],
        },
        {
          label: 'put it together, columns first',
          code: 'SELECT account_id, provider AS cloud FROM cloud_accounts;',
          why: 'Same shape again. By now the shape should be doing the work, not your memory.',
          accept: ['SELECT account_id, provider AS cloud FROM cloud_accounts'],
        },
      ],
      blanks: 2,
      closing: '6 rows, 2 columns. Three of these accounts are production.',
    },

    parsons: {
      task: 'Build the query that returns every identity name and type, with identity_type headed kind.',
      blocks: [
        { id: 'p1', label: 'ask for columns', code: 'SELECT' },
        { id: 'p2', label: 'the columns, renaming one', code: '  name, identity_type AS kind' },
        { id: 'p3', label: 'the table they come from', code: 'FROM identities;' },
        { id: 'd1', label: 'the table they come from', code: 'FROM permissions;', distractor: true },
        {
          id: 'd2',
          label: 'the columns, renaming one',
          code: '  name, kind AS identity_type',
          distractor: true,
        },
      ],
      solution: ['p1', 'p2', 'p3'],
      closing:
        'The second block you left out has the alias backwards. AS always reads as real column name first, new heading second.',
    },

    produce: {
      kind: 'sql',
      task: 'Return the name, the region and the resource type of every resource. Three columns, nothing else.',
      starter: 'SELECT',
      referenceSql: 'SELECT name, region, resource_type FROM resources;',
      closing: '40 rows, 3 columns. Same forty rows as the star gave you, three columns wide instead of seven.',
      fallback: {
        task: 'Same problem, as blocks. Name, region and resource type, for every resource.',
        blocks: [
          { id: 'f1', label: 'ask for columns', code: 'SELECT' },
          { id: 'f2', label: 'the three columns', code: '  name, region, resource_type' },
          { id: 'f3', label: 'the table they come from', code: 'FROM resources;' },
        ],
        solution: ['f1', 'f2', 'f3'],
        closing: 'That is the shape. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-language-based',
      setup: 'This is meant to return the name of every resource. It runs with no error and gives back 40 rows.',
      code: "SELECT 'name' FROM resources;",
      question: 'What is actually in those 40 rows?',
      options: [
        { text: 'The name of every resource, the same as SELECT name.', correct: false },
        { text: 'The word name, forty times. The quotes turned it into a piece of text.', correct: true },
        { text: 'An error, because name is a reserved word.', correct: false },
        { text: 'One row containing the word name.', correct: false },
      ],
      silently:
        'Forty rows, one column, no error. The row count is right and the shape of the result is right, so a report built on it looks healthy. Every single resource is simply called name.',
      explanation:
        'In SQL, quotes are not emphasis and they are not decoration. Single quotes mean this is a piece of text, use it as a value. A bare word means this is the name of something: a column or a table. English uses quotes to point at a word, SQL uses them to make one, and that difference is the most common language based mistake there is. You will meet it again in the next lesson, on the other side of the equals sign.',
    },

    handoff: {
      canNow: [
        'Return a chosen set of columns instead of the whole table',
        'Rename a column in the result with AS',
        'Say why a shorter column list never means fewer rows',
      ],
      note: 'Still nothing in the question bank at this level. Lesson 3 adds the clause that removes rows, and that is where the bank starts.',
    },
  },
}

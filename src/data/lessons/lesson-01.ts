import type { Lesson } from '../../types/lesson.ts'

/**
 * Lesson 1. Nothing is assumed. The learner has never been told what a table
 * is in this app, so the whole lesson is the shape of the data and the shape of
 * a request, and the only SQL is the smallest complete statement there is.
 */
export const lesson: Lesson = {
  id: 'L1',
  number: 1,
  topicId: 'sql',
  sectionId: 1,
  title: 'Tables, queries, and describing what you want',
  objective:
    'You will be able to pick the right table out of the posture schema and ask it for everything it holds.',
  minutes: 12,
  difficulty: 'easy',
  sources: ['F1', 'B#SCHEMA for the SQL questions'],
  practice: { questionIds: [], factIds: [] },

  steps: {
    vocabulary: [
      {
        term: 'table',
        definition: 'A grid of data. Every row in it is the same kind of thing, and every row has the same columns.',
      },
      {
        term: 'row',
        definition: 'One entry in a table. One cloud resource, or one finding, or one account.',
      },
      {
        term: 'column',
        definition: 'One named piece of information that every row carries, such as the name or the region.',
      },
      {
        term: 'schema',
        definition: 'The list of tables, the columns inside each one, and the kind of value each column holds.',
      },
      {
        term: 'query',
        definition: 'A written request for data. You describe the rows you want, and the database works out how to find them.',
      },
      {
        term: 'result set',
        definition: 'What comes back from a query. It is itself a table: rows and columns.',
      },
    ],

    model: {
      narrative: [
        'The sandbox holds seven tables. One of them is `resources`: one row for every cloud resource the scanner found.',
        '',
        'A row is a thing. A column is something you know about that thing. So `resources` has 40 rows because the scanner found 40 resources, and 7 columns because it records 7 things about each one.',
        '',
        'Here is the part that is different from any other kind of programming you have done. A query does not tell the database how to walk the table. It describes the result you want. The database decides how to get it, and it is free to do the work in a different order from the one you wrote. That is why the same request can be written several ways and still give the same rows.',
      ].join('\n'),
      diagram: {
        kind: 'rows',
        caption: 'resources: 40 rows, 7 columns. Three columns and four rows shown.',
        columns: ['resource_id', 'name', 'resource_type'],
        rows: [
          ['res-01', 'payments-exports', 's3_bucket'],
          ['res-03', 'payments-api-1', 'ec2_instance'],
          ['res-05', 'payments-lambda-role', 'iam_role'],
          ['res-17', 'platform-cluster', 'eks_cluster'],
        ],
      },
      takeaway: 'You name what you want. The database decides how to fetch it.',
    },

    worked: {
      task: 'The team asks which cloud accounts we are scanning. Get the full contents of the table that answers that.',
      steps: [
        {
          label: 'pick the table whose rows are the thing being asked about',
          code: 'cloud_accounts',
          why: 'The question is about accounts, and `cloud_accounts` holds one row per account. This choice is half the job: no part of a query can bring in a table you did not name.',
          prompt: {
            question: 'The `resources` table also has an account_id column. Why not start there?',
            answer:
              'Because one row of `resources` is one resource, not one account. Six accounts would come back as forty rows, one per resource. The table you start from decides what a single row means.',
          },
        },
        {
          label: 'decide which columns you want back',
          code: '*',
          why: 'The star means every column. You are looking at this table for the first time, so you want all of it. Later you will name columns to keep a result narrow.',
          prompt: {
            question: 'Does the star change how many rows come back?',
            answer:
              'No. Rows and columns are two separate decisions. The star makes the result wider, never longer.',
          },
        },
        {
          label: 'write it in the order SQL wants',
          code: 'SELECT * FROM cloud_accounts;',
          why: 'SQL is written columns first, table second, even though you chose the table first. That gap between the order you think in and the order you write in is the thing to get used to. The semicolon ends the statement.',
        },
      ],
      result: '6 rows, 4 columns. One row per cloud account.',
    },

    fadeLight: {
      task: 'Get the full contents of the table that lists the rules the scanner checks against.',
      steps: [
        {
          label: 'pick the table whose rows are the thing being asked about',
          code: 'rules',
          why: 'One row per rule, which is exactly what was asked for.',
        },
        {
          label: 'decide which columns you want back',
          code: '*',
          why: 'Everything, because you have not seen this table yet.',
        },
        {
          label: 'write it in the order SQL wants',
          code: 'SELECT * FROM rules;',
          why: 'Columns first, then the table it reads them from.',
          accept: ['SELECT * FROM rules'],
        },
      ],
      blanks: 1,
      closing: '10 rows, 5 columns. One row per rule the scanner can raise.',
    },

    fadeHeavy: {
      task: 'Get everything the scanner knows about the identities in these accounts.',
      steps: [
        {
          label: 'pick the table whose rows are the thing being asked about',
          code: 'identities',
          why: 'One row per identity: a user, a role or a service account.',
        },
        {
          label: 'decide which columns you want back',
          code: '*',
          why: 'All five, because you are still exploring.',
          accept: ['all columns'],
        },
        {
          label: 'write it in the order SQL wants',
          code: 'SELECT * FROM identities;',
          why: 'Same shape as every query you have written so far.',
          accept: ['SELECT * FROM identities'],
        },
      ],
      blanks: 2,
      closing: '20 rows, 5 columns. Five of those identities have never been used at all.',
    },

    parsons: {
      task: 'Build the query that returns the id, the name and the region of every resource.',
      blocks: [
        { id: 'p1', label: 'ask for columns', code: 'SELECT' },
        { id: 'p2', label: 'the columns you want', code: '  resource_id, name, region' },
        { id: 'p3', label: 'the table they come from', code: 'FROM resources;' },
        {
          id: 'd1',
          label: 'the table they come from',
          code: 'FROM cloud_accounts;',
          distractor: true,
        },
        {
          id: 'd2',
          label: 'the columns you want',
          code: '  resource_id, name, account_name',
          distractor: true,
        },
      ],
      solution: ['p1', 'p2', 'p3'],
      closing:
        'Both of the blocks you left out were plausible. One reads from the wrong table, and one asks for account_name, which lives in cloud_accounts and not in resources.',
    },

    produce: {
      kind: 'sql',
      task: 'Return everything the scanner knows about every finding. All columns, all rows.',
      starter: 'SELECT',
      referenceSql: 'SELECT * FROM findings;',
      closing: '80 rows, 7 columns. That is every finding in the sandbox, open or not.',
      fallback: {
        task: 'Same problem, as blocks. Return every column of every finding.',
        blocks: [
          { id: 'f1', label: 'ask for columns', code: 'SELECT' },
          { id: 'f2', label: 'the columns you want', code: '  *' },
          { id: 'f3', label: 'the table they come from', code: 'FROM findings;' },
        ],
        solution: ['f1', 'f2', 'f3'],
        closing: 'That is the whole shape of a query. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-wrong-mental-model',
      setup:
        'A colleague runs this and says: the first row that comes back is res-01, because that is the row that went in first. So the first row is always the oldest resource.',
      code: 'SELECT * FROM resources;',
      question: 'What is wrong with that?',
      options: [
        { text: 'Nothing. Rows always come back in the order they were inserted.', correct: false },
        {
          text: 'A query says which rows you want, not what order they arrive in. Nothing here asked for an order, so nothing is promised.',
          correct: true,
        },
        { text: 'The star has to come after the table name.', correct: false },
        { text: 'The table has no sort column, so the query will fail.', correct: false },
      ],
      silently:
        'It looks right today. A small, untouched table usually does come back in insertion order, so the report agrees with the colleague every time they check. It stays right until the table grows, or rows are deleted and rewritten, or the database chooses a different plan. Then a report that quietly meant "oldest" starts meaning "whichever row was cheapest to read", and nothing errors.',
      explanation:
        'This is the mental model to replace on day one. The query describes the result, not the route to it. Order is something you ask for, and you will ask for it in lesson 5. If you did not ask, you did not get it.',
    },

    handoff: {
      canNow: [
        'Read the schema and pick the table whose rows are the thing being asked about',
        'Ask a table for all of its rows and columns',
        'Say what a result set is, and why nothing about its order is promised',
      ],
      note: 'No question in the bank sits at this level yet, so there is nothing to practise against. Lesson 2 narrows the columns, and the questions start at lesson 4.',
    },
  },
}

import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L7',
  number: 7,
  topicId: 'sql',
  sectionId: 1,
  title: 'Why data is split across tables, and foreign keys',
  objective:
    'You will be able to say which table a fact lives in, and pull rows from one table using a value stored in another.',
  minutes: 14,
  difficulty: 'medium',
  sources: ['Q1.5', 'B#SCHEMA for the SQL questions'],

  steps: {
    vocabulary: [
      {
        term: 'primary key',
        definition: 'The column that gives every row in a table its own name. No two rows share one.',
      },
      {
        term: 'foreign key',
        definition: "A column holding another table's primary key. It is the thread from one row back to another.",
      },
      {
        term: 'one to many',
        definition: 'One row over here matched by many rows over there. One account, many resources.',
      },
      {
        term: 'subquery',
        definition: 'A query written inside brackets inside another query. It runs first and hands its rows over.',
      },
      {
        term: 'IN with a subquery',
        definition: 'A test that keeps a row when its value is one of the ones the subquery gave back.',
      },
    ],

    model: {
      narrative: [
        'Why is the account name not simply a column on `resources`?',
        '',
        'Because it would then be written out forty times, once per resource, and changing it would mean forty edits with forty chances to get one of them wrong. So the name is stored **once**, in `cloud_accounts`, and every resource carries `account_id` instead.',
        '',
        'That column is the foreign key. It is a primary key on one side and a pointer on the other, and it is the only thing holding the two tables together.',
        '',
        'Which leaves you a problem. The question you are asked is often about a fact in one table and a list from another: give me the resources in production accounts, where `environment` lives on `cloud_accounts` and `name` lives on `resources`. A subquery is the first way to cross that gap. Run one query to collect the keys, and use them to filter the other.',
      ].join('\n'),
      diagram: {
        kind: 'link',
        caption:
          'One account row, many resource rows. account_id is a primary key on the left and a foreign key on the right, and matching values are the only link between them.',
        left: {
          title: 'cloud_accounts',
          columns: ['account_id', 'account_name'],
          rows: [
            ['acc-101', 'payments-prod'],
            ['acc-106', 'identity-prod'],
          ],
        },
        right: {
          title: 'resources',
          columns: ['resource_id', 'account_id'],
          rows: [
            ['res-01', 'acc-101'],
            ['res-03', 'acc-101'],
            ['res-37', 'acc-106'],
            ['res-38', 'acc-106'],
          ],
        },
        leftKey: 0,
        rightKey: 1,
      },
      takeaway: 'A fact is stored once. A key is how every other table points at it.',
    },

    worked: {
      task: 'Return the name and the type of every resource that sits in a production account.',
      steps: [
        {
          label: 'name the table whose rows you want back',
          code: 'FROM resources',
          why: 'The answer is a list of resources, so resources is the starting point. environment is not a column here, and that gap is the whole problem to solve.',
          prompt: {
            question: 'Why not start FROM cloud_accounts, since that is where environment lives?',
            answer:
              'Because one row of the answer is one resource. Starting from cloud_accounts would give you one row per account, three rows rather than twenty one. Always start from the table whose rows the question is counting in, then reach for the rest.',
          },
        },
        {
          label: 'write the subquery that collects the keys you want',
          code: "SELECT account_id FROM cloud_accounts WHERE environment = 'prod'",
          why: 'On its own this is a complete, ordinary query, and it returns three account ids. Run it by itself if you are unsure: a subquery is only a query that happens to be standing inside another one.',
          prompt: {
            question: 'The subquery returns account_id rather than account_name. Why does that matter?',
            answer:
              'Because the outer query compares its result against resources.account_id. The two sides of IN have to be the same kind of value. A name would match nothing at all, because no resource stores a name.',
          },
        },
        {
          label: 'use those keys to filter the outer table',
          code: "WHERE account_id IN (SELECT account_id FROM cloud_accounts WHERE environment = 'prod')",
          why: 'IN keeps a row when its account_id is one of the three the subquery handed over. The brackets are what make the inner query a value the outer one can test against.',
        },
        {
          label: 'choose the columns',
          code: 'SELECT name, resource_type',
          why: 'Two columns, both from resources. The subquery contributed no columns to the result: it only decided which rows survive.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT name, resource_type FROM resources WHERE account_id IN (SELECT account_id FROM cloud_accounts WHERE environment = 'prod');",
          why: 'One statement, two queries, and the inner one runs first.',
        },
      ],
      result: '21 rows. The three production accounts hold 9, 8 and 4 resources.',
    },

    fadeLight: {
      task: 'Return the id and the name of every identity that belongs to a development account.',
      steps: [
        {
          label: 'name the table whose rows you want back',
          code: 'FROM identities',
          why: 'One row of the answer is one identity.',
        },
        {
          label: 'write the subquery that collects the keys you want',
          code: "SELECT account_id FROM cloud_accounts WHERE environment = 'dev'",
          why: 'Two accounts are tagged dev, so this hands over two ids.',
        },
        {
          label: 'use those keys to filter the outer table',
          code: "WHERE account_id IN (SELECT account_id FROM cloud_accounts WHERE environment = 'dev')",
          why: 'Same shape as the worked example, on a different pair of tables.',
        },
        {
          label: 'choose the columns',
          code: 'SELECT identity_id, name',
          why: 'The id so you can look it up, the name so you can read it.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT identity_id, name FROM identities WHERE account_id IN (SELECT account_id FROM cloud_accounts WHERE environment = 'dev');",
          why: 'Columns, table, then the test that carries the subquery.',
          accept: [
            "SELECT identity_id, name FROM identities WHERE account_id IN (SELECT account_id FROM cloud_accounts WHERE environment = 'dev')",
          ],
        },
      ],
      blanks: 1,
      closing: '6 rows. research-dev and data-dev hold three identities each.',
    },

    fadeHeavy: {
      task: 'Return the id and the severity of every finding raised on a resource in the account acc-101.',
      steps: [
        {
          label: 'name the table whose rows you want back',
          code: 'FROM findings',
          why: 'One row of the answer is one finding.',
        },
        {
          label: 'write the subquery that collects the keys you want',
          code: "SELECT resource_id FROM resources WHERE account_id = 'acc-101'",
          why: 'The nine resources in payments-prod. Note the key changes with the question: this time it is resource_id, not account_id.',
        },
        {
          label: 'use those keys to filter the outer table',
          code: "WHERE resource_id IN (SELECT resource_id FROM resources WHERE account_id = 'acc-101')",
          why: 'findings has no account_id column, so the only route from a finding to an account runs through resources.',
        },
        {
          label: 'choose the columns',
          code: 'SELECT finding_id, severity',
          why: 'Two columns from findings.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT finding_id, severity FROM findings WHERE resource_id IN (SELECT resource_id FROM resources WHERE account_id = 'acc-101');",
          why: 'By the third time through, the shape should arrive before the details do.',
          accept: [
            "SELECT finding_id, severity FROM findings WHERE resource_id IN (SELECT resource_id FROM resources WHERE account_id = 'acc-101')",
          ],
        },
      ],
      blanks: 2,
      closing: '27 rows. Nine resources, and between them twenty seven findings.',
    },

    parsons: {
      task: 'Build the query that returns the name of every resource carrying at least one critical finding.',
      blocks: [
        { id: 'p1', label: 'ask for the column', code: 'SELECT name' },
        { id: 'p2', label: 'name the outer table', code: 'FROM resources' },
        { id: 'p3', label: 'keep the rows whose key is in the list', code: 'WHERE resource_id IN (' },
        {
          id: 'p4',
          label: 'the subquery that builds the list',
          code: "  SELECT resource_id FROM findings WHERE severity = 'critical'",
        },
        { id: 'p5', label: 'close the brackets', code: ');' },
        {
          id: 'd1',
          label: 'the subquery that builds the list',
          code: "  SELECT name FROM findings WHERE severity = 'critical'",
          distractor: true,
        },
        {
          id: 'd2',
          label: 'keep the rows whose key is in the list',
          code: "WHERE severity = 'critical' AND resource_id IN (",
          distractor: true,
        },
      ],
      solution: ['p1', 'p2', 'p3', 'p4', 'p5'],
      closing:
        '21 rows. One block you left out selects a name from findings, which has no name column. The other tests severity on resources, which has no severity column. Both mistakes come from forgetting which table you are standing in.',
    },

    produce: {
      kind: 'sql',
      task: 'Return the id and the name of every resource that belongs to an account run by aws.',
      starter: 'SELECT',
      referenceSql:
        "SELECT resource_id, name FROM resources WHERE account_id IN (SELECT account_id FROM cloud_accounts WHERE provider = 'aws');",
      closing: '23 rows. Three of the six accounts are on aws, and between them they hold 23 resources.',
      fallback: {
        task: 'Same problem, as blocks. Every resource in an aws account, id and name.',
        blocks: [
          { id: 'f1', label: 'ask for the columns', code: 'SELECT resource_id, name' },
          { id: 'f2', label: 'name the outer table', code: 'FROM resources' },
          { id: 'f3', label: 'keep the rows whose key is in the list', code: 'WHERE account_id IN (' },
          {
            id: 'f4',
            label: 'the subquery that builds the list',
            code: "  SELECT account_id FROM cloud_accounts WHERE provider = 'aws'",
          },
          { id: 'f5', label: 'close the brackets', code: ');' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4', 'f5'],
        closing: 'Outer query, then the subquery inside the brackets. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-is-not-as-not-equals',
      setup:
        'Someone wants every resource that is not in the payments-prod account, acc-101. Lesson 4 taught them that IS NULL is the safe test where a value might be missing, so IS NOT is what comes to hand.',
      code: "SELECT name FROM resources WHERE account_id IS NOT 'acc-101';",
      question: 'This sandbox runs it and returns the right 31 rows. So what is wrong with it?',
      options: [
        { text: 'Nothing. IS NOT is the careful form of not equals.', correct: false },
        {
          text: 'IS NOT is a test for a missing value, not a general not equals. This database quietly extends it, most databases reject it, and it does not mean the same thing as != on a column that can be missing.',
          correct: true,
        },
        { text: 'It should be written IS NOT NULL.', correct: false },
        { text: 'The value should not be in quotes.', correct: false },
      ],
      silently:
        'It returns the correct 31 rows here, which is exactly why the habit survives. account_id is never missing, so IS NOT and != cannot disagree. Carry the same habit onto a column that can be missing and they stop agreeing at once: in lesson 4, is_public IS NOT TRUE kept 29 rows and is_public != TRUE kept 21. Run this query against most other databases and it is rejected as a syntax error, so the version that reaches production is the one that runs and quietly means something else.',
      explanation:
        'This is over generalisation, the second of the four documented categories: one case worked, so it is assumed to work everywhere. IS NULL and IS NOT NULL are a matched pair of tests for absence, not a general purpose comparison that happens to be safer. Use = and != to compare values, use IS NULL and IS NOT NULL to ask whether a value is there at all, and keep the two jobs apart.',
    },

    handoff: {
      canNow: [
        'Say which table a given fact is stored in, and why it is stored only once',
        'Follow a foreign key from one table to another',
        'Filter one table by a value that lives in a different one, using IN with a subquery',
      ],
      note: 'Q1.5 in the bank asks about IN against EXISTS, which is the same machinery seen from the other side. The next three lessons replace the subquery with a join.',
    },
  },
}

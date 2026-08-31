import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L8',
  number: 8,
  topicId: 'sql',
  sectionId: 1,
  title: 'INNER JOIN',
  objective:
    'You will be able to bring two tables together on a key, and say exactly how many rows come back and which ones did not.',
  minutes: 15,
  difficulty: 'medium',
  sources: ['Q1.7', 'Q1.12', 'B#SCHEMA for the SQL questions'],

  steps: {
    vocabulary: [
      {
        term: 'JOIN',
        definition: 'An instruction to bring a second table alongside the first, pairing rows by a value they share.',
      },
      {
        term: 'ON',
        definition: 'The part that says which two columns have to be equal before a pair of rows counts as a match.',
      },
      {
        term: 'alias',
        definition: 'A short name for a table inside one query, such as r for resources, so a column can be written r.name.',
      },
      {
        term: 'matched pair',
        definition: 'One row from each side that satisfies the ON test. Every pair becomes one row of the result.',
      },
      {
        term: 'INNER',
        definition: 'The default kind of join. A row that finds nothing to pair with does not appear in the result at all.',
      },
    ],

    model: {
      narrative: [
        'A join pairs rows. That single sentence predicts every row count you will ever see from one.',
        '',
        'There are 40 resources and 80 findings. Join them on `resource_id` and you get **80 rows**, not 40 and not 120, because there are exactly 80 pairs to be made. payments-exports has nine findings, so it appears nine times, once in each pair it takes part in.',
        '',
        'And here is the part to hold on to. Eight resources have no findings at all. They take part in no pair, so they contribute no rows, and they are simply not in the result. Nothing warns you. The count went up, so it does not feel like anything was lost.',
        '',
        'A join is the one operation that can make a result both longer and shorter than the table you started from, at the same time.',
      ].join('\n'),
      diagram: {
        kind: 'buckets',
        caption:
          'resources JOIN findings. 40 resources go in, 80 rows come out, and 8 of those resources are not among them.',
        buckets: [
          {
            label: 'resources with at least one finding',
            count: 32,
            note: 'each appears once per finding it has, 80 rows in all',
            kept: true,
          },
          {
            label: 'resources with no findings',
            count: 8,
            note: 'nothing to pair with, so no row in the result',
            kept: false,
          },
        ],
      },
      takeaway: 'One row out per matched pair. A row with no match is not there at all.',
    },

    worked: {
      task: 'Return the name of the resource and the severity, for every finding.',
      steps: [
        {
          label: 'name the table the rows are counted in',
          code: 'FROM findings f',
          why: 'One row of the answer is one finding, so findings is the left hand side. The f after it is an alias: a short name for this table for the rest of this query.',
          prompt: {
            question: 'Could you start FROM resources instead?',
            answer:
              'Yes, and for an inner join you would get the same 80 rows: pairing is symmetric. Starting from the table the question counts in keeps the query readable, and it starts to matter for real in the next lesson, where the two sides stop being interchangeable.',
          },
        },
        {
          label: 'bring the second table alongside',
          code: 'JOIN resources r ON r.resource_id = f.resource_id',
          why: 'ON names the pair of columns that have to be equal. This is the foreign key from lesson 7 doing the job it exists for.',
          prompt: {
            question: 'What would happen if you left the ON clause off?',
            answer:
              'Every finding would be paired with every resource: 80 times 40, which is 3,200 rows. The ON clause is the only thing standing between a join and every possible combination, which is why a missing one shows up as an absurd row count rather than as an error.',
          },
        },
        {
          label: 'choose the columns, saying which table each comes from',
          code: 'SELECT r.name, f.severity',
          why: 'With two tables in play, prefix every column. name and severity happen to be unambiguous here, but resource_id exists on both sides, and a query that is half prefixed is a query you have to think about twice.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT r.name, f.severity FROM findings f JOIN resources r ON r.resource_id = f.resource_id;',
          why: 'Columns, then the left table, then the table joined to it and the test that pairs them.',
        },
      ],
      result: '80 rows, one per finding. payments-exports appears nine times, once for each of its nine findings.',
    },

    fadeLight: {
      task: 'Return the rule name and the severity for every finding.',
      steps: [
        {
          label: 'name the table the rows are counted in',
          code: 'FROM findings f',
          why: 'One row per finding again.',
        },
        {
          label: 'bring the second table alongside',
          code: 'JOIN rules ru ON ru.rule_id = f.rule_id',
          why: 'rule_id is the foreign key from findings into rules. ru rather than r, because r is already spoken for in queries like this one.',
        },
        {
          label: 'choose the columns, saying which table each comes from',
          code: 'SELECT ru.rule_name, f.severity',
          why: 'One column from each side, which is the usual reason to join in the first place.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT ru.rule_name, f.severity FROM findings f JOIN rules ru ON ru.rule_id = f.rule_id;',
          why: 'The same four parts, on a different pair of tables.',
          accept: ['SELECT ru.rule_name, f.severity FROM findings f JOIN rules ru ON ru.rule_id = f.rule_id'],
        },
      ],
      blanks: 1,
      closing: '80 rows. Every finding was raised by a rule, so this join loses nothing.',
    },

    fadeHeavy: {
      task: 'Return the account name and the resource name, for every resource.',
      steps: [
        {
          label: 'name the table the rows are counted in',
          code: 'FROM resources r',
          why: 'One row of the answer is one resource.',
        },
        {
          label: 'bring the second table alongside',
          code: 'JOIN cloud_accounts a ON a.account_id = r.account_id',
          why: 'The same key the subquery used in lesson 7, now doing the work in one statement.',
        },
        {
          label: 'choose the columns, saying which table each comes from',
          code: 'SELECT a.account_name, r.name',
          why: 'Both tables have a name-like column, so the prefixes are doing real work here.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT a.account_name, r.name FROM resources r JOIN cloud_accounts a ON a.account_id = r.account_id;',
          why: 'Four parts, same order.',
          accept: ['SELECT a.account_name, r.name FROM resources r JOIN cloud_accounts a ON a.account_id = r.account_id'],
        },
      ],
      blanks: 2,
      closing:
        '40 rows, one per resource, and the count did not move. Every resource has exactly one account, so this pairing is one to one. A join only changes the row count when the match is not.',
    },

    parsons: {
      task: 'Build the query that returns the resource name and the CVE id for every recorded vulnerability.',
      blocks: [
        { id: 'p1', label: 'choose the columns', code: 'SELECT r.name, v.cve_id' },
        { id: 'p2', label: 'name the table the rows are counted in', code: 'FROM vulnerabilities v' },
        { id: 'p3', label: 'bring the second table alongside', code: 'JOIN resources r ON r.resource_id = v.resource_id;' },
        {
          id: 'd1',
          label: 'bring the second table alongside',
          code: 'JOIN resources r ON r.resource_id = v.cve_id;',
          distractor: true,
        },
        { id: 'd2', label: 'bring the second table alongside', code: 'JOIN resources r;', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3'],
      closing:
        '30 rows, one per recorded CVE. One block you left out pairs a resource id against a CVE id, which matches nothing and returns an empty result. The other has no ON clause at all, which pairs everything with everything.',
    },

    produce: {
      kind: 'sql',
      task: 'Return the resource name and the finding severity, for every open finding.',
      starter: 'SELECT',
      referenceSql:
        "SELECT r.name, f.severity FROM findings f JOIN resources r ON r.resource_id = f.resource_id WHERE f.status = 'open';",
      closing:
        '49 rows. The WHERE clause runs after the join, on the paired rows, and status is a column on the left hand table, so it belongs there.',
      fallback: {
        task: 'Same problem, as blocks. Resource name and severity, open findings only.',
        blocks: [
          { id: 'f1', label: 'choose the columns', code: 'SELECT r.name, f.severity' },
          { id: 'f2', label: 'name the table the rows are counted in', code: 'FROM findings f' },
          { id: 'f3', label: 'bring the second table alongside', code: 'JOIN resources r ON r.resource_id = f.resource_id' },
          { id: 'f4', label: 'keep only the open ones', code: "WHERE f.status = 'open';" },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Columns, left table, joined table, filter. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-inner-join-for-absence',
      setup:
        'A posture rule has to find the EC2 instances that have never had a single finding raised on them, because an instance nothing has ever fired on is usually an instance nothing has ever scanned. This is the query that gets written first.',
      code: "SELECT r.name\nFROM resources r\nJOIN findings f ON f.resource_id = r.resource_id\nWHERE r.resource_type = 'ec2_instance'\n  AND f.finding_id IS NULL;",
      question: 'Two EC2 instances in this sandbox have no findings at all. How many rows does this return?',
      options: [
        { text: '2, the two instances with no findings.', correct: false },
        { text: 'Zero, and it will return zero on any data it is ever pointed at.', correct: true },
        { text: '11, every EC2 finding pair.', correct: false },
        { text: '6, one per EC2 instance.', correct: false },
      ],
      silently:
        'Zero rows and no error. Worse than wrong: it is wrong for ever, on every dataset. An inner join only ever produces rows that matched, and a row that matched cannot have a NULL finding_id, so the last condition can never be true. A posture rule built on this reports a clean estate the day it ships and every day after. That is a false negative, and in this job the false negative is the expensive one, because nobody goes looking for the alert that did not fire.',
      explanation:
        'This is the documented trap: an inner join used to search for absence. The order of operations is what does it. The join runs first and throws the unmatched resources away, so by the time WHERE runs there is nothing left for IS NULL to find. To search for absence you need a join that keeps unmatched rows, which is the next lesson, and then a test that spots them, which is the one after.',
    },

    handoff: {
      canNow: [
        'Pair two tables on a key with JOIN and ON',
        'Predict the row count a join will produce, and name the rows it drops',
        'Say why an inner join can never answer a question about something missing',
      ],
      note: 'Q1.7 in the bank chains three joins to put a rule name, a resource name and an account name on one row. It is the same move twice more.',
    },
  },
}

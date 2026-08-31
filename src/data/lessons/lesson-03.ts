import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L3',
  number: 3,
  topicId: 'sql',
  sectionId: 1,
  title: 'WHERE, and the four value types',
  objective:
    'You will be able to keep only the rows you want with a WHERE clause, and write each of the four kinds of value the way SQL expects.',
  minutes: 14,
  difficulty: 'easy',
  sources: ['F3', 'Q1.1', 'Q1.4', 'B#SCHEMA for the SQL questions'],
  practice: { questionIds: [], factIds: ['F3'] },

  steps: {
    vocabulary: [
      {
        term: 'WHERE',
        definition: 'The part of a query that decides which rows to keep. It is a test, and it runs once for every row.',
      },
      {
        term: 'condition',
        definition: 'One test that comes out true or false for a single row, such as region equals us-east-1.',
      },
      {
        term: 'text value',
        definition: "A piece of text. Always inside single quotes, like 's3_bucket'.",
      },
      {
        term: 'number value',
        definition: 'A number. Written bare, with no quotes at all, like 90.',
      },
      {
        term: 'boolean value',
        definition: 'TRUE or FALSE. Also written bare, with no quotes. A boolean column holds one or the other.',
      },
      {
        term: 'NULL',
        definition: 'The marker for a value the scanner does not have. Not zero, not empty text, and never tested with an equals sign.',
      },
    ],

    model: {
      narrative: [
        'WHERE is a gate. Every row from the table walks up to it, the condition is tested on that row alone, and the row is either let through or dropped. Nothing about the row is changed and no row ever sees another row.',
        '',
        'That is why the row count falls at this stage and only at this stage. `SELECT` narrows each row; `WHERE` removes rows.',
        '',
        'The other half of this lesson is how to write the value on the right of the condition. SQL cares, and it cares in a way that is easy to get wrong because it looks like punctuation:',
        '',
        '- text goes in single quotes: `resource_type = \'s3_bucket\'`',
        '- numbers go bare: `cvss_score = 10`',
        '- booleans go bare: `is_public = TRUE`',
        '- NULL is never tested with `=` at all. It has its own test, and that is the whole of lesson 4.',
      ].join('\n'),
      diagram: {
        kind: 'pipeline',
        caption: 'The same query, stage by stage. Only WHERE changes the row count.',
        stages: [
          { label: 'FROM resources', note: 'every scanned resource arrives', rows: 40 },
          { label: "WHERE resource_type = 's3_bucket'", note: 'rows that fail the test are dropped', rows: 7 },
          { label: 'SELECT name, region', note: 'seven rows, now two columns wide', rows: 7 },
        ],
      },
      takeaway: 'WHERE removes rows. SELECT never does.',
    },

    worked: {
      task: 'Return the name and the region of every S3 bucket.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM resources',
          why: 'All 40 scanned resources, of which the buckets are a part.',
        },
        {
          label: 'write the test that keeps only the rows you want',
          code: "WHERE resource_type = 's3_bucket'",
          why: 'resource_type holds text, so the value it is compared against goes in single quotes. Written bare, SQL would read s3_bucket as the name of a column and fail to find one.',
          prompt: {
            question: 'Why single quotes and not double quotes?',
            answer:
              'Single quotes mean a text value. Double quotes mean the name of something, a column or a table, that has awkward characters or capitals in it. Swapping the two is one of the most common early errors, and the error message it produces talks about a missing column, which does not sound like a quoting problem at all.',
          },
        },
        {
          label: 'choose the columns you want back',
          code: 'SELECT name, region',
          why: 'Two of the seven. This decision is independent of the test above it.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT name, region FROM resources WHERE resource_type = 's3_bucket';",
          why: 'Columns, table, test. You worked it out in the other order, and the database will run it in the other order too.',
          prompt: {
            question: 'Only 7 of the 40 rows come back. Which part of this query removed the other 33?',
            answer:
              'WHERE, on its own. SELECT picked two of the seven columns and did not touch a single row. If you can answer this reliably you can read almost any simple query.',
          },
        },
      ],
      result: '7 rows, 2 columns. Seven of the forty resources are S3 buckets.',
    },

    fadeLight: {
      task: 'Return the id and the name of every resource in the region us-east-1.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM resources',
          why: 'Region is a column on resources.',
        },
        {
          label: 'write the test that keeps only the rows you want',
          code: "WHERE region = 'us-east-1'",
          why: 'Region holds text, so the value goes in single quotes. The dashes inside the quotes are just part of the text.',
        },
        {
          label: 'choose the columns you want back',
          code: 'SELECT resource_id, name',
          why: 'The id so you can look the row up again, the name so you can read it.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT resource_id, name FROM resources WHERE region = 'us-east-1';",
          why: 'Same three parts, same order.',
          accept: ["SELECT resource_id, name FROM resources WHERE region = 'us-east-1'"],
        },
      ],
      blanks: 1,
      closing: '7 rows. Seven resources live in us-east-1.',
    },

    fadeHeavy: {
      task: 'Return the id and the severity of every finding whose status is resolved.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM findings',
          why: 'Status is a column on findings.',
        },
        {
          label: 'write the test that keeps only the rows you want',
          code: "WHERE status = 'resolved'",
          why: 'Status holds text: open, resolved or suppressed.',
        },
        {
          label: 'choose the columns you want back',
          code: 'SELECT finding_id, severity',
          why: 'Two columns is enough to read the answer.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT finding_id, severity FROM findings WHERE status = 'resolved';",
          why: 'By the third time, the shape should be arriving before the details do.',
          accept: ["SELECT finding_id, severity FROM findings WHERE status = 'resolved'"],
        },
      ],
      blanks: 2,
      closing: '19 rows. Of the 80 findings, 19 have been resolved and 49 are still open.',
    },

    parsons: {
      task: 'Build the query that returns the name and the type of every resource that is public.',
      blocks: [
        { id: 'p1', label: 'ask for columns', code: 'SELECT name, resource_type' },
        { id: 'p2', label: 'name the table', code: 'FROM resources' },
        { id: 'p3', label: 'keep only the public ones', code: 'WHERE is_public = TRUE;' },
        {
          id: 'd1',
          label: 'keep only the public ones',
          code: "WHERE is_public = 'TRUE';",
          distractor: true,
        },
        { id: 'd2', label: 'keep only the public ones', code: 'WHERE public = TRUE;', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3'],
      closing:
        'One block you left out quoted a boolean, which turns it into text. The other used a column called public, which this table does not have. Both look reasonable on a phone screen at speed.',
    },

    produce: {
      kind: 'sql',
      task: 'Return the name and the region of every resource whose type is ec2_instance.',
      starter: 'SELECT',
      referenceSql: "SELECT name, region FROM resources WHERE resource_type = 'ec2_instance';",
      closing: '6 rows. Six of the forty resources are EC2 instances.',
      fallback: {
        task: 'Same problem, as blocks. Name and region, every ec2_instance.',
        blocks: [
          { id: 'f1', label: 'ask for columns', code: 'SELECT name, region' },
          { id: 'f2', label: 'name the table', code: 'FROM resources' },
          { id: 'f3', label: 'keep only the EC2 instances', code: "WHERE resource_type = 'ec2_instance';" },
        ],
        solution: ['f1', 'f2', 'f3'],
        closing: 'Three parts, in that order. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-quotes-on-boolean',
      setup:
        'This is meant to list the resources that are not public. is_public is a boolean column: it holds TRUE, FALSE, or nothing at all.',
      code: "SELECT name FROM resources WHERE is_public = 'false';",
      question: 'Twenty-one resources in this table are not public. How many rows come back?',
      options: [
        { text: 'All 21.', correct: false },
        { text: 'None at all. Zero rows.', correct: true },
        { text: '21, plus the 8 the scanner could not read.', correct: false },
        { text: 'It refuses to run and reports a type error.', correct: false },
      ],
      silently:
        "Zero rows, no error, no warning. The quotes made 'false' a piece of text, and a piece of text is never equal to a boolean, so the test is false for every row in the table. A check built on this reports that nothing is misconfigured, which is the most expensive way for a posture rule to be wrong: it is silent, and it looks like good news. Some databases reject this outright instead. Do not rely on being told.",
      explanation:
        'This is the same misconception as the trap in lesson 2, now on the right of the equals sign: the quotes look like punctuation, so they feel optional. They are not. Quotes make a value into text. TRUE and FALSE are booleans and go bare, numbers go bare, and only text is quoted. When a filter returns zero rows and you expected many, the first thing to check is whether you quoted something that should not have been.',
    },

    handoff: {
      canNow: [
        'Cut a table down to the rows that pass a test',
        'Write text, number and boolean values the way SQL expects them',
        'Say which clause removed the rows that are missing from a result',
      ],
      note: 'Fact F3 is the one to keep in rotation from here: the only way to test for a missing value. Lesson 4 is entirely about it.',
    },
  },
}

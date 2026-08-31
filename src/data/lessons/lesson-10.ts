import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L10',
  number: 10,
  topicId: 'sql',
  sectionId: 1,
  title: 'The anti join: finding what is absent',
  objective:
    'You will be able to find the rows that have no match at all, which is the shape most posture rules take.',
  minutes: 14,
  difficulty: 'hard',
  sources: ['F5', 'Q1.5', 'Q1.8', 'Q1.12'],

  steps: {
    vocabulary: [
      {
        term: 'anti join',
        definition: 'A search for the rows on one side that have no match at all on the other.',
      },
      {
        term: 'the pattern',
        definition: 'LEFT JOIN to keep everything, then keep only the rows where the right hand key came back NULL.',
      },
      {
        term: 'NOT IN',
        definition: 'A test that keeps a row when its value is not among the ones a subquery returned.',
      },
      {
        term: 'NOT EXISTS',
        definition: 'A test that keeps a row when no matching row exists on the other side. It asks about rows, not values.',
      },
      {
        term: 'false negative',
        definition: 'A check that reports nothing wrong when something is wrong. The expensive kind of mistake in posture work.',
      },
    ],

    model: {
      narrative: [
        'Most posture rules are absence questions. A bucket with **no** logging. An instance with **no** agent. A role that has **never** been used. Lesson 8 showed you that an inner join cannot answer one of those, because it throws the interesting rows away before you can look at them.',
        '',
        'The anti join is the pattern that can. It is two moves you already have:',
        '',
        '1. `LEFT JOIN`, so the rows that matched nothing survive, padded with NULL.',
        '2. `WHERE right_table.key IS NULL`, which keeps only those padded rows.',
        '',
        'The second line is doing something slightly sneaky, and it is worth seeing clearly. A primary key is never NULL in a real row. So if `f.finding_id` is NULL in the joined result, there is only one possible explanation: this row was padded, which means it matched nothing. The NULL is not data. It is the fingerprint of an absence.',
      ].join('\n'),
      diagram: {
        kind: 'buckets',
        caption:
          'The same LEFT JOIN as the last lesson, read the other way round. The anti join throws away the matches and keeps the padding.',
        buckets: [
          {
            label: 'matched at least one finding',
            count: 32,
            note: 'right hand columns are filled in, so the IS NULL test is false',
            kept: false,
          },
          {
            label: 'matched nothing',
            count: 8,
            note: 'right hand columns are NULL, and these are the answer',
            kept: true,
          },
        ],
      },
      takeaway: 'No match shows up as a NULL key on the right. Test for that NULL and you have found what is absent.',
    },

    worked: {
      task: 'Return every resource of type ec2_instance that has no findings at all.',
      steps: [
        {
          label: 'name the table you are looking for gaps in',
          code: 'FROM resources r',
          why: 'The answer is a list of resources. The thing that is missing lives on the other side.',
        },
        {
          label: 'keep every row of it through the join',
          code: 'LEFT JOIN findings f ON f.resource_id = r.resource_id',
          why: 'LEFT, because the rows you want are precisely the ones an inner join would have deleted.',
        },
        {
          label: 'keep only the rows that matched nothing',
          code: 'WHERE f.finding_id IS NULL',
          why: 'finding_id is the primary key of findings, so a real finding can never have a NULL there. A NULL in this column can only mean padding, which can only mean no match.',
          prompt: {
            question: 'Why test finding_id rather than, say, f.severity?',
            answer:
              'Because severity could legitimately be NULL in a real row, and then a genuine finding would look exactly like an absence. Always test a column the right hand table can never leave empty, which in practice means its primary key.',
          },
        },
        {
          label: 'add the condition on the left table',
          code: "AND r.resource_type = 'ec2_instance'",
          why: 'This condition is on the LEFT table, so WHERE is exactly where it belongs. Every left row is present by the time WHERE runs, so nothing is silently dropped.',
          prompt: {
            question: 'The last lesson said a condition on the right table belongs in ON. Why is this one different?',
            answer:
              'Because it is on the left table. The LEFT JOIN promises every left row survives, so a test on a left column in WHERE is testing a value that is really there. The rule is about which side the column comes from, not about which clause looks tidier.',
          },
        },
        {
          label: 'choose the columns and assemble',
          code: "SELECT r.resource_id, r.name FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id WHERE f.finding_id IS NULL AND r.resource_type = 'ec2_instance';",
          why: 'One condition from each side, in the clause that suits it. This is the query file C gives as the answer to Q1.8.',
        },
      ],
      result: '2 rows: platform-edge-2 and data-dev-etl. Two EC2 instances that no rule has ever fired on.',
    },

    fadeLight: {
      task: 'Return the id and the name of every resource with no CVE recorded against it.',
      steps: [
        {
          label: 'name the table you are looking for gaps in',
          code: 'FROM resources r',
          why: 'The answer is a list of resources again.',
        },
        {
          label: 'keep every row of it through the join',
          code: 'LEFT JOIN vulnerabilities v ON v.resource_id = r.resource_id',
          why: 'LEFT, so the resources with nothing recorded survive to be counted.',
        },
        {
          label: 'keep only the rows that matched nothing',
          code: 'WHERE v.cve_id IS NULL',
          why: 'cve_id is half of the primary key of vulnerabilities, so it is never empty in a real row.',
        },
        {
          label: 'choose the columns and assemble',
          code: 'SELECT r.resource_id, r.name FROM resources r LEFT JOIN vulnerabilities v ON v.resource_id = r.resource_id WHERE v.cve_id IS NULL;',
          why: 'Three parts, and only the tables have changed.',
          accept: [
            'SELECT r.resource_id, r.name FROM resources r LEFT JOIN vulnerabilities v ON v.resource_id = r.resource_id WHERE v.cve_id IS NULL',
          ],
        },
      ],
      blanks: 1,
      closing: '19 rows. No CVE recorded is not the same as no CVE, and telling those two apart is most of this job.',
    },

    fadeHeavy: {
      task: 'Return the name of every resource that has no critical finding.',
      steps: [
        {
          label: 'name the table you are looking for gaps in',
          code: 'FROM resources r',
          why: 'All forty resources go in.',
        },
        {
          label: 'keep every row of it through the join, narrowing what counts as a match',
          code: "LEFT JOIN findings f ON f.resource_id = r.resource_id AND f.severity = 'critical'",
          why: 'The severity test is on the right table, so it sits inside ON. A resource whose only findings are low severity now matches nothing, which is exactly the answer you want.',
        },
        {
          label: 'keep only the rows that matched nothing',
          code: 'WHERE f.finding_id IS NULL',
          why: 'The same fingerprint as before.',
        },
        {
          label: 'choose the columns and assemble',
          code: "SELECT r.name FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id AND f.severity = 'critical' WHERE f.finding_id IS NULL;",
          why: 'Two lessons in one query: the condition in ON, and the IS NULL test in WHERE.',
          accept: [
            "SELECT r.name FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id AND f.severity = 'critical' WHERE f.finding_id IS NULL",
          ],
        },
      ],
      blanks: 2,
      closing:
        '19 rows. Look at where the severity test sits: inside ON. In WHERE it would have deleted every padded row, which is to say the entire answer.',
    },

    parsons: {
      task: 'Build the query that returns the name of every resource in the account acc-106 that has no findings.',
      blocks: [
        { id: 'p1', label: 'choose the column', code: 'SELECT r.name' },
        { id: 'p2', label: 'the table you are looking for gaps in', code: 'FROM resources r' },
        { id: 'p3', label: 'keep every row of it through the join', code: 'LEFT JOIN findings f ON f.resource_id = r.resource_id' },
        { id: 'p4', label: 'keep only the rows that matched nothing', code: 'WHERE f.finding_id IS NULL' },
        { id: 'p5', label: 'the condition on the left table', code: "  AND r.account_id = 'acc-106';" },
        {
          id: 'd1',
          label: 'keep every row of it through the join',
          code: 'JOIN findings f ON f.resource_id = r.resource_id',
          distractor: true,
        },
        { id: 'd2', label: 'keep only the rows that matched nothing', code: 'WHERE f.finding_id != NULL', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4', 'p5'],
      closing:
        '4 rows: every resource in identity-prod. One block you left out is an inner join, which returns nothing here for the reason lesson 8 ended on. The other compares to NULL with an operator, which answers unknown on every row and also returns nothing.',
    },

    produce: {
      kind: 'sql',
      task: 'Return the name and the type of every resource that has no findings at all.',
      starter: 'SELECT',
      referenceSql:
        'SELECT r.name, r.resource_type FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id WHERE f.finding_id IS NULL;',
      closing:
        '8 rows. Four of them sit in identity-prod, the account that never appears in any finding, and an account that never appears is worth asking about.',
      fallback: {
        task: 'Same problem, as blocks. Every resource with no findings, name and type.',
        blocks: [
          { id: 'f1', label: 'choose the columns', code: 'SELECT r.name, r.resource_type' },
          { id: 'f2', label: 'the table you are looking for gaps in', code: 'FROM resources r' },
          { id: 'f3', label: 'keep every row of it through the join', code: 'LEFT JOIN findings f ON f.resource_id = r.resource_id' },
          { id: 'f4', label: 'keep only the rows that matched nothing', code: 'WHERE f.finding_id IS NULL;' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'LEFT JOIN, then the IS NULL test on the right hand key. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-not-in-with-null',
      setup:
        'NOT IN is the other way to ask an absence question, and it reads beautifully. Now suppose the findings table is loaded from a scanner feed, and one row arrives whose resource the scanner could not resolve, so its resource_id is NULL.',
      code: 'SELECT name\nFROM resources\nWHERE resource_id NOT IN (SELECT resource_id FROM findings);',
      question:
        'Today, with no NULL in the feed, this returns the 8 resources with no findings. What does it return the day that one NULL row arrives?',
      options: [
        { text: 'The same 8 rows. One NULL is just one more value that will not match.', correct: false },
        { text: 'Zero rows, for every resource, from then on.', correct: true },
        { text: '9 rows, the 8 plus the unresolved one.', correct: false },
        { text: 'It stops running and reports an error.', correct: false },
      ],
      silently:
        'Zero rows, no error, no warning, and no clue that anything changed. NOT IN is a chain of not equals tests joined by AND, and one of those comparisons is now against NULL, which answers unknown rather than true. Lesson 4 settled what happens next: unknown is not true, so every row is dropped. A rule written this way works perfectly until the feed gets slightly dirtier, and then it silently reports a completely clean estate. Nobody investigates the alert that did not fire.',
      explanation:
        "This is why fact F5 in the deck gives the LEFT JOIN plus IS NULL pattern first, and names NOT EXISTS rather than NOT IN as the alternative. NOT EXISTS asks whether a matching row exists, which is a question about rows and always has a yes or no answer. NOT IN asks whether a value differs from every value in a list, which is a question about values and inherits three valued logic. When you are searching for absence, use the join or use NOT EXISTS, and treat NOT IN over a subquery as something to be talked out of.",
    },

    handoff: {
      canNow: [
        'Find the rows on one side that have no match at all on the other',
        'Explain why the IS NULL test has to be on the right hand primary key',
        'Say why NOT IN is the wrong tool for an absence question over real data',
      ],
      note: 'F5 is the fact, Q1.8 is the query, and Q1.5 is the NOT IN trap in the bank version. All three are the same idea.',
    },
  },
}

import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L9',
  number: 9,
  topicId: 'sql',
  sectionId: 1,
  title: 'LEFT JOIN, and ON versus WHERE',
  objective:
    'You will be able to keep every row of the left table through a join, and put a condition on the right table where it will not silently undo that.',
  minutes: 15,
  difficulty: 'hard',
  sources: ['F6', 'Q1.9', 'Q1.11', 'Q1.12'],

  steps: {
    vocabulary: [
      {
        term: 'LEFT JOIN',
        definition: 'A join that keeps every row of the left table, whether it found a match or not.',
      },
      {
        term: 'left table',
        definition: 'The one named in FROM. All of its rows survive a LEFT JOIN.',
      },
      {
        term: 'right table',
        definition: 'The one named in JOIN. Its rows appear only where they matched something.',
      },
      {
        term: 'unmatched row',
        definition: 'A left row that found nothing to pair with. It still comes back, exactly once.',
      },
      {
        term: 'NULL padding',
        definition: 'The right hand columns of an unmatched row. They are filled with NULL, because there is nothing to put there.',
      },
    ],

    model: {
      narrative: [
        'A LEFT JOIN makes one promise: **every row of the left table survives**. Where a left row matched nothing, it comes back once anyway, and every column borrowed from the right table is NULL.',
        '',
        'So `resources LEFT JOIN findings` gives 88 rows: the 80 matched pairs from the last lesson, plus one padded row for each of the 8 resources that matched nothing.',
        '',
        'Now the part that costs people real bugs, and it is fact F6 in the deck.',
        '',
        'Put a condition on a **right hand** column in `WHERE`, and it is tested after the padding has happened. On a padded row that column is NULL, the test answers unknown, and lesson 4 tells you what happens next: the row is dropped. The promise is silently withdrawn and your LEFT JOIN has quietly become an INNER JOIN.',
        '',
        'Put the same condition in `ON` and it is part of deciding what counts as a match. A left row that matches nothing is padded and kept, which is what you asked for.',
      ].join('\n'),
      diagram: {
        kind: 'rows',
        caption:
          'resources LEFT JOIN findings, four of the 88 rows. The last two matched nothing and came back padded, and a WHERE test on either of those NULL columns would delete them.',
        columns: ['r.name', 'f.finding_id', 'f.severity'],
        rows: [
          ['payments-exports', '9001', 'critical'],
          ['payments-exports', '9002', 'low'],
          ['platform-edge-2', 'null', 'null'],
          ['data-dev-etl', 'null', 'null'],
        ],
        highlightColumns: [1],
      },
      takeaway: 'A condition on the right table goes in ON. In WHERE it deletes the very rows a LEFT JOIN kept for you.',
    },

    worked: {
      task: 'For every resource, return its name and its critical findings. Resources with no critical finding must still appear.',
      steps: [
        {
          label: 'name the table whose rows must all survive',
          code: 'FROM resources r',
          why: 'Must still appear is the phrase that decides this. Whatever must survive goes on the left.',
        },
        {
          label: 'keep every left row through the join',
          code: 'LEFT JOIN findings f ON f.resource_id = r.resource_id',
          why: 'LEFT is the whole difference from the last lesson. The 8 resources with no findings come back padded instead of disappearing.',
          prompt: {
            question: 'How many rows would a plain JOIN have given here?',
            answer:
              '26, one per critical finding, and the 19 resources you were explicitly asked to keep would be gone with nothing on screen to say they ever existed. That is the whole reason the question said must still appear.',
          },
        },
        {
          label: 'put the condition on the right table inside ON',
          code: "AND f.severity = 'critical'",
          why: 'This step is the one that decides whether the query works at all. Inside ON, the condition is part of what counts as a match, so a resource with no critical finding matches nothing and is padded rather than dropped.',
          prompt: {
            question: 'Why does the same condition behave differently in ON and in WHERE?',
            answer:
              'Because of when each one runs. ON runs while the pairs are being built, so it decides what matches. WHERE runs after the join is finished, on rows that already exist, and on a padded row severity is NULL, which fails every comparison. This is lesson 6 execution order doing real damage rather than producing a tidy error.',
          },
        },
        {
          label: 'choose the columns',
          code: 'SELECT r.name, f.finding_id',
          why: 'finding_id is NULL on every padded row, which is how you will read the answer: a NULL there means this resource has no critical finding.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT r.name, f.finding_id FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id AND f.severity = 'critical';",
          why: 'Both halves of the ON clause together: the key that pairs the rows, and the condition that narrows what counts as a pair.',
        },
      ],
      result:
        '45 rows: the 26 critical findings, plus one padded row for each of the 19 resources that have no critical finding.',
    },

    fadeLight: {
      task: 'For every resource, return its name and any CVE recorded against it. Resources with no CVE must still appear.',
      steps: [
        {
          label: 'name the table whose rows must all survive',
          code: 'FROM resources r',
          why: 'The question is a list of resources, all of them.',
        },
        {
          label: 'keep every left row through the join',
          code: 'LEFT JOIN vulnerabilities v ON v.resource_id = r.resource_id',
          why: 'LEFT, so a resource with no CVE recorded still comes back once, padded.',
        },
        {
          label: 'choose the columns',
          code: 'SELECT r.name, v.cve_id',
          why: 'A NULL cve_id is the reader visible sign of a resource with nothing recorded against it.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT r.name, v.cve_id FROM resources r LEFT JOIN vulnerabilities v ON v.resource_id = r.resource_id;',
          why: 'No extra condition on the right table this time, so nothing has to move into ON.',
          accept: ['SELECT r.name, v.cve_id FROM resources r LEFT JOIN vulnerabilities v ON v.resource_id = r.resource_id'],
        },
      ],
      blanks: 1,
      closing: '49 rows: 30 for the recorded CVEs, and one each for the 19 resources with none recorded.',
    },

    fadeHeavy: {
      task: 'For every resource, return its name and its open findings. Resources with no open finding must still appear.',
      steps: [
        {
          label: 'name the table whose rows must all survive',
          code: 'FROM resources r',
          why: 'All forty of them, whatever the findings table says.',
        },
        {
          label: 'keep every left row through the join',
          code: 'LEFT JOIN findings f ON f.resource_id = r.resource_id',
          why: 'The key half of the ON clause, exactly as before.',
        },
        {
          label: 'choose the columns',
          code: 'SELECT r.name, f.finding_id',
          why: 'Two columns, one from each side.',
        },
        {
          label: 'decide where the condition on the right table goes',
          code: "AND f.status = 'open'",
          why: 'status is a column on findings, the right hand table, so it belongs in ON alongside the key. In WHERE it would delete every padded row and undo the LEFT.',
          accept: ["AND f.status = 'open'", "and f.status='open'"],
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT r.name, f.finding_id FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id AND f.status = 'open';",
          why: 'Key first, then the narrowing condition, both inside ON.',
          accept: [
            "SELECT r.name, f.finding_id FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id AND f.status = 'open'",
          ],
        },
      ],
      blanks: 2,
      closing:
        '59 rows: the 49 open findings, plus one padded row for each of the 10 resources that have no open finding at all.',
    },

    parsons: {
      task: 'Build the query that returns every rule name with the critical findings it raised, keeping the rules that raised none.',
      blocks: [
        { id: 'p1', label: 'choose the columns', code: 'SELECT ru.rule_name, f.finding_id' },
        { id: 'p2', label: 'the table whose rows must all survive', code: 'FROM rules ru' },
        { id: 'p3', label: 'keep every left row through the join', code: 'LEFT JOIN findings f' },
        { id: 'p4', label: 'the key that pairs the rows', code: '  ON f.rule_id = ru.rule_id' },
        { id: 'p5', label: 'the condition on the right table', code: "  AND f.severity = 'critical';" },
        {
          id: 'd1',
          label: 'the condition on the right table',
          code: "WHERE f.severity = 'critical';",
          distractor: true,
        },
        { id: 'd2', label: 'keep every left row through the join', code: 'JOIN findings f', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4', 'p5'],
      closing:
        'Both blocks you left out quietly turn this into an inner join. One puts the right hand condition in WHERE, the other drops the word LEFT. Either way the rules that raised no critical finding vanish, which is the half of the question that was hard.',
    },

    produce: {
      kind: 'sql',
      task: 'For every resource, return its name and the id of any high severity finding on it. Every resource must appear, including the ones with no high severity finding.',
      starter: 'SELECT',
      referenceSql:
        "SELECT r.name, f.finding_id FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id AND f.severity = 'high';",
      closing:
        'Count the rows and check them against the two numbers you know: 20 high severity findings, and 40 resources of which some have none. If you got 20, the condition ended up in WHERE.',
      fallback: {
        task: 'Same problem, as blocks. Every resource, with any high severity finding, keeping the ones with none.',
        blocks: [
          { id: 'f1', label: 'choose the columns', code: 'SELECT r.name, f.finding_id' },
          { id: 'f2', label: 'the table whose rows must all survive', code: 'FROM resources r' },
          { id: 'f3', label: 'keep every left row through the join', code: 'LEFT JOIN findings f' },
          { id: 'f4', label: 'the key that pairs the rows', code: '  ON f.resource_id = r.resource_id' },
          { id: 'f5', label: 'the condition on the right table', code: "  AND f.severity = 'high';" },
        ],
        solution: ['f1', 'f2', 'f3', 'f4', 'f5'],
        closing: 'Key and condition, both inside ON. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-right-condition-in-where',
      setup:
        'The task was the worked example: every resource, with its critical findings, and the resources with no critical finding still listed. The LEFT JOIN is there and the key is right. One thing has moved.',
      code: "SELECT r.name, f.finding_id\nFROM resources r\nLEFT JOIN findings f ON f.resource_id = r.resource_id\nWHERE f.severity = 'critical';",
      question: 'The correct version returns 45 rows. What does this one return?',
      options: [
        { text: '45, the same. WHERE and ON are two ways of writing one thing.', correct: false },
        { text: '26, which is exactly what a plain inner join would have given.', correct: true },
        { text: 'Zero rows.', correct: false },
        { text: '88, every row of the join.', correct: false },
      ],
      silently:
        '26 rows, no error, and every one of them is a genuine critical finding. That is what makes it survive review: nothing in the output is wrong, something is simply not in it. The 19 resources with no critical finding are gone, which was the half of the question that mattered. The WHERE test ran after the join, met a NULL severity on every padded row, answered unknown, and dropped it. The word LEFT is still sitting in the query, doing nothing at all.',
      explanation:
        'Fact F6 in the deck is this one sentence: in a LEFT JOIN, a condition on the right table belongs in the ON clause, and putting it in WHERE silently turns the LEFT JOIN into an INNER JOIN. A condition on the left table still belongs in WHERE, because those rows are all present by then either way. The check that catches it every time: if the rows that matched nothing are still in your result, the condition is in the right place.',
    },

    handoff: {
      canNow: [
        'Keep every row of the left table through a join, padded where it matched nothing',
        'Decide whether a condition belongs in ON or in WHERE by asking which table its column comes from',
        'Recognise a LEFT JOIN that has been silently downgraded, from the row count alone',
      ],
      note: 'F6 is the fact to keep in rotation, and Q1.12 in the bank asks you to argue the choice out loud, which is the version of this that comes up in an interview.',
    },
  },
}

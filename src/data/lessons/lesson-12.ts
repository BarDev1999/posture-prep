import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L12',
  number: 12,
  topicId: 'sql',
  sectionId: 1,
  title: 'Aggregate functions, and the three COUNTs',
  objective:
    'You will be able to ask a question about a whole pile of rows, and pick the counting function that answers the question you actually asked.',
  minutes: 15,
  difficulty: 'medium',
  sources: ['F4', 'Q1.13', 'Q1.18'],

  steps: {
    vocabulary: [
      {
        term: 'aggregate function',
        definition: 'A function that takes a whole pile of rows and gives back one value for it.',
      },
      {
        term: 'COUNT(*)',
        definition: 'Counts rows in the pile. It counts a row even when every column in it is empty.',
      },
      {
        term: 'COUNT(column)',
        definition: 'Counts only the rows where that column has a value. Missing values are skipped.',
      },
      {
        term: 'COUNT(DISTINCT column)',
        definition: 'Counts how many different values that column holds, not how many rows hold them.',
      },
      {
        term: 'SUM, MIN, MAX, AVG',
        definition: 'The other everyday aggregates: the total, the smallest, the largest, the average of a column.',
      },
    ],

    model: {
      narrative: [
        'An aggregate takes a pile and returns one value for it. With `GROUP BY` you get one value per pile; with no `GROUP BY` at all, the whole table is treated as a single pile and you get exactly one row back.',
        '',
        'The three counts look like spellings of one idea. They are three different questions, and fact F4 in the deck exists because the difference costs people marks:',
        '',
        '- `COUNT(*)` asks **how many rows**.',
        '- `COUNT(is_public)` asks **how many rows have a value there**. The 8 resources the scanner could not read are skipped, so it answers 32.',
        '- `COUNT(DISTINCT is_public)` asks **how many different values appear**. There are only ever two, so it answers 2.',
        '',
        'Same table, same column, three answers, and every one of them is correct for the question it was asked. Almost every wrong number in a posture report comes from asking one of these when you meant another.',
      ].join('\n'),
      diagram: {
        kind: 'rows',
        caption:
          'Three counts over the same forty resources. Eight have no public setting recorded, and only two distinct values are ever recorded.',
        columns: ['written this way', 'asks', 'answers'],
        rows: [
          ['COUNT(*)', 'how many rows', '40'],
          ['COUNT(is_public)', 'how many have a value', '32'],
          ['COUNT(DISTINCT is_public)', 'how many values exist', '2'],
        ],
        highlightColumns: [2],
      },
      takeaway: 'COUNT(*) counts rows. COUNT(column) skips the missing ones. COUNT(DISTINCT column) counts values, not rows.',
    },

    worked: {
      task: 'Return the number of open findings per severity, with the biggest count first.',
      steps: [
        {
          label: 'name the table',
          code: 'FROM findings',
          why: 'All 80 findings arrive.',
        },
        {
          label: 'cut the rows before they are grouped',
          code: "WHERE status = 'open'",
          why: 'A row filter, so it belongs in WHERE and it runs before any pile is built. 49 rows survive.',
        },
        {
          label: 'gather the survivors into piles',
          code: 'GROUP BY severity',
          why: 'Four piles, exactly as in the last lesson.',
        },
        {
          label: 'ask each pile a question',
          code: 'SELECT severity, COUNT(*) AS open_findings',
          why: 'COUNT(*) counts the rows in each pile. AS names the new column, because otherwise the database calls it COUNT(*), which is unpleasant to read and awkward to sort by.',
          prompt: {
            question: 'Why is COUNT(*) the right choice here, when the trap at the end of this lesson is about COUNT(*)?',
            answer:
              'Because nothing has been joined. Every row in these piles is one finding, so counting rows is counting findings. COUNT(*) goes wrong when a row has stopped being one of the thing you meant to count, which is exactly what a join does to it.',
          },
        },
        {
          label: 'order by the new column',
          code: 'ORDER BY open_findings DESC',
          why: 'ORDER BY runs at stage six, after SELECT has invented the name, so the alias exists by the time this line is evaluated.',
          prompt: {
            question: 'WHERE could not use that alias. Why can ORDER BY?',
            answer:
              'Timing, and nothing else. WHERE runs at stage two, before SELECT has created the name. ORDER BY runs at stage six, after it. The execution order from lesson 6 is not trivia: it decides what is legal where.',
          },
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT severity, COUNT(*) AS open_findings FROM findings WHERE status = 'open' GROUP BY severity ORDER BY open_findings DESC;",
          why: 'Five clauses, and this is the shape most posture reporting queries end up in.',
        },
      ],
      result: '4 rows: critical 20, high 12, medium 9, low 8.',
    },

    fadeLight: {
      task: 'Return the number of resources in each account, most first.',
      steps: [
        {
          label: 'name the table',
          code: 'FROM resources',
          why: 'One row per resource going in.',
        },
        {
          label: 'gather the rows into piles',
          code: 'GROUP BY account_id',
          why: 'One pile per account. Six accounts hold resources, so six piles.',
        },
        {
          label: 'ask each pile a question',
          code: 'SELECT account_id, COUNT(*) AS resources',
          why: 'Nothing is joined here either, so a row is a resource and COUNT(*) means what it looks like it means.',
        },
        {
          label: 'order by the new column',
          code: 'ORDER BY resources DESC',
          why: 'Biggest pile first.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT account_id, COUNT(*) AS resources FROM resources GROUP BY account_id ORDER BY resources DESC;',
          why: 'Four clauses, no filter needed.',
          accept: ['SELECT account_id, COUNT(*) AS resources FROM resources GROUP BY account_id ORDER BY resources DESC'],
        },
      ],
      blanks: 1,
      closing: '6 rows. payments-prod holds 9 resources and identity-prod holds 4.',
    },

    fadeHeavy: {
      task: 'Return, in one row, how many identities there are and how many of them have ever been used.',
      steps: [
        {
          label: 'name the table',
          code: 'FROM identities',
          why: 'No GROUP BY at all this time, so the whole table is treated as one pile and exactly one row comes back.',
        },
        {
          label: 'count every row',
          code: 'COUNT(*) AS all_identities',
          why: 'Every identity, used or not.',
        },
        {
          label: 'count only the rows that have a value',
          code: 'COUNT(last_used_at) AS ever_used',
          why: 'An identity that has never been used has no last used date, so this count skips it. The difference between the two numbers is the answer to a question nobody had to write.',
          accept: ['COUNT(last_used_at) AS ever_used', 'count(last_used_at) as ever_used'],
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT COUNT(*) AS all_identities, COUNT(last_used_at) AS ever_used FROM identities;',
          why: 'Two aggregates side by side over the same pile.',
          accept: ['SELECT COUNT(*) AS all_identities, COUNT(last_used_at) AS ever_used FROM identities'],
        },
      ],
      blanks: 2,
      closing:
        'One row: 20 identities, of which 15 have been used at least once. The five that have not are the five with no last used date, and COUNT found them by skipping them.',
    },

    parsons: {
      task: 'Build the query that returns how many different regions each account holds resources in, most first.',
      blocks: [
        { id: 'p1', label: 'ask each pile a question', code: 'SELECT account_id, COUNT(DISTINCT region) AS regions' },
        { id: 'p2', label: 'name the table', code: 'FROM resources' },
        { id: 'p3', label: 'gather the rows into piles', code: 'GROUP BY account_id' },
        { id: 'p4', label: 'order by the new column', code: 'ORDER BY regions DESC;' },
        {
          id: 'd1',
          label: 'ask each pile a question',
          code: 'SELECT account_id, COUNT(region) AS regions',
          distractor: true,
        },
        { id: 'd2', label: 'gather the rows into piles', code: 'GROUP BY account_id, region', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4'],
      closing:
        'The block you left out with COUNT(region) counts rows that have a region, which is every resource in the account, so it answers a completely different question and looks plausible doing it. The other groups by region as well, which makes one pile per account and region and destroys the thing you were counting.',
    },

    produce: {
      kind: 'sql',
      task: 'Return the number of findings raised on each resource. Only resources that have at least one will appear, which is what grouping the findings table gives you.',
      starter: 'SELECT',
      referenceSql: 'SELECT resource_id, COUNT(*) AS findings FROM findings GROUP BY resource_id;',
      closing:
        '32 rows, which is the same 32 resources the inner join in lesson 8 kept. The 8 with no findings are absent for the same reason as before: no row, no pile.',
      fallback: {
        task: 'Same problem, as blocks. How many findings on each resource.',
        blocks: [
          { id: 'f1', label: 'ask each pile a question', code: 'SELECT resource_id, COUNT(*) AS findings' },
          { id: 'f2', label: 'name the table', code: 'FROM findings' },
          { id: 'f3', label: 'gather the rows into piles', code: 'GROUP BY resource_id;' },
        ],
        solution: ['f1', 'f2', 'f3'],
        closing: 'Aggregate, table, grouping. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-count-star-after-join',
      setup:
        'The question was: how many resources have at least one finding? The join is right, and COUNT(*) is the counter that comes to hand.',
      code: 'SELECT COUNT(*) AS resources_with_findings\nFROM resources r\nJOIN findings f ON f.resource_id = r.resource_id;',
      question: '32 of the 40 resources have at least one finding. What number does this return?',
      options: [
        { text: '32', correct: false },
        { text: '80', correct: true },
        { text: '40', correct: false },
        { text: '8', correct: false },
      ],
      silently:
        'It returns 80, under a column heading that says resources_with_findings. There are only 40 resources in the entire estate, so the answer is not just wrong, it is impossible, and it still gets pasted into a report because 80 is a plausible looking number sitting next to a plausible looking name. The join produced one row per finding, and COUNT(*) counted exactly what it was handed.',
      explanation:
        'After a one to many join a row is no longer one of the thing you set out to count. COUNT(*) is still counting rows perfectly correctly; the rows simply stopped meaning what you assumed. COUNT(DISTINCT r.resource_id) asks the question you meant and answers 32. This is the documented omission of DISTINCT, and file C puts it plainly in the answer to Q1.18: posture reports almost always want the distinct count.',
    },

    handoff: {
      canNow: [
        'Ask one question of a whole pile of rows with an aggregate',
        'Choose between the three COUNTs by naming the question each one answers',
        'Spot a count that has been inflated by a join, from the number alone',
      ],
      note: 'F4 is the fact to keep in rotation, and Q1.18 in the bank asks you to explain all three counts and show a case where the wrong one inflates a report.',
    },
  },
}

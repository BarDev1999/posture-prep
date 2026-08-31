import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L13',
  number: 13,
  topicId: 'sql',
  sectionId: 1,
  title: 'HAVING versus WHERE',
  objective:
    'You will be able to filter on what a group answered rather than on what a row holds, and say which of the two stages any filter belongs in.',
  minutes: 13,
  difficulty: 'medium',
  sources: ['F1', 'F2', 'Q1.15', 'Q1.16'],

  steps: {
    vocabulary: [
      {
        term: 'HAVING',
        definition: 'The stage that keeps or drops whole groups, using the answer an aggregate gave for each one.',
      },
      {
        term: 'row filter',
        definition: 'A test on the values in one row. It belongs in WHERE, and it runs before any grouping.',
      },
      {
        term: 'group filter',
        definition: 'A test on something only a finished group knows, such as how many rows it holds. It belongs in HAVING.',
      },
      {
        term: 'the deciding question',
        definition: 'Could a single row, on its own, answer this test? If yes it is WHERE. If no it is HAVING.',
      },
    ],

    model: {
      narrative: [
        'Two filters, and the only real difference between them is **when** they run.',
        '',
        '`WHERE` runs at stage two, on single rows, before any pile exists. `HAVING` runs at stage four, on finished piles. That is the whole of it, and fact F2 in the deck is the consequence: HAVING can use `COUNT` and WHERE cannot, because at stage two there are no groups yet and therefore nothing to count.',
        '',
        'So the question that settles every case is not which word sounds right. It is: **could one row, looked at on its own, answer this test?**',
        '',
        'A status can. One finding knows whether it is open. That is a row filter, and it goes in WHERE.',
        '',
        'A count cannot. No single finding knows how many findings share its severity. That is a group filter, and it goes in HAVING.',
        '',
        'Put the row filter in WHERE and you also get it for free: filtering before grouping means smaller piles and less work, rather than building piles and throwing them away.',
      ].join('\n'),
      diagram: {
        kind: 'pipeline',
        caption:
          'Two filters at two stages. WHERE removed 31 rows before any pile existed. HAVING removed two finished piles.',
        stages: [
          { label: 'FROM findings', note: 'every finding arrives', rows: 80 },
          { label: "WHERE status = 'open'", note: 'a row filter, at stage two', rows: 49 },
          { label: 'GROUP BY severity', note: 'four piles', rows: 4 },
          { label: 'HAVING COUNT(*) > 10', note: 'a group filter, at stage four', rows: 2 },
        ],
      },
      takeaway: 'WHERE filters rows before the piles are made. HAVING filters piles after.',
    },

    worked: {
      task: 'Return the severities that have more than 10 open findings, with their counts.',
      steps: [
        {
          label: 'name the table',
          code: 'FROM findings',
          why: 'All 80 findings.',
        },
        {
          label: 'filter the rows, before any grouping',
          code: "WHERE status = 'open'",
          why: 'A single finding knows its own status, so this is a row filter and it belongs at stage two. 49 rows survive into the piles.',
        },
        {
          label: 'make the piles',
          code: 'GROUP BY severity',
          why: 'Four piles, built from the 49 rows rather than all 80.',
        },
        {
          label: 'filter the piles',
          code: 'HAVING COUNT(*) > 10',
          why: 'How many rows are in this pile is a question only a finished pile can answer, so it cannot run at stage two. HAVING runs at stage four, when the piles exist and COUNT has a number for each.',
          prompt: {
            question: 'Why can HAVING use COUNT when WHERE cannot?',
            answer:
              'Because of when each one runs. At stage two there are no groups, so there is nothing for COUNT to count and the question is meaningless rather than merely forbidden. By stage four the groups are built and COUNT has an answer for every one. That is fact F2, and it is a consequence of the order rather than a rule of its own.',
          },
        },
        {
          label: 'choose the columns',
          code: 'SELECT severity, COUNT(*) AS open_findings',
          why: 'The grouping column, and the same aggregate the filter used.',
          prompt: {
            question: 'COUNT(*) appears in both HAVING and SELECT. Is it worked out twice?',
            answer:
              'It is worked out once per pile and both stages read the same answer. Writing it in both places is not waste, it is how you say filter on this and also show me this.',
          },
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT severity, COUNT(*) AS open_findings FROM findings WHERE status = 'open' GROUP BY severity HAVING COUNT(*) > 10;",
          why: 'Written SELECT, FROM, WHERE, GROUP BY, HAVING. Run FROM, WHERE, GROUP BY, HAVING, SELECT.',
        },
      ],
      result: '2 rows: critical with 20 and high with 12. Medium and low had piles, and HAVING threw them away.',
    },

    fadeLight: {
      task: 'Return the accounts that hold more than 6 resources, with how many they hold.',
      steps: [
        {
          label: 'name the table',
          code: 'FROM resources',
          why: 'Forty resources going in.',
        },
        {
          label: 'make the piles',
          code: 'GROUP BY account_id',
          why: 'One pile per account. No row filter is needed here: the question asks about every account.',
        },
        {
          label: 'filter the piles',
          code: 'HAVING COUNT(*) > 6',
          why: 'A test on how big the pile is, so stage four.',
        },
        {
          label: 'choose the columns',
          code: 'SELECT account_id, COUNT(*) AS resources',
          why: 'Grouping column plus the aggregate.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT account_id, COUNT(*) AS resources FROM resources GROUP BY account_id HAVING COUNT(*) > 6;',
          why: 'Four clauses, and HAVING always sits directly after GROUP BY.',
          accept: ['SELECT account_id, COUNT(*) AS resources FROM resources GROUP BY account_id HAVING COUNT(*) > 6'],
        },
      ],
      blanks: 1,
      closing: '3 rows, holding 9, 8 and 7 resources. The other three accounts hold 6 or fewer.',
    },

    fadeHeavy: {
      task: 'Return the rules that have caught more than 8 findings, with how many they caught.',
      steps: [
        {
          label: 'name the table',
          code: 'FROM findings',
          why: 'The findings table already carries rule_id, so no join is needed.',
        },
        {
          label: 'make the piles',
          code: 'GROUP BY rule_id',
          why: 'One pile per rule that has ever fired.',
        },
        {
          label: 'choose the columns',
          code: 'SELECT rule_id, COUNT(*) AS caught',
          why: 'Grouping column plus the count.',
        },
        {
          label: 'filter the piles',
          code: 'HAVING COUNT(*) > 8',
          why: 'The last decision, and the one that decides whether this is a report or a shortlist.',
          accept: ['HAVING COUNT(*) > 8;', 'having count(*) > 8'],
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT rule_id, COUNT(*) AS caught FROM findings GROUP BY rule_id HAVING COUNT(*) > 8;',
          why: 'By now this shape should be arriving whole.',
          accept: ['SELECT rule_id, COUNT(*) AS caught FROM findings GROUP BY rule_id HAVING COUNT(*) > 8'],
        },
      ],
      blanks: 2,
      closing: '4 rows. The busiest rule has caught 16 findings on its own.',
    },

    parsons: {
      task: 'Build the query that returns the regions holding more than 5 resources, with their counts, biggest first.',
      blocks: [
        { id: 'p1', label: 'choose the columns', code: 'SELECT region, COUNT(*) AS resources' },
        { id: 'p2', label: 'name the table', code: 'FROM resources' },
        { id: 'p3', label: 'make the piles', code: 'GROUP BY region' },
        { id: 'p4', label: 'filter the piles', code: 'HAVING COUNT(*) > 5' },
        { id: 'p5', label: 'order by the new column', code: 'ORDER BY resources DESC;' },
        { id: 'd1', label: 'filter the piles', code: 'WHERE COUNT(*) > 5', distractor: true },
        { id: 'd2', label: 'filter the piles', code: "HAVING region = 'us-east-1'", distractor: true },
      ],
      solution: ['p1', 'p2', 'p3', 'p4', 'p5'],
      closing:
        'The two blocks you left out are the two halves of the same confusion. One puts a count in WHERE, where no pile exists yet. The other puts a row test in HAVING, where it filters whole piles on the value of whichever row the pile hands over.',
    },

    produce: {
      kind: 'sql',
      task: 'Return every resource that has more than 2 findings, with how many it has.',
      starter: 'SELECT',
      referenceSql: 'SELECT resource_id, COUNT(*) AS findings FROM findings GROUP BY resource_id HAVING COUNT(*) > 2;',
      closing:
        '10 rows. One resource has 9 findings on its own, and it is the one the last lesson of this topic is built around.',
      fallback: {
        task: 'Same problem, as blocks. Resources with more than 2 findings, and the count.',
        blocks: [
          { id: 'f1', label: 'choose the columns', code: 'SELECT resource_id, COUNT(*) AS findings' },
          { id: 'f2', label: 'name the table', code: 'FROM findings' },
          { id: 'f3', label: 'make the piles', code: 'GROUP BY resource_id' },
          { id: 'f4', label: 'filter the piles', code: 'HAVING COUNT(*) > 2;' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4'],
        closing: 'Group first, then filter the groups. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-where-instead-of-having',
      setup:
        'The question was: which resources have more than 2 findings? WHERE is the filter you have been using since lesson 3, so it is the one that comes to hand.',
      code: 'SELECT resource_id, COUNT(*) AS findings\nFROM findings\nWHERE COUNT(*) > 2\nGROUP BY resource_id;',
      question: 'What happens when this runs?',
      options: [
        { text: 'It returns the 10 resources with more than 2 findings.', correct: false },
        {
          text: 'It is refused. WHERE runs before the piles exist, so there is nothing for COUNT to count.',
          correct: true,
        },
        { text: 'It returns every resource, ignoring the filter.', correct: false },
        { text: 'It returns a single row holding the total.', correct: false },
      ],
      silently:
        'This one is refused outright, with a message about misusing an aggregate function, and that is the good case: the database caught it for you. The same belief has a quiet twin that is not caught. Move a row test the other way, into HAVING, and it is accepted. a HAVING clause testing status runs after grouping, reads the status of whichever row the pile happens to hand over, and keeps or drops the entire pile on that one arbitrary member. That version returns rows, and the counts inside them are counts of everything rather than counts of the open findings.',
      explanation:
        'Both directions come from one wrong model: that WHERE and HAVING are interchangeable filters, and that a query runs in the order it is written. They are two different stages of the order in lesson 6. The deciding question settles it every time, so ask it out loud: could a single row, on its own, answer this test? A status can, so WHERE. A count cannot, so HAVING.',
    },

    handoff: {
      canNow: [
        'Filter whole groups on the answer an aggregate gave for each one',
        'Place any filter correctly by asking whether one row could answer it alone',
        'Explain why HAVING can use COUNT and WHERE cannot',
      ],
      note: 'F2 is the fact, and Q1.16 in the bank asks for the whole execution order out loud, which is the version an interviewer asks for.',
    },
  },
}

import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L14',
  number: 14,
  topicId: 'sql',
  sectionId: 1,
  title: 'Fan out and duplicate inflation across chained JOINs',
  objective:
    'You will be able to spot when a join has multiplied your rows, and total a column without counting the same value several times.',
  minutes: 15,
  difficulty: 'hard',
  sources: ['Q1.10', 'Q1.11', 'Q1.18'],

  steps: {
    vocabulary: [
      {
        term: 'fan out',
        definition: 'What a one to many join does to the row count. One row on the left becomes as many rows as it matched.',
      },
      {
        term: 'duplicate inflation',
        definition: 'The consequence. A value is now present several times, and anything that adds it up adds every copy.',
      },
      {
        term: 'chained join',
        definition: 'A second join added onto the first. The two fan outs multiply each other rather than adding.',
      },
      {
        term: 'SUM',
        definition: 'An aggregate that adds a column up across a pile. It has no way of knowing a value arrived twice.',
      },
      {
        term: 'aggregate first, then join',
        definition: 'The fix. Reduce each table to one row per thing before bringing them together.',
      },
    ],

    model: {
      narrative: [
        'Lesson 8 said a join pairs rows. Chain two of them and the pairings multiply.',
        '',
        'Take payments-exports, one single resource. It has 9 findings and 3 CVEs. Join it to findings and it becomes 9 rows. Join that result to vulnerabilities and each of those 9 rows is paired with all 3 CVEs, so you have 27.',
        '',
        'Not 9 plus 3. **9 times 3.** And every one of those three CVE scores is now sitting in the result nine times over.',
        '',
        'Nothing is wrong with the join. Every one of the 27 rows is a genuine pairing, and if you look at them you can see the repetition plainly. The damage happens the moment you wrap the whole thing in `SUM` or `COUNT`, because an aggregate collapses those 27 rows into one number and takes the evidence with it.',
        '',
        'The habit that saves you is small and mechanical: **count the rows before you total anything.** A count that is a neat multiple of what you expected is a fan out, every time.',
      ].join('\n'),
      diagram: {
        kind: 'pipeline',
        caption:
          'One resource, nine findings, three CVEs. One times nine times three is 27 rows, and every CVE score is now in there nine times.',
        stages: [
          { label: "FROM resources ('res-01')", note: 'one resource', rows: 1 },
          { label: 'JOIN findings', note: 'one row per finding, nine of them', rows: 9 },
          { label: 'JOIN vulnerabilities', note: 'each of those nine paired with all three CVEs', rows: 27 },
        ],
      },
      takeaway: 'Two one to many joins multiply. Anything you total afterwards is multiplied along with them.',
    },

    worked: {
      task: 'Total the CVSS scores of the CVEs on payments-exports, and get the right number.',
      steps: [
        {
          label: 'count the rows before you total anything',
          code: "SELECT COUNT(*) FROM resources r JOIN findings f ON f.resource_id = r.resource_id JOIN vulnerabilities v ON v.resource_id = r.resource_id WHERE r.resource_id = 'res-01';",
          why: '27, for a single resource with three CVEs. That number is the whole diagnosis. Running this before you aggregate costs one query and catches this entire family of bugs.',
          prompt: {
            question: 'Why 27 and not 12?',
            answer:
              'Because joins multiply rather than add. Nine findings each paired with three CVEs is 27 pairings. If they added you would get 12, and the fact that people expect 12 is exactly why the real number goes unnoticed.',
          },
        },
        {
          label: 'decide which table actually holds the numbers you want',
          code: 'FROM vulnerabilities',
          why: 'The scores live on vulnerabilities, one row per CVE per resource. Nothing in the question needs findings at all, and the findings join is the entire cause of the damage.',
        },
        {
          label: 'narrow to the thing you were asked about',
          code: "WHERE resource_id = 'res-01'",
          why: 'No join at all now. The rows are already one per CVE, which is the grain the question asked for.',
        },
        {
          label: 'total it',
          code: 'SELECT SUM(cvss_score) AS total_cvss',
          why: 'SUM over three rows, each one a distinct CVE.',
          prompt: {
            question: 'Both queries are about the same resource. Why does one say 245.7 and the other 27.3?',
            answer:
              '245.7 is 27.3 added up nine times, once for each finding the first query dragged along. The join did not change a single score. It changed how many times each score was present, and SUM cannot tell the difference.',
          },
        },
        {
          label: 'assemble, in the order SQL wants',
          code: "SELECT SUM(cvss_score) AS total_cvss FROM vulnerabilities WHERE resource_id = 'res-01';",
          why: 'The fix is usually not a cleverer aggregate. It is removing a join the question never needed.',
        },
      ],
      result: 'One row: 27.3. That is 10.0 plus 7.5 plus 9.8, the three CVEs on payments-exports, each counted once.',
    },

    fadeLight: {
      task: 'From a join of resources and findings, return how many distinct resources have at least one finding.',
      steps: [
        {
          label: 'name the table the rows are counted in',
          code: 'FROM resources r',
          why: 'The question counts resources, so resources is the left hand side.',
        },
        {
          label: 'bring the second table alongside, knowing it will fan out',
          code: 'JOIN findings f ON f.resource_id = r.resource_id',
          why: '80 rows for 32 resources. The fan out is unavoidable here; the job is to survive it.',
        },
        {
          label: 'count the thing, not the rows',
          code: 'SELECT COUNT(DISTINCT r.resource_id) AS resources',
          why: 'DISTINCT is what puts the grain back. It counts resource ids rather than rows, so the nine copies of res-01 collapse to one.',
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT COUNT(DISTINCT r.resource_id) AS resources FROM resources r JOIN findings f ON f.resource_id = r.resource_id;',
          why: 'Same join as lesson 8, one word different in the count.',
          accept: [
            'SELECT COUNT(DISTINCT r.resource_id) AS resources FROM resources r JOIN findings f ON f.resource_id = r.resource_id',
          ],
        },
      ],
      blanks: 1,
      closing: 'One row: 32. COUNT(*) over exactly the same join says 80, and DISTINCT is the whole of the difference.',
    },

    fadeHeavy: {
      task: 'Return the total CVSS score across every recorded CVE, without letting a join anywhere near it.',
      steps: [
        {
          label: 'name the one table that holds the numbers',
          code: 'FROM vulnerabilities',
          why: 'One row per CVE per resource, which is already the grain the question wants. Nothing else needs to be here.',
        },
        {
          label: 'total the column',
          code: 'SELECT SUM(cvss_score) AS total_cvss',
          why: 'No GROUP BY, so the whole table is one pile and one row comes back.',
          accept: ['SELECT SUM(cvss_score) AS total_cvss', 'select sum(cvss_score) as total_cvss'],
        },
        {
          label: 'assemble, in the order SQL wants',
          code: 'SELECT SUM(cvss_score) AS total_cvss FROM vulnerabilities;',
          why: 'The shortest correct query in this lesson, and that is the point of it.',
          accept: ['SELECT SUM(cvss_score) AS total_cvss FROM vulnerabilities'],
        },
      ],
      blanks: 2,
      closing:
        'One row: 263.8. Push the same figure through the double join and it comes out at 802.7, inflated by every finding that came along for the ride.',
    },

    parsons: {
      task: 'Build the query that returns how many distinct CVEs each resource has, using only the table that holds them.',
      blocks: [
        { id: 'p1', label: 'count the thing, not the rows', code: 'SELECT resource_id, COUNT(DISTINCT cve_id) AS cves' },
        { id: 'p2', label: 'the one table that holds them', code: 'FROM vulnerabilities' },
        { id: 'p3', label: 'one pile per resource', code: 'GROUP BY resource_id;' },
        {
          id: 'd1',
          label: 'the one table that holds them',
          code: 'FROM vulnerabilities v JOIN findings f ON f.resource_id = v.resource_id',
          distractor: true,
        },
        { id: 'd2', label: 'count the thing, not the rows', code: 'SELECT resource_id, COUNT(*) AS cves', distractor: true },
      ],
      solution: ['p1', 'p2', 'p3'],
      closing:
        '21 rows. The block you left out with the findings join is the fan out itself, dressed up as extra thoroughness. The one with COUNT(*) would have been correct here only because nothing was joined, and it stops being correct the moment somebody adds a join.',
    },

    produce: {
      kind: 'sql',
      task: 'Return the total CVSS score for the resource res-03, counting each CVE once.',
      starter: 'SELECT',
      referenceSql: "SELECT SUM(cvss_score) AS total_cvss FROM vulnerabilities WHERE resource_id = 'res-03';",
      closing:
        'One row: 19.8, from two CVEs scoring 10.0 and 9.8. Join findings in as well and it becomes 59.4, because res-03 has three findings and each score would arrive three times.',
      fallback: {
        task: 'Same problem, as blocks. The total CVSS for res-03, each CVE counted once.',
        blocks: [
          { id: 'f1', label: 'total the column', code: 'SELECT SUM(cvss_score) AS total_cvss' },
          { id: 'f2', label: 'the one table that holds the numbers', code: 'FROM vulnerabilities' },
          { id: 'f3', label: 'narrow to one resource', code: "WHERE resource_id = 'res-03';" },
        ],
        solution: ['f1', 'f2', 'f3'],
        closing: 'One table, one filter, one total. Now write it out yourself.',
      },
    },

    trap: {
      misconceptionId: 'sql-sum-fan-out',
      setup:
        'The question was: what is the total CVSS score across the CVEs on payments-exports? The resource has three CVEs, scoring 10.0, 7.5 and 9.8, and it also has nine findings.',
      code: "SELECT SUM(v.cvss_score) AS total_cvss\nFROM resources r\nJOIN findings f ON f.resource_id = r.resource_id\nJOIN vulnerabilities v ON v.resource_id = r.resource_id\nWHERE r.resource_id = 'res-01';",
      question: 'The three scores add up to 27.3. What does this query return?',
      options: [
        { text: '27.3', correct: false },
        { text: '245.7, which is 27.3 counted nine times over', correct: true },
        { text: '81.9', correct: false },
        { text: 'Zero, because nothing matches', correct: false },
      ],
      silently:
        'It returns 245.7 in a column called total_cvss, with no error and no visible duplication anywhere, because SUM collapsed the 27 rows into a single number before you had a chance to notice there were 27 of them. The second join multiplied the first, every CVE arrived nine times, and SUM faithfully added every copy. A single total never shows you how many rows went into it, which is what makes this the hardest of these traps to catch by reading.',
      explanation:
        'This is the documented fan out trap, and file C answers Q1.10 with the fix: aggregate each table separately and then join the aggregates, or drop the join the question never needed. SUM(DISTINCT ...) is not the fix, because two genuinely different CVEs can share a score and DISTINCT would silently drop one of them. The habit that actually saves you is the first step of the worked example: count the rows before you total anything, and be suspicious of any count that is a tidy multiple of what you expected.',
    },

    handoff: {
      canNow: [
        'Predict the row count of two chained one to many joins',
        'Recognise an inflated total from the row count rather than from the number itself',
        'Total a column at the right grain, by removing the join instead of patching the aggregate',
      ],
      note: 'Q1.10 and Q1.11 in the bank are both this, and Q1.11 is the hardest query in the whole section: a double LEFT JOIN with both conditions in ON and a COUNT DISTINCT on top. Everything it needs is now in your hands.',
    },
  },
}

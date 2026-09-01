import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L14X',
  number: 14,
  topicId: 'sql',
  sectionId: 1,
  title: 'Window functions and ROW_NUMBER for top N per group',
  objective:
    'You will be able to number the rows inside each group with ROW_NUMBER, filter on that number in an outer query, and say why LIMIT cannot do the same job.',
  minutes: 15,
  difficulty: 'hard',
  sources: ['Q1.19', 'Q1.17', 'F1', 'B#1C. SQL, GROUP BY, aggregation, ORDER BY with LIMIT'],

  steps: {
    vocabulary: [
      {
        term: 'window function',
        definition: 'A function that looks at a set of rows around the current one and returns a value for that row. The rows are not collapsed.',
      },
      {
        term: 'OVER',
        definition: 'The clause that defines which rows the window function may look at, and in what order.',
      },
      {
        term: 'PARTITION BY',
        definition: 'Splits the rows into groups for the window function, restarting the numbering in each one. Nothing is collapsed.',
      },
      {
        term: 'ROW_NUMBER()',
        definition: 'Gives each row in its partition a number, starting at 1, in the order the window defines.',
      },
      {
        term: 'subquery',
        definition: 'A query inside another query. Here it is what lets the outer query filter on a number the inner one produced.',
      },
    ],

    model: {
      narrative: [
        'GROUP BY collapses. Ten findings on one resource become one row, and the ten disappear. That is what you want for a count and it is exactly what you do not want for top N per group, because the rows you are trying to pick are the ones being collapsed.',
        '',
        'A window function does the opposite. It looks at a set of rows around the current one and hands back a value for that row, and every row survives. `ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY open_count DESC)` gives each row a number inside its own account, best first, and the row keeps its identity.',
        '',
        'Once every row carries a number, top three per account is a filter: keep the rows whose number is at most three. The only mechanical detail is that a window function cannot be used in WHERE, because the numbering has not happened yet when WHERE runs, which you know from the execution order in lesson 6. So the numbering goes in a subquery and the filter goes outside it.',
        '',
        'That shape, number in an inner query and filter in an outer one, is the whole technique. It is also the answer to question 1.19, and the reason the question adds if you know them: without window functions the same result needs a correlated subquery that counts how many rows beat this one, which works and is slower and much harder to read.',
      ].join('\n'),
      diagram: {
        kind: 'rows',
        caption:
          'Six of the fifteen rows the worked example returns. The number restarts at 1 in each account, which is what PARTITION BY does and what LIMIT cannot do.',
        columns: ['account', 'resource', 'open', 'rn'],
        rows: [
          ['acc-101', 'payments-exports', '7', '1'],
          ['acc-101', 'payments-api-1', '1', '2'],
          ['acc-101', 'payments-api-2', '1', '3'],
          ['acc-102', 'platform-assets', '2', '1'],
          ['acc-102', 'platform-artifacts', '2', '2'],
          ['acc-102', 'platform-edge-1', '2', '3'],
        ],
        highlightColumns: [3],
      },
      takeaway: 'Number inside the group with ROW_NUMBER, then filter on that number in an outer query.',
    },

    worked: {
      task:
        'Question 1.19: for each account, return the three resources with the most open findings. There are 40 resources across 6 accounts, and 30 of them have at least one open finding.',
      steps: [
        {
          label: 'count the open findings per resource',
          code: "SELECT r.account_id, r.name, COUNT(*) AS open_count\nFROM resources r\nJOIN findings f ON f.resource_id = r.resource_id\nWHERE f.status = 'open'\nGROUP BY r.resource_id",
          why: 'The inner question first, and it is a join plus a group from lessons 8 and 11. Grouping by the resource id rather than by the name keeps two resources with the same name apart.',
          prompt: {
            question: 'Why group by r.resource_id when the output shows the name?',
            answer:
              'Because the id is unique and the name is not promised to be. Grouping by a non unique column silently merges two things into one row, which is the same class of error as the fan out in lesson 14.',
          },
        },
        {
          label: 'number the rows inside each account',
          code: 'ROW_NUMBER() OVER (PARTITION BY r.account_id ORDER BY COUNT(*) DESC) AS rn',
          why: 'PARTITION BY restarts the numbering per account, and the ORDER BY inside OVER decides what first means. Nothing is collapsed: this is one more column on each row.',
          prompt: {
            question: 'What decides which resource gets number 1 when two are tied?',
            answer:
              'Nothing you have specified, which is the same problem as the tie in lesson 5. Two resources with two open findings each can arrive in either order. If the tie matters, add a second column to the ORDER BY inside the window, such as the name, so the result is stable.',
          },
        },
        {
          label: 'wrap it so the number can be filtered',
          code: 'SELECT account_id, name, open_count\nFROM (\n  ...the numbered query...\n)\nWHERE rn <= 3',
          why: 'WHERE runs before the window function has produced anything, so the filter cannot live in the same query. The subquery finishes the numbering, and the outer WHERE reads a column that now exists.',
          prompt: {
            question: 'Could HAVING be used instead, since it runs later?',
            answer:
              'No. HAVING filters groups after GROUP BY, and window functions are evaluated after that again, just before SELECT. There is no clause in the same query that runs late enough, which is exactly why the subquery is not a style choice.',
          },
        },
        {
          label: 'assemble the whole thing',
          code: "SELECT account_id, name, open_count\nFROM (\n  SELECT r.account_id, r.name, COUNT(*) AS open_count,\n         ROW_NUMBER() OVER (PARTITION BY r.account_id ORDER BY COUNT(*) DESC) AS rn\n  FROM resources r\n  JOIN findings f ON f.resource_id = r.resource_id\n  WHERE f.status = 'open'\n  GROUP BY r.resource_id\n)\nWHERE rn <= 3;",
          why: 'Numbering inside, filtering outside. Every account with any open findings contributes up to three rows, and an account with fewer contributes what it has.',
        },
      ],
      result:
        '15 rows. Five of the six accounts have open findings, four of them contribute three rows each and one contributes three as well, which is what up to three per account looks like on this data.',
    },

    fadeLight: {
      task: 'For each account, return the identity that was used most recently.',
      steps: [
        {
          label: 'number the identities inside each account',
          code: 'ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY last_used_at DESC) AS rn',
          why: 'One partition per account, ordered by recency, so number 1 is the most recently used in that account.',
        },
        {
          label: 'wrap it and keep the first of each',
          code: 'SELECT account_id, name FROM (SELECT account_id, name, ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY last_used_at DESC) AS rn FROM identities) WHERE rn = 1;',
          why: 'Top one per group is the same shape as top three, with a different number in the outer filter.',
          accept: [
            'SELECT account_id, name FROM (SELECT account_id, name, ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY last_used_at DESC) AS rn FROM identities) WHERE rn <= 1;',
          ],
        },
      ],
      blanks: 1,
      closing:
        '6 rows, one per account. Note what happened to the identities that were never used: their last_used_at is NULL, and NULL sorts last in descending order here, so they take number 1 only in an account where nothing has ever been used.',
    },

    fadeHeavy: {
      task: 'For each resource that has any vulnerabilities, return its two highest scoring CVEs.',
      steps: [
        {
          label: 'name the table the rows come from',
          code: 'FROM vulnerabilities',
          why: 'One row per CVE per resource, which is already the grain the answer needs. No join and no grouping.',
        },
        {
          label: 'number the CVEs inside each resource',
          code: 'ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY cvss_score DESC) AS rn',
          why: 'Partition by the resource, order by the score, so number 1 is the worst CVE on that resource.',
        },
        {
          label: 'wrap it and keep the top two of each',
          code: 'SELECT resource_id, cve_id, cvss_score FROM (SELECT resource_id, cve_id, cvss_score, ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY cvss_score DESC) AS rn FROM vulnerabilities) WHERE rn <= 2;',
          why: 'Same shape a third time. Once you can see it, top N per group is one pattern rather than a family of tricks.',
          accept: [
            'SELECT resource_id, cve_id, cvss_score FROM (SELECT resource_id, cve_id, cvss_score, ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY cvss_score DESC) AS rn FROM vulnerabilities) WHERE rn < 3;',
          ],
        },
      ],
      blanks: 2,
      closing:
        'This is the shape a real vulnerability report needs: not the twenty worst CVEs in the estate, which are usually on three machines, but the worst two on each of them.',
    },

    parsons: {
      task: 'Build the top three resources per account by open findings, from question 1.19.',
      blocks: [
        { id: 'p1', label: 'ask for the columns the answer needs', code: 'SELECT account_id, name, open_count' },
        { id: 'p2', label: 'open the subquery that does the numbering', code: 'FROM (' },
        {
          id: 'p3',
          label: 'count per resource and number inside each account',
          code: '  SELECT r.account_id, r.name, COUNT(*) AS open_count,\n         ROW_NUMBER() OVER (PARTITION BY r.account_id ORDER BY COUNT(*) DESC) AS rn',
        },
        {
          id: 'p4',
          label: 'name the tables and join them',
          code: '  FROM resources r JOIN findings f ON f.resource_id = r.resource_id',
        },
        { id: 'p5', label: 'keep the open findings and group per resource', code: "  WHERE f.status = 'open' GROUP BY r.resource_id" },
        { id: 'p6', label: 'close the subquery and filter on the number', code: ') WHERE rn <= 3;' },
        {
          id: 'd1',
          label: 'close the subquery and filter on the number',
          code: ') ORDER BY open_count DESC LIMIT 3;',
          distractor: true,
        },
        {
          id: 'd2',
          label: 'keep the open findings and group per resource',
          code: "  WHERE f.status = 'open' AND rn <= 3 GROUP BY r.resource_id",
          distractor: true,
        },
      ],
      solution: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
      closing:
        'The first block you left out is the trap on this lesson: it returns three rows in total. The second puts the window column in WHERE, which fails outright, and that failure is useful, because it is the execution order from lesson 6 telling you the number does not exist yet.',
    },

    produce: {
      kind: 'sql',
      task:
        'For each resource that has any vulnerabilities, return the resource id, the CVE id and the score of its single highest scoring CVE. There are 21 such resources.',
      starter: 'SELECT',
      referenceSql:
        'SELECT resource_id, cve_id, cvss_score FROM (SELECT resource_id, cve_id, cvss_score, ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY cvss_score DESC) AS rn FROM vulnerabilities) WHERE rn = 1;',
      closing:
        '21 rows, one per resource that has a CVE at all. Compare that with ORDER BY cvss_score DESC LIMIT 21, which returns the 21 worst CVEs in the estate and would list the same resource several times while leaving others out entirely.',
      fallback: {
        task: 'Same problem, as blocks. The highest scoring CVE for each resource.',
        blocks: [
          { id: 'f1', label: 'ask for the columns the answer needs', code: 'SELECT resource_id, cve_id, cvss_score' },
          { id: 'f2', label: 'open the subquery that does the numbering', code: 'FROM (' },
          {
            id: 'f3',
            label: 'number the CVEs inside each resource',
            code: '  SELECT resource_id, cve_id, cvss_score,\n         ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY cvss_score DESC) AS rn',
          },
          { id: 'f4', label: 'name the table', code: '  FROM vulnerabilities' },
          { id: 'f5', label: 'close the subquery and keep the first of each', code: ') WHERE rn = 1;' },
        ],
        solution: ['f1', 'f2', 'f3', 'f4', 'f5'],
        closing: 'Number inside, filter outside. Now write it out.',
      },
    },

    trap: {
      misconceptionId: 'sql-limit-per-group',
      setup:
        'This is meant to answer the same question as the worked example: for each account, the three resources with the most open findings.',
      code:
        "SELECT r.account_id, r.name, COUNT(*) AS open_count\nFROM resources r\nJOIN findings f ON f.resource_id = r.resource_id\nWHERE f.status = 'open'\nGROUP BY r.resource_id\nORDER BY open_count DESC\nLIMIT 3;",
      question: 'What does it return?',
      options: [
        { text: 'Three rows for each account, ordered by count within each one.', correct: false },
        { text: 'Three rows in total, taken from the whole result regardless of account.', correct: true },
        { text: 'An error, because LIMIT cannot be used with GROUP BY.', correct: false },
        { text: 'One row per account, showing its highest count.', correct: false },
      ],
      silently:
        'Three rows come back, each with an account, a resource and a plausible count, and the shape is exactly what the report expected. On this data they are payments-exports with seven, and two resources in acc-105 with two each, so the result names two accounts and quietly omits the other three that have open findings entirely. Nobody checks a result that has the right columns and a sensible looking top row.',
      explanation:
        'LIMIT is the last thing a query does and it knows nothing about groups: it cuts the finished result. GROUP BY collapsed the rows into one per resource, ORDER BY sorted all of them together, and LIMIT took three off the top of that single ordered list. Per group means the numbering has to happen inside the group, which is what PARTITION BY does, and the filter then reads that number in an outer query because WHERE runs long before the window function has produced it.',
    },

    handoff: {
      canNow: [
        'Number rows inside a group with ROW_NUMBER and PARTITION BY',
        'Filter on that number from an outer query, and say why it cannot go in WHERE',
        'Explain why LIMIT cannot express top N per group',
      ],
      note: 'Q1.19 is this lesson exactly, and Q1.17 is the same shape with an extra aggregate. This is stretch material: everything the exam needs is in lessons 1 to 14, and this is the technique that turns a hard question into a short one.',
    },
  },
}

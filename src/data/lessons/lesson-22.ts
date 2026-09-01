import type { Lesson } from '../../types/lesson.ts'

export const lesson: Lesson = {
  id: 'L22',
  number: 22,
  topicId: 'python',
  sectionId: 1,
  title: 'SQL injection and parameterized queries',
  objective:
    'You will be able to spot a query built by string concatenation, rewrite it with placeholders, and say why escaping is not the fix.',
  minutes: 14,
  difficulty: 'medium',
  sources: ['F7', 'Q4.9', 'C#Section 4: Linux, Web Security, Containers'],

  steps: {
    vocabulary: [
      {
        term: 'SQL injection',
        definition: 'When text supplied by a user ends up being read as part of the query instead of as a value inside it.',
      },
      {
        term: 'concatenation',
        definition: 'Joining strings with a plus sign. It is how the query and the value end up in one piece of text.',
      },
      {
        term: 'parameterized query',
        definition: 'A query with placeholders, sent to the database separately from its values, so a value can never become code.',
      },
      {
        term: 'placeholder',
        definition: 'The marker in the query text where a value will go. In sqlite3 it is a question mark, and the values come as a tuple.',
      },
      {
        term: 'escaping',
        definition: 'Rewriting dangerous characters in a value so they lose their meaning. It patches one symbol at a time and is not a boundary.',
      },
    ],

    model: {
      narrative: [
        'A database receives two things: a query, and the values that go in it. The only question that matters is whether they arrive as one piece of text or as two separate things.',
        '',
        'Concatenation makes them one. Once the username is inside the query string, nothing can tell which characters came from you and which came from the user, because there is nothing left to tell them apart with. A quote in the value ends the string early and everything after it is read as more query.',
        '',
        'A parameterized query keeps them apart all the way down. The query text goes to the database with a question mark where the value belongs; the value travels beside it, and the database puts it in place after the query has already been parsed. A value that arrives after parsing cannot change the parse.',
        '',
        'That is the whole idea, and it is also why escaping is the wrong fix: escaping tries to make a dangerous value safe inside one shared channel, and being right about that forever means being right about every quote style, every encoding and every numeric context. The parameterized query does not need to be right about any of it, because there is no shared channel.',
      ].join('\n'),
      diagram: {
        kind: 'flow',
        caption:
          'The concatenated version, step by step, with the real result: three rows out of a table the caller was only supposed to see one row of.',
        nodes: [
          { label: 'username = admin\' OR \'1\'=\'1', note: 'Ordinary text in a form field. Nothing is wrong yet.' },
          {
            label: '"... WHERE username = \'" + username + "\'"',
            note: 'The value is now part of the query text. This is the hop where it stops being data.',
            danger: true,
          },
          {
            label: "SELECT * FROM users WHERE username = 'admin' OR '1'='1'",
            note: 'A valid query with two conditions, one of which is always true.',
          },
          { label: '3 rows returned', note: 'Every user in the table, from a lookup for one username.' },
        ],
      },
      takeaway: 'One channel and the value can become code. Two channels and it cannot, whatever it contains.',
    },

    worked: {
      task: 'Take the vulnerable lookup from Q4.9 and rewrite it as a parameterized query.',
      steps: [
        {
          label: 'read the vulnerable version and name the flaw',
          code: 'def get_user(conn, username):\n    q = "SELECT * FROM users WHERE username = \'" + username + "\'"\n    return conn.execute(q).fetchall()',
          why: 'The plus signs are the whole bug. By the time execute is called there is one string, and the database has no way to know that part of it arrived from a form.',
          prompt: {
            question: 'The quotes around the placeholder look like they contain the value. Why do they not?',
            answer:
              'Because they are just characters in the same string. A value containing a quote closes the first one early, and everything after that is parsed as query. The quotes mark a string to the parser, not a container the value is trapped in.',
          },
        },
        {
          label: 'write the query with a placeholder instead',
          code: 'q = "SELECT * FROM users WHERE username = ?"',
          why: 'No quotes around the question mark, on purpose. The placeholder is not a piece of text being substituted; it is a slot the driver fills after parsing.',
          prompt: {
            question: 'Why is there no quote around the question mark?',
            answer:
              'Because quoting is the database problem now, not yours. It knows the value is a string and handles it. Writing quotes around a placeholder is a common instinct and it breaks the query.',
          },
        },
        {
          label: 'pass the values beside the query, not inside it',
          code: 'return conn.execute(q, (username,)).fetchall()',
          why: 'A tuple, and the comma is not optional: (username) is just brackets around a name, while (username,) is a tuple of one. Missing that comma is the most common error in this line.',
        },
        {
          label: 'check what the attack does now',
          code: "get_user(conn, \"admin' OR '1'='1\")",
          why: 'It returns nothing at all, because there is no user whose name is literally that text. The attack string became an ordinary value, which is exactly what should happen to it.',
          prompt: {
            question: 'The same input returned 3 rows before and 0 rows now. What actually changed?',
            answer:
              'Not the input, and not the filtering. What changed is when the value arrives: after parsing rather than before it. The parse is already finished and cannot be influenced, so the text is compared as a name and matches nothing.',
          },
        },
      ],
      trace: {
        caption: 'Watch the query text grow. Line 3 is where a value becomes code, and nothing after that can undo it.',
        language: 'python',
        code: [
          'username = "admin\' OR \'1\'=\'1"',
          'prefix = "SELECT * FROM users WHERE username = \'"',
          'q = prefix + username + "\'"',
          'print(q)',
          'rows = conn.execute(q).fetchall()',
          'print(len(rows))',
        ],
        predict: {
          question: 'The users table holds three rows. Before you step through it: how many does this print?',
          options: [
            { text: '3', correct: true },
            { text: '1', correct: false },
            { text: '0', correct: false },
            { text: 'It raises an sqlite3 error, because the quotes are unbalanced.', correct: false },
          ],
        },
        frames: [
          {
            line: 1,
            vars: { username: 'admin\' OR \'1\'=\'1' },
            note: 'A string like any other. It contains quotes, which is legal in text.',
          },
          {
            line: 2,
            vars: { prefix: "SELECT * FROM users WHERE username = '" },
            note: 'The query so far, ending in an opening quote that is waiting to be closed.',
          },
          {
            line: 3,
            vars: { q: "SELECT * FROM users WHERE username = 'admin' OR '1'='1'" },
            note: 'The value closed that quote itself, then added a condition. The line that was meant to add a value added a clause.',
          },
          {
            line: 4,
            vars: {},
            output: "SELECT * FROM users WHERE username = 'admin' OR '1'='1'",
            note: 'Read it as the database will: username equals admin, OR one equals one.',
          },
          {
            line: 5,
            vars: { rows: '[admin, bar, dana]' },
            note: 'The second condition is true for every row, so the first one stops mattering.',
          },
          {
            line: 6,
            vars: { rows: '3 rows' },
            output: '3',
            note: 'A lookup for one username returned the whole table, and nothing errored.',
          },
        ],
        conclusion:
          'Nothing here was a bug in the database. The query it received was valid and it answered it correctly. The mistake happened on line 3, in Python, before the database was involved at all, and no amount of care inside the database can undo a query that already means the wrong thing.',
      },
      result:
        'The parameterized version returns zero rows for the same input, and one row for a real username. Same function, same call, and the attack string is now just a name that does not exist.',
    },

    fadeLight: {
      task: 'Rewrite this lookup safely: findings for one resource id.',
      steps: [
        {
          label: 'write the query with a placeholder',
          code: 'q = "SELECT * FROM findings WHERE resource_id = ?"',
          why: 'One placeholder, no quotes around it.',
        },
        {
          label: 'pass the value beside the query',
          code: 'return conn.execute(q, (resource_id,)).fetchall()',
          why: 'A tuple of one, so the comma has to be there. Without it Python passes a string, and the driver reports a mismatch in the number of parameters.',
          accept: ['return conn.execute(q, [resource_id]).fetchall()'],
        },
      ],
      blanks: 1,
      closing: 'Two lines, and there is no arrangement of characters the caller can send that changes what the query does.',
    },

    fadeHeavy: {
      task: 'Two values this time: findings for one resource id above a severity score.',
      steps: [
        {
          label: 'name the work and its holes',
          code: 'def findings_for(conn, resource_id, min_score):',
          why: 'Both values arrive as parameters. Neither is ever put into the query text.',
        },
        {
          label: 'write the query with one placeholder per value',
          code: 'q = "SELECT * FROM findings WHERE resource_id = ? AND score > ?"',
          why: 'Two question marks, in the order the values will be passed. Position is the only link between them.',
        },
        {
          label: 'pass both values in a tuple, in that order',
          code: 'return conn.execute(q, (resource_id, min_score)).fetchall()',
          why: 'Two items, so no trailing comma is needed here. Swap them and the database compares an id to a number without complaining about it.',
          accept: ['return conn.execute(q, [resource_id, min_score]).fetchall()'],
        },
      ],
      blanks: 2,
      closing:
        'Note the second placeholder: a number, and still a placeholder. The trap on this lesson is built on exactly the numeric field that people leave concatenated because it has no quotes to break out of.',
    },

    parsons: {
      task: 'Order the blocks into a safe lookup function for one username.',
      language: 'python',
      blocks: [
        { id: 'p1', label: 'name the work and its holes', code: 'def get_user(conn, username):' },
        { id: 'p2', label: 'write the query with a placeholder', code: 'q = "SELECT * FROM users WHERE username = ?"', indent: 1 },
        { id: 'p3', label: 'pass the value beside it', code: 'return conn.execute(q, (username,)).fetchall()', indent: 1 },
        {
          id: 'd1',
          label: 'write the query with a placeholder',
          code: 'q = "SELECT * FROM users WHERE username = \'?\'"',
          indent: 1,
          distractor: true,
        },
        {
          id: 'd2',
          label: 'pass the value beside it',
          code: 'return conn.execute(q % username).fetchall()',
          indent: 1,
          distractor: true,
        },
      ],
      solution: ['p1', 'p2', 'p3'],
      closing:
        'One block you left out puts quotes around the placeholder, which turns it into the literal text of a question mark and matches nothing. The other uses string formatting, which is concatenation wearing a different hat: the value is in the query text before the database ever sees it.',
    },

    produce: {
      kind: 'python',
      task: 'Fill in the blanks to make this lookup safe. It returns the findings for one resource above a minimum score.',
      template:
        'def findings_for(conn, resource_id, min_score):\n    q = "SELECT * FROM findings WHERE resource_id = [[1]] AND score > [[2]]"\n    return conn.execute(q, [[3]]).fetchall()',
      blanks: [
        {
          answer: '?',
          hint: 'The marker sqlite3 uses where a value belongs. One character, and it takes no quotes around it.',
        },
        {
          answer: '?',
          hint: 'The same marker again. A numeric field needs one just as much as a text field does.',
        },
        {
          answer: '(resource_id, min_score)',
          hint: 'The two values, in the order the markers appear, passed as a tuple beside the query.',
          accept: ['[resource_id, min_score]', '(resource_id, min_score,)'],
        },
      ],
      closing:
        'That is Q4.9 from the bank, and its answer key says the thing worth remembering: a parameterized query is not escaping. The database receives the query and the values through two separate channels, so a value cannot become code.',
      fallback: {
        task: 'Same problem, as blocks. A safe lookup taking a resource id and a minimum score.',
        language: 'python',
        blocks: [
          { id: 'f1', label: 'name the work and its holes', code: 'def findings_for(conn, resource_id, min_score):' },
          {
            id: 'f2',
            label: 'one placeholder per value',
            code: 'q = "SELECT * FROM findings WHERE resource_id = ? AND score > ?"',
            indent: 1,
          },
          {
            id: 'f3',
            label: 'the values beside the query, in order',
            code: 'return conn.execute(q, (resource_id, min_score)).fetchall()',
            indent: 1,
          },
        ],
        solution: ['f1', 'f2', 'f3'],
        closing: 'Placeholders in the text, values in the tuple, order matching. Now write it with the blanks filled.',
      },
    },

    trap: {
      misconceptionId: 'py-string-concat-sql',
      setup:
        'This started as plain concatenation, an injection was found in it, and the fix was to escape the quotes in the resource id. The score comes from a query string parameter and is a number, so it was left as it was.',
      code: 'rid = rid.replace("\'", "\'\'")\nq = ("SELECT * FROM findings WHERE resource_id = \'" + rid\n     + "\' AND score > " + score)\nrows = conn.execute(q).fetchall()',
      language: 'python',
      question: 'The resource id is now escaped. What does score = "0 OR 1=1" do?',
      options: [
        { text: 'Nothing. It is not a valid number, so the query raises an error.', correct: false },
        { text: 'It returns every row of findings, because the injected condition needs no quotes at all.', correct: true },
        { text: 'Nothing. The escaping applies to the whole query string, including the score.', correct: false },
        { text: 'It returns no rows, because score is compared as text rather than as a number.', correct: false },
      ],
      silently:
        'The query runs, returns rows, and looks like a successful search. The escaping on the id keeps working perfectly and keeps drawing attention away from the real hole, because the code visibly contains a fix. Anyone reviewing this sees an author who knows about injection, which is exactly the wrong signal: the numeric field is concatenated straight into the query with nothing around it, so it needs no quote to break out of anything.',
      explanation:
        'The query broke on a quote, so the fix was aimed at the quote. That is the misconception: injection is treated as a problem about a character rather than about a boundary. Escaping is a per context patch, and there are more contexts than anyone can hold in their head, starting with the one here where no quotes exist. A parameterized query has no context to get wrong: every value goes down the second channel and arrives after the parse. The rule is the one in fact 7 of the deck: never concatenate, and escaping is not a fix.',
    },

    handoff: {
      canNow: [
        'Spot a query built with plus signs or string formatting and say what it lets a caller do',
        'Rewrite it with placeholders and a tuple of values',
        'Explain why escaping is not the fix, including for fields with no quotes around them',
      ],
      note: 'Q4.9 in the bank is this lesson exactly, and fact 7 is the sentence to be able to say out loud. The next lesson is the same shape one layer down, at the shell.',
    },
  },
}

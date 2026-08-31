/**
 * The documented misconceptions, transcribed from section 5 of the learn module
 * brief. Every step 8 trap must name one of these, and the verifier fails the
 * build if a trap names something that is not here.
 *
 * This is a reference list, not authored content. Nothing here is invented: the
 * SQL entries come from the think aloud research on novice SQL errors, the
 * Python and security entries from this learner's own diagnostic mistakes.
 */

import type { TopicId } from '../types/lesson.ts'

/** The four documented categories novice SQL errors fall into, plus omission. */
export type MisconceptionCategory =
  | 'carryover'
  | 'over-generalisation'
  | 'language-based'
  | 'wrong-mental-model'
  | 'omission'

export type Misconception = {
  id: string
  /** Short name, shown to the learner as a weak spot. */
  name: string
  /** What the learner believes, in their words. */
  belief: string
  category: MisconceptionCategory
  topics: TopicId[]
  /**
   * 'trap' is a row from one of the three "specific traps to build" tables.
   * 'category' is one of the four documented categories, used only where no
   * specific trap covers the ground a lesson stands on.
   */
  kind: 'trap' | 'category'
}

export const MISCONCEPTIONS: Misconception[] = [
  // ------------------------------------------------------------------- SQL
  {
    id: 'sql-language-based',
    name: 'English words mean what they mean in English',
    belief: 'SQL borrowed these words from English, so they behave the way the English word does.',
    category: 'language-based',
    topics: ['sql'],
    kind: 'category',
  },
  {
    id: 'sql-wrong-mental-model',
    name: 'The query describes how to fetch the rows',
    belief: 'The database does what the query says, in the order the query says it, one row at a time.',
    category: 'wrong-mental-model',
    topics: ['sql'],
    kind: 'category',
  },
  {
    id: 'sql-not-equal-drops-null',
    name: 'Not equal keeps everything else',
    belief: 'is_public != TRUE returns every row that is not TRUE, so the unknown rows are in there.',
    category: 'wrong-mental-model',
    topics: ['sql'],
    kind: 'trap',
  },
  {
    id: 'sql-quotes-on-boolean',
    name: 'Quotes are decoration',
    belief: 'Comparing to the quoted text false and comparing to FALSE are the same thing.',
    category: 'language-based',
    topics: ['sql'],
    kind: 'trap',
  },
  {
    id: 'sql-is-not-as-not-equals',
    name: 'IS NOT is a general not equals',
    belief: 'IS NOT NULL works, so IS NOT low must work the same way.',
    category: 'over-generalisation',
    topics: ['sql'],
    kind: 'trap',
  },
  {
    id: 'sql-not-in-with-null',
    name: 'NOT IN ignores a NULL in the list',
    belief: 'A NULL inside the subquery is just one more value that will not match.',
    category: 'wrong-mental-model',
    topics: ['sql'],
    kind: 'trap',
  },
  {
    id: 'sql-where-after-group-by',
    name: 'Clauses run in the order they are written',
    belief: 'WHERE can go after GROUP BY or after HAVING, because the query is read top to bottom.',
    category: 'wrong-mental-model',
    topics: ['sql'],
    kind: 'trap',
  },
  {
    id: 'sql-where-instead-of-having',
    name: 'WHERE can filter a group',
    belief: 'WHERE filters rows, so it can filter on a count the same way HAVING does.',
    category: 'wrong-mental-model',
    topics: ['sql'],
    kind: 'trap',
  },
  {
    id: 'sql-inner-join-for-absence',
    name: 'INNER JOIN can find what is missing',
    belief: 'Join the two tables and look for nothing on the right, and you find the rows with no match.',
    category: 'omission',
    topics: ['sql'],
    kind: 'trap',
  },
  {
    id: 'sql-right-condition-in-where',
    name: 'A condition is a condition, wherever it goes',
    belief: 'A test on the right hand table reads the same in WHERE as it does in ON.',
    category: 'wrong-mental-model',
    topics: ['sql'],
    kind: 'trap',
  },
  {
    id: 'sql-count-star-after-join',
    name: 'COUNT(*) counts the things you joined',
    belief: 'After a one to many join, COUNT(*) still counts resources.',
    category: 'omission',
    topics: ['sql'],
    kind: 'trap',
  },
  {
    id: 'sql-sum-fan-out',
    name: 'SUM across two joins is still one total',
    belief: 'Chaining a second join adds columns, not extra copies of the rows.',
    category: 'wrong-mental-model',
    topics: ['sql'],
    kind: 'trap',
  },
  {
    id: 'sql-missing-order-by',
    name: 'Top N without an order',
    belief: 'LIMIT 5 gives the top five, because the rows arrive in a sensible order.',
    category: 'omission',
    topics: ['sql'],
    kind: 'trap',
  },
  {
    id: 'sql-grouping-column-omitted',
    name: 'Any column can sit next to an aggregate',
    belief: 'A column in SELECT does not have to appear in GROUP BY.',
    category: 'omission',
    topics: ['sql'],
    kind: 'trap',
  },

  // ---------------------------------------------------------------- Python
  {
    id: 'py-bracket-access-missing-key',
    name: 'Bracket access on data you did not write',
    belief: 'The key is in the dict, because it was in the example.',
    category: 'wrong-mental-model',
    topics: ['python'],
    kind: 'trap',
  },
  {
    id: 'py-equals-true',
    name: 'Comparing to True is how you test a boolean',
    belief: 'Writing == True is the explicit, careful way to check a flag.',
    category: 'carryover',
    topics: ['python'],
    kind: 'trap',
  },
  {
    id: 'py-truthiness',
    name: 'Truthy is the same as true',
    belief: 'If the value is truthy then the check passed, so the text true and the number 1 are fine.',
    category: 'over-generalisation',
    topics: ['python'],
    kind: 'trap',
  },
  {
    id: 'py-loop-instead-of-comprehension',
    name: 'A loop and a comprehension are interchangeable',
    belief: 'The task said comprehension, but a loop does the same thing.',
    category: 'carryover',
    topics: ['python'],
    kind: 'trap',
  },
  {
    id: 'py-redefining-parent-attributes',
    name: 'Setting the attributes again is the same as super()',
    belief: 'The parent sets those attributes, so the child can simply set them too.',
    category: 'wrong-mental-model',
    topics: ['python'],
    kind: 'trap',
  },
  {
    id: 'py-signature-change-on-override',
    name: 'An override can take different arguments',
    belief: 'It is my method now, so it can take what I want.',
    category: 'wrong-mental-model',
    topics: ['python'],
    kind: 'trap',
  },
  {
    id: 'py-string-concat-sql',
    name: 'More quotes fix the injection',
    belief: 'The query broke on a quote, so the fix is to escape it or add more quotes.',
    category: 'wrong-mental-model',
    topics: ['python'],
    kind: 'trap',
  },
  {
    id: 'py-shell-true-concat',
    name: 'shell=True is just how you run a command',
    belief: 'Building the command as one string is the normal way to call out to the shell.',
    category: 'carryover',
    topics: ['python'],
    kind: 'trap',
  },

  // -------------------------------------------------------------- security
  {
    id: 'sec-injection-vs-xss',
    name: 'Prompt injection is XSS',
    belief: 'Direct and indirect prompt injection map onto reflected and stored XSS.',
    category: 'carryover',
    topics: ['ai-security'],
    kind: 'trap',
  },
  {
    id: 'sec-sanitisation-solves-injection',
    name: 'Sanitising the input solves prompt injection',
    belief: 'Strip the dangerous words and the model is safe.',
    category: 'wrong-mental-model',
    topics: ['ai-security'],
    kind: 'trap',
  },
  {
    id: 'sec-filter-after-retrieval',
    name: 'Filter the retrieved documents afterwards',
    belief: 'Retrieve everything, then drop what this user may not see.',
    category: 'wrong-mental-model',
    topics: ['ai-security'],
    kind: 'trap',
  },
  {
    id: 'sec-private-subnet-blocks-egress',
    name: 'A private subnet blocks outbound traffic',
    belief: 'Private means nothing gets out.',
    category: 'wrong-mental-model',
    topics: ['cloud'],
    kind: 'trap',
  },
  {
    id: 'sec-public-ip-makes-subnet-public',
    name: 'A public IP is what makes a subnet public',
    belief: 'Give the instance a public address and the subnet is public.',
    category: 'wrong-mental-model',
    topics: ['cloud'],
    kind: 'trap',
  },
  {
    id: 'sec-mfa-stops-golden-saml',
    name: 'MFA protects against Golden SAML',
    belief: 'The attacker still has to pass the second factor.',
    category: 'wrong-mental-model',
    topics: ['identity'],
    kind: 'trap',
  },
  {
    id: 'sec-allow-overrides-scp-deny',
    name: 'An explicit Allow beats an SCP Deny',
    belief: 'The most specific policy wins, so a targeted Allow overrides the guardrail.',
    category: 'wrong-mental-model',
    topics: ['cloud'],
    kind: 'trap',
  },
  {
    id: 'sec-container-is-a-vm',
    name: 'A container is a security boundary like a VM',
    belief: 'Two containers are isolated from each other the way two VMs are.',
    category: 'wrong-mental-model',
    topics: ['linux-web-containers'],
    kind: 'trap',
  },
]

/**
 * The twelve rows of the SQL "specific traps to build" table. Every SQL lesson
 * from the third onward ends on one of these, each used exactly once, which the
 * verifier enforces.
 */
export const DOCUMENTED_SQL_TRAPS: string[] = MISCONCEPTIONS.filter(
  (entry) => entry.kind === 'trap' && entry.topics.includes('sql'),
).map((entry) => entry.id)

const byId = new Map(MISCONCEPTIONS.map((entry) => [entry.id, entry]))

export function getMisconception(id: string): Misconception | undefined {
  return byId.get(id)
}

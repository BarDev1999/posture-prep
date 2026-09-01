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
   * 'derived' is read off a fact or a question in files A to D. The brief lists
   * eight security traps and the security sections run to thirty five lessons,
   * so the rest had to come from somewhere: they come from the source files,
   * one named source each, and the verifier resolves every one of them.
   */
  kind: 'trap' | 'category' | 'derived'
  /** Required on a derived entry. A fact id, a question id or an A to D heading. */
  source?: string
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
  // ------------------------------------- derived from files A to D, Python
  {
    id: 'py-class-attribute-shared',
    name: 'A value in the class body belongs to the object',
    belief: 'Setting it once at the top of the class is the same as setting it in __init__.',
    category: 'wrong-mental-model',
    topics: ['python'],
    kind: 'derived',
    source: 'Q1.23',
  },

  // -------------------------------- derived from files A to D, AI security
  {
    id: 'ai-system-prompt-is-secret',
    name: 'The system prompt is a private place',
    belief: 'The user never sees the system prompt, so a key or a rule is safe inside it.',
    category: 'wrong-mental-model',
    topics: ['ai-security'],
    kind: 'derived',
    source: 'F11',
  },
  {
    id: 'ai-read-only-tool-is-safe',
    name: 'A tool that only reads cannot hurt you',
    belief: 'Give the agent read access and the worst case is that it reads something.',
    category: 'over-generalisation',
    topics: ['ai-security'],
    kind: 'derived',
    source: 'Q2.8',
  },
  {
    id: 'ai-one-service-identity',
    name: 'One service identity for the agent is fine',
    belief: 'The user is authenticated at the front door, so the agent can use one strong identity behind it.',
    category: 'carryover',
    topics: ['ai-security'],
    kind: 'derived',
    source: 'F15',
  },
  {
    id: 'ai-retrieved-text-is-trusted',
    name: 'Retrieved text is trusted text',
    belief: 'It came out of our own vector store, so it is our content.',
    category: 'wrong-mental-model',
    topics: ['ai-security'],
    kind: 'derived',
    source: 'F16',
  },
  {
    id: 'ai-poisoning-is-training-only',
    name: 'Poisoning is a training time problem',
    belief: 'We did not train the model, so poisoning is not our risk.',
    category: 'over-generalisation',
    topics: ['ai-security'],
    kind: 'derived',
    source: 'F18',
  },
  {
    id: 'ai-model-file-is-data',
    name: 'A model file is data, not code',
    belief: 'Downloading weights is like downloading a picture: nothing runs.',
    category: 'wrong-mental-model',
    topics: ['ai-security'],
    kind: 'derived',
    source: 'F19',
  },
  {
    id: 'ai-output-is-trusted',
    name: 'Our own model output is trusted input',
    belief: 'We wrote the prompt, so what comes back is ours and can go straight into the next system.',
    category: 'wrong-mental-model',
    topics: ['ai-security'],
    kind: 'derived',
    source: 'F20',
  },
  {
    id: 'ai-frameworks-compete',
    name: 'The frameworks are competing standards',
    belief: 'OWASP, ATLAS and NIST cover the same ground, so pick the one your company uses.',
    category: 'carryover',
    topics: ['ai-security'],
    kind: 'derived',
    source: 'F22',
  },

  // ------------------------------------- derived from files A to D, cloud
  {
    id: 'cloud-encryption-covers-exposure',
    name: 'Encrypted means not exposed',
    belief: 'The bucket is encrypted at rest, so a public policy on it is a paperwork problem.',
    category: 'wrong-mental-model',
    topics: ['cloud'],
    kind: 'derived',
    source: 'F35',
  },
  {
    id: 'cloud-sg-can-deny',
    name: 'A security group can block something',
    belief: 'Add a deny rule to the security group and that traffic stops.',
    category: 'carryover',
    topics: ['cloud'],
    kind: 'derived',
    source: 'F27',
  },
  {
    id: 'cloud-boundary-grants-access',
    name: 'A permission boundary grants permissions',
    belief: 'Attach a boundary allowing s3:* and the identity can use S3.',
    category: 'wrong-mental-model',
    topics: ['cloud'],
    kind: 'derived',
    source: 'F32',
  },
  {
    id: 'cloud-external-id-optional',
    name: 'The external id is optional hardening',
    belief: 'The trust policy already names the vendor account, so an external id adds nothing.',
    category: 'wrong-mental-model',
    topics: ['cloud'],
    kind: 'derived',
    source: 'F33',
  },
  {
    id: 'cloud-imds-needs-public-ip',
    name: 'No public IP, no metadata theft',
    belief: 'The instance is not reachable from the internet, so nobody can reach its metadata service.',
    category: 'wrong-mental-model',
    topics: ['cloud'],
    kind: 'derived',
    source: 'F29',
  },
  {
    id: 'cloud-passrole-is-harmless',
    name: 'PassRole only names a role',
    belief: 'It does not hand me the permissions of that role, so it is a low risk one to grant.',
    category: 'wrong-mental-model',
    topics: ['cloud'],
    kind: 'derived',
    source: 'F30',
  },
  {
    id: 'cloud-severity-is-cvss',
    name: 'The CVSS score is the priority',
    belief: 'Sort by severity, work down the list, and the most important thing is at the top.',
    category: 'carryover',
    topics: ['cloud'],
    kind: 'derived',
    source: 'F35',
  },

  // ----------------------- derived from files A to D, Linux, web, containers
  {
    id: 'linux-setuid-is-just-a-permission',
    name: 'setuid is one more permission bit',
    belief: '4755 is 755 with something extra switched on, and it changes who may run the file.',
    category: 'wrong-mental-model',
    topics: ['linux-web-containers'],
    kind: 'derived',
    source: 'F36',
  },
  {
    id: 'linux-persistence-is-only-cron',
    name: 'Persistence means cron',
    belief: 'Check the crontab and you have checked whether the attacker can come back.',
    category: 'over-generalisation',
    topics: ['linux-web-containers'],
    kind: 'derived',
    source: 'F38',
  },
  {
    id: 'web-fail-open-is-safer',
    name: 'Failing open keeps the site up',
    belief: 'If the authorization service is down, letting the request through is the safe default.',
    category: 'carryover',
    topics: ['linux-web-containers'],
    kind: 'derived',
    source: 'F47',
  },
  {
    id: 'web-escaping-is-the-fix',
    name: 'Injection is a quoting problem',
    belief: 'The input broke out of the string, so escaping the dangerous characters closes it.',
    category: 'wrong-mental-model',
    topics: ['linux-web-containers'],
    kind: 'derived',
    source: 'F7',
  },
  {
    id: 'web-idor-found-by-scanners',
    name: 'The scanner would have found it',
    belief: 'We run an automated scan every night, so access control bugs would show up.',
    category: 'carryover',
    topics: ['linux-web-containers'],
    kind: 'derived',
    source: 'F44',
  },
  {
    id: 'web-waf-sees-all-xss',
    name: 'The WAF sees every request, so it sees every XSS',
    belief: 'Anything the attacker sends passes the WAF on the way in, so the WAF can block it.',
    category: 'wrong-mental-model',
    topics: ['linux-web-containers'],
    kind: 'derived',
    source: 'F46',
  },
  {
    id: 'container-privileged-is-just-convenience',
    name: 'privileged true turns on a few extra features',
    belief: 'It is a convenience flag for containers that need to do slightly more than usual.',
    category: 'wrong-mental-model',
    topics: ['linux-web-containers'],
    kind: 'derived',
    source: 'F40',
  },
  {
    id: 'k8s-token-not-reachable',
    name: 'The service account is a cluster thing',
    belief: 'RBAC is configured outside the pod, so code inside the pod cannot use it.',
    category: 'wrong-mental-model',
    topics: ['linux-web-containers'],
    kind: 'derived',
    source: 'F50',
  },

  // ------------------------------------ derived from files A to D, identity
  {
    id: 'identity-authn-implies-authz',
    name: 'Logged in means allowed',
    belief: 'The user proved who they are, so the request is legitimate.',
    category: 'wrong-mental-model',
    topics: ['identity'],
    kind: 'derived',
    source: 'Q4.8',
  },
  {
    id: 'identity-federation-shares-passwords',
    name: 'Federation hands the password over',
    belief: 'The service provider gets the credentials from the identity provider and checks them.',
    category: 'wrong-mental-model',
    topics: ['identity'],
    kind: 'derived',
    source: 'F51',
  },
  {
    id: 'identity-browser-is-trusted-channel',
    name: 'The assertion goes straight from the IdP to the SP',
    belief: 'It is a server to server exchange, so nothing in between can hold it.',
    category: 'wrong-mental-model',
    topics: ['identity'],
    kind: 'derived',
    source: 'Q5.2',
  },
  {
    id: 'identity-signature-is-enough',
    name: 'A valid signature is a valid assertion',
    belief: 'The signature checks out against the IdP certificate, so the assertion can be accepted.',
    category: 'omission',
    topics: ['identity'],
    kind: 'derived',
    source: 'F52',
  },
  {
    id: 'identity-oauth-is-authentication',
    name: 'OAuth logs the user in',
    belief: 'The user came back from the OAuth flow with a token, so they are authenticated.',
    category: 'carryover',
    topics: ['identity'],
    kind: 'derived',
    source: 'F54',
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

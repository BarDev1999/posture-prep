import type { TopicId } from '../types/lesson.ts'

/**
 * The curriculum graph. Order matters and a lesson does not unlock until its
 * prerequisites are complete, so the whole sequence lives here rather than
 * being implied by the order of the lesson files.
 *
 * All 58 lessons are listed from the start, including the ones not yet written.
 * That is deliberate: the topic map has to show the learner the shape of the
 * road, and a lesson with no file yet reads as "not written" rather than
 * silently missing.
 *
 * Prerequisites stay inside a topic. There are real conceptual links across
 * topics (command injection and SQL injection are the same shape) but making
 * them prerequisites would lock the Linux block behind the Python block, which
 * costs the learner more than the ordering gains.
 */

export type Topic = {
  id: TopicId
  title: string
  /** Exam section, 1 to 5. SQL and Python are both section 1. */
  sectionId: number
  /** One line on the topic screen explaining the practice schedule. */
  scheduleNote: string
}

export const TOPICS: Topic[] = [
  {
    id: 'sql',
    title: 'SQL',
    sectionId: 1,
    scheduleNote:
      'Blocked practice while you are inside SQL: same topic, repeated. Once the topic is done its questions mix in with everything else.',
  },
  {
    id: 'python',
    title: 'Python',
    sectionId: 1,
    scheduleNote: 'Read code before you write code. Each lesson predicts, runs, investigates, then modifies.',
  },
  {
    id: 'ai-security',
    title: 'AI Security',
    sectionId: 2,
    scheduleNote: 'Every lesson ends in a detection rule, because that is what the job produces.',
  },
  {
    id: 'cloud',
    title: 'Cloud Security',
    sectionId: 3,
    scheduleNote: 'Every lesson ends in a detection rule, because that is what the job produces.',
  },
  {
    id: 'linux-web-containers',
    title: 'Linux, Web, Containers',
    sectionId: 4,
    scheduleNote: 'Every lesson ends in a detection rule, because that is what the job produces.',
  },
  {
    id: 'identity',
    title: 'Identity',
    sectionId: 5,
    scheduleNote: 'Every lesson ends in a detection rule, because that is what the job produces.',
  },
]

export type CurriculumEntry = {
  id: string
  /**
   * The brief's own numbering, 1 to 58. The stretch lesson has no number of its
   * own and carries the number of the lesson it follows, so that "author
   * lessons 15 through 23" keeps meaning the Python block.
   */
  number: number
  topicId: TopicId
  title: string
  /** Lesson ids that must be complete first. */
  prerequisites: string[]
  /** Extra material, unlocked after its prerequisites and shown without a number. */
  stretch?: boolean
  /**
   * What this lesson's step 9 hands the learner into. It lives here rather than
   * on the lesson itself because the practice and drill screens need it without
   * pulling a whole topic's lesson content into the first chunk.
   */
  practice: { questionIds: string[]; factIds: string[] }
}

/** `L` plus the lesson number. Kept short because it appears in URLs. */
function id(n: number): string {
  return `L${n}`
}

const STRETCH_ID = 'L14X'

type Row = [number, TopicId, string, number[]] | [number, TopicId, string, number[], 'stretch']

/**
 * The sequence exactly as the brief lists it. The fourth column is the
 * prerequisite numbers: mostly the lesson before, with the genuine multi parent
 * links written out where a lesson really does need two earlier ideas.
 */
const ROWS: Row[] = [
  // --------------------------------------------------------- SQL, 14 lessons
  [1, 'sql', 'Tables, queries, and describing what you want', []],
  [2, 'sql', 'SELECT and FROM', [1]],
  [3, 'sql', 'WHERE, and the four value types', [2]],
  [4, 'sql', 'NULL as unknown, and three valued logic', [3]],
  [5, 'sql', 'ORDER BY and LIMIT', [3]],
  [6, 'sql', 'The execution order model', [4, 5]],
  [7, 'sql', 'Why data is split across tables, and foreign keys', [6]],
  [8, 'sql', 'INNER JOIN', [7]],
  [9, 'sql', 'LEFT JOIN, and ON versus WHERE', [8]],
  [10, 'sql', 'The anti join: finding what is absent', [9]],
  [11, 'sql', 'GROUP BY: collapsing many rows into one', [6]],
  [12, 'sql', 'Aggregate functions, and the three COUNTs', [11]],
  [13, 'sql', 'HAVING versus WHERE', [11, 12]],
  [14, 'sql', 'Fan out and duplicate inflation across chained JOINs', [10, 12]],
  [14, 'sql', 'Window functions and ROW_NUMBER for top N per group', [13, 14], 'stretch'],

  // ------------------------------------------------------ Python, 9 lessons
  [15, 'python', 'Lists and dicts, and .get() versus bracket access', []],
  [16, 'python', 'Filtering with a loop, then as a comprehension', [15]],
  [17, 'python', 'Comprehensions with several conditions, and dict comprehensions', [16]],
  [18, 'python', 'Functions and return values', [17]],
  [19, 'python', 'Classes and objects', [18]],
  [20, 'python', 'Inheritance and super()', [19]],
  [21, 'python', 'Method overriding and NotImplementedError', [20]],
  [22, 'python', 'SQL injection and parameterized queries', [18]],
  [23, 'python', 'Command injection, shell=False, and input validation', [22]],

  // ------------------------------------------------ AI Security, 11 lessons
  [24, 'ai-security', 'What an LLM application is made of', []],
  [25, 'ai-security', 'Why instructions and data are the same text', [24]],
  [26, 'ai-security', 'Prompt injection, direct and indirect, against XSS', [25]],
  [27, 'ai-security', 'Tools, and what agency means', [26]],
  [28, 'ai-security', 'Excessive Agency and least agency', [27]],
  [29, 'ai-security', 'What RAG is and how retrieval works', [25]],
  [30, 'ai-security', 'RAG risks: poisoning, leakage, authorize before retrieval', [29]],
  [31, 'ai-security', 'Memory, persistence, and the three kinds of poisoning', [30]],
  [32, 'ai-security', 'Supply chain, serialization, and why pickle executes code', [24]],
  [33, 'ai-security', 'Output handling: model output is untrusted input', [26]],
  [34, 'ai-security', 'OWASP, MITRE ATLAS, NIST AI RMF, and what each is for', [28, 31, 33]],

  // ---------------------------------------------- Cloud Security, 9 lessons
  [35, 'cloud', 'What a cloud account is: control plane versus data plane', []],
  [36, 'cloud', 'VPC, subnets, and route tables', [35]],
  [37, 'cloud', 'Security groups and NACLs, stateful versus stateless', [36]],
  [38, 'cloud', 'IAM: principals, policies, actions, resources, conditions', [35]],
  [39, 'cloud', 'Policy evaluation order, and the layers that can deny', [38]],
  [40, 'cloud', 'Roles, assume role, and temporary credentials', [39]],
  [41, 'cloud', 'IMDS, and why SSRF reaches it', [40, 36]],
  [42, 'cloud', 'Privilege escalation paths: PassRole and policy self modification', [40]],
  [43, 'cloud', 'Posture: CSPM, CIEM, attack paths, toxic combinations', [42, 37]],

  // -------------------------------------- Linux, Web, Containers, 9 lessons
  [44, 'linux-web-containers', 'Linux filesystem, users, and permission bits', []],
  [45, 'linux-web-containers', 'Processes, listening ports, and persistence locations', [44]],
  [46, 'linux-web-containers', 'HTTP: requests, responses, and sessions', []],
  [47, 'linux-web-containers', 'The injection family: SQL, command, and one shape', [46]],
  [48, 'linux-web-containers', 'Broken access control, IDOR, and SSRF', [46]],
  [49, 'linux-web-containers', 'XSS, three kinds', [47]],
  [50, 'linux-web-containers', 'What a container actually is', [45]],
  [51, 'linux-web-containers', 'Container escape, privileged mode, and host mounts', [50]],
  [52, 'linux-web-containers', 'Kubernetes, service accounts, and RBAC', [51]],

  // -------------------------------------------------- Identity, 6 lessons
  [53, 'identity', 'Authentication versus authorization', []],
  [54, 'identity', 'Why federation exists, and what an IdP and an SP are', [53]],
  [55, 'identity', 'The SAML flow, step by step', [54]],
  [56, 'identity', 'What the SP must validate, and what breaks if it does not', [55]],
  [57, 'identity', 'OAuth 2.0 and OIDC, and how they differ from SAML', [55]],
  [58, 'identity', 'Golden SAML, and ITDR versus CIEM', [56]],
]

/**
 * The tagged questions and facts each written lesson hands off to. A lesson with
 * an empty set says so on its completion screen rather than sending the learner
 * somewhere unhelpful: the question bank does not have an item at every level.
 */
const PRACTICE: Record<string, { questionIds: string[]; factIds: string[] }> = {
  L1: { questionIds: [], factIds: [] },
  L2: { questionIds: [], factIds: [] },
  L3: { questionIds: [], factIds: ['F3'] },
  L4: { questionIds: ['Q1.3', 'Q1.4', 'Q1.6'], factIds: ['F3'] },
  L5: { questionIds: ['Q1.2'], factIds: [] },
  L6: { questionIds: ['Q1.15', 'Q1.16'], factIds: ['F1', 'F2'] },
  L7: { questionIds: ['Q1.5'], factIds: [] },
  L8: { questionIds: ['Q1.7'], factIds: [] },
  L9: { questionIds: ['Q1.9', 'Q1.12'], factIds: ['F6'] },
  L10: { questionIds: ['Q1.5', 'Q1.8'], factIds: ['F5'] },
  L11: { questionIds: [], factIds: ['F1'] },
  L12: { questionIds: ['Q1.13', 'Q1.18'], factIds: ['F4'] },
  L13: { questionIds: ['Q1.16'], factIds: ['F2'] },
  L14: { questionIds: ['Q1.10', 'Q1.11'], factIds: [] },
}

const NO_PRACTICE = { questionIds: [], factIds: [] }

export const CURRICULUM: CurriculumEntry[] = ROWS.map(([number, topicId, title, prerequisites, stretch]) => {
  const entryId = stretch ? STRETCH_ID : id(number)
  return {
    id: entryId,
    number,
    topicId,
    title,
    prerequisites: prerequisites.map(id),
    practice: PRACTICE[entryId] ?? NO_PRACTICE,
    ...(stretch ? { stretch: true } : {}),
  }
})

const entriesById = new Map(CURRICULUM.map((entry) => [entry.id, entry]))
const topicsById = new Map(TOPICS.map((topic) => [topic.id, topic]))

export function curriculumEntry(lessonId: string): CurriculumEntry | undefined {
  return entriesById.get(lessonId)
}

export function getTopic(topicId: TopicId): Topic | undefined {
  return topicsById.get(topicId)
}

export function lessonsInTopic(topicId: TopicId): CurriculumEntry[] {
  return CURRICULUM.filter((entry) => entry.topicId === topicId)
}

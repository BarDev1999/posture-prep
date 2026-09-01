import type { Lesson, TopicId } from '../../types/lesson.ts'

/**
 * Lessons are split one chunk per topic and fetched when a lesson is opened.
 *
 * Fourteen SQL lessons are roughly a hundred kilobytes of prose, worked
 * examples and Parsons blocks, and all fifty eight would be several times that.
 * None of it is needed to paint the topic map, so none of it belongs in the
 * chunk that has to start the app on a phone.
 *
 * What stays in the first chunk is this list of ids. It is what the topic map
 * needs in order to tell a lesson that is locked from one that is simply not
 * written yet, and the verifier checks it against the real bundles.
 */

const WRITTEN: Record<TopicId, string[]> = {
  sql: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L13', 'L14'],
  python: [],
  'ai-security': [],
  cloud: [],
  'linux-web-containers': [],
  identity: [],
}

const LOADERS: Partial<Record<TopicId, () => Promise<{ lessons: Lesson[] }>>> = {
  sql: () => import('./sql.ts'),
  python: () => import('./python.ts'),
  'ai-security': () => import('./ai-security.ts'),
  cloud: () => import('./cloud.ts'),
  'linux-web-containers': () => import('./linux-web-containers.ts'),
  identity: () => import('./identity.ts'),
}

const topicOf = new Map<string, TopicId>()
for (const [topicId, ids] of Object.entries(WRITTEN) as [TopicId, string[]][]) {
  for (const id of ids) topicOf.set(id, topicId)
}

export function hasLesson(lessonId: string): boolean {
  return topicOf.has(lessonId)
}

export function writtenCount(topicId: TopicId): number {
  return WRITTEN[topicId].length
}

export function isWritten(lessonId: string): boolean {
  return topicOf.has(lessonId)
}

// One in flight request per topic, and the result kept, so reopening a lesson
// in a topic already visited is instant and offline safe.
const loaded = new Map<TopicId, Promise<Map<string, Lesson>>>()

function loadTopic(topicId: TopicId): Promise<Map<string, Lesson>> {
  const existing = loaded.get(topicId)
  if (existing) return existing
  const loader = LOADERS[topicId]
  const promise = loader
    ? loader().then((module) => new Map(module.lessons.map((lesson) => [lesson.id, lesson])))
    : Promise.resolve(new Map<string, Lesson>())
  loaded.set(topicId, promise)
  return promise
}

export async function loadLesson(lessonId: string): Promise<Lesson | undefined> {
  const topicId = topicOf.get(lessonId)
  if (!topicId) return undefined
  const lessons = await loadTopic(topicId)
  return lessons.get(lessonId)
}

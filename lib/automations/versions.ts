export type AutomationRecord<T> = { draft: T; published: T | null; publishedRevision: number }
export function saveDraft<T>(record: AutomationRecord<T>, draft: T): AutomationRecord<T> { return { ...record, draft: structuredClone(draft) } }
export function publish<T>(record: AutomationRecord<T>): AutomationRecord<T> {
  return { draft: structuredClone(record.draft), published: structuredClone(record.draft), publishedRevision: record.publishedRevision + 1 }
}

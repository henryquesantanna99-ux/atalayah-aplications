export const SCHEDULE_FUNCTION_CATEGORIES = ['band', 'vocal', 'sound', 'other'] as const

export type ScheduleFunctionCategory = typeof SCHEDULE_FUNCTION_CATEGORIES[number]

export interface ScheduleFunctionOption {
  id: string
  display_name: string
  category: ScheduleFunctionCategory
  is_active?: boolean
}

/** Band and vocal assignments participate in rotation; sound is intentionally excluded. */
export function participatesInRotation(category: ScheduleFunctionCategory | null | undefined) {
  return category === 'band' || category === 'vocal'
}

export function isVocalFunction(category: ScheduleFunctionCategory | null | undefined) {
  return category === 'vocal'
}

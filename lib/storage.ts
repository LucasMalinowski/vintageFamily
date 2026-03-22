export const LOCAL_STORAGE_KEYS = {
  sidebarCollapsed: 'sidebar-collapsed',
  familyName: 'family-name',
} as const

export function getSidebarCollapsedStorageKey(userId?: string | null) {
  if (!userId) return LOCAL_STORAGE_KEYS.sidebarCollapsed

  return `${LOCAL_STORAGE_KEYS.sidebarCollapsed}:${userId}`
}

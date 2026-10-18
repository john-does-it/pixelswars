// Retired maps stay playable through old links and saves, but are no longer
// offered in the chooser or progression catalogue. Never reuse their IDs.
export const retiredMapIds = ['2', '4', '10', '11', '12', '17', '29'] as const

const retired = new Set<string>(retiredMapIds)
export const isMapInCatalog = (id: string | number): boolean => !retired.has(String(id))

export type MediaOrderRow = {
  id: string;
  property_id: string;
  sort_order: number;
  deleted_at: string | null;
};

export function moveMediaId(ids: readonly string[], id: string, direction: -1 | 1) {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function placeMediaId(ids: readonly string[], draggedId: string, targetId: string) {
  const from = ids.indexOf(draggedId);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return [...ids];
  const next = [...ids];
  const [dragged] = next.splice(from, 1);
  next.splice(to, 0, dragged);
  return next;
}

export function validateMediaOrder(orderedIds: unknown, rows: readonly MediaOrderRow[], propertyId: string) {
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string" || !id)) return null;
  if (new Set(orderedIds).size !== orderedIds.length) return null;
  const activeRows = rows.filter((row) => row.property_id === propertyId && !row.deleted_at);
  if (orderedIds.length !== activeRows.length) return null;
  const activeIds = new Set(activeRows.map((row) => row.id));
  if (orderedIds.some((id) => !activeIds.has(id))) return null;
  return orderedIds.map((id, index) => ({ id, sort_order: (index + 1) * 100 }));
}

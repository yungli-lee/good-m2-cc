export function toggleReminder(openIds: ReadonlySet<string>, reminderId: string) {
  const next = new Set(openIds);
  if (next.has(reminderId)) next.delete(reminderId);
  else next.add(reminderId);
  return next;
}

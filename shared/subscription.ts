export function canDictateOffline(offlineCountToday: number): boolean {
  return offlineCountToday < 2;
}

export function getOfflineKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `offline_dictations_${yyyy}-${mm}-${dd}`;
}

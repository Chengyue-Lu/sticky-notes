/** 文件说明：FutureTasksPanel 的时间格式化与输入转换工具。 */
function padTimePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatCountdown(dueAt: string, nowTimestamp: number): string {
  const deltaMs = new Date(dueAt).getTime() - nowTimestamp;

  if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
    return 'Due now';
  }

  const totalSeconds = Math.floor(deltaMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m ${seconds}s`;
}

export function toDateTimeInputValue(value: string): string {
  const parsedTimestamp = new Date(value).getTime();
  const date = Number.isFinite(parsedTimestamp)
    ? new Date(parsedTimestamp)
    : new Date(Date.now() + 60 * 60 * 1000);

  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(
    date.getDate(),
  )}T${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
}

export function formatAbsoluteDueAt(value: string): string {
  const parsedTimestamp = new Date(value).getTime();

  if (!Number.isFinite(parsedTimestamp)) {
    return 'Invalid due time';
  }

  return new Date(parsedTimestamp).toLocaleString();
}


function padTimePart(value: number): string {
  return String(value).padStart(2, '0');
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatDatePart(date: Date): string {
  const year = date.getFullYear();
  const month = padTimePart(date.getMonth() + 1);
  const day = padTimePart(date.getDate());

  return `${year}-${month}-${day}`;
}

function formatTimePart(date: Date): string {
  const hours = padTimePart(date.getHours());
  const minutes = padTimePart(date.getMinutes());

  return `${hours}:${minutes}`;
}

export function formatNoteTimestampForDisplay(
  timestamp: string,
  referenceDate: Date = new Date(),
): string {
  const parsedDate = new Date(timestamp);

  if (!isValidDate(parsedDate)) {
    return timestamp;
  }

  if (isSameDay(parsedDate, referenceDate)) {
    return `Today ${formatTimePart(parsedDate)}`;
  }

  const yesterday = new Date(referenceDate);
  yesterday.setDate(referenceDate.getDate() - 1);

  if (isSameDay(parsedDate, yesterday)) {
    return `Yesterday ${formatTimePart(parsedDate)}`;
  }

  return formatDatePart(parsedDate);
}

export function formatNoteTimestampForAbsoluteLabel(timestamp: string): string {
  const parsedDate = new Date(timestamp);

  if (!isValidDate(parsedDate)) {
    return timestamp;
  }

  return `${formatDatePart(parsedDate)} ${formatTimePart(parsedDate)}`;
}

export function normalizeIntegerAmount(value: string) {
  return value.replace(/\D/g, "");
}

export function formatIntegerAmount(value: string | number | null | undefined) {
  const text = String(value ?? "");
  const numeric = Number(text);
  const decimalValue = /^\d+\.\d{1,2}$/.test(text.trim());
  if (text.trim() && decimalValue && Number.isFinite(numeric)) {
    return Math.round(numeric).toLocaleString("es-PY", { maximumFractionDigits: 0 });
  }
  const digits = normalizeIntegerAmount(text);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatIntegerAmountInput(value: string, selectionStart: number | null) {
  const cursor = selectionStart ?? value.length;
  const digitsBeforeCursor = normalizeIntegerAmount(value.slice(0, cursor)).length;
  const formatted = formatIntegerAmount(value);
  if (digitsBeforeCursor === 0) return { value: formatted, caret: 0 };

  let digitsSeen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index])) digitsSeen += 1;
    if (digitsSeen === digitsBeforeCursor) return { value: formatted, caret: index + 1 };
  }
  return { value: formatted, caret: formatted.length };
}

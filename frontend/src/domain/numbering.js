export function nextDocumentNumber(records = [], prefix, digits = 6) {
  const highest = records.reduce((max, record) => {
    const candidate = record?.invoiceNumber || record?.id || '';
    const match = String(candidate).match(/(\d+)\s*$/);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);

  return `${prefix}-${String(highest + 1).padStart(digits, '0')}`;
}

// utils/emailHelpers.js
function extractProductNames(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const productNames = [];

  // 1. Line-based patterns (short lines only)
  const structuredLines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line =>
      line.length < 100 && ( // avoid matching full single-line emails
        /^\d+\.\s/.test(line) ||
        /Item[s]?\s*[:\-]/i.test(line) ||
        /Product[s]?\s*[:\-]/i.test(line)
      )
    );

  for (const line of structuredLines) {
    const cleaned = line
      .replace(/^\d+\.\s*/, '')
      .replace(/^(Product|Item|Items|Products)\s*[:\-]\s*/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (cleaned.length > 2) productNames.push(cleaned);
  }

  // 2. Inline "order for X, Y and Z"
  const inlineMatch = rawText.match(/order\s+(?:for|of)\s+([\w\s,\.\-&]+?)\s+(?:is|has been)?\s*(?:confirmed|placed|dispatched)/i);
  if (inlineMatch && inlineMatch[1]) {
    const items = inlineMatch[1]
      .split(/,| and /i)
      .map(x => x.trim())
      .filter(x => x.length > 2);
    productNames.push(...items);
  }

  // 3. Inline "Items: X, Y"
  const itemsInline = rawText.match(/items\s*[:\-]\s*(.+?)\s*(\.|Expected|Delivered|$)/i);
  if (itemsInline && itemsInline[1]) {
    const items = itemsInline[1]
      .split(/,| and /i)
      .map(x => x.trim())
      .filter(x => x.length > 2);
    productNames.push(...items);
  }

  // ✅ 4. New: Handle "order of X worth Rs..." (Amazon style)
  const worthMatch = rawText.match(/order\s+(?:for|of)\s+(.+?)\s+worth\s+/i);
  if (worthMatch && worthMatch[1]) {
    const items = worthMatch[1]
      .split(/,| and /i)
      .map(x => x.trim())
      .filter(x => x.length > 2);
    productNames.push(...items);
  }

  return [...new Set(productNames)];
}

module.exports = { extractProductNames };

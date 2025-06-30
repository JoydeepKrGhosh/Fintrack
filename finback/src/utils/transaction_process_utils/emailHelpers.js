function extractProductNames(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const productNames = [];

  // Normalize the text by replacing common variations
  const normalizedText = rawText
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .replace(/[:\-]\s+/g, ': ') // standardize colon formatting
    .replace(/\s+[:\-]/g, ': ');

  // 1. Handle "Items Ordered: X, Y" pattern (Zomato style)
  const itemsOrderedMatch = normalizedText.match(/Items Ordered:\s*(.+?)(?:\.|\s*Payment|$)/i);
  if (itemsOrderedMatch && itemsOrderedMatch[1]) {
    const items = itemsOrderedMatch[1]
      .split(/,| and /i)
      .map(x => x.trim())
      .filter(x => x.length > 2);
    productNames.push(...items);
  }

  // 2. Handle "Items: X, Y" pattern
  const itemsMatch = normalizedText.match(/Items:\s*(.+?)(?:\.|\s*Payment|$)/i);
  if (itemsMatch && itemsMatch[1]) {
    const items = itemsMatch[1]
      .split(/,| and /i)
      .map(x => x.trim())
      .filter(x => x.length > 2);
    productNames.push(...items);
  }

  // 3. Handle "order of X, Y" pattern
  const orderOfMatch = normalizedText.match(/order\s+(?:for|of)\s+(.+?)\s+(?:worth|is|has been|received)/i);
  if (orderOfMatch && orderOfMatch[1]) {
    const items = orderOfMatch[1]
      .split(/,| and /i)
      .map(x => x.trim())
      .filter(x => x.length > 2);
    productNames.push(...items);
  }

  // 4. Line-based patterns (for multi-line emails)
  const lines = normalizedText.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Handle numbered items (1. X, 2. Y)
    if (/^\d+\.\s/.test(trimmedLine)) {
      const item = trimmedLine.replace(/^\d+\.\s*/, '').trim();
      if (item.length > 2) productNames.push(item);
    }
    
    // Handle "Item(s): X" pattern in lines
    const lineItemsMatch = trimmedLine.match(/^Item[s]?:\s*(.+)/i);
    if (lineItemsMatch && lineItemsMatch[1]) {
      const items = lineItemsMatch[1]
        .split(/,| and /i)
        .map(x => x.trim())
        .filter(x => x.length > 2);
      productNames.push(...items);
    }
  }

  return [...new Set(productNames)]; // Remove duplicates
}

module.exports = { extractProductNames };

function splitChunksBySections(fullText, sections) {
  const results = [];

  // Normalize
  const text = fullText.replace(/\s+/g, " ");

  // 🔥 Step 1: Find all section positions FIRST
  const positions = sections.map(section => {
    const title = section.sectionTitle;

    const regex = new RegExp(`\\b${title}\\b`, "i"); // strict match
    const match = text.match(regex);

    return {
      sectionTitle: title,
      index: match ? match.index : -1
    };
  });

  // 🔥 Step 2: Sort valid positions
  const validPositions = positions
    .filter(p => p.index !== -1)
    .sort((a, b) => a.index - b.index);

  // 🔥 Step 3: Fallback if nothing matched
  if (validPositions.length === 0) {
    console.warn("⚠️ No section titles found → fallback equal split");

    const chunkSize = Math.floor(text.length / sections.length);

    return sections.map((section, i) => ({
      sectionTitle: section.sectionTitle,
      text: text.substring(
        i * chunkSize,
        i === sections.length - 1 ? text.length : (i + 1) * chunkSize
      )
    }));
  }

  // 🔥 Step 4: Build chunks using positions
  for (let i = 0; i < validPositions.length; i++) {
    const current = validPositions[i];
    const next = validPositions[i + 1];

    const start = current.index;
    const end = next ? next.index : text.length;

    results.push({
      sectionTitle: current.sectionTitle,
      text: text.substring(start, end).trim()
    });
  }

  return results;
}

module.exports = { splitChunksBySections };
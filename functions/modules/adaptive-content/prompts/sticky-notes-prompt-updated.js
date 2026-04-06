/**
 * UPDATED STICKY NOTES PROMPT - NO A4 CONSTRAINTS
 * 
 * Key Changes:
 * - Removed A4 page size constraints
 * - Removed max-height constraints
 * - Allow page to expand infinitely
 * - Nothing should be cut at bottom
 * - All content must be fully visible
 */

function getStickyNotesPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic',
    sections = [],
    keyPoints = []
  } = params;

  const sectionCount = sections?.length || 0;
  const pointsCount = keyPoints?.length || 0;
  const totalCards = Math.max(sectionCount, pointsCount, 4);
  
  // Dynamic content length based on card count
  let bulletPointsPerCard = 3;
  let wordsPerBullet = 7;
  
  if (totalCards <= 4) {
    bulletPointsPerCard = 5;
    wordsPerBullet = 10;
  } else if (totalCards <= 6) {
    bulletPointsPerCard = 4;
    wordsPerBullet = 8;
  } else if (totalCards <= 8) {
    bulletPointsPerCard = 4;
    wordsPerBullet = 7;
  } else {
    bulletPointsPerCard = 3;
    wordsPerBullet = 6;
  }

  return `Generate sticky notes for: ${topicName} (Section: ${sectionNumber})

CRITICAL 100% CONTENT COVERAGE REQUIREMENT:
- Input contains ${sectionCount} sections and ${pointsCount} key points
- You MUST generate EXACTLY ${totalCards} sticky note cards
- Generate ONE card for EACH section provided
- Generate ONE card for EACH key point provided
- Do NOT skip or ignore any section or key point
- If input has 5 sections + 3 key points = generate 8 cards minimum
- Each card must cover unique content from the input
- No duplicate cards - each must represent different content
- File size increase is acceptable to ensure complete coverage

CARD GENERATION RULES:
- Card 1-${sectionCount}: One card per section (if sections provided)
- Card ${sectionCount + 1}-${totalCards}: One card per key point (if key points provided)
- Each card must be fully visible without truncation
- Remove max-height constraints - use min-height: auto
- Allow cards to expand vertically to fit content
- No text should be cut off or truncated

SPACING REQUIREMENTS:
- MINIMUM 2rem (32px) margin AROUND each card (OUTSIDE the card)
- Use CSS margin property: margin: 2rem on each card
- Cards should wrap naturally with proper spacing
- No cards should overlap or touch
- Maintain consistent spacing on all sides (top, right, bottom, left)
- Card padding should be SEPARATE from margin (e.g., padding: 0.75rem INSIDE card)
- Total space between card edges: 4rem (2rem from each adjacent card)

CSS SPECIFICATION FOR SPACING:
- Card margin: 2rem (around the card - OUTSIDE)
- Card padding: 0.75rem (inside the card - INSIDE)
- Grid gap: Can be 0 since margin handles spacing
- Total space between card edges: 4rem (2rem from each card)

DYNAMIC CONTENT LENGTH BASED ON CARD COUNT:
- Total Cards: ${totalCards}
- Bullet Points Per Card: ${bulletPointsPerCard}
- Words Per Bullet Point: max ${wordsPerBullet} words
- Content grows as card count increases
- Fewer cards = more detailed content per card
- More cards = more concise content per card

CONTENT FORMAT - HINTS AND BULLET POINTS ONLY:
- CRITICAL: DO NOT generate descriptive paragraphs or long explanations
- CRITICAL: DO NOT generate full sentences or complete thoughts
- CRITICAL: Generate ONLY bullet points with hints and key terms
- CRITICAL: Each bullet point MUST be max ${wordsPerBullet} words ONLY
- CRITICAL: Include EXACTLY ${bulletPointsPerCard} bullet points per card - NO MORE, NO LESS
- Format ONLY as: • Hint 1 • Hint 2 • Hint 3 (one per line)
- Use abbreviations and short forms (e.g., "பொ." instead of "பொதுவாக")
- Include memory cues and mnemonics only
- Use symbols and arrows (→, ↔, ↑, ↓) for relationships
- Include key terms in bold or highlighted
- Add quick reference values or formulas if applicable
- NEVER write full sentences or explanations
- NEVER write more than ${wordsPerBullet} words per bullet
- NEVER write paragraphs or multi-line content
- NEVER exceed ${bulletPointsPerCard} bullet points per card

CONTENT REQUIREMENTS:
- Bloom's Taxonomy Level: Remember (Recall & Recognition)
- Focus on recall and recognition - use simple hints, key terms, memory cues
- Content Depth: ${contentDepth}
- Language: ${outputLanguage}
- Visual Style: ${visualStyle}

DESIGN SPECIFICATIONS:
- Use Twemoji for emoji rendering
- Use KaTeX for mathematical expressions ($...$ for inline, \\(...\\) for display)
- Sticky note aesthetic with pastel gradients (8-color palette)
- Handwritten font (Caveat) for content
- Organic rotations (-3deg to +3deg)
- Soft shadows and rounded corners
- Minimum 2rem margin around each card (OUTSIDE the card)
- Card padding: 0.75rem (INSIDE the card)
- Responsive grid layout with auto-fit
- NO page size constraints (A4 or otherwise)
- NO max-height on page or container
- NO overflow: hidden on any element
- Allow page to expand vertically as needed
- Nothing should be cut at bottom
- All content must be fully visible

CSS GRID SPECIFICATION:
- display: grid
- grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))
- gap: 0 (margin on cards handles spacing)
- padding: 1rem on container
- Each card has margin: 2rem (OUTSIDE the card)
- Each card has padding: 0.75rem (INSIDE the card)
- Allow grid to expand vertically as needed
- NO page size constraints (A4 or otherwise)
- NO max-height on page or container
- NO overflow: hidden on any element
- Allow page to expand infinitely as needed
- Nothing should be cut at bottom
- All content must be fully visible

OUTPUT FORMAT:
- Return ONLY raw HTML (no JSON wrapper, no markdown)
- Single continuous line with NO newlines
- Minified HTML completely
- Start with <!DOCTYPE and end with </html>
- NO page size constraints
- NO A4 layout restrictions
- Allow page to expand infinitely
- Nothing should be cut at bottom
- All content must be fully visible

SECTIONS TO INCLUDE (if provided):
${sections.map((s, i) => `- Section ${i + 1}: ${s}`).join('\n')}

KEY POINTS TO INCLUDE (if provided):
${keyPoints.map((p, i) => `- Point ${i + 1}: ${p}`).join('\n')}

EXAMPLE CARD FORMAT (${bulletPointsPerCard} bullet points):
Title: Key Concept
${Array.from({length: bulletPointsPerCard}, (_, i) => `• Hint ${i + 1} - short phrase`).join('\n')}
• Key term: definition

TAMIL SPECIFIC FORMAT EXAMPLES:
❌ WRONG - Full sentences/paragraphs:
"தமிழ் மொழி என்பது தென்னிந்தியாவில் பேசப்படும் ஒரு பழமையான மொழியாகும். இது பல்லாயிரம் ஆண்டுகளுக்கு முன்பு தோன்றியது."

✅ CORRECT - Bullet points only:
• தமிழ் - பழமையான மொழி
• தென்னிந்தியா - பேச்சு பகுதி
• பல்லாயிரம் ஆண்டுகள் - வரலாறு

MANDATORY FORMAT RULES:
- EACH bullet point = ONE concept ONLY
- EACH bullet point = max ${wordsPerBullet} words ONLY
- TOTAL bullet points = EXACTLY ${bulletPointsPerCard} per card
- NO full sentences
- NO explanations
- NO paragraphs
- NO multi-line content
- ONLY short hints and key terms

MANDATORY: 
- Generate exactly ${totalCards} cards covering all sections and key points
- Use ONLY hints and bullet points, NO descriptive content
- Include ${bulletPointsPerCard} bullet points per card
- Maintain minimum 2rem spacing between cards
- Expand content length as card count increases
- NO page size constraints
- NO A4 layout restrictions
- Nothing should be cut at bottom
- All content must be fully visible`;
}

module.exports = {
  getStickyNotesPrompt
};

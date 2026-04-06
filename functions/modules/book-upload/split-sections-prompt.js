/**
 * Split Sections Prompt
 * Extracts sections from book chapters with flattened structure (no nested subsections)
 * All subsection content is merged into parent sections
 */

const getSplitSectionsPrompt = (textContent, chapterName) => {
  return `You are an expert at extracting educational content from textbooks.

TASK: Extract all sections from this chapter and merge subsections into their parent sections.

CHAPTER: ${chapterName}

STRUCTURE RULES:
- Main sections have numbers like: 5.1, 5.2, 5.3, 5.4, etc.
- Subsections have numbers like: 5.1.1, 5.1.2, 5.1.3, 5.2.1, 5.2.2, etc.
- Your job: Combine all subsections (5.1.1, 5.1.2, 5.1.3) into their parent section (5.1)
- Output ONLY main sections (5.1, 5.2, 5.3) with merged content

CONTENT EXTRACTION RULES:
1. For each main section (e.g., 5.1), extract ALL content from:
   - The main section heading and introduction
   - ALL subsections under it (5.1.1, 5.1.2, 5.1.3, etc.)
   - Everything until the next main section (5.2)
2. Combine all this content into ONE section entry
3. Include EVERY WORD of content - nothing should be lost
4. Preserve all text, explanations, examples, definitions, diagrams descriptions
5. ONLY exclude: Dedicated "Exercises" sections, "Practice Problems" sections, "Activities" sections, "Review Questions" sections, "Answer Keys"
6. If content is part of a subsection (5.1.1, 5.1.2), it MUST be included in the parent section (5.1)

SECTION TITLE EXTRACTION:
- Extract the EXACT section title from the text as it appears
- The title is the text that comes immediately after the section number (e.g., "5.1 WHAT ARE LIFE PROCESSES?")
- Remove the section number from the title (e.g., return "WHAT ARE LIFE PROCESSES?" not "5.1 WHAT ARE LIFE PROCESSES?")
- Use the EXACT title from the source text - do NOT create or modify titles
- If title spans multiple lines, combine them into one line

TEXTBOOK CONTENT:
${textContent}

Return ONLY valid JSON (no markdown, no extra text):

{
  "success": true,
  "chapterName": "${chapterName}",
  "sections": [
    {
      "sectionNumber": "5.1",
      "sectionTitle": "EXACT TITLE FROM TEXT - extracted from the source material",
      "content": "ALL content from section 5.1 including all subsections 5.1.1, 5.1.2, 5.1.3 merged together. Every word must be included."
    },
    {
      "sectionNumber": "5.2",
      "sectionTitle": "EXACT TITLE FROM TEXT - extracted from the source material",
      "content": "ALL content from section 5.2 including all subsections 5.2.1, 5.2.2 merged together."
    }
  ]
}

CRITICAL CHECKLIST:
✓ Extract main sections only (5.1, 5.2, 5.3, etc.)
✓ For section 5.1: Include content from 5.1 + 5.1.1 + 5.1.2 + 5.1.3 + ... (all subsections)
✓ For section 5.2: Include content from 5.2 + 5.2.1 + 5.2.2 + ... (all subsections)
✓ NO content loss - every subsection content must be in the parent section
✓ NO separate subsection entries - only main sections in output
✓ Exclude only dedicated exercise/activity/review sections
✓ Section titles MUST be extracted from the actual text, not made up
✓ Return ONLY JSON, nothing else`;
};

module.exports = {
  getSplitSectionsPrompt,
};

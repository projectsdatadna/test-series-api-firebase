/**
 * TN State Board Book Extraction Prompts
 * Specialized prompts for extracting chapters and sections from TN State Board textbooks
 * These books have two-column layout with chapters and sections
 * For Social Science: Books are organized by DIVISIONS (HISTORY, GEOGRAPHY, CIVICS, ECONOMICS)
 * For Science: Books are organized by UNITS (1, 2, 3, etc.)
 */

const getTNStateBoardChapterExtractionPrompt = (bookContent) => {
  return `You are an expert at analyzing TN State Board textbooks. These books have chapters with multiple sections.

IMPORTANT INSTRUCTIONS:
1. The content is in TWO-COLUMN layout - text flows from left column to right column
2. Identify ALL chapters in the provided text
3. For each chapter, identify ALL sections within that chapter
4. For SOCIAL SCIENCE books: Identify the DIVISION (HISTORY, GEOGRAPHY, CIVICS, or ECONOMICS) for each chapter
5. For SCIENCE books: No division needed
6. Return ONLY valid JSON, no other text

BOOK CONTENT:
${bookContent}

Return JSON in this exact format:
{
  "chapters": [
    {
      "chapterNumber": "1",
      "chapterTitle": "Chapter Title",
      "division": "HISTORY",
      "sections": [
        {
          "sectionNumber": "1.1",
          "sectionTitle": "Section Title"
        }
      ]
    }
  ]
}

RULES:
- Extract ALL chapters and sections, do not skip any
- Chapter numbers should be numeric (1, 2, 3, etc.)
- Section numbers should be hierarchical (1.1, 1.2, 2.1, etc.)
- Section titles should be exact as they appear in the text
- For Social Science: division MUST be one of: HISTORY, GEOGRAPHY, CIVICS, ECONOMICS
- For Science: division can be null or omitted
- Return ONLY the JSON object, nothing else`;
};

const getTNStateBoardSectionContentPrompt = (chapterContent, chapterTitle, sectionTitle) => {
  return `Extract the complete content for this specific section from the TN State Board textbook.

CHAPTER: ${chapterTitle}
SECTION: ${sectionTitle}

CONTENT:
${chapterContent}

Extract and return ONLY the content that belongs to this section. Include all text, definitions, examples, and explanations for this section.

Return as JSON:
{
  "sectionTitle": "${sectionTitle}",
  "content": "Complete section content here",
  "hasSubsections": false,
  "subsections": []
}`;
};

const getTNStateBoardSectionExtractionPrompt = (textContent) => {
  return `You are an expert at extracting structured information from TN State Board textbooks.
Your task is to extract all UNITS (chapters) and SECTIONS from the provided textbook.

IMPORTANT RULES FOR TN STATE BOARD BOOKS:
1. TN books are organized as: UNIT → SECTIONS
2. For SOCIAL SCIENCE books: Identify the DIVISION (HISTORY, GEOGRAPHY, CIVICS, or ECONOMICS) for each unit
3. For SCIENCE books: No division needed
4. Extract EVERY unit and section from the book - DO NOT SKIP ANY
5. Preserve exact unit and section numbering from the original text
6. Handle two-column layouts by combining content logically
7. Maintain hierarchical structure (Unit > Sections)
8. Skip table of contents, preface, front matter, and appendices
9. Include only actual content units
10. DO NOT TRUNCATE ANY CONTENT - Include complete text for all sections

Return ONLY valid JSON with no additional text.

TEXTBOOK CONTENT:
${textContent}

Return JSON in this exact format:
{
  "success": true,
  "sections": [
    {
      "sectionNumber": "1.0",
      "sectionTitle": "Unit 1: Measurement",
      "division": null,
      "content": "Complete unit introduction/overview content here...",
      "sectionType": "chapter"
    },
    {
      "sectionNumber": "1.1",
      "sectionTitle": "Introduction to Measurement",
      "division": null,
      "content": "Complete section content here...",
      "sectionType": "section"
    }
  ]
}

CRITICAL EXTRACTION GUIDELINES:
- Unit titles MUST include the unit number AND full descriptive name (e.g., "Unit 1: Measurement", "Unit 2: Force and Pressure")
- Section titles should NOT include the section number prefix (e.g., use "Introduction to Measurement" NOT "1.1 Introduction to Measurement")
- Extract EVERY unit and section - do not skip any
- Unit numbers: Use actual unit numbers from book (1, 2, 3, etc.)
- Section numbers: Use decimal format (1.1, 1.2, 1.3, etc.)
- Content: Include COMPLETE main content of each section - DO NOT TRUNCATE
- Two-column handling: Combine logically
- Skip: Exercises, activities, practice problems, lab procedures
- Include: Learning objectives, key concepts, definitions, explanations
- For Social Science: division MUST be one of: HISTORY, GEOGRAPHY, CIVICS, ECONOMICS (or null if not applicable)
- For Science: division should be null`;
};

module.exports = {
  getTNStateBoardChapterExtractionPrompt,
  getTNStateBoardSectionContentPrompt,
  getTNStateBoardSectionExtractionPrompt,
};

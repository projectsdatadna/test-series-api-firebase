/**
 * TN State Board Book Upload Controller
 * Handles extraction of chapters and sections from TN State Board textbooks
 * Stores data in the existing DB structure
 */

const hierarchyService = require('./service');
const { getTNStateBoardChapterExtractionPrompt } = require('./tn-state-board-prompt');

/**
 * Extract chapter and section names from TN State Board book
 * POST /book-upload/tn-state-board/extract-chapters
 * 
 * Division is passed from UI - no extraction needed
 * Extracts ONLY chapter names and section names (no content)
 */
const extractTNStateBoardChapters = async (req, res) => {
  try {
    const { text, bookTitle, syllabusId, standardId, subjectId, division } = req.body;

    // Validate required fields
    if (!text || !bookTitle || !syllabusId || !standardId || !subjectId) {
      return res.status(400).json({
        success: false,
        error: 'text, bookTitle, syllabusId, standardId, and subjectId are required',
      });
    }

    console.log(`[TN State Board] Extracting chapters from: ${bookTitle}`);
    console.log(`[TN State Board] Input text length: ${text.length} chars`);
    console.log(`[TN State Board] Subject ID: ${subjectId}`);
    if (division) {
      console.log(`[TN State Board] Division: ${division}`);
    }

    const azureEndpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '');
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = 'gpt-4o-mini-testseries-pv';

    if (!azureApiKey || !azureEndpoint) {
      return res.status(500).json({
        success: false,
        error: 'Azure OpenAI credentials not configured',
      });
    }

    const url = `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-08-01-preview`;

    const systemPrompt = `You are an expert at analyzing TN State Board textbooks.
Your task is to extract ONLY the chapter names and section names from the provided textbook.
Do NOT extract any content - only the structure and names.

IMPORTANT RULES:
1. Extract EVERY chapter and section name - DO NOT SKIP ANY
2. Preserve exact chapter and section numbering from the original text
3. Handle two-column layouts by combining logically
4. Maintain hierarchical structure (Chapter > Sections)
5. Skip table of contents, preface, front matter, and appendices
6. Include only actual content chapters

Return ONLY valid JSON with no additional text.`;

    const userPrompt = `Extract all chapter names and section names from this TN State Board textbook.
Extract ONLY the names and structure - NO CONTENT.

TEXTBOOK CONTENT:
${text}

Return JSON in this exact format:
{
  "success": true,
  "chapters": [
    {
      "chapterNumber": "1",
      "chapterTitle": "1 - Ancient India",
      "sections": [
        {
          "sectionNumber": "1.1",
          "sectionTitle": "Indus Valley Civilization"
        },
        {
          "sectionNumber": "1.2",
          "sectionTitle": "Vedic Period"
        }
      ]
    },
    {
      "chapterNumber": "2",
      "chapterTitle": "2 - Medieval India",
      "sections": [
        {
          "sectionNumber": "2.1",
          "sectionTitle": "Delhi Sultanate"
        }
      ]
    }
  ]
}

CRITICAL EXTRACTION GUIDELINES:
- Chapter titles: Include chapter number with title (e.g., "1 - Ancient India", "2 - Medieval India")
- Section titles: Extract exact names WITHOUT section numbers (e.g., use "Indus Valley Civilization" NOT "1.1 Indus Valley Civilization")
- Chapter numbers: Use actual chapter numbers from book (1, 2, 3, etc.)
- Section numbers: Use decimal format (1.1, 1.2, 1.3, etc.)
- Extract EVERY chapter and section - do not skip any
- Return ONLY names and structure - NO CONTENT`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': azureApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 8192,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[TN State Board] Azure API error:', response.status, err.error?.message);
      throw new Error(`Azure API error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message?.content;

    if (!rawContent) {
      console.error('[TN State Board] No content in response');
      return res.json({ success: true, chapters: [] });
    }

    console.log('[TN State Board] Response length:', rawContent.length, 'chars');

    let parsed;
    try {
      // Clean up response - remove markdown code blocks
      const cleaned = rawContent
        .replace(/```json\n?|\n?```/g, '')
        .replace(/```\n?|\n?```/g, '')
        .trim();
      
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('[TN State Board] Parse error:', e.message);
      throw new Error(`JSON parse failed: ${e.message}`);
    }

    if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
      throw new Error('Invalid response format: missing chapters array');
    }

    console.log(`[TN State Board] Extracted ${parsed.chapters.length} chapters`);

    // Add division to all chapters if provided
    let chapters = parsed.chapters;
    if (division) {
      chapters = chapters.map(ch => ({
        ...ch,
        division: division,
      }));
      console.log(`[TN State Board] Added division "${division}" to all chapters`);
    }

    // Log chapter and section counts
    let totalSections = 0;
    chapters.forEach(ch => {
      const sectionCount = ch.sections ? ch.sections.length : 0;
      totalSections += sectionCount;
      console.log(`[TN State Board] Chapter ${ch.chapterNumber}: ${ch.chapterTitle} - ${sectionCount} sections`);
    });

    // Return chapters with division field
    return res.json({
      success: true,
      bookTitle,
      division: division || null,
      totalChapters: chapters.length,
      totalSections: totalSections,
      chapters: chapters,
      message: `Successfully extracted ${chapters.length} chapters with ${totalSections} sections from TN State Board book`,
    });

  } catch (error) {
    console.error('[TN State Board] Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  extractTNStateBoardChapters,
};

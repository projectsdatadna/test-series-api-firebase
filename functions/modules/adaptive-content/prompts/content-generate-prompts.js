
function getStickyNotesPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic'
  } = params;
  

  return `Extract key concepts from the section ${sectionNumber} in the chapter to form the basis of an HTML study guide and Generate a SINGLE A4 PAGE HTML script that visually presents a set of sticky notes for each key concept. Each sticky note must display concise content with clear information and supporting details. The design should be visually appealing and easy to read, with a consistent layout and color scheme. The sticky notes should be organized in a grid layout, with each card having a uniform size and shape. The overall design should be professional and suitable for use in an educational or training setting. notes of the file with ${contentDepth} content depth in ${outputLanguage} language in ${contentType} style with ${visualStyle} nature as a structured, visually elegant, and interactive reference sheet using Tailwind CSS. The layout should serve as a quick-access knowledge companion for students and professionals — focused on clarity, visual memory cues, and ease of scanning. CRITICAL EMOJI RENDERING REQUIREMENT: To ensure emojis render correctly in the generated image, you MUST use Twemoji library: 1. Add this script in the <head> section BEFORE the closing </head> tag: <script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script> 2. Add this CSS in the <style> section to control emoji size: img.emoji { height: 1em; width: 1em; margin: 0 0.05em 0 0.1em; vertical-align: -0.1em; display: inline-block;   } 3. Add this script at the END of <body> section BEFORE the closing </body> tag: <script> window.addEventListener('DOMContentLoaded', (event) => { twemoji.parse(document.body, { folder: 'svg', ext: '.svg' }); }); </script> 4. This will automatically convert all emoji characters (🌿, 📘, 💡, etc.) into properly sized SVG images that render perfectly in screenshots. 5. You can use emojis freely in the HTML - Twemoji will handle the rendering and sizing. CRITICAL A4 SINGLE PAGE REQUIREMENTS: 1. SINGLE PAGE ONLY: The entire content MUST fit within ONE A4 page (210mm × 297mm portrait). DO NOT create multiple pages. DO NOT exceed A4 dimensions. 2. Page Size: Use CSS @page rule with size: A4 portrait (210mm × 297mm). Set body margin to 0. 3. Page Container: Wrap all content in a SINGLE div with class "page" that has exact dimensions: width: 210mm, height: 297mm (NOT min-height), padding: 12mm, box-sizing: border-box, overflow: hidden. 4. Content Limits: Limit the number of sticky notes to fit within the single A4 page. Typically 4-6 sticky notes maximum depending on content length. Keep each note concise. 5. Compact Design: Use smaller fonts, tighter spacing, and compact layouts to ensure everything fits. Reduce padding and margins where necessary. 6. No Overflow: Set overflow: hidden on the page container to prevent content from exceeding A4 boundaries. Design Style: 'Sticky Notes Aesthetic' — handwritten font (Caveat) with pastel gradient backgrounds in 8 distinct color palettes (Yellow #FEF3C7 with border #FCD34D, Pink #FCE7F3 with border #F472B6, Blue #DBEAFE with border #60A5FA, Green #DCFCE7 with border #86EFAC, Purple #E9D5FF with border #D8B4FE, Orange #FFEDD5 with border #FDBA74, Red #FEE2E2 with border #FCA5A5, Cyan #CFFAFE with border #67E8F9), soft left border (4-5px), rounded corners (8px), soft shadows (0 8px 16px rgba), and subtle paper-like texture with organic rotations (-3deg to +3deg). Apply handwritten font (Caveat) for content and body text (Inter) for badges and labels. Consistent padding (1rem) for compact, digestible content. Layout Flow: 1. **Header / Title Section** — Compact title showing the topic name (1.5rem bold, Caveat) centered on paper-like background gradient (#FFFACD → #F5F5DC), with subtitle 'Curated Summary | Powered by DATADNA AI Study Platform' (0.7rem). You may include relevant emoji icons to make it visually appealing. Dashed border bottom (#D4AF37). Minimal padding (0.5rem). 2. **Concept Overview** — OPTIONAL: Only include if space permits. A brief introduction in a neutral sticky note (Yellow background) with handwritten typography. Keep very concise (2-3 sentences max). 3. **Key Concepts Grid** — A responsive 2-column layout of sticky note cards (using 8-color palette cyclically), each representing a main concept. LIMIT TO 4-6 CARDS TOTAL to fit within A4. Each card includes: Category badge (top-left, translucent rgba(0,0,0,0.15)), Title in bold handwritten text (0.9rem, Caveat), subtle divider line (rgba(0,0,0,0.2)), and content in handwritten font (0.85rem, Caveat). Add subtle rotation effect (-2deg to +2deg) for organic placement. Max-height: 180px, compact padding (0.75rem). 4. **Footer / Attribution** — Footer text "© 2025 DATADNA AI Study Platform" (0.6rem, Inter) on paper-like background (#F9FAFB) with center alignment, minimal padding (0.5rem). Typography: Use handwritten font (Caveat) for all content and headings (1.5rem for h1, 0.9rem for card titles, 0.85rem for body). Use Inter font exclusively for badge labels and metadata. Maintain compact padding (0.5-0.75rem) and minimal whitespace for A4 fit. All text on colored backgrounds rendered in dark ink. Animations: Subtle fade-in for sections, no hover effects, organic rotations (-2deg to +2deg) applied at render time for natural sticky note placement. Color rotation: Distribute pastel colors cyclically across cards using the 8-color palette. Page background: Paper-like gradient (#FFFACD → #F5F5DC → #FFF8DC). IMPORTANT: Skip optional sections (Formulae, Mind Map, Quick Reference Table, Smart Insights, Knowledge Check) to ensure content fits within single A4 page. Focus only on the most essential key concepts. Output Format: <!DOCTYPE html>...complete HTML script here.... Strictly adhere to the output format given. Additional Notes: The page must look structured, calm, and intuitive for study purposes — readable in both light and dark modes. Avoid clutter, ensure responsive alignment, and use color cues for grouping concepts. CRITICAL REQUIREMENT: The HTML must be returned as a SINGLE CONTINUOUS LINE with absolutely NO newline characters (\\n), NO line breaks, NO tabs, and NO formatting whitespace. Minify the HTML completely by removing all spaces between tags. The entire HTML must be one unbroken line from <!DOCTYPE to </html>. Do NOT format or pretty-print the HTML. Do NOT wrap the HTML in JSON. Do NOT add quotes around the HTML. Return ONLY the raw HTML code starting with <!DOCTYPE and ending with </html>, nothing else - no JSON wrapper, no markdown, no explanations.`
}

function getReadyReckonerPrompt(params) {
  const {
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    topicName = '',
    visualStyle = 'academic',
    sectionNumber = '',
  } = params;

  
  return `
  Generate a ready reckoner for: ${topicName} with ${contentDepth} depth in ${outputLanguage} language

GENERATE EXACTLY THESE SECTIONS ONLY:
1. HEADER - Title: "Ready Reckoner: ${sectionNumber}" and subtitle: "Curated Summary | Powered by DATADNA AI Study Platform" with relevant emoji icon
2. CONCEPT OVERVIEW - A concise introduction paragraph summarizing the study topic with key definitions and its importance (max 400 characters)
3. KEY CONCEPTS GRID - A responsive grid (2-3 columns) of cards, each representing a main concept. Each card includes: Title with emoji, short explanation, and optional formula or key value (5-6 cards total)
4. FOOTER - "© 2025 DATADNA AI Study Platform — Ready Reckoner Generated by AI"

DO NOT GENERATE:
- Ready Reckoner section
- Core Concept section
- Key Points section
- Formulae / Frameworks Section (separate)
- Mind Map or Flow Summary
- Quick Reference Table
- Smart Insights / AI Notes
- Knowledge Check Section
- Story Framework section
- Story Flow section
- Key Vocabulary section
- Any additional sections beyond the 4 listed above

DESIGN STYLE: Academic Neumorphism with gradients, rounded corners, shadows, and modern fonts (Inter, Manrope, Lexend). Use subtle gradients and pastel colors (#F9FAFB, #EEF2FF, #6366F1, #14B8A6, #F59E0B). Include CSS styling for professional appearance.

EMOJIS AND IMAGES:
- Use relevant emojis (📘, 🧠, 📚, 💡, ✨, 🎯, 📊, 🔍, etc.) to make content visually appealing
- Include emoji icons in headers and concept cards
- Use actual emoji characters (not HTML entities) for better rendering
- If images are available in context, include them in concept cards
- Add Twemoji script for proper emoji rendering: <script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script>
- Add Twemoji CSS: img.emoji{height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block;}
- Add Twemoji initialization script before </body>: <script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script>

OUTPUT STRUCTURE - KEEP ALL CSS AND STYLING:
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter','Manrope','Lexend',sans-serif;background:linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%);min-height:100vh;padding:20px;color:#1F2937}header{background:linear-gradient(135deg,#6366F1 0%,#14B8A6 100%);border-radius:20px;padding:40px;text-align:center;margin-bottom:30px;box-shadow:0 8px 32px rgba(99,102,241,0.15)}.header-icon{font-size:48px;margin-bottom:10px}.header-title{color:white;font-size:2.5em;font-weight:700;margin-bottom:8px}.header-subtitle{color:rgba(255,255,255,0.9);font-size:0.95em;font-weight:300}.container{max-width:1200px;margin:0 auto}.section{margin-bottom:40px}.section-title{font-size:1.8em;font-weight:600;color:#1F2937;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #6366F1}.overview-box{background:white;border-radius:16px;padding:25px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border-left:6px solid #14B8A6;line-height:1.7;color:#374151}.overview-box strong{color:#6366F1}.concepts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-bottom:30px}.concept-card{background:white;border-radius:16px;padding:25px;box-shadow:0 4px 16px rgba(0,0,0,0.08);transition:all 0.3s ease;border-top:5px solid #F59E0B;cursor:pointer}.concept-card:hover{transform:translateY(-5px);box-shadow:0 12px 32px rgba(99,102,241,0.2)}.concept-card h3{color:#6366F1;font-size:1.2em;margin-bottom:10px}.concept-card p{color:#6B7280;font-size:0.95em;line-height:1.6}.concept-card img{max-width:100%;height:auto;border-radius:8px;margin-bottom:10px}img.emoji{height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block}footer{background:white;border-radius:16px;padding:25px;text-align:center;color:#6B7280;font-size:0.9em;box-shadow:0 4px 16px rgba(0,0,0,0.08);margin-top:40px}@media(max-width:768px){.header-title{font-size:1.8em}.concepts-grid{grid-template-columns:1fr}}</style></head><body><header><div class="header-icon">EMOJI ICON HERE</div><div class="header-title">Ready Reckoner: ${sectionNumber}</div><div class="header-subtitle">Curated Summary | Powered by DATADNA AI Study Platform</div></header><div class="container"><section class="section"><h2 class="section-title">Concept Overview</h2><div class="overview-box">CONCEPT OVERVIEW TEXT HERE - MAX 400 CHARS</div></section><section class="section"><h2 class="section-title">Key Concepts</h2><div class="concepts-grid">CONCEPT CARDS HERE - 5-6 CARDS WITH TITLES, DESCRIPTIONS, AND OPTIONAL IMAGES</div></section></div><footer>© 2025 DATADNA AI Study Platform — Ready Reckoner Generated by AI</footer><script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script></body></html>

CONSTRAINTS:
- SECTIONS ONLY: Header, Concept Overview, Key Concepts Grid, Footer
- NO Ready Reckoner section
- NO Core Concept section
- NO Key Points section
- HEADER: Include relevant emoji icon (📘, 🧠, 📚, or subject-specific emoji)
- Concept Overview: Single paragraph, max 400 characters
- Key Concepts: 5-6 concept cards with emoji titles, descriptions, and optional images
- Use emojis throughout for visual appeal
- Include Twemoji script for proper emoji rendering
- Keep ALL CSS styling and design
- Keep gradient backgrounds, shadows, rounded corners
- Keep responsive grid layout
- Minified HTML (one continuous line)

RETURN ONLY THE HTML. NOTHING ELSE.`;
}

function getFlashCardsPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic'
  } = params;

  return `Generate exactly 6 flash cards in JSON format for: ${topicName} with ${contentDepth} depth in ${outputLanguage} language.

RETURN ONLY VALID JSON - NO MARKDOWN, NO EXPLANATIONS, NO PREAMBLE.

JSON STRUCTURE REQUIRED:
{
  "success": true,
  "flashCards": {
    "flashCards": [
      {
        "id": 1,
        "frontSide": {
          "question": "Question text here"
        },
        "backSide": {
          "answer": "Answer text here",
          "example": "Optional example",
          "keyPoint": "Optional key point"
        }
      }
    ],
    "uiConfig": {
      "colors": ["#4F46E5", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#8B5CF6"]
    }
  }
}

REQUIREMENTS:
- Generate EXACTLY 6 flash cards
- Each card MUST have: id (1-6), frontSide.question, backSide.answer
- Each card SHOULD include: backSide.example and backSide.keyPoint (optional but recommended)
- Questions should be clear and concise
- Answers should be comprehensive but concise
- Examples should illustrate the concept
- Key points should highlight the most important aspect
- Colors array must have exactly 6 hex color codes for UI styling
- Return ONLY the JSON object, nothing else
- Ensure all JSON is valid and properly formatted
- No markdown code blocks, no explanations, no additional text`;
}

/**
 * Generate mind maps prompt with dynamic values
 * @param {object} params - { sectionNumber, topicName, contentDepth, contentType, outputLanguage, visualStyle }
 * @returns {string} - The formatted prompt
 */
function getMindMapsPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic'
  } = params;

  return `Generate a mind map with header, footer, and concept structure in JSON format.

Topic: ${topicName}
Depth: ${contentDepth}
Language: ${outputLanguage}

RETURN ONLY VALID JSON - NO MARKDOWN, NO CODE BLOCKS, NO EXPLANATIONS, NO PREAMBLE.

JSON STRUCTURE REQUIRED:
{
  "success": true,
  "header": {
    "emoji": "📚",
    "title": "Mind Map: ${sectionNumber}",
    "subtitle": "Curated Summary | Powered by DATADNA AI Study Platform"
  },
  "mindMap": {
    "mainTopic": "Main Topic",
    "concepts": [
      {
        "title": "Concept 1",
        "subconcepts": ["Subconcept 1", "Subconcept 2", "Subconcept 3"]
      }
    ]
  },
  "footer": {
    "text": "© 2025 DATADNA AI Study Platform — Mind Map Generated by AI"
  },
  "styling": {
    "colors": {
      "header": "#1f2937",
      "headerBg": "#f9fafb",
      "centerCircle": "#4f46e5",
      "cardColors": ["#eef2ff", "#ecfdf5", "#fdf2f8", "#fffbeb", "#f0fdfa", "#faf5ff"]
    },
    "fonts": {
      "headerTitle": "28pt bold",
      "conceptTitle": "11pt bold",
      "subconcept": "10pt"
    },
    "spacing": {
      "headerPadding": "15mm",
      "cardPadding": "8mm",
      "footerPadding": "10mm"
    }
  }
}

REQUIREMENTS:
- Generate EXACTLY 4-6 main concepts
- Each concept MUST have 2-3 subconcepts (as simple strings)
- Use relevant subject-specific emoji for header (📘, 🧠, 📚, 💡, ✨, 🎯, 📊, 🔍, etc.)
- Keep all text concise and scannable
- Ensure valid JSON formatting
- Return ONLY the JSON object, nothing else
- No markdown code blocks, no explanations, no additional text`;
}

function getVisualExplainersPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic'
  } = params;

  return `Generate a Visual Explainers A4 HTML page for: ${topicName} with ${contentDepth} depth in ${outputLanguage} language.

GENERATE EXACTLY THESE 6 SECTIONS IN ORDER:
1. HEADER - Title: "Visual Explainers: ${sectionNumber}" | subtitle: "Curated Summary | Powered by DATADNA AI Study Platform" | large subject emoji
2. CORE CONCEPT BOX - emoji on left + max 200 chars bold text, indigo left-border accent
3. TOPIC SUMMARY STRIP - emoji tag + topic name + key idea
4. VISUAL EXPLAINER CARDS GRID - exactly 4 cards in 2-column grid, each with SVG icon + ASCII diagram
5. COMPARISON TABLE - table with emoji headers, 3-4 attribute rows, alternating row colors
6. FOOTER - "© 2025 DATADNA AI Study Platform — Visual Explainers Generated by AI" pinned to bottom

ICONS AND IMAGES — MANDATORY:
- Include Twemoji in <head>: <script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script>
- Add before </body>: <script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script>
- CSS: img.emoji{height:1.2em;width:1.2em;margin:0 0.05em 0 0.1em;vertical-align:-0.15em;display:inline-block}
- Every card title MUST start with a relevant emoji (🔢 🌿 ⚗️ 🧬 🌍 📐 ⚡ 🔬)
- Core concept box must have an emoji on the left
- Topic strip must have an emoji tag

CARD RULES — VISUAL IS THE HERO:
- .card-title: emoji + title (13px bold, subject accent color)
- .visual-zone: min-height:90px, contains inline SVG icon (36x36) ABOVE ASCII diagram:
  * GRID (■ ■ ■ rows) → maths, patterns
  * FLOW (A → B → C) → science, processes
  * CHAIN (X → Y ↓ Z) → cause-effect
  * TREE (Root ├─ A └─ B) → classification
  * STACK (L3 / L2 / L1) → layers, geography
  * TIMELINE (E1 ──► E2 ──► E3) → history
- .explanation: max 1 sentence, 11px
- .insight: 💡 bold key insight, 11px, accent color

SVG ICONS (inline, use stroke=VAR_ACCENT):
- Maths/grid: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="VAR_ACCENT" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
- Flow/process: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="VAR_ACCENT" stroke-width="2"><circle cx="5" cy="12" r="3"/><circle cx="19" cy="12" r="3"/><line x1="8" y1="12" x2="16" y2="12"/><polyline points="13,9 16,12 13,15"/></svg>
- Tree/classify: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="VAR_ACCENT" stroke-width="2"><line x1="12" y1="3" x2="12" y2="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="15" x2="6" y2="20"/><line x1="12" y1="15" x2="18" y2="20"/></svg>
- Stack/layers: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="VAR_ACCENT" stroke-width="2"><polygon points="12,2 22,8.5 12,15 2,8.5"/><polyline points="2,15 12,21.5 22,15"/><polyline points="2,11.5 12,18 22,11.5"/></svg>
- Timeline/clock: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="VAR_ACCENT" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
- Biology/leaf: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="VAR_ACCENT" stroke-width="2"><path d="M12 22V12M12 12C12 7 17 3 22 3c0 5-3 9-10 9M12 12C12 7 7 3 2 3c0 5 3 9 10 9"/></svg>

SUBJECT COLOR (auto-detect, replace VAR_ACCENT everywhere in CSS and SVGs):
- Biology/Nature → #16a34a | Physics/Chemistry → #2563eb | Maths → #7c3aed | History/Social → #ea580c | Default → #6366f1

OUTPUT STRUCTURE — USE THIS EXACT HTML SKELETON:
<!DOCTYPE html><html><head><meta charset="UTF-8"><script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script><style>@page{size:A4 portrait;margin:0}body{margin:0;font-family:'Inter',system-ui,sans-serif;background:#f8fafc}img.emoji{height:1.2em;width:1.2em;margin:0 0.05em 0 0.1em;vertical-align:-0.15em;display:inline-block}.page{width:210mm;height:297mm;padding:14mm;box-sizing:border-box;overflow:hidden;background:#fff;display:flex;flex-direction:column}header{background:linear-gradient(135deg,#6366F1 0%,#14B8A6 100%);border-radius:12px;padding:11px 20px;text-align:center;margin-bottom:10px}.header-icon{font-size:32px;display:block;margin-bottom:4px}.header-title{color:#fff;font-size:18px;font-weight:700;margin:3px 0}.header-subtitle{color:rgba(255,255,255,0.88);font-size:10px}.core-concept{border-left:4px solid VAR_ACCENT;background:#f5f3ff;border-radius:0 8px 8px 0;padding:9px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px}.core-concept p{font-size:12px;color:#1f2937;margin:0;line-height:1.55;font-weight:500}.topic-strip{background:#f0fdf4;border-radius:8px;padding:7px 14px;margin-bottom:10px;display:flex;gap:12px;align-items:center;border-left:3px solid VAR_ACCENT}.topic-strip h2{font-size:12px;color:VAR_ACCENT;margin:0;font-weight:700}.topic-strip p{font-size:11px;color:#6b7280;margin:0}.card-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:10px}.card{background:#fff;border-radius:12px;padding:12px;box-shadow:0 3px 10px rgba(0,0,0,0.09);border-top:3px solid VAR_ACCENT;transition:transform 0.2s,box-shadow 0.2s}.card:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,0.13)}.card-title{font-size:13px;font-weight:700;color:VAR_ACCENT;margin:0 0 7px;display:flex;align-items:center;gap:5px}.visual-zone{min-height:90px;text-align:center;background:#f8fafc;border-radius:8px;padding:8px 6px;margin:0 0 8px;line-height:1.8;font-family:monospace;font-size:12px;color:#1f2937;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;transition:background 0.2s}.visual-zone:hover{background:#eef2ff}.explanation{font-size:11px;color:#4b5563;margin:0 0 6px;line-height:1.5}.insight{font-size:11px;font-weight:700;color:VAR_ACCENT}.comparison{background:linear-gradient(135deg,#f0fdf4,#eff6ff);border-radius:10px;padding:10px 14px;margin-bottom:10px}.comparison h3{font-size:12px;font-weight:700;color:#1f2937;margin:0 0 8px}.comp-table{width:100%;border-collapse:collapse;font-size:11px}.comp-table th{background:VAR_ACCENT;color:#fff;padding:5px 10px;text-align:left;font-weight:600}.comp-table td{padding:5px 10px;color:#374151;border-bottom:1px solid #e5e7eb}.comp-table tr:nth-child(even) td{background:#f9fafb}.comp-table td:first-child{font-weight:600;color:#1f2937}footer{margin-top:auto;text-align:center;font-size:9px;color:#6b7280;padding:8px 0 4px;border-top:1px solid #e5e7eb;background:#fff;flex-shrink:0}</style></head><body><div class="page"><header><div class="header-icon">SUBJECT EMOJI HERE</div><div class="header-title">Visual Explainers: ${sectionNumber}</div><div class="header-subtitle">Curated Summary | Powered by DATADNA AI Study Platform</div></header><div class="core-concept"><span style="font-size:20px">CONCEPT EMOJI</span><p>CORE CONCEPT TEXT HERE - MAX 200 CHARS</p></div><div class="topic-strip"><span style="font-size:16px">TAG EMOJI</span><h2>TOPIC NAME</h2><p>KEY IDEA HERE</p></div><div class="card-grid"><div class="card"><div class="card-title">EMOJI CARD 1 TITLE</div><div class="visual-zone">SVG ICON HERE ASCII DIAGRAM HERE</div><p class="explanation">EXPLANATION 1</p><p class="insight">💡 KEY INSIGHT 1</p></div><div class="card"><div class="card-title">EMOJI CARD 2 TITLE</div><div class="visual-zone">SVG ICON HERE ASCII DIAGRAM HERE</div><p class="explanation">EXPLANATION 2</p><p class="insight">💡 KEY INSIGHT 2</p></div><div class="card"><div class="card-title">EMOJI CARD 3 TITLE</div><div class="visual-zone">SVG ICON HERE ASCII DIAGRAM HERE</div><p class="explanation">EXPLANATION 3</p><p class="insight">💡 KEY INSIGHT 3</p></div><div class="card"><div class="card-title">EMOJI CARD 4 TITLE</div><div class="visual-zone">SVG ICON HERE ASCII DIAGRAM HERE</div><p class="explanation">EXPLANATION 4</p><p class="insight">💡 KEY INSIGHT 4</p></div></div><div class="comparison"><h3>EMOJI COMPARISON TITLE</h3><table class="comp-table"><thead><tr><th>Attribute</th><th>EMOJI CONCEPT A</th><th>EMOJI CONCEPT B</th></tr></thead><tbody><tr><td>ATTR 1</td><td>VALUE</td><td>VALUE</td></tr><tr><td>ATTR 2</td><td>VALUE</td><td>VALUE</td></tr><tr><td>ATTR 3</td><td>VALUE</td><td>VALUE</td></tr></tbody></table></div><footer style="margin-top:auto;text-align:center;font-size:9px;color:#6b7280;padding:8px 0 4px;border-top:1px solid #e5e7eb;background:#fff;flex-shrink:0">© 2025 DATADNA AI Study Platform — Visual Explainers Generated by AI</footer></div><script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script></body></html>

CRITICAL REQUIREMENTS:
- Replace VAR_ACCENT with the detected subject accent color hex in ALL CSS and SVG stroke attributes
- Replace all placeholder text (SUBJECT EMOJI HERE, CORE CONCEPT TEXT HERE, etc.) with actual extracted content
- Header MUST contain .header-icon div with emoji, .header-title, .header-subtitle — DO NOT REMOVE
- Footer MUST be the LAST element inside .page div, with inline style margin-top:auto and text "© 2025 DATADNA AI Study Platform — Visual Explainers Generated by AI" — DO NOT REMOVE OR OMIT
- Each .visual-zone MUST contain an inline SVG icon followed by ASCII diagram
- Return ONLY the complete minified HTML. ONE CONTINUOUS LINE. NO MARKDOWN. NO EXPLANATIONS.`;
}


function getDiagrammaticRepresentationPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic'
  } = params;

  return `Extract key concepts from the chapter to form the basis of an HTML study guide and Generate a 1-page HTML script that visually presents structured diagrams for complex systems, processes, or relationships. Each diagram should include clear labels, annotations, and hierarchical connections. The design should be visually appealing with clean layouts using boxes, arrows, and connecting lines. Create a diagrammatic representation of the file with ${contentDepth} content depth in ${outputLanguage} language in ${contentType} style with ${visualStyle} nature as a structured, visually elegant reference sheet. Design Style: 'Structured Diagram Layout' — Clean white/off-white background (#FFFFFF to #F9FAFB), soft academic pastel blocks (Blue #DBEAFE, Green #DCFCE7, Yellow #FEF3C7, Pink #FCE7F3, Purple #E9D5FF), rounded rectangles (12px border-radius), thin gray borders (#E5E7EB, 2px), minimal shadows (0 4px 12px rgba(0,0,0,0.08)). Use Inter font for labels (0.875rem) and Poppins for headings (1.25rem bold). Layout includes: 1) Header with subject/chapter/topic and 'Textbook Diagram Sheet' tag, 2) Title section with main topic, 3) Topic Explanation section with 3-6 descriptive sentences in neutral box, 4) System Diagram section with interconnected boxes showing components and relationships with directional arrows, 5) Important Points section with 6-10 key points in colored boxes, 6) Key Terms section with term-definition pairs in two-column layout, 7) Footer with attribution. Use SVG or CSS for arrows connecting diagram elements. Maintain clean spacing (2rem padding) and academic tone. Output Format: <!DOCTYPE html>...complete HTML script here.... CRITICAL REQUIREMENT: The HTML must be returned as a SINGLE CONTINUOUS LINE with absolutely NO newline characters (\\n), NO line breaks, NO tabs, and NO formatting whitespace. Minify the HTML completely. Return only the JSON output with fully minified HTML inside quotes, nothing else. Follow the output format strictly.`;
}

function getProcessFlowChartsPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic'
  } = params;

  return `Extract key concepts from the chapter to form the basis of an HTML study guide and Generate a 1-page HTML script that visually presents step-by-step flowcharts mapping sequential processes, decision trees, and algorithmic patterns. Include decision diamonds, process rectangles, and directional flow arrows. Create a process flow chart of the file with ${contentDepth} content depth in ${outputLanguage} language in ${contentType} style with ${visualStyle} nature. Design Style: 'Flowchart Layout' — White background (#FFFFFF), flowchart shapes: rectangles for processes (Blue #3B82F6 background, white text, 8px border-radius, padding 1rem), diamonds for decisions (Yellow #FBBF24 background, 45deg rotation, white text), rounded rectangles for start/end (Green #10B981 for start, Red #EF4444 for end, 999px border-radius), arrows connecting shapes (Gray #6B7280, 3px stroke). Use CSS Grid or Flexbox for vertical/horizontal flow alignment. Layout includes: 1) Header with title 'Process Flow Chart: [Topic]', 2) Start node (rounded green rectangle), 3) Sequential process boxes connected by arrows, 4) Decision diamonds with Yes/No branches, 5) Alternative paths showing different outcomes, 6) End node (rounded red rectangle), 7) Legend explaining shape meanings, 8) Footer. Use Inter font (0.875rem for text, 1rem bold for labels). Maintain clear spacing (2rem gaps) between flow elements. Output Format: <!DOCTYPE html>...complete HTML script here.... CRITICAL REQUIREMENT: The HTML must be returned as a SINGLE CONTINUOUS LINE with absolutely NO newline characters (\\n), NO line breaks, NO tabs, and NO formatting whitespace. Minify the HTML completely. Return only the JSON output with fully minified HTML inside quotes, nothing else. Follow the output format strictly.`;
}

function getCompareContrastTablesPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic'
  } = params;

  return `Extract key concepts from the chapter and generate a complete 1-page HTML comparison table script presenting side-by-side matrices highlighting similarities, differences, and key distinguishing features for ${topicName} at ${contentDepth} content depth in ${outputLanguage} using ${contentType} style and ${visualStyle} visual design on clean white background (#FFFFFF) with 3-column layout (Feature | Item A | Item B), gradient header row (linear-gradient(90deg, #6366F1, #8B5CF6) white text 1rem bold), alternating row colors (white #FFFFFF/light gray #F9FAFB), 1px solid borders (#E5E7EB), 12px rounded table corners, 1rem cell padding, green highlights (#10B981) for similarities, red highlights (#EF4444) for differences, blue highlights (#3B82F6) for neutral features, Inter font (0.875rem table text, 1.125rem headings), checkmark (✓) and cross (✗) icons where applicable, including header title 'Comparison Analysis: [Identify 2 main entities from content]', introduction paragraph explaining comparison context, main table with 8-12 feature rows intelligently comparing key concepts/terms/processes from the source document, similarities summary section in green box, key differences section in orange box, summary insights in neutral blue box, and footer attribution, ensuring full responsive design and print compatibility, output as fully minified single-line HTML from <!DOCTYPE html> to </html> with absolutely no newlines, line breaks, tabs, or formatting whitespace.`;
}

function getCauseEffectChainsPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic'
  } = params;

  return `Extract key concepts from the chapter to form the basis of an HTML study guide and Generate a 1-page HTML script that visually presents cause-and-effect diagrams showing causal relationships, consequences, and interconnected events. Create a cause-effect chain diagram of the file with ${contentDepth} content depth in ${outputLanguage} language in ${contentType} style with ${visualStyle} nature. Design Style: 'Cause-Effect Chain Layout' — Light background (#F8FAFC), cause boxes (Purple #A855F7 background, white text, rounded-left 16px, padding 1.5rem), effect boxes (Teal #14B8A6 background, white text, rounded-right 16px, padding 1.5rem), connecting arrows (thick 4px, gradient from purple to teal), intermediate consequence boxes (Orange #F59E0B, standard 8px border-radius). Use vertical or horizontal chain layout with clear directional flow. Layout includes: 1) Header with title 'Cause & Effect Analysis: [Topic]', 2) Introduction explaining the causal relationship, 3) Primary Cause section (large purple box), 4) Arrow leading to Intermediate Effects (3-4 orange boxes), 5) Arrows leading to Final Consequences (2-3 teal boxes), 6) Feedback Loops section showing cyclical relationships (dashed arrows in Gray #6B7280), 7) Key Insights box summarizing the chain, 8) Footer. Use Poppins for cause/effect labels (1rem bold) and Inter for descriptions (0.875rem). Add icons: ⚡ for causes, → for direct effects, ↻ for feedback loops. Output Format: <!DOCTYPE html>...complete HTML script here.... CRITICAL REQUIREMENT: The HTML must be returned as a SINGLE CONTINUOUS LINE with absolutely NO newline characters (\\n), NO line breaks, NO tabs, and NO formatting whitespace. Minify the HTML completely. Return only the JSON output with fully minified HTML inside quotes, nothing else. Follow the output format strictly.`;
}

function getTimelineVisualsPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic'
  } = params;

  return `Extract key concepts from the chapter to form the basis of an HTML study guide and Generate a 1-page HTML script that visually presents chronological timelines mapping historical events, geographical changes, and temporal progressions. Create a timeline visual of the file with ${contentDepth} content depth in ${outputLanguage} language in ${contentType} style with ${visualStyle} nature. Design Style: 'Vertical Timeline Layout' — Light gradient background (#FFFFFF to #F0F9FF), central vertical timeline bar (4px wide, gradient Blue #3B82F6 to Purple #8B5CF6), event nodes positioned alternately left and right of timeline, circular date markers (40px diameter, gradient background, white text, bold font), event cards (White background, rounded 12px, padding 1.5rem, shadow 0 4px 12px rgba(0,0,0,0.1), colored left border 4px solid matching date marker color). Use 6-color rotation: Blue #3B82F6, Green #10B981, Orange #F59E0B, Red #EF4444, Purple #8B5CF6, Teal #14B8A6. Layout includes: 1) Header with title 'Timeline: [Topic/Period]', 2) Introduction paragraph with date range, 3) Vertical timeline with 8-12 chronological events, 4) Each event card contains: date/year (bold, colored), event title (1rem bold), description (0.875rem, 2-3 sentences), optional image placeholder, 5) Era dividers (horizontal dashed lines with era labels like 'Ancient Period', 'Modern Era'), 6) Key Milestones section highlighting 3-4 most significant events, 7) Footer. Use Poppins for dates/titles (1rem bold) and Inter for descriptions (0.875rem). Icons: 📅 for dates, ⭐ for milestones, 🌍 for geographical events. Responsive: switches to left-aligned on mobile. Output Format: <!DOCTYPE html>...complete HTML script here.... CRITICAL REQUIREMENT: The HTML must be returned as a SINGLE CONTINUOUS LINE with absolutely NO newline characters (\\n), NO line breaks, NO tabs, and NO formatting whitespace. Minify the HTML completely. Return only the JSON output with fully minified HTML inside quotes, nothing else. Follow the output format strictly.`;
}

function getKeyFormulaPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic'
  } = params;

  return `Extract key concepts from the chapter to form the basis of an HTML study guide and Generate a 1-page HTML script that visually presents a curated collection of essential formulas, equations, and mathematical expressions with usage examples and conditions. Create a key formula sheet of the file with ${contentDepth} content depth in ${outputLanguage} language in ${contentType} style with ${visualStyle} nature. Design Style: 'Formula Sheet Layout' — Clean white background (#FFFFFF), formula cards in grid layout (2-column on desktop, 1-column on mobile), each card with light gradient background (linear-gradient(135deg, #EEF2FF, #FFFFFF)), rounded corners (16px), padding (2rem), shadow (0 6px 16px rgba(0,0,0,0.08)). Formula display in large monospace font (Fira Code or Courier New, 1.125rem), colored formula name badge (Blue #3B82F6 background, white text, rounded-full, padding 0.5rem 1rem). Layout includes: 1) Header with title 'Key Formula Sheet: [Topic]', 2) Subject/Chapter info subtitle, 3) Quick Index section with clickable formula names, 4) Formula Cards Grid containing 8-12 formulas, each with: Formula name badge, Large formula display (LaTeX-style rendering or HTML entities), 'Where' section explaining variables (small gray boxes with variable definitions), 'Usage' section with application context, 'Example' section with worked calculation, Color-coded difficulty badge (Easy=Green, Medium=Orange, Hard=Red), 5) Units & Constants reference table, 6) Common Mistakes section with warning boxes (Red #FEE2E2 background), 7) Quick Tips section (Blue #DBEAFE background), 8) Footer with print-friendly notice. Use Poppins for headings (1.25rem bold), Inter for descriptions (0.875rem), Fira Code for formulas and variables. Icons: ∑ for summations, ∫ for integrals, √ for roots, π for constants. Add copy-to-clipboard button for each formula. Output Format: <!DOCTYPE html>...complete HTML script here.... CRITICAL REQUIREMENT: The HTML must be returned as a SINGLE CONTINUOUS LINE with absolutely NO newline characters (\\n), NO line breaks, NO tabs, and NO formatting whitespace. Minify the HTML completely. Return only the JSON output with fully minified HTML inside quotes, nothing else. Follow the output format strictly.`;
}

function getChapterSummariesPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic'
  } = params;

  return `Extract key concepts from the chapter to form the basis of an HTML study guide and Generate a comprehensive 1-3 page HTML script that presents a detailed chapter summary capturing main concepts, key takeaways, and critical insights. Create a chapter summary of the file with ${contentDepth} content depth in ${outputLanguage} language in ${contentType} style with ${visualStyle} nature. Design Style: 'Academic Summary Layout' — Clean A4-printable white background (#FFFFFF), structured sections with clear hierarchy, soft section dividers (1px solid #E5E7EB), generous line spacing (1.8), readable paragraph width (max-width: 65ch). Use subtle background colors for section headers (Blue #EEF2FF for Overview, Green #F0FDF4 for Key Concepts, Yellow #FFFBEB for Important Points, Purple #FAF5FF for Conclusion). Layout includes: 1) Cover Section with title 'Chapter Summary: [Chapter Name]', subject/board/standard info, chapter number, AI generation notice, 2) Table of Contents with section links, 3) Chapter Overview (2-3 paragraphs) introducing main theme and scope, 4) Learning Objectives section with numbered list of 5-8 key learning outcomes, 5) Key Concepts & Definitions section with sub-sections for each major concept, each containing: concept heading, detailed explanation (3-5 sentences), related terms in highlighted boxes, 6) Important Points section with 10-15 critical takeaways in numbered format with colored left borders, 7) Formulas & Rules section (if applicable) with formula cards, 8) Diagrams & Visual Aids section with placeholder boxes and descriptions, 9) Worked Examples section with 2-3 detailed problem solutions, 10) Summary & Conclusion with condensed main points, 11) Practice Questions section with 5-8 review questions, 12) Additional Resources section with reference links, 13) Footer with page numbers and copyright. Use Merriweather or Georgia for body text (1rem, line-height 1.8), Poppins for headings (h1: 2rem, h2: 1.5rem, h3: 1.25rem), monospace for code/formulas. Color scheme: Primary Blue #2563EB, Secondary Green #059669, Accent Orange #EA580C, Text Dark Gray #1F2937, Text Light Gray #6B7280. Icons: 📖 for sections, ✓ for key points, 💡 for insights, ⚠️ for important notes, 📝 for examples. Add print styles with page breaks and proper margins. Multi-column layout for dense sections. Highlight boxes for definitions, warnings, tips, and examples with appropriate icons and colors. Output Format: <!DOCTYPE html>...complete HTML script here.... CRITICAL REQUIREMENT: The HTML must be returned as a SINGLE CONTINUOUS LINE with absolutely NO newline characters (\\n), NO line breaks, NO tabs, and NO formatting whitespace. Minify the HTML completely. Return only the JSON output with fully minified HTML inside quotes, nothing else. Follow the output format strictly.`;
}

function getPrompt(contentTypeId, params) {
  switch (contentTypeId) {
    case 'sticky-notes':
      return getStickyNotesPrompt(params);
    case 'ready-reckoner':
      return getReadyReckonerPrompt(params);
    case 'flash-cards':
      return getFlashCardsPrompt(params);
    case 'mind-maps':
      return getMindMapsPrompt(params);
    case 'visual-explainers':
      return getVisualExplainersPrompt(params);
    case 'diagrammatic-representation':
      return getDiagrammaticRepresentationPrompt(params);
    case 'process-flow-charts':
      return getProcessFlowChartsPrompt(params);
    case 'compare-contrast-tables':
      return getCompareContrastTablesPrompt(params);
    case 'cause-effect-chains':
      return getCauseEffectChainsPrompt(params);
    case 'timeline-visuals':
      return getTimelineVisualsPrompt(params);
    case 'key-formula':
      return getKeyFormulaPrompt(params);
    case 'chapter-summaries':
      return getChapterSummariesPrompt(params);
    default:
      console.warn(`No prompt found for content type: ${contentTypeId}. Using ready-reckoner as default.`);
      return getReadyReckonerPrompt(params);
  }
}

module.exports = {
  getPrompt,
  getStickyNotesPrompt,
  getReadyReckonerPrompt,
  getFlashCardsPrompt,
  getMindMapsPrompt,
  getVisualExplainersPrompt,
  getDiagrammaticRepresentationPrompt,
  getProcessFlowChartsPrompt,
  getCompareContrastTablesPrompt,
  getCauseEffectChainsPrompt,
  getTimelineVisualsPrompt,
  getKeyFormulaPrompt,
  getChapterSummariesPrompt
};

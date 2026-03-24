
function getStickyNotesPrompt(params) {
  const {
    sectionNumber = '',
    topicName = '',
    contentDepth = 'intermediate',
    contentType = '',
    outputLanguage = 'english',
    visualStyle = 'academic'
  } = params;
  

  return `Extract key concepts from the section ${sectionNumber} in the chapter to form the basis of an HTML study guide and Generate a SINGLE A4 PAGE HTML script that visually presents a set of sticky notes for each key concept.
Bloom's Taxonomy Level — Remember (Recall & Recognition): Focus on recall and recognition — use simple definitions, key terms, and memory cues.
KATEX FOR MATH: Include KaTeX CDN in <head>: <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$',right:'$',display:true},{left:'\\(',right:'\\)',display:false}]})"></script>. Use $...$ for display math and \\(...\\) for inline math. NEVER use raw Unicode math symbols.
Each sticky note must display concise content with clear information and supporting details. The design should be visually appealing and easy to read, with a consistent layout and color scheme. The sticky notes should be organized in a grid layout, with each card having a uniform size and shape. The overall design should be professional and suitable for use in an educational or training setting. notes of the file with ${contentDepth} content depth in ${outputLanguage} language in ${contentType} style with ${visualStyle} nature as a structured, visually elegant, and interactive reference sheet using Tailwind CSS. The layout should serve as a quick-access knowledge companion for students and professionals — focused on clarity, visual memory cues, and ease of scanning. CRITICAL EMOJI RENDERING REQUIREMENT: To ensure emojis render correctly in the generated image, you MUST use Twemoji library: 1. Add this script in the <head> section BEFORE the closing </head> tag: <script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script> 2. Add this CSS in the <style> section to control emoji size: img.emoji { height: 1em; width: 1em; margin: 0 0.05em 0 0.1em; vertical-align: -0.1em; display: inline-block;   } 3. Add this script at the END of <body> section BEFORE the closing </body> tag: <script> window.addEventListener('DOMContentLoaded', (event) => { twemoji.parse(document.body, { folder: 'svg', ext: '.svg' }); }); </script> 4. This will automatically convert all emoji characters (🌿, 📘, 💡, etc.) into properly sized SVG images that render perfectly in screenshots. 5. You can use emojis freely in the HTML - Twemoji will handle the rendering and sizing. CRITICAL A4 SINGLE PAGE REQUIREMENTS: 1. SINGLE PAGE ONLY: The entire content MUST fit within ONE A4 page (210mm × 297mm portrait). DO NOT create multiple pages. DO NOT exceed A4 dimensions. 2. Page Size: Use CSS @page rule with size: A4 portrait (210mm × 297mm). Set body margin to 0. 3. Page Container: Wrap all content in a SINGLE div with class "page" that has exact dimensions: width: 210mm, height: 297mm (NOT min-height), padding: 12mm, box-sizing: border-box, overflow: hidden. 4. Content Limits: Limit the number of sticky notes to fit within the single A4 page. Typically 4-6 sticky notes maximum depending on content length. Keep each note concise. 5. Compact Design: Use smaller fonts, tighter spacing, and compact layouts to ensure everything fits. Reduce padding and margins where necessary. 6. No Overflow: Set overflow: hidden on the page container to prevent content from exceeding A4 boundaries. Design Style: 'Sticky Notes Aesthetic' — handwritten font (Caveat) with pastel gradient backgrounds in 8 distinct color palettes (Yellow #FEF3C7 with border #FCD34D, Pink #FCE7F3 with border #F472B6, Blue #DBEAFE with border #60A5FA, Green #DCFCE7 with border #86EFAC, Purple #E9D5FF with border #D8B4FE, Orange #FFEDD5 with border #FDBA74, Red #FEE2E2 with border #FCA5A5, Cyan #CFFAFE with border #67E8F9), soft left border (4-5px), rounded corners (8px), soft shadows (0 8px 16px rgba), and subtle paper-like texture with organic rotations (-3deg to +3deg). Apply handwritten font (Caveat) for content and body text (Inter) for badges and labels. Consistent padding (1rem) for compact, digestible content. Layout Flow: 1. **Header / Title Section** — Compact title showing the topic name (1.5rem bold, Caveat) centered on paper-like background gradient (#FFFACD → #F5F5DC), with subtitle 'Curated Summary | Powered by DATADNA AI Study Platform' (0.7rem). You may include relevant emoji icons to make it visually appealing. Dashed border bottom (#D4AF37). Minimal padding (0.5rem). 2. **Concept Overview** — OPTIONAL: Only include if space permits. A brief introduction in a neutral sticky note (Yellow background) with handwritten typography. Keep very concise (2-3 sentences max). 3. **Key Concepts Grid** — A responsive 2-column layout of sticky note cards (using 8-color palette cyclically), each representing a main concept. LIMIT TO 4-6 CARDS TOTAL to fit within A4. Each card includes: Category badge (top-left, translucent rgba(0,0,0,0.15)), Title in bold handwritten text (0.9rem, Caveat), subtle divider line (rgba(0,0,0,0.2)), and content in handwritten font (0.85rem, Caveat). Add subtle rotation effect (-2deg to +2deg) for organic placement. Max-height: 180px, compact padding (0.75rem). 4. **Footer / Attribution** — Footer text "© 2025 DATADNA AI Study Platform" (0.6rem, Inter) on paper-like background (#F9FAFB) with center alignment, minimal padding (0.5rem). Typography: Use handwritten font (Caveat) for all content and headings (1.5rem for h1, 0.9rem for card titles, 0.85rem for body). Use Inter font exclusively for badge labels and metadata. Maintain compact padding (0.5-0.75rem) and minimal whitespace for A4 fit. All text on colored backgrounds rendered in dark ink. Animations: Subtle fade-in for sections, no hover effects, organic rotations (-2deg to +2deg) applied at render time for natural sticky note placement. Color rotation: Distribute pastel colors cyclically across cards using the 8-color palette. Page background: Paper-like gradient (#FFFACD → #F5F5DC → #FFF8DC). IMPORTANT: Skip optional sections (Formulae, Mind Map, Quick Reference Table, Smart Insights, Knowledge Check) to ensure content fits within single A4 page. Focus only on the most essential key concepts. Output Format: <!DOCTYPE html>...complete HTML script here.... Strictly adhere to the output format given. Additional Notes: The page must look structured, calm, and intuitive for study purposes — readable in both light and dark modes. Avoid clutter, ensure responsive alignment, and use color cues for grouping concepts. CRITICAL REQUIREMENT: The HTML must be returned as a SINGLE CONTINUOUS LINE with absolutely NO newline characters (\\n), NO line breaks, NO tabs, and NO formatting whitespace. Minify the HTML completely by removing all spaces between tags. The entire HTML must be one unbroken line from <!DOCTYPE to </html>. Do NOT format or pretty-print the HTML. Do NOT wrap the HTML in JSON. Do NOT add quotes around the HTML. Return ONLY the raw HTML code starting with <!DOCTYPE and ending with </html>, nothing else - no JSON wrapper, no markdown, no explanations.`
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
Bloom's Taxonomy Level — Remember (Recall & Recognition): Focus on recall and recognition — present key concepts and definitions for quick reference.

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

KATEX FOR MATH: If any concept card contains a formula or equation, wrap it in \\(...\\) for inline math or $$...$$ for display math. Use LaTeX syntax: \\frac{}{}, \\sqrt{}, \\pi, \\Delta, \\sum, \\int etc. NEVER use raw Unicode math symbols.

OUTPUT STRUCTURE - KEEP ALL CSS AND STYLING:
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}]})"></script><script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter','Manrope','Lexend',sans-serif;background:linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%);min-height:100vh;padding:20px;color:#1F2937}header{background:linear-gradient(135deg,#6366F1 0%,#14B8A6 100%);border-radius:20px;padding:40px;text-align:center;margin-bottom:30px;box-shadow:0 8px 32px rgba(99,102,241,0.15)}.header-icon{font-size:48px;margin-bottom:10px}.header-title{color:white;font-size:2.5em;font-weight:700;margin-bottom:8px}.header-subtitle{color:rgba(255,255,255,0.9);font-size:0.95em;font-weight:300}.container{max-width:1200px;margin:0 auto}.section{margin-bottom:40px}.section-title{font-size:1.8em;font-weight:600;color:#1F2937;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #6366F1}.overview-box{background:white;border-radius:16px;padding:25px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border-left:6px solid #14B8A6;line-height:1.7;color:#374151}.overview-box strong{color:#6366F1}.concepts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-bottom:30px}.concept-card{background:white;border-radius:16px;padding:25px;box-shadow:0 4px 16px rgba(0,0,0,0.08);transition:all 0.3s ease;border-top:5px solid #F59E0B;cursor:pointer}.concept-card:hover{transform:translateY(-5px);box-shadow:0 12px 32px rgba(99,102,241,0.2)}.concept-card h3{color:#6366F1;font-size:1.2em;margin-bottom:10px}.concept-card p{color:#6B7280;font-size:0.95em;line-height:1.6}.concept-card img{max-width:100%;height:auto;border-radius:8px;margin-bottom:10px}img.emoji{height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block}.katex{font-size:1em}footer{background:white;border-radius:16px;padding:25px;text-align:center;color:#6B7280;font-size:0.9em;box-shadow:0 4px 16px rgba(0,0,0,0.08);margin-top:40px}@media(max-width:768px){.header-title{font-size:1.8em}.concepts-grid{grid-template-columns:1fr}}</style></head><body><header><div class="header-icon">EMOJI ICON HERE</div><div class="header-title">Ready Reckoner: ${sectionNumber}</div><div class="header-subtitle">Curated Summary | Powered by DATADNA AI Study Platform</div></header><div class="container"><section class="section"><h2 class="section-title">Concept Overview</h2><div class="overview-box">CONCEPT OVERVIEW TEXT HERE - MAX 400 CHARS</div></section><section class="section"><h2 class="section-title">Key Concepts</h2><div class="concepts-grid">CONCEPT CARDS HERE - 5-6 CARDS WITH TITLES, DESCRIPTIONS, AND OPTIONAL IMAGES</div></section></div><footer>© 2025 DATADNA AI Study Platform — Ready Reckoner Generated by AI</footer><script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script></body></html>

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
Bloom's Taxonomy Level — Remember (Recall & Recognition): Focus on recall and recognition — questions should test definitions, facts, and key terms.

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
Bloom's Taxonomy Level — Analyze & Create: Focus on analysis and creation — connect concepts, reveal patterns, and help students organise their own understanding.

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
Bloom's Taxonomy Level — Understand (Comprehension): Focus on comprehension — simplify concepts visually to build clarity and intuitive understanding.

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
- .visual-zone: min-height:90px, contains ONLY topic-relevant visuals:
  * If the card concept has a clear visual representation → include inline SVG icon (36x36) AND ASCII diagram
  * If no meaningful visual exists for the concept → show ONLY a styled text summary, NO SVG, NO ASCII art
  * NEVER show a generic/unrelated SVG just to fill space — omit it entirely if not relevant
  * ASCII diagram types (use only when directly relevant):
    - GRID (■ ■ ■ rows) → maths, patterns, tables
    - FLOW (A → B → C) → science, processes
    - CHAIN (X → Y ↓ Z) → cause-effect
    - TREE (Root ├─ A └─ B) → classification
    - STACK (L3 / L2 / L1) → layers, geography
    - TIMELINE (E1 ──► E2 ──► E3) → history
- .explanation: max 1 sentence, 11px
- .insight: 💡 bold key insight, 11px, accent color

SVG ICONS (inline, use stroke=VAR_ACCENT) — use ONLY when the icon directly represents the card concept:
- Maths/grid: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="VAR_ACCENT" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
- Flow/process: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="VAR_ACCENT" stroke-width="2"><circle cx="5" cy="12" r="3"/><circle cx="19" cy="12" r="3"/><line x1="8" y1="12" x2="16" y2="12"/><polyline points="13,9 16,12 13,15"/></svg>
- Tree/classify: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="VAR_ACCENT" stroke-width="2"><line x1="12" y1="3" x2="12" y2="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="15" x2="6" y2="20"/><line x1="12" y1="15" x2="18" y2="20"/></svg>
- Stack/layers: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="VAR_ACCENT" stroke-width="2"><polygon points="12,2 22,8.5 12,15 2,8.5"/><polyline points="2,15 12,21.5 22,15"/><polyline points="2,11.5 12,18 22,11.5"/></svg>
- Timeline/clock: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="VAR_ACCENT" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
- Biology/leaf: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="VAR_ACCENT" stroke-width="2"><path d="M12 22V12M12 12C12 7 17 3 22 3c0 5-3 9-10 9M12 12C12 7 7 3 2 3c0 5 3 9 10 9"/></svg>
- If NONE of the above icons match the card concept — DO NOT include any SVG at all

SUBJECT COLOR (auto-detect, replace VAR_ACCENT everywhere in CSS and SVGs):
- Biology/Nature → #16a34a | Physics/Chemistry → #2563eb | Maths → #7c3aed | History/Social → #ea580c | Default → #6366f1

OUTPUT STRUCTURE — USE THIS EXACT HTML SKELETON:
<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}]})"></script><script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script><style>@page{size:A4 portrait;margin:0}body{margin:0;font-family:'Inter',system-ui,sans-serif;background:#f8fafc}img.emoji{height:1.2em;width:1.2em;margin:0 0.05em 0 0.1em;vertical-align:-0.15em;display:inline-block}.katex{font-size:1em}.page{width:210mm;height:297mm;padding:14mm;box-sizing:border-box;overflow:hidden;background:#fff;display:flex;flex-direction:column}header{background:linear-gradient(135deg,#6366F1 0%,#14B8A6 100%);border-radius:12px;padding:11px 20px;text-align:center;margin-bottom:10px}.header-icon{font-size:32px;display:block;margin-bottom:4px}.header-title{color:#fff;font-size:18px;font-weight:700;margin:3px 0}.header-subtitle{color:rgba(255,255,255,0.88);font-size:10px}.core-concept{border-left:4px solid VAR_ACCENT;background:#f5f3ff;border-radius:0 8px 8px 0;padding:9px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px}.core-concept p{font-size:12px;color:#1f2937;margin:0;line-height:1.55;font-weight:500}.topic-strip{background:#f0fdf4;border-radius:8px;padding:7px 14px;margin-bottom:10px;display:flex;gap:12px;align-items:center;border-left:3px solid VAR_ACCENT}.topic-strip h2{font-size:12px;color:VAR_ACCENT;margin:0;font-weight:700}.topic-strip p{font-size:11px;color:#6b7280;margin:0}.card-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:10px}.card{background:#fff;border-radius:12px;padding:12px;box-shadow:0 3px 10px rgba(0,0,0,0.09);border-top:3px solid VAR_ACCENT;transition:transform 0.2s,box-shadow 0.2s}.card:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,0.13)}.card-title{font-size:13px;font-weight:700;color:VAR_ACCENT;margin:0 0 7px;display:flex;align-items:center;gap:5px}.visual-zone{min-height:90px;text-align:center;background:#f8fafc;border-radius:8px;padding:8px 6px;margin:0 0 8px;line-height:1.8;font-family:monospace;font-size:12px;color:#1f2937;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;transition:background 0.2s}.visual-zone:hover{background:#eef2ff}.explanation{font-size:11px;color:#4b5563;margin:0 0 6px;line-height:1.5}.insight{font-size:11px;font-weight:700;color:VAR_ACCENT}.comparison{background:linear-gradient(135deg,#f0fdf4,#eff6ff);border-radius:10px;padding:10px 14px;margin-bottom:10px}.comparison h3{font-size:12px;font-weight:700;color:#1f2937;margin:0 0 8px}.comp-table{width:100%;border-collapse:collapse;font-size:11px}.comp-table th{background:VAR_ACCENT;color:#fff;padding:5px 10px;text-align:left;font-weight:600}.comp-table td{padding:5px 10px;color:#374151;border-bottom:1px solid #e5e7eb}.comp-table tr:nth-child(even) td{background:#f9fafb}.comp-table td:first-child{font-weight:600;color:#1f2937}footer{margin-top:auto;text-align:center;font-size:9px;color:#6b7280;padding:8px 0 4px;border-top:1px solid #e5e7eb;background:#fff;flex-shrink:0}</style></head><body><div class="page"><header><div class="header-icon">SUBJECT EMOJI HERE</div><div class="header-title">Visual Explainers: ${sectionNumber}</div><div class="header-subtitle">Curated Summary | Powered by DATADNA AI Study Platform</div></header><div class="core-concept"><span style="font-size:20px">CONCEPT EMOJI</span><p>CORE CONCEPT TEXT HERE - MAX 200 CHARS</p></div><div class="topic-strip"><span style="font-size:16px">TAG EMOJI</span><h2>TOPIC NAME</h2><p>KEY IDEA HERE</p></div><div class="card-grid"><div class="card"><div class="card-title">EMOJI CARD 1 TITLE</div><div class="visual-zone">SVG ICON ONLY IF RELEVANT, ASCII DIAGRAM ONLY IF RELEVANT, OTHERWISE STYLED TEXT SUMMARY</div><p class="explanation">EXPLANATION 1</p><p class="insight">💡 KEY INSIGHT 1</p></div><div class="card"><div class="card-title">EMOJI CARD 2 TITLE</div><div class="visual-zone">SVG ICON ONLY IF RELEVANT, ASCII DIAGRAM ONLY IF RELEVANT, OTHERWISE STYLED TEXT SUMMARY</div><p class="explanation">EXPLANATION 2</p><p class="insight">💡 KEY INSIGHT 2</p></div><div class="card"><div class="card-title">EMOJI CARD 3 TITLE</div><div class="visual-zone">SVG ICON ONLY IF RELEVANT, ASCII DIAGRAM ONLY IF RELEVANT, OTHERWISE STYLED TEXT SUMMARY</div><p class="explanation">EXPLANATION 3</p><p class="insight">💡 KEY INSIGHT 3</p></div><div class="card"><div class="card-title">EMOJI CARD 4 TITLE</div><div class="visual-zone">SVG ICON ONLY IF RELEVANT, ASCII DIAGRAM ONLY IF RELEVANT, OTHERWISE STYLED TEXT SUMMARY</div><p class="explanation">EXPLANATION 4</p><p class="insight">💡 KEY INSIGHT 4</p></div></div><div class="comparison"><h3>EMOJI COMPARISON TITLE</h3><table class="comp-table"><thead><tr><th>Attribute</th><th>EMOJI CONCEPT A</th><th>EMOJI CONCEPT B</th></tr></thead><tbody><tr><td>ATTR 1</td><td>VALUE</td><td>VALUE</td></tr><tr><td>ATTR 2</td><td>VALUE</td><td>VALUE</td></tr><tr><td>ATTR 3</td><td>VALUE</td><td>VALUE</td></tr></tbody></table></div><footer style="margin-top:auto;text-align:center;font-size:9px;color:#6b7280;padding:8px 0 4px;border-top:1px solid #e5e7eb;background:#fff;flex-shrink:0">© 2025 DATADNA AI Study Platform — Visual Explainers Generated by AI</footer></div><script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script></body></html>

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

  // Map contentDepth to class-level adaptive rules
  const depthRules = {
    beginner:     'Class 6–8 style: more visuals, minimal text, icons + simple words, no formulas',
    intermediate: 'Class 9–10 style: definitions + examples + formulas where applicable',
    advanced:     'Class 11–12 style: derivations, logic chains, edge cases, technical notation'
  };
  const adaptiveRule = depthRules[contentDepth] || depthRules.intermediate;

  // Map contentType to diagram type
  const diagramTypeHint = contentType === 'process' ? 'TYPE B — FLOWCHART'
    : contentType === 'comparison' ? 'TYPE C — COMPARISON'
    : contentType === 'formula' ? 'TYPE A — TREE'
    : 'AUTO — analyze topic and pick TYPE A, B, C, or D (see selection rules below)';

  return `You are generating structured diagram data. The UI renders the diagram directly from nodes and edges using SVG — no Mermaid dependency.
Return ONLY a valid JSON object. NO markdown. NO explanation. NO html. Just raw JSON.

Topic: ${topicName}
Section: ${sectionNumber}
Depth: ${contentDepth} | Language: ${outputLanguage}
Adaptive rule: ${adaptiveRule}
Bloom's Taxonomy Level — Understand (Comprehension): Focus on comprehension — use diagrams to clarify structure, relationships, and simplified understanding.

STEP 1 — CHOOSE DIAGRAM TYPE:
Hint: ${diagramTypeHint}
If AUTO, pick the best fit:
  TYPE A — TREE: classification, taxonomy, categories, parts of a whole
  TYPE B — FLOWCHART: steps, sequences, processes, cause→effect chains
  TYPE C — COMPARISON: two concepts side by side, similarities/differences
  TYPE D — CYCLE: recurring processes, life cycles, circular relationships

STEP 2 — BUILD NODES AND EDGES:
Node styles per type:
  TREE     → root (1), branch (main categories), leaf (details)
  FLOWCHART → start (1), step, decision (for branches), end (1)
  COMPARISON → root (1), left, right, left-leaf, right-leaf
  CYCLE    → cycle (all nodes same style, last edge loops back to first)

Edge rules:
- Every edge: { "from": "<id>", "to": "<id>" }
- FLOWCHART decision nodes only: add "label": "Yes" or "label": "No"
- CYCLE: last node must have an edge back to rootId
- COMPARISON: root connects to both left and right group heads
- Max node label: 30 chars

STEP 3 — DETECT SUBJECT COLOR:
Biology/Nature: accent=#16a34a, pastel=#dcfce7
Physics/Chemistry: accent=#2563eb, pastel=#dbeafe
Maths: accent=#7c3aed, pastel=#ede9fe
History/Social: accent=#ea580c, pastel=#ffedd5
Default: accent=#6366f1, pastel=#eef2ff

OUTPUT — return exactly this JSON structure:
{
  "header": {
    "title": "Diagrammatic Representation: ${sectionNumber}",
    "subtitle": "Curated Summary | Powered by DATADNA AI Study Platform",
    "emoji": "<single relevant subject emoji>",
    "accentColor": "<hex from subject detection>",
    "pastelColor": "<hex from subject detection>"
  },
  "coreIdea": "<single bold sentence max 180 chars summarising the central concept>",
  "diagram": {
    "type": "<TREE|FLOWCHART|COMPARISON|CYCLE>",
    "rootId": "<id of the root/start node>",
    "nodes": [
      { "id": "A", "label": "<short label>", "style": "<root|branch|leaf|start|step|decision|end|cycle|left|right|left-leaf|right-leaf>" }
    ],
    "edges": [
      { "from": "A", "to": "B", "label": "<optional, only for decision branches>" }
    ]
  },
  "keyNotes": [
    "<note 1 max 15 words>",
    "<note 2 max 15 words>",
    "<note 3 max 15 words>",
    "<note 4 max 15 words>",
    "<note 5 max 15 words>"
  ],
  "summary": "<3 sentences max summarising the topic>",
  "footer": {
    "text": "© 2025 DATADNA AI Study Platform — Diagrammatic Representation Generated by AI"
  }
}`;

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

  return `Generate a Process Flow Chart for: ${topicName} with ${contentDepth} depth in ${outputLanguage} language.
Bloom's Taxonomy Level — Apply (Use Knowledge): Focus on application — show how concepts are used in sequences, procedures, and real contexts.

CRITICAL: Generate EXACTLY ONE single flowchart covering the entire topic. Do NOT split into multiple charts or multiple sections. One <section> block, one <div class="mermaid"> block, one flowchart only. If the topic has sub-processes, combine them into a single unified flow with branching nodes — do not create separate charts.

CRITICAL: Use Mermaid.js to render the flowchart. Mermaid draws properly connected arrows between nodes — do NOT use CSS flexbox or HTML divs for the flowchart itself.

HEADER AND FOOTER — USE EXACTLY THIS STYLE:
- header: background linear-gradient(135deg,#6366F1 0%,#14B8A6 100%), border-radius 20px, padding 40px, text-align center, box-shadow 0 8px 32px rgba(99,102,241,0.15)
- header-icon: font-size 48px, margin-bottom 10px, relevant subject emoji
- header-title: "Process Flow Chart: ${sectionNumber}", color white, font-size 2.5em, font-weight 700
- header-subtitle: "Curated Summary | Powered by DATADNA AI Study Platform", color rgba(255,255,255,0.9), font-size 0.95em
- footer: background white, border-radius 16px, padding 25px, text-align center, color #6B7280, font-size 0.9em, box-shadow 0 4px 16px rgba(0,0,0,0.08), margin-top 40px
- footer text: "© 2025 DATADNA AI Study Platform — Process Flow Chart Generated by AI"
- body: font-family Inter/Manrope/Lexend, background linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%), padding 20px

MERMAID FLOWCHART RULES:
- Load Mermaid from CDN: <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
- Initialize BEFORE the diagram div with: mermaid.initialize({startOnLoad:true,theme:'base',themeVariables:{primaryColor:'#3B82F6',primaryTextColor:'#fff',primaryBorderColor:'#2563EB',lineColor:'#6366F1',secondaryColor:'#10B981',tertiaryColor:'#F9FAFB',edgeLabelBackground:'#fff',fontSize:'16px'}});
- Place the diagram inside: <div class="mermaid">flowchart TD\n...\n</div>
- Use flowchart TD (top-down) direction

EXACT NODE SYNTAX — copy these patterns exactly:
  A(["Start"])
  B["Process step label"]
  C{"Decision label"}
  Z(["End"])
  A --> B
  B --> C
  C -->|Yes| D
  C -->|No| E

FORBIDDEN — these WILL cause Syntax error in text:
  B[Label without quotes]        — missing quotes
  C{Has nucleus?}                — ? inside label
  B["Step: do this"]             — : inside label
  B["Cell (Plasma) Membrane"]    — () inside label
  B["value > 5"]                 — > inside label
  B["A & B"]                     — & inside label

ALLOWED replacements inside labels:
  ? → remove it entirely
  : → use hyphen -
  () → remove them
  > → write "greater than"
  & → write "and"
  / → write "or"

- Declare ALL nodes first (A, B, C...), then ALL edges (A-->B, B-->C...), then classDef
- classDef startEnd fill:#10B981,stroke:#059669,color:#fff
- classDef process fill:#3B82F6,stroke:#2563EB,color:#fff
- classDef decision fill:#FBBF24,stroke:#D97706,color:#1F2937
- class A,Z startEnd
- Keep labels under 4 words maximum — short enough to fit on one line without wrapping. Examples: "Cell Divides", "Forms Tissue", "Organ System Forms". NEVER write long labels like "System Performs Major Function" or "Tissues Combine into Organ" — split meaning across nodes instead.

KATEX FOR MATH: Use $...$ for display equations and \\(...\\) for inline math. NEVER use raw Unicode math symbols.

OUTPUT STRUCTURE — USE THIS EXACT HTML SKELETON (replace only node labels and edges, keep all other HTML identical):
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter','Manrope','Lexend',sans-serif;background:linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%);min-height:100vh;padding:20px;color:#1F2937}header{background:linear-gradient(135deg,#6366F1 0%,#14B8A6 100%);border-radius:20px;padding:40px;text-align:center;margin-bottom:30px;box-shadow:0 8px 32px rgba(99,102,241,0.15)}.header-icon{font-size:48px;margin-bottom:10px}.header-title{color:white;font-size:2.5em;font-weight:700;margin-bottom:8px}.header-subtitle{color:rgba(255,255,255,0.9);font-size:0.95em;font-weight:300}.container{max-width:960px;margin:0 auto}.section{margin-bottom:60px;padding-top:10px}.section+.section{border-top:2px solid #E5E7EB;padding-top:30px}.section-title{font-size:1.8em;font-weight:600;color:#1F2937;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #6366F1}img.emoji{height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block}.mermaid-wrap{background:white;border-radius:16px;padding:30px;box-shadow:0 4px 16px rgba(0,0,0,0.08);margin-bottom:40px;width:100%;overflow:auto;display:flex;justify-content:center;align-items:flex-start}.mermaid{width:100%;display:flex;justify-content:center}.mermaid svg{display:block;margin:0 auto;height:auto;max-width:100%}.mermaid svg .node rect{rx:12;ry:12;}.mermaid svg .node polygon{}.mermaid svg path.flowchart-link{stroke-width:2.5px}.legend{background:white;border-radius:16px;padding:20px;box-shadow:0 4px 16px rgba(0,0,0,0.08)}.legend-title{font-size:1.1em;font-weight:600;color:#1F2937;margin-bottom:12px}.legend-items{display:flex;flex-wrap:wrap;gap:12px}.legend-item{display:flex;align-items:center;gap:8px;font-size:0.85em;color:#374151}.legend-dot{width:14px;height:14px;border-radius:3px;flex-shrink:0}footer{background:white;border-radius:16px;padding:25px;text-align:center;color:#6B7280;font-size:0.9em;box-shadow:0 4px 16px rgba(0,0,0,0.08);margin-top:40px}@media(max-width:768px){.header-title{font-size:1.8em}}</style></head><body><script>mermaid.initialize({startOnLoad:true,theme:'base',useMaxWidth:false,themeVariables:{primaryColor:'#3B82F6',primaryTextColor:'#fff',primaryBorderColor:'#2563EB',lineColor:'#6366F1',secondaryColor:'#10B981',tertiaryColor:'#F9FAFB',edgeLabelBackground:'#fff',fontSize:'18px',nodeBorder:'2px',clusterBkg:'#EEF2FF'},flowchart:{curve:'basis',nodeSpacing:60,rankSpacing:80,padding:20,wrappingWidth:300,useMaxWidth:false}});</script><header><div class="header-icon">SUBJECT EMOJI HERE</div><div class="header-title">Process Flow Chart: ${sectionNumber}</div><div class="header-subtitle">Curated Summary | Powered by DATADNA AI Study Platform</div></header><div class="container"><section class="section"><h2 class="section-title">Process Flow</h2><div class="mermaid-wrap"><div class="mermaid">
flowchart TD
%%{init:{'flowchart':{'nodeSpacing':60,'rankSpacing':80,'curve':'basis','wrappingWidth':300}}}%%
A(["Start"])
B["First process step"]
C{"Decision point"}
D["Yes path step"]
E["No path step"]
F["Next step"]
G["Another step"]
H{"Second decision"}
I["Result step one"]
J["Result step two"]
Z(["End"])
A --> B
B --> C
C -->|Yes| D
C -->|No| E
D --> F
E --> F
F --> G
G --> H
H -->|Yes| I
H -->|No| J
I --> Z
J --> Z
classDef startEnd fill:#10B981,stroke:#059669,color:#fff
classDef process fill:#3B82F6,stroke:#2563EB,color:#fff
classDef decision fill:#FBBF24,stroke:#D97706,color:#1F2937
class A,Z startEnd
class B,D,E,F,G,I,J process
class C,H decision
</div></div></section><div class="legend"><div class="legend-title">Legend</div><div class="legend-items"><div class="legend-item"><div class="legend-dot" style="background:#10B981;border-radius:50%"></div><span>Start / End</span></div><div class="legend-item"><div class="legend-dot" style="background:#3B82F6"></div><span>Process Step</span></div><div class="legend-item"><div class="legend-dot" style="background:#FBBF24;transform:rotate(45deg)"></div><span>Decision</span></div></div></div></div><footer>© 2025 DATADNA AI Study Platform — Process Flow Chart Generated by AI</footer><script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script></body></html>

CONSTRAINTS:
- ONE CHART ONLY: generate exactly one <section> with one <div class="mermaid"> — never multiple sections or multiple mermaid divs
- Replace SUBJECT EMOJI HERE with a relevant subject emoji
- Replace ALL node labels (A, B, C... Z) with actual content from the topic — keep the same node IDs and structure
- ALL labels MUST stay in double quotes
- NEVER use ? : ( ) > < & inside any label
- Keep the flowchart TD block exactly as formatted above — one node or edge per line
- Minified HTML (one continuous line) BUT the mermaid diagram block must stay on separate lines inside the div

RETURN ONLY THE HTML. NOTHING ELSE.`;
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

  return `Generate a Compare & Contrast Table for: ${topicName} with ${contentDepth} depth in ${outputLanguage} language.
Bloom's Taxonomy Level — Analyze & Evaluate: Focus on analysis and evaluation — highlight relationships, patterns, similarities, and differences to support deeper thinking and reasoning.

HEADER AND FOOTER — USE EXACTLY THIS STYLE (same as Ready Reckoner):
- header: background linear-gradient(135deg,#6366F1 0%,#14B8A6 100%), border-radius 20px, padding 40px, text-align center, box-shadow 0 8px 32px rgba(99,102,241,0.15)
- header-icon: font-size 48px, margin-bottom 10px, relevant subject emoji
- header-title: "Compare & Contrast: ${sectionNumber}", color white, font-size 2.5em, font-weight 700
- header-subtitle: "Curated Summary | Powered by DATADNA AI Study Platform", color rgba(255,255,255,0.9), font-size 0.95em
- footer: background white, border-radius 16px, padding 25px, text-align center, color #6B7280, font-size 0.9em, box-shadow 0 4px 16px rgba(0,0,0,0.08), margin-top 40px
- footer text: "© 2025 DATADNA AI Study Platform — Compare & Contrast Table Generated by AI"
- body: font-family Inter/Manrope/Lexend, background linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%), padding 20px
- Include Twemoji: <script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script>
- img.emoji CSS: height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block
- Twemoji init before </body>: <script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script>

TABLE CONTENT — inside a .container (max-width 1200px, margin 0 auto):
- 3-column layout (Feature | Item A | Item B), gradient header row (linear-gradient(90deg,#6366F1,#8B5CF6) white text 1rem bold)
- Alternating row colors (white #FFFFFF / light gray #F9FAFB), 1px solid borders (#E5E7EB), 12px rounded table corners, 1rem cell padding
- Green highlights (#10B981) for similarities, red highlights (#EF4444) for differences, blue highlights (#3B82F6) for neutral features
- Inter font (0.875rem table text), checkmark (✓) and cross (✗) icons where applicable
- 8-12 feature rows comparing key concepts from the source document
- Similarities summary section in green box, key differences in orange box, summary insights in neutral blue box
- Section title style: font-size 1.8em, font-weight 600, color #1F2937, border-bottom 3px solid #6366F1, margin-bottom 20px

KATEX FOR MATH: Use $$...$$ for display equations and \\(...\\) for inline math in any formula or equation content. Use LaTeX: \\frac{}{}, \\sqrt{}, \\pi, \\Delta, \\sum, \\int etc. NEVER use raw Unicode math symbols.

OUTPUT STRUCTURE — USE THIS EXACT HTML SKELETON:
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}]})"></script><script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter','Manrope','Lexend',sans-serif;background:linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%);min-height:100vh;padding:20px;color:#1F2937}header{background:linear-gradient(135deg,#6366F1 0%,#14B8A6 100%);border-radius:20px;padding:40px;text-align:center;margin-bottom:30px;box-shadow:0 8px 32px rgba(99,102,241,0.15)}.header-icon{font-size:48px;margin-bottom:10px}.header-title{color:white;font-size:2.5em;font-weight:700;margin-bottom:8px}.header-subtitle{color:rgba(255,255,255,0.9);font-size:0.95em;font-weight:300}.container{max-width:1200px;margin:0 auto}.section{margin-bottom:40px}.section-title{font-size:1.8em;font-weight:600;color:#1F2937;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #6366F1}img.emoji{height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block}.katex{font-size:1em}.comp-table{width:100%;border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}.comp-table th{background:linear-gradient(90deg,#6366F1,#8B5CF6);color:white;padding:1rem;text-align:left;font-size:1rem;font-weight:600}.comp-table td{padding:1rem;font-size:0.875rem;border-bottom:1px solid #E5E7EB}.comp-table tr:nth-child(even) td{background:#F9FAFB}.comp-table tr:nth-child(odd) td{background:#FFFFFF}.similar{color:#10B981;font-weight:600}.different{color:#EF4444;font-weight:600}.neutral{color:#3B82F6;font-weight:600}.summary-box{border-radius:12px;padding:20px;margin-bottom:16px}.summary-green{background:#F0FDF4;border-left:4px solid #10B981}.summary-orange{background:#FFF7ED;border-left:4px solid #F59E0B}.summary-blue{background:#EFF6FF;border-left:4px solid #3B82F6}.summary-box h3{font-size:1rem;font-weight:600;margin-bottom:8px}.summary-box p{font-size:0.875rem;color:#374151;line-height:1.6}footer{background:white;border-radius:16px;padding:25px;text-align:center;color:#6B7280;font-size:0.9em;box-shadow:0 4px 16px rgba(0,0,0,0.08);margin-top:40px}@media(max-width:768px){.header-title{font-size:1.8em}}</style></head><body><header><div class="header-icon">SUBJECT EMOJI HERE</div><div class="header-title">Compare &amp; Contrast: ${sectionNumber}</div><div class="header-subtitle">Curated Summary | Powered by DATADNA AI Study Platform</div></header><div class="container"><section class="section"><h2 class="section-title">Comparison Analysis</h2><table class="comp-table"><thead><tr><th>Feature</th><th>EMOJI CONCEPT A</th><th>EMOJI CONCEPT B</th></tr></thead><tbody>TABLE ROWS HERE</tbody></table></section><section class="section"><div class="summary-box summary-green"><h3>✓ Similarities</h3><p>SIMILARITIES TEXT HERE</p></div><div class="summary-box summary-orange"><h3>✗ Key Differences</h3><p>DIFFERENCES TEXT HERE</p></div><div class="summary-box summary-blue"><h3>💡 Summary Insights</h3><p>INSIGHTS TEXT HERE</p></div></section></div><footer>© 2025 DATADNA AI Study Platform — Compare &amp; Contrast Table Generated by AI</footer><script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script></body></html>

CONSTRAINTS:
- HEADER: gradient background, large emoji icon, title "Compare & Contrast: ${sectionNumber}", subtitle exactly as shown
- FOOTER: white card style, text "© 2025 DATADNA AI Study Platform — Compare & Contrast Table Generated by AI"
- Replace all placeholder text with actual content from the document
- Minified HTML (one continuous line)

RETURN ONLY THE HTML. NOTHING ELSE.`;
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

  return `Generate a Cause & Effect Chain for: ${topicName} with ${contentDepth} depth in ${outputLanguage} language.
Bloom's Taxonomy Level — Analyze & Evaluate: Focus on analysis and evaluation — map causal relationships and consequences to support reasoning and decision-making.

HEADER AND FOOTER — USE EXACTLY THIS STYLE (same as Ready Reckoner):
- header: background linear-gradient(135deg,#6366F1 0%,#14B8A6 100%), border-radius 20px, padding 40px, text-align center, box-shadow 0 8px 32px rgba(99,102,241,0.15)
- header-icon: font-size 48px, margin-bottom 10px, relevant subject emoji
- header-title: "Cause & Effect: ${sectionNumber}", color white, font-size 2.5em, font-weight 700
- header-subtitle: "Curated Summary | Powered by DATADNA AI Study Platform", color rgba(255,255,255,0.9), font-size 0.95em
- footer: background white, border-radius 16px, padding 25px, text-align center, color #6B7280, font-size 0.9em, box-shadow 0 4px 16px rgba(0,0,0,0.08), margin-top 40px
- footer text: "© 2025 DATADNA AI Study Platform — Cause & Effect Chain Generated by AI"
- body: font-family Inter/Manrope/Lexend, background linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%), padding 20px
- Include Twemoji: <script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script>
- img.emoji CSS: height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block
- Twemoji init before </body>: <script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script>

CHAIN CONTENT — inside a .container (max-width 1200px, margin 0 auto):
- Each cause-effect pair in a SINGLE card (.chain-card) with 2rem gap between different cards
- Inside each card: "Cause:" label in bold purple, followed by cause text, then "Effect:" label in bold teal, followed by effect text
- All cards have fully rounded corners (16px border-radius on all sides)
- Card background: white with shadow, border-left 6px solid #6366F1, padding 1.5rem
- Cause label: font-weight 700, color #A855F7
- Effect label: font-weight 700, color #14B8A6
- Vertical chain layout with clear directional flow
- Key Insights box at the end summarizing the chain
- Section title style: font-size 1.8em, font-weight 600, color #1F2937, border-bottom 3px solid #6366F1, margin-bottom 20px
- CRITICAL: Each card contains BOTH cause and effect. Format: "Cause: <description>" on one line, "Effect: <description>" on next line

KATEX FOR MATH: Use $$...$$ for display equations and \\(...\\) for inline math in any formula or equation content. Use LaTeX: \\frac{}{}, \\sqrt{}, \\pi, \\Delta, \\sum, \\int etc. NEVER use raw Unicode math symbols.

OUTPUT STRUCTURE — USE THIS EXACT HTML SKELETON:
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}]})"></script><script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter','Manrope','Lexend',sans-serif;background:linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%);min-height:100vh;padding:20px;color:#1F2937}header{background:linear-gradient(135deg,#6366F1 0%,#14B8A6 100%);border-radius:20px;padding:40px;text-align:center;margin-bottom:30px;box-shadow:0 8px 32px rgba(99,102,241,0.15)}.header-icon{font-size:48px;margin-bottom:10px}.header-title{color:white;font-size:2.5em;font-weight:700;margin-bottom:8px}.header-subtitle{color:rgba(255,255,255,0.9);font-size:0.95em;font-weight:300}.container{max-width:1200px;margin:0 auto}.section{margin-bottom:40px}.section-title{font-size:1.8em;font-weight:600;color:#1F2937;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #6366F1}img.emoji{height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block}.katex{font-size:1em}.chain{display:flex;flex-direction:column;align-items:center;gap:2rem}.chain-card{background:white;border-radius:16px;padding:1.5rem 2rem;box-shadow:0 4px 16px rgba(0,0,0,0.08);border-left:6px solid #6366F1;min-width:260px;max-width:600px;width:100%;text-align:left}.chain-card:nth-child(1){background:#faf5ff;border-left-color:#A855F7}.chain-card:nth-child(2){background:#f0fdfa;border-left-color:#14B8A6}.chain-card:nth-child(3){background:#eff6ff;border-left-color:#3B82F6}.chain-card:nth-child(4){background:#fff7ed;border-left-color:#F59E0B}.chain-card:nth-child(5){background:#f0fdf4;border-left-color:#10B981}.chain-card:nth-child(6){background:#fef2f2;border-left-color:#EF4444}.chain-card:nth-child(7){background:#faf5ff;border-left-color:#A855F7}.chain-card:nth-child(8){background:#f0fdfa;border-left-color:#14B8A6}.chain-card p{margin:0;font-size:0.95em;line-height:1.8;color:#374151}.cause-label{font-weight:700;color:#A855F7}.effect-label{font-weight:700;color:#14B8A6;margin-top:12px;display:block}.insights-box{background:white;border-radius:16px;padding:20px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border-left:6px solid #6366F1;margin-top:20px}.insights-box h3{font-size:1.1em;font-weight:600;color:#6366F1;margin-bottom:10px}.insights-box p{font-size:0.875rem;color:#374151;line-height:1.6}footer{background:white;border-radius:16px;padding:25px;text-align:center;color:#6B7280;font-size:0.9em;box-shadow:0 4px 16px rgba(0,0,0,0.08);margin-top:40px}@media(max-width:768px){.header-title{font-size:1.8em}}</style></head><body><header><div class="header-icon">SUBJECT EMOJI HERE</div><div class="header-title">Cause &amp; Effect: ${sectionNumber}</div><div class="header-subtitle">Curated Summary | Powered by DATADNA AI Study Platform</div></header><div class="container"><section class="section"><h2 class="section-title">Cause &amp; Effect Analysis</h2><div class="chain"><div class="chain-card"><p><span class="cause-label">⚡ Cause:</span> CAUSE 1 DESCRIPTION HERE</p><p><span class="effect-label">Effect:</span> EFFECT 1 DESCRIPTION HERE</p></div><div class="chain-card"><p><span class="cause-label">⚡ Cause:</span> CAUSE 2 DESCRIPTION HERE</p><p><span class="effect-label">Effect:</span> EFFECT 2 DESCRIPTION HERE</p></div></div><div class="insights-box"><h3>💡 Key Insights</h3><p>KEY INSIGHTS TEXT HERE</p></div></section></div><footer>© 2025 DATADNA AI Study Platform — Cause &amp; Effect Chain Generated by AI</footer><script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script></body></html>

CONSTRAINTS:
- HEADER: gradient background, large emoji icon, title "Cause & Effect: ${sectionNumber}", subtitle exactly as shown
- FOOTER: white card style, text "© 2025 DATADNA AI Study Platform — Cause & Effect Chain Generated by AI"
- STRUCTURE: Each .chain-card contains BOTH cause and effect in a single white card with 2rem gap between different cards
- LABELING: Use <span class="cause-label">⚡ Cause:</span> followed by description, then <span class="effect-label">Effect:</span> followed by description
- ALL CARDS: border-radius 16px, different light pastel background per card (cycles through purple/teal/blue/orange/green/red), matching left border accent color
- Replace all placeholder text with actual content from the document
- Minified HTML (one continuous line)

RETURN ONLY THE HTML. NOTHING ELSE.`;
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

  return `Generate a Timeline Visual for: ${topicName} with ${contentDepth} depth in ${outputLanguage} language.
Bloom's Taxonomy Level — Apply (Use Knowledge): Focus on application — place concepts in real chronological or contextual sequences.

HEADER AND FOOTER — USE EXACTLY THIS STYLE (same as Ready Reckoner):
- header: background linear-gradient(135deg,#6366F1 0%,#14B8A6 100%), border-radius 20px, padding 40px, text-align center, box-shadow 0 8px 32px rgba(99,102,241,0.15)
- header-icon: font-size 48px, margin-bottom 10px, relevant subject emoji
- header-title: "Timeline: ${sectionNumber}", color white, font-size 2.5em, font-weight 700
- header-subtitle: "Curated Summary | Powered by DATADNA AI Study Platform", color rgba(255,255,255,0.9), font-size 0.95em
- footer: background white, border-radius 16px, padding 25px, text-align center, color #6B7280, font-size 0.9em, box-shadow 0 4px 16px rgba(0,0,0,0.08), margin-top 40px
- footer text: "© 2025 DATADNA AI Study Platform — Timeline Visual Generated by AI"
- body: font-family Inter/Manrope/Lexend, background linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%), padding 20px
- Include Twemoji: <script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script>
- img.emoji CSS: height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block
- Twemoji init before </body>: <script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script>

TIMELINE CONTENT — inside a .container (max-width 1200px, margin 0 auto):
- Central vertical timeline bar: 4px wide, gradient Blue #3B82F6 to Purple #8B5CF6
- Event nodes alternately left and right of timeline, circular date markers (40px diameter, gradient background, white text)
- Event cards: white background, rounded 12px, padding 1.5rem, shadow 0 4px 12px rgba(0,0,0,0.1), colored left border 4px solid
- 6-color rotation: Blue #3B82F6, Green #10B981, Orange #F59E0B, Red #EF4444, Purple #8B5CF6, Teal #14B8A6
- 8-12 chronological events. Icons: 📅 for dates, ⭐ for milestones, 🌍 for geographical events
- Section title style: font-size 1.8em, font-weight 600, color #1F2937, border-bottom 3px solid #6366F1, margin-bottom 20px

KATEX FOR MATH: Use $$...$$ for display equations and \\(...\\) for inline math in any formula or equation content. Use LaTeX: \\frac{}{}, \\sqrt{}, \\pi, \\Delta, \\sum, \\int etc. NEVER use raw Unicode math symbols.

OUTPUT STRUCTURE — USE THIS EXACT HTML SKELETON:
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}]})"></script><script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter','Manrope','Lexend',sans-serif;background:linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%);min-height:100vh;padding:20px;color:#1F2937}header{background:linear-gradient(135deg,#6366F1 0%,#14B8A6 100%);border-radius:20px;padding:40px;text-align:center;margin-bottom:30px;box-shadow:0 8px 32px rgba(99,102,241,0.15)}.header-icon{font-size:48px;margin-bottom:10px}.header-title{color:white;font-size:2.5em;font-weight:700;margin-bottom:8px}.header-subtitle{color:rgba(255,255,255,0.9);font-size:0.95em;font-weight:300}.container{max-width:1200px;margin:0 auto}.section{margin-bottom:40px}.section-title{font-size:1.8em;font-weight:600;color:#1F2937;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #6366F1}img.emoji{height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block}.katex{font-size:1em}.timeline{position:relative;padding:20px 0}.timeline::before{content:'';position:absolute;left:50%;top:0;bottom:0;width:4px;background:linear-gradient(to bottom,#3B82F6,#8B5CF6);transform:translateX(-50%)}.timeline-item{display:flex;justify-content:flex-end;padding-right:calc(50% + 30px);margin-bottom:2rem;position:relative}.timeline-item:nth-child(even){justify-content:flex-start;padding-right:0;padding-left:calc(50% + 30px)}.timeline-marker{position:absolute;left:50%;top:0;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6366F1,#14B8A6);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.75em;transform:translateX(-50%);z-index:1}.timeline-card{background:white;border-radius:12px;padding:1.5rem;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:420px;border-left:4px solid #6366F1}.timeline-date{font-weight:700;font-size:0.9em;margin-bottom:6px}.timeline-title{font-size:1rem;font-weight:600;color:#1F2937;margin-bottom:8px}.timeline-desc{font-size:0.875rem;color:#6B7280;line-height:1.6}footer{background:white;border-radius:16px;padding:25px;text-align:center;color:#6B7280;font-size:0.9em;box-shadow:0 4px 16px rgba(0,0,0,0.08);margin-top:40px}@media(max-width:768px){.header-title{font-size:1.8em}.timeline::before{left:20px}.timeline-item,.timeline-item:nth-child(even){justify-content:flex-start;padding-left:60px;padding-right:0}.timeline-marker{left:20px}}</style></head><body><header><div class="header-icon">SUBJECT EMOJI HERE</div><div class="header-title">Timeline: ${sectionNumber}</div><div class="header-subtitle">Curated Summary | Powered by DATADNA AI Study Platform</div></header><div class="container"><section class="section"><h2 class="section-title">Chronological Timeline</h2><div class="timeline">TIMELINE ITEMS HERE</div></section></div><footer>© 2025 DATADNA AI Study Platform — Timeline Visual Generated by AI</footer><script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script></body></html>

CONSTRAINTS:
- HEADER: gradient background, large emoji icon, title "Timeline: ${sectionNumber}", subtitle exactly as shown
- FOOTER: white card style, text "© 2025 DATADNA AI Study Platform — Timeline Visual Generated by AI"
- Replace all placeholder text with actual content from the document
- Minified HTML (one continuous line)

RETURN ONLY THE HTML. NOTHING ELSE.`;
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

  return `Generate a Key Formula Sheet for: ${topicName} with ${contentDepth} depth in ${outputLanguage} language.
Bloom's Taxonomy Level — Remember (Recall & Recognition): Focus on recall and recognition — present formulas, constants, and rules for memorisation.

HEADER AND FOOTER — USE EXACTLY THIS STYLE (same as Ready Reckoner):
- header: background linear-gradient(135deg,#6366F1 0%,#14B8A6 100%), border-radius 20px, padding 40px, text-align center, box-shadow 0 8px 32px rgba(99,102,241,0.15)
- header-icon: font-size 48px, margin-bottom 10px, relevant subject emoji
- header-title: "Key Formula Sheet: ${sectionNumber}", color white, font-size 2.5em, font-weight 700
- header-subtitle: "Curated Summary | Powered by DATADNA AI Study Platform", color rgba(255,255,255,0.9), font-size 0.95em
- footer: background white, border-radius 16px, padding 25px, text-align center, color #6B7280, font-size 0.9em, box-shadow 0 4px 16px rgba(0,0,0,0.08), margin-top 40px
- footer text: "© 2025 DATADNA AI Study Platform — Key Formula Sheet Generated by AI"
- body: font-family Inter/Manrope/Lexend, background linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%), padding 20px
- Include Twemoji: <script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script>
- img.emoji CSS: height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block
- Twemoji init before </body>: <script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script>

FORMULA CONTENT — inside a .container (max-width 1200px, margin 0 auto):
- Formula cards grid: 2-column, each card with light gradient background (linear-gradient(135deg,#EEF2FF,#FFFFFF)), rounded 16px, padding 2rem, shadow 0 6px 16px rgba(0,0,0,0.08)
- Formula display: rendered using KaTeX — wrap ALL formulas in $...$ delimiters inside .formula-display div
- Formula name badge: Blue #3B82F6 background, white text, rounded-full, padding 0.5rem 1rem
- Each card: formula name badge, formula display (KaTeX $...$), 'Where' section (variable definitions using inline KaTeX \(...\)), 'Usage' context, 'Example' worked calculation
- Difficulty badge: Easy=Green #10B981, Medium=Orange #F59E0B, Hard=Red #EF4444
- KATEX RULES — READ CAREFULLY:
  1. ONLY use LaTeX/KaTeX for actual mathematical or chemical expressions (equations, formulas with symbols, fractions, exponents, Greek letters, etc.). Examples of VALID LaTeX use: $E = mc^2$, $F = \\frac{mv^2}{r}$, $\\sqrt{a^2+b^2}$, $H_2O$, $\\Delta G = \\Delta H - T\\Delta S$.
  2. For biology, history, geography, or any non-math topic — write ALL content as plain HTML text. Do NOT use \\text{}, \\mathrm{}, or any LaTeX command for plain words.
  3. FORBIDDEN PATTERN — never do this: \\text{Cell Membrane} or \\text{Microorganisms} or \\text{Any Plain Words}. These are plain words — write them directly in HTML: <span>Cell Membrane</span> or just Cell Membrane.
  4. If a topic has NO mathematical formulas (e.g. biology definitions, history facts, geography terms), the .formula-display div must contain plain HTML text — NOT LaTeX. Example for biology: <div class="formula-display">Cell Membrane Function: Controls what enters and exits the cell</div>.
  5. LaTeX is ONLY for symbols like: numbers, variables (x, y, n), operators (+, -, =, ×), fractions, roots, integrals, Greek letters, subscripts/superscripts in a mathematical context.
- Section title style: font-size 1.8em, font-weight 600, color #1F2937, border-bottom 3px solid #6366F1, margin-bottom 20px

OUTPUT STRUCTURE — USE THIS EXACT HTML SKELETON:
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$',right:'$',display:true},{left:'\\(',right:'\\)',display:false}]})"></script><script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter','Manrope','Lexend',sans-serif;background:linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%);min-height:100vh;padding:20px;color:#1F2937}header{background:linear-gradient(135deg,#6366F1 0%,#14B8A6 100%);border-radius:20px;padding:40px;text-align:center;margin-bottom:30px;box-shadow:0 8px 32px rgba(99,102,241,0.15)}.header-icon{font-size:48px;margin-bottom:10px}.header-title{color:white;font-size:2.5em;font-weight:700;margin-bottom:8px}.header-subtitle{color:rgba(255,255,255,0.9);font-size:0.95em;font-weight:300}.container{max-width:1200px;margin:0 auto}.section{margin-bottom:40px}.section-title{font-size:1.8em;font-weight:600;color:#1F2937;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #6366F1}img.emoji{height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block}.formula-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}.formula-card{background:linear-gradient(135deg,#EEF2FF,#FFFFFF);border-radius:16px;padding:2rem;box-shadow:0 6px 16px rgba(0,0,0,0.08)}.formula-badge{display:inline-block;background:#3B82F6;color:white;border-radius:999px;padding:0.4rem 1rem;font-size:0.85em;font-weight:600;margin-bottom:12px}.formula-display{font-size:1.2rem;color:#1F2937;background:#F8FAFC;border-radius:8px;padding:14px 16px;margin-bottom:12px;border-left:4px solid #6366F1;text-align:center;overflow-x:auto}.formula-section{margin-bottom:10px}.formula-section-label{font-size:0.75em;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px}.formula-section-text{font-size:0.875rem;color:#374151;line-height:1.6}.difficulty{display:inline-block;border-radius:999px;padding:0.25rem 0.75rem;font-size:0.75em;font-weight:600;margin-top:8px}.easy{background:#D1FAE5;color:#065F46}.medium{background:#FEF3C7;color:#92400E}.hard{background:#FEE2E2;color:#991B1B}.katex-display{margin:0.3em 0}.katex{font-size:1.1em}footer{background:white;border-radius:16px;padding:25px;text-align:center;color:#6B7280;font-size:0.9em;box-shadow:0 4px 16px rgba(0,0,0,0.08);margin-top:40px}@media(max-width:768px){.header-title{font-size:1.8em}.formula-grid{grid-template-columns:1fr}}</style></head><body><header><div class="header-icon">SUBJECT EMOJI HERE</div><div class="header-title">Key Formula Sheet: ${sectionNumber}</div><div class="header-subtitle">Curated Summary | Powered by DATADNA AI Study Platform</div></header><div class="container"><section class="section"><h2 class="section-title">Formulas &amp; Equations</h2><div class="formula-grid">FORMULA CARDS HERE — each .formula-display must contain $LaTeX formula here$</div></section></div><footer>© 2025 DATADNA AI Study Platform — Key Formula Sheet Generated by AI</footer><script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script></body></html>

CONSTRAINTS:
- HEADER: gradient background, large emoji icon, title "Key Formula Sheet: ${sectionNumber}", subtitle exactly as shown
- FOOTER: white card style, text "© 2025 DATADNA AI Study Platform — Key Formula Sheet Generated by AI" — THE FOOTER ELEMENT MUST ALWAYS BE THE LAST ELEMENT BEFORE </body>. DO NOT OMIT THE FOOTER UNDER ANY CIRCUMSTANCES.
- KATEX: Only use $...$ or \\(...\\) for actual math/science formulas with symbols. For non-math topics (biology, history, etc.), write plain HTML text in .formula-display — NEVER use \\text{}, \\mathrm{}, or any LaTeX command for plain words. A bare \\text{Word} outside $...$ will render as broken text.
- Replace all placeholder text with actual content from the document
- Minified HTML (one continuous line)

RETURN ONLY THE HTML. NOTHING ELSE.`;
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

  return `Generate a Chapter Summary for: ${topicName} with ${contentDepth} depth in ${outputLanguage} language.
Bloom's Taxonomy Level — Understand (Comprehension): Focus on comprehension — summarise main ideas to support concept clarity and understanding.

HEADER AND FOOTER — USE EXACTLY THIS STYLE (same as Ready Reckoner):
- header: background linear-gradient(135deg,#6366F1 0%,#14B8A6 100%), border-radius 20px, padding 40px, text-align center, box-shadow 0 8px 32px rgba(99,102,241,0.15)
- header-icon: font-size 48px, margin-bottom 10px, relevant subject emoji
- header-title: "Chapter Summary: ${sectionNumber}", color white, font-size 2.5em, font-weight 700
- header-subtitle: "Curated Summary | Powered by DATADNA AI Study Platform", color rgba(255,255,255,0.9), font-size 0.95em
- footer: background white, border-radius 16px, padding 25px, text-align center, color #6B7280, font-size 0.9em, box-shadow 0 4px 16px rgba(0,0,0,0.08), margin-top 40px
- footer text: "© 2025 DATADNA AI Study Platform — Chapter Summary Generated by AI"
- body: font-family Inter/Manrope/Lexend, background linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%), padding 20px
- Include Twemoji: <script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script>
- img.emoji CSS: height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block
- Twemoji init before </body>: <script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script>

SUMMARY CONTENT — inside a .container (max-width 1200px, margin 0 auto):
- Structured sections with clear hierarchy, soft section dividers (1px solid #E5E7EB), generous line spacing (1.8)
- Section header backgrounds: Blue #EEF2FF for Overview, Green #F0FDF4 for Key Concepts, Yellow #FFFBEB for Important Points, Purple #FAF5FF for Conclusion
- Include: Chapter Overview (2-3 paragraphs), Learning Objectives (5-8 items), Key Concepts & Definitions, Important Points (10-15 takeaways with colored left borders), Formulas & Rules (if applicable), Summary & Conclusion, Practice Questions (5-8)
- Icons: 📖 sections, ✓ key points, 💡 insights, ⚠️ important notes, 📝 examples
- Section title style: font-size 1.8em, font-weight 600, color #1F2937, border-bottom 3px solid #6366F1, margin-bottom 20px

OUTPUT STRUCTURE — USE THIS EXACT HTML SKELETON:
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$',right:'$',display:true},{left:'\\(',right:'\\)',display:false}]})"></script><script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter','Manrope','Lexend',sans-serif;background:linear-gradient(135deg,#F9FAFB 0%,#EEF2FF 100%);min-height:100vh;padding:20px;color:#1F2937}header{background:linear-gradient(135deg,#6366F1 0%,#14B8A6 100%);border-radius:20px;padding:40px;text-align:center;margin-bottom:30px;box-shadow:0 8px 32px rgba(99,102,241,0.15)}.header-icon{font-size:48px;margin-bottom:10px}.header-title{color:white;font-size:2.5em;font-weight:700;margin-bottom:8px}.header-subtitle{color:rgba(255,255,255,0.9);font-size:0.95em;font-weight:300}.container{max-width:1200px;margin:0 auto}.section{margin-bottom:40px}.section-title{font-size:1.8em;font-weight:600;color:#1F2937;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #6366F1;display:flex;align-items:center;gap:10px}.section-title img.emoji{height:1.2em;width:1.2em;vertical-align:middle}img.emoji{height:1em;width:1em;margin:0 0.05em 0 0.1em;vertical-align:-0.1em;display:inline-block}.katex{font-size:1em}.content-box{background:white;border-radius:16px;padding:25px;box-shadow:0 4px 16px rgba(0,0,0,0.08);margin-bottom:20px;line-height:1.8}.content-box.blue{background:#EEF2FF;border-left:6px solid #6366F1}.content-box.green{background:#F0FDF4;border-left:6px solid #10B981}.content-box.yellow{background:#FFFBEB;border-left:6px solid #F59E0B}.content-box.purple{background:#FAF5FF;border-left:6px solid #8B5CF6}.content-box h3{font-size:1.1em;font-weight:600;color:#1F2937;margin-bottom:10px}.content-box p,.content-box li{font-size:0.95em;color:#374151;line-height:1.8}.content-box ul,.content-box ol{padding-left:1.5rem}.key-point{border-left:4px solid #6366F1;padding:8px 16px;margin-bottom:8px;background:#F9FAFB;border-radius:0 8px 8px 0;font-size:0.9em;color:#374151}footer{background:white;border-radius:16px;padding:25px;text-align:center;color:#6B7280;font-size:0.9em;box-shadow:0 4px 16px rgba(0,0,0,0.08);margin-top:40px}@media(max-width:768px){.header-title{font-size:1.8em}}</style></head><body><header><div class="header-icon">SUBJECT EMOJI HERE</div><div class="header-title">Chapter Summary: ${sectionNumber}</div><div class="header-subtitle">Curated Summary | Powered by DATADNA AI Study Platform</div></header><div class="container"><section class="section"><h2 class="section-title">&#x1F4D6; Chapter Overview</h2><div class="content-box blue">OVERVIEW TEXT HERE</div></section><section class="section"><h2 class="section-title">&#x1F3AF; Learning Objectives</h2><div class="content-box green">OBJECTIVES LIST HERE</div></section><section class="section"><h2 class="section-title">&#x1F9E0; Key Concepts</h2>KEY CONCEPT BOXES HERE</section><section class="section"><h2 class="section-title">&#x2705; Important Points</h2>KEY POINTS HERE</section><section class="section"><h2 class="section-title">&#x1F4DD; Summary &amp; Conclusion</h2><div class="content-box purple">CONCLUSION TEXT HERE</div></section><section class="section"><h2 class="section-title">&#x2753; Practice Questions</h2><div class="content-box yellow">PRACTICE QUESTIONS HERE</div></section></div><footer>© 2025 DATADNA AI Study Platform — Chapter Summary Generated by AI</footer><script>window.addEventListener('DOMContentLoaded',(event)=>{twemoji.parse(document.body,{folder:'svg',ext:'.svg'});});</script></body></html>

CONSTRAINTS:
- HEADER: gradient background, large emoji icon, title "Chapter Summary: ${sectionNumber}", subtitle exactly as shown
- FOOTER: white card style, text "© 2025 DATADNA AI Study Platform — Chapter Summary Generated by AI"
- SECTION TITLE ICONS: use HTML numeric entities (&#x1F4D6; &#x1F3AF; &#x1F9E0; &#x2705; &#x1F4DD; &#x2753;) — Twemoji will convert these to SVG images automatically
- KATEX: use $...$ for any formulas/equations, \\(...\\) for inline math. NEVER use raw Unicode math symbols.
- Replace all placeholder text with actual content from the document
- Minified HTML (one continuous line)

RETURN ONLY THE HTML. NOTHING ELSE.`;
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

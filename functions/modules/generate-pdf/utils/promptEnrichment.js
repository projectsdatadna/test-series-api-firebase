// const Anthropic = require('@anthropic-ai/sdk');

// const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
// const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// /**
//  * Detect subject from label and description
//  * @param {string} label - The label/title
//  * @param {string} description - The description
//  * @returns {string} - Subject category
//  */
// function detectSubject(label, description) {
//   const text = `${label} ${description}`.toLowerCase();
  
//   if (/biology|cell|organism|plant|animal|dna|protein|enzyme|photosynthesis|respiration|mitosis|meiosis|genetics|evolution|ecosystem|organ|tissue|anatomy|physiology/.test(text)) {
//     return 'biology';
//   }
//   if (/physics|force|motion|energy|wave|light|sound|electricity|magnetism|quantum|relativity|mechanics|thermodynamics|optics/.test(text)) {
//     return 'physics';
//   }
//   if (/chemistry|atom|molecule|bond|reaction|element|compound|acid|base|oxidation|reduction|periodic|valence|orbital/.test(text)) {
//     return 'chemistry';
//   }
//   if (/math|geometry|algebra|calculus|trigonometry|equation|function|graph|vector|matrix|probability|statistics|number|fraction|decimal/.test(text)) {
//     return 'maths';
//   }
//   if (/history|war|revolution|empire|civilization|culture|society|government|politics|social|historical|era|period|dynasty/.test(text)) {
//     return 'history';
//   }
//   if (/geography|map|continent|country|region|climate|weather|terrain|mountain|river|ocean|latitude|longitude|location/.test(text)) {
//     return 'geography';
//   }
  
//   return 'general';
// }

// /**
//  * Detect language from text
//  * @param {string} text - Text to analyze
//  * @returns {object} - { code, name }
//  */
// function detectLanguage(text) {
//   // Tamil script detection
//   if (/[\u0B80-\u0BFF]/.test(text)) {
//     return { code: 'ta', name: 'Tamil' };
//   }
//   // Hindi script detection
//   if (/[\u0900-\u097F]/.test(text)) {
//     return { code: 'hi', name: 'Hindi' };
//   }
//   // Default to English
//   return { code: 'en', name: 'English' };
// }

// /**
//  * Get subject-specific prompt style guide
//  * @param {string} subject - Subject category
//  * @param {string} label - Label/title
//  * @param {string} description - Description
//  * @param {object} visualContext - Additional visual context
//  * @returns {string} - Style guide prompt
//  */
// function getSubjectPromptStyle(subject, label, description, visualContext = {}) {
//   const baseStyle = `Create a clear, educational diagram suitable for school students aged 10–18. Use simple, clean lines and bright, distinct colors. Avoid clutter. Focus on clarity and accuracy.`;

//   const subjectStyles = {
//     biology: `${baseStyle} For biology: Show anatomical structures clearly. Use realistic proportions. Color-code different systems (e.g., red for blood vessels, green for chloroplasts). Include cell structures, organs, or organisms as appropriate.`,
//     physics: `${baseStyle} For physics: Use arrows to show forces, motion, or energy flow. Include coordinate systems or reference frames if needed. Use consistent color coding for different types of forces or particles.`,
//     chemistry: `${baseStyle} For chemistry: Show molecular structures clearly. Use standard atomic colors (e.g., black for carbon, white for hydrogen, red for oxygen). Include electron shells or bonds as appropriate.`,
//     maths: `${baseStyle} For mathematics: Use clear geometric shapes. Include coordinate axes if needed. Use consistent colors for different elements (e.g., blue for lines, red for points). Make angles and measurements clear.`,
//     history: `${baseStyle} For history: Show timelines, maps, or key events. Use period-appropriate imagery where relevant. Include labels for dates, locations, or key figures.`,
//     geography: `${baseStyle} For geography: Show maps, terrain, or climate zones. Use standard map colors (e.g., blue for water, green for land). Include latitude/longitude lines if needed.`,
//     general: baseStyle,
//   };

//   return subjectStyles[subject] || subjectStyles.general;
// }

// /**
//  * Enrich prompt with Claude for image generation
//  * @param {string} rawPrompt - Raw prompt (can be JSON or text)
//  * @param {string} imageType - Type of image (e.g., 'diagram', 'illustration')
//  * @returns {Promise<object>} - { enrichedPrompt, title, labels, lang, isNonEnglish, imageStyle }
//  */
// async function enrichPromptWithClaude(rawPrompt, imageType) {
//   if (imageType === 'SKIP') return null;

//   let visualContext = null;
//   try {
//     visualContext = JSON.parse(rawPrompt);
//   } catch (_) {
//     // Not JSON, treat as plain text
//   }

//   const label = visualContext?.label || '';
//   const description = visualContext?.description || rawPrompt;
//   const subject = detectSubject(label, description);
//   const lang = detectLanguage(`${label} ${description}`);
//   const imageStyle = visualContext?.imageStyle || 'color';

//   console.log('─'.repeat(60));
//   console.log(`SUBJECT   : ${subject}`);
//   console.log(`LANGUAGE  : ${lang.name} (${lang.code})`);
//   console.log(`LABEL     : ${label}`);
//   console.log(`DESC      : ${description}`);
//   console.log('─'.repeat(60));
//   console.log(`IMAGE STYLE: ${imageStyle}`);

//   const stylePrompt = getSubjectPromptStyle(subject, label, description, visualContext);
//   const isNonEnglish = lang.code !== 'en';

//   let userContent;
//   if (isNonEnglish) {
//     // Tamil / Hindi: TWO outputs — no-text image prompt + labels JSON
//     userContent = `You are an expert educational illustration prompt writer. Your task has TWO parts. Return ONLY valid JSON — no markdown, no explanation. PART 1 — imagePrompt: Write a visual-only image generation prompt based on the style guide below. The image must have ABSOLUTELY ZERO text, ZERO labels, ZERO numbers, ZERO words. Purely visual illustration. Text will be overlaid separately via HTML. PART 2 — labels in ${lang.name}: List the key parts/structures of this diagram with their labels in ${lang.name} script. Each label needs an approximate position (x%, y%) within a 1024x1024 image. (0,0) = top-left, (100,100) = bottom-right. Style Guide: ${stylePrompt} Return this exact JSON structure: {   "imagePrompt": "purely visual prompt here — NO text in image",   "title": "diagram title in ${lang.name} script",   "labels": [     { "text": "${lang.name} label here", "x": 50, "y": 10 },     { "text": "${lang.name} label here", "x": 20, "y": 45 }   ] }`;
//   } else {
//     // English: normal labeled image prompt
//     userContent = `You are an expert educational illustration prompt writer. Based on the following style guide, write a precise image generation prompt. The image must be a clear educational labeled diagram for school students aged 10–18. Text rules: - Include a bold title at the very top in English - Add short labels (1–3 words) with thin callout lines to each key part - Style like a Cleveland Clinic medical diagram or school science textbook - No paragraph text — ONLY title + part labels with pointer lines Style Guide: ${stylePrompt} Write the final image generation prompt in under 150 words. Return ONLY the prompt text. No explanation. No markdown.`;
//   }

//   console.log('PROMPT TO CLAUDE:');
//   console.log(userContent);
//   console.log('─'.repeat(60));

//   const msg = await anthropic.messages.create({
//     model: CLAUDE_MODEL,
//     max_tokens: 600,
//     temperature: 0.2,
//     messages: [{ role: 'user', content: userContent }],
//   });

//   const raw = msg.content?.[0]?.text?.trim() || '';

//   console.log('CLAUDE RESPONSE:');
//   console.log(raw);
//   console.log('─'.repeat(60));

//   if (isNonEnglish) {
//     // Parse JSON response for Tamil/Hindi
//     let parsed = {};
//     try {
//       const jsonMatch = raw.match(/\{[\s\S]*\}/);
//       parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
//     } catch (e) {
//       console.warn('JSON parse failed, using fallback');
//       parsed = { imagePrompt: description, title: label, labels: [] };
//     }

//     return {
//       enrichedPrompt: parsed.imagePrompt || description,
//       title: parsed.title || label,
//       labels: Array.isArray(parsed.labels) ? parsed.labels : [],
//       lang,
//       isNonEnglish: true,
//       imageStyle,
//     };
//   } else {
//     // Plain text response for English
//     return {
//       enrichedPrompt: raw || description,
//       title: label,
//       labels: [],
//       lang,
//       isNonEnglish: false,
//       imageStyle,
//     };
//   }
// }

// module.exports = {
//   detectSubject,
//   detectLanguage,
//   getSubjectPromptStyle,
//   enrichPromptWithClaude,
// };

const axios = require('axios');

const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_CONTENT_DEPLOYMENT3;
const AZURE_OPENAI_API_KEY    = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT   = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_API_VERSION       = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

/**
 * Detect subject from label and description
 */
function detectSubject(label, description) {
  const text = `${label} ${description}`.toLowerCase();
  
  if (/biology|cell|organism|plant|animal|dna|protein|enzyme|photosynthesis|respiration|mitosis|meiosis|genetics|evolution|ecosystem|organ|tissue|anatomy|physiology/.test(text)) {
    return 'biology';
  }
  if (/physics|force|motion|energy|wave|light|sound|electricity|magnetism|quantum|relativity|mechanics|thermodynamics|optics/.test(text)) {
    return 'physics';
  }
  if (/chemistry|atom|molecule|bond|reaction|element|compound|acid|base|oxidation|reduction|periodic|valence|orbital/.test(text)) {
    return 'chemistry';
  }
  if (/math|geometry|algebra|calculus|trigonometry|equation|function|graph|vector|matrix|probability|statistics|number|fraction|decimal/.test(text)) {
    return 'maths';
  }
  if (/history|war|revolution|empire|civilization|culture|society|government|politics|social|historical|era|period|dynasty/.test(text)) {
    return 'history';
  }
  if (/geography|map|continent|country|region|climate|weather|terrain|mountain|river|ocean|latitude|longitude|location/.test(text)) {
    return 'geography';
  }
  
  return 'general';
}

/**
 * Detect language from text
 */
function detectLanguage(text) {
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return { code: 'ta', name: 'Tamil' };
  }
  if (/[\u0900-\u097F]/.test(text)) {
    return { code: 'hi', name: 'Hindi' };
  }
  return { code: 'en', name: 'English' };
}

/**
 * Get subject-specific prompt style guide
 */
function getSubjectPromptStyle(subject, label, description, visualContext = {}) {
  const baseStyle = `Create a clear, educational diagram suitable for school students aged 10–18. Use simple, clean lines and bright, distinct colors. Avoid clutter. Focus on clarity and accuracy.`;

  const subjectStyles = {
    biology: `${baseStyle} For biology: Show anatomical structures clearly. Use realistic proportions. Color-code different systems (e.g., red for blood vessels, green for chloroplasts). Include cell structures, organs, or organisms as appropriate.`,
    physics: `${baseStyle} For physics: Use arrows to show forces, motion, or energy flow. Include coordinate systems or reference frames if needed. Use consistent color coding for different types of forces or particles.`,
    chemistry: `${baseStyle} For chemistry: Show molecular structures clearly. Use standard atomic colors (e.g., black for carbon, white for hydrogen, red for oxygen). Include electron shells or bonds as appropriate.`,
    maths: `${baseStyle} For mathematics: Use clear geometric shapes. Include coordinate axes if needed. Use consistent colors for different elements (e.g., blue for lines, red for points). Make angles and measurements clear.`,
    history: `${baseStyle} For history: Show timelines, maps, or key events. Use period-appropriate imagery where relevant. Include labels for dates, locations, or key figures.`,
    geography: `${baseStyle} For geography: Show maps, terrain, or climate zones. Use standard map colors (e.g., blue for water, green for land). Include latitude/longitude lines if needed.`,
    general: baseStyle,
  };

  return subjectStyles[subject] || subjectStyles.general;
}

/**
 * Enrich prompt with Azure OpenAI for image generation
 */
async function enrichPromptWithClaude(rawPrompt, imageType) {
  if (imageType === 'SKIP') return null;

  let visualContext = null;
  try {
    visualContext = JSON.parse(rawPrompt);
  } catch (_) {
    // Not JSON, treat as plain text
  }

  const label       = visualContext?.label || '';
  const description = visualContext?.description || rawPrompt;
  const subject     = detectSubject(label, description);
  const lang        = detectLanguage(`${label} ${description}`);
  const imageStyle  = visualContext?.imageStyle || 'color';

  console.log('─'.repeat(60));
  console.log(`SUBJECT   : ${subject}`);
  console.log(`LANGUAGE  : ${lang.name} (${lang.code})`);
  console.log(`LABEL     : ${label}`);
  console.log(`DESC      : ${description}`);
  console.log('─'.repeat(60));
  console.log(`IMAGE STYLE: ${imageStyle}`);

  const stylePrompt  = getSubjectPromptStyle(subject, label, description, visualContext);
  const isNonEnglish = lang.code !== 'en';

  let userContent;
  if (isNonEnglish) {
    userContent = `You are an expert educational illustration prompt writer. Your task has TWO parts. Return ONLY valid JSON — no markdown, no explanation. PART 1 — imagePrompt: Write a visual-only image generation prompt based on the style guide below. The image must have ABSOLUTELY ZERO text, ZERO labels, ZERO numbers, ZERO words. Purely visual illustration. Text will be overlaid separately via HTML. PART 2 — labels in ${lang.name}: List the key parts/structures of this diagram with their labels in ${lang.name} script. Each label needs an approximate position (x%, y%) within a 1024x1024 image. (0,0) = top-left, (100,100) = bottom-right. Style Guide: ${stylePrompt} Return this exact JSON structure: {   "imagePrompt": "purely visual prompt here — NO text in image",   "title": "diagram title in ${lang.name} script",   "labels": [     { "text": "${lang.name} label here", "x": 50, "y": 10 },     { "text": "${lang.name} label here", "x": 20, "y": 45 }   ] }`;
  } else {
    userContent = `You are an expert educational illustration prompt writer. Based on the following style guide, write a precise image generation prompt. The image must be a clear educational labeled diagram for school students aged 10–18. Text rules: - Include a bold title at the very top in English - Add short labels (1–3 words) with thin callout lines to each key part - Style like a Cleveland Clinic medical diagram or school science textbook - No paragraph text — ONLY title + part labels with pointer lines Style Guide: ${stylePrompt} Write the final image generation prompt in under 150 words. Return ONLY the prompt text. No explanation. No markdown.`;
  }

  console.log('PROMPT TO AZURE OPENAI:');
  console.log(userContent);
  console.log('─'.repeat(60));

  // ✅ Azure OpenAI call — replaces anthropic.messages.create
  const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

  const response = await axios.post(
    azureUrl,
    {
      messages: [
        { role: 'user', content: userContent },
      ],
      max_tokens:  600,
      temperature: 0.2,
    },
    {
      headers: {
        'api-key':      AZURE_OPENAI_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  // ✅ Azure response shape
  const raw = response.data?.choices?.[0]?.message?.content?.trim() || '';

  console.log('AZURE OPENAI RESPONSE:');
  console.log(raw);
  console.log('─'.repeat(60));

  if (isNonEnglish) {
    let parsed = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch (e) {
      console.warn('JSON parse failed, using fallback');
      parsed = { imagePrompt: description, title: label, labels: [] };
    }

    return {
      enrichedPrompt: parsed.imagePrompt || description,
      title:          parsed.title || label,
      labels:         Array.isArray(parsed.labels) ? parsed.labels : [],
      lang,
      isNonEnglish:   true,
      imageStyle,
    };
  } else {
    return {
      enrichedPrompt: raw || description,
      title:          label,
      labels:         [],
      lang,
      isNonEnglish:   false,
      imageStyle,
    };
  }
}

module.exports = {
  detectSubject,
  detectLanguage,
  getSubjectPromptStyle,
  enrichPromptWithClaude,
};
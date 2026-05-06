
require("dotenv").config();
const axios = require("axios");
const {
  getMCQPrompt,
  getShortAnswerPrompt,
  getFillUpsPrompt,
  getLongAnswerPrompt,
  getMatchPrompt,
  getTrueOrFalsePrompt,
  getEssayPrompt,
  getInternalChoicePrompt,
  getExamDetailsPrompt,
  getVeryShortAnswerPrompt,
  getAssertionReasonPrompt,
  getCaseStudyPrompt,
  getDiagramBasedPrompt,
  getMapBasedPrompt,
  getDataInterpretationPrompt,
  getDifferentiatePrompt,
  getSequencingPrompt,
  getGeometryPrompt,
} = require("./prompts");

const { generateImageFromInstructions } = require("./imageGenerator");
const { splitChunksBySections } = require("../../utils/chunkSplitter");

const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_CONTENT_DEPLOYMENT3;
const AZURE_OPENAI_API_KEY    = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT   = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_API_VERSION       = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Build combined prompt for a given set of question type configs
// ─────────────────────────────────────────────────────────────────────────────
function buildCombinedPrompt(typeConfigs, difficultyLevel, subject, isSingleSection = false) {
  const {
    mcq, shortAnswer, fillups, longans, match, trueorfalse,
    essay, internalChoice, veryShortAnswer, assertionReason,
    caseStudy, diagramBased, mapBased, dataInterpretation,
    differentiate, sequencing, geometry, customTypes = {},
  } = typeConfigs;

  let prompt = `Generate all question types below in a single JSON response.\n\n`;

  prompt += `🚨 STRICT CONTENT COVERAGE (MANDATORY):
- Use ONLY the content provided in the context below
- DO NOT use external knowledge
- DO NOT introduce new concepts not present in the content
- Cover ALL important concepts from the provided content
- Every question MUST be based strictly on the given content

🚨 NO OUTSIDE CONTENT RULE:
- Do NOT add extra examples or facts not present in content
- Do NOT expand beyond the given material
- If information is missing, DO NOT guess

🚨 TRACEABILITY:
- Every question must be directly traceable to the provided content

`;

  if (!isSingleSection) {
    prompt += `🚨 MULTI-CHAPTER COVERAGE (CRITICAL FIX):
- The provided context may contain MULTIPLE chapters or sections.
- You MUST generate questions from ALL contexts, not just one.

MANDATORY DISTRIBUTION RULE:
- Questions must be DISTRIBUTED across ALL provided contexts
- Do NOT generate all questions from a single context
- Each context (e.g., [Context 1], [Context 2]) MUST contribute to the final questions

MINIMUM COVERAGE REQUIREMENT:
- Each context must contribute at least 30–50% of its key concepts
- If 2 chapters are provided → BOTH must appear in questions
- If 3 chapters → all 3 must appear

🚨 IDENTIFICATION RULE:
- Treat each [Context X] as a separate source
- Ensure questions reference concepts from DIFFERENT contexts

🚨 FAILURE CONDITION:
- If questions come from only one context → OUTPUT IS INVALID

`;
  }

  if (mcq && mcq.count > 0) {
    prompt += getMCQPrompt({ count: mcq.count, marks: mcq.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (shortAnswer && shortAnswer.count > 0) {
    prompt += getShortAnswerPrompt({ count: shortAnswer.count, marks: shortAnswer.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (fillups && fillups.count > 0) {
    prompt += getFillUpsPrompt({ count: fillups.count, marks: fillups.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (longans && longans.count > 0) {
    prompt += getLongAnswerPrompt({ count: longans.count, marks: longans.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (match && match.count > 0) {
    prompt += getMatchPrompt({ count: match.count, marks: match.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (trueorfalse && trueorfalse.count > 0) {
    prompt += getTrueOrFalsePrompt({ count: trueorfalse.count, marks: trueorfalse.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (essay && essay.count > 0) {
    prompt += getEssayPrompt({ count: essay.count, marks: essay.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (internalChoice && internalChoice.count > 0) {
    prompt += getInternalChoicePrompt({ count: internalChoice.count, marks: internalChoice.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (veryShortAnswer && veryShortAnswer.count > 0) {
    prompt += getVeryShortAnswerPrompt({ count: veryShortAnswer.count, marks: veryShortAnswer.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (assertionReason && assertionReason.count > 0) {
    prompt += getAssertionReasonPrompt({ count: assertionReason.count, marks: assertionReason.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (caseStudy && caseStudy.count > 0) {
    prompt += getCaseStudyPrompt({ marks: caseStudy.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (diagramBased && diagramBased.count > 0) {
    prompt += getDiagramBasedPrompt({ count: diagramBased.count, marks: diagramBased.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (mapBased && mapBased.count > 0) {
    prompt += getMapBasedPrompt({ count: mapBased.count, marks: mapBased.marks, difficultyLevel }) + "\n\n";
  }
  if (dataInterpretation && dataInterpretation.count > 0) {
    prompt += getDataInterpretationPrompt({ marks: dataInterpretation.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (differentiate && differentiate.count > 0) {
    prompt += getDifferentiatePrompt({ count: differentiate.count, marks: differentiate.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (sequencing && sequencing.count > 0) {
    prompt += getSequencingPrompt({ count: sequencing.count, marks: sequencing.marks, difficultyLevel, subject }) + "\n\n";
  }
  if (geometry && geometry.count > 0) {
    prompt += getGeometryPrompt({ count: geometry.count, marks: geometry.marks, difficultyLevel }) + "\n\n";
  }

  Object.entries(customTypes).forEach(([questionType, config]) => {
    if (config && config.count > 0) {
      prompt += getGenericQuestionPrompt(questionType, config.count, config.marks || 1, difficultyLevel) + "\n\n";
    }
  });

  const requestedKeys = [];
  if (mcq && mcq.count > 0) requestedKeys.push('"mcq"');
  if (shortAnswer && shortAnswer.count > 0) requestedKeys.push('"shortAnswer"');
  if (fillups && fillups.count > 0) requestedKeys.push('"fillups"');
  if (longans && longans.count > 0) requestedKeys.push('"longans"');
  if (match && match.count > 0) requestedKeys.push('"match"');
  if (trueorfalse && trueorfalse.count > 0) requestedKeys.push('"trueorfalse"');
  if (essay && essay.count > 0) requestedKeys.push('"essay"');
  if (internalChoice && internalChoice.count > 0) requestedKeys.push('"internalChoice"');
  if (veryShortAnswer && veryShortAnswer.count > 0) requestedKeys.push('"veryShortAnswer"');
  if (assertionReason && assertionReason.count > 0) requestedKeys.push('"assertionReason"');
  if (caseStudy && caseStudy.count > 0) requestedKeys.push('"caseStudy"');
  if (diagramBased && diagramBased.count > 0) requestedKeys.push('"diagramBased"');
  if (mapBased && mapBased.count > 0) requestedKeys.push('"mapBased"');
  if (dataInterpretation && dataInterpretation.count > 0) requestedKeys.push('"dataInterpretation"');
  if (differentiate && differentiate.count > 0) requestedKeys.push('"differentiate"');
  if (sequencing && sequencing.count > 0) requestedKeys.push('"sequencing"');
  if (geometry && geometry.count > 0) requestedKeys.push('"geometry"');
  Object.entries(customTypes).forEach(([questionType, config]) => {
    if (config && config.count > 0) requestedKeys.push(`"${questionType}"`);
  });

  prompt += `RETURN RESPONSE WITH EXACTLY THESE KEYS: {${requestedKeys.join(", ")}}.
CRITICAL REQUIREMENTS:
- Include ALL requested keys with COMPLETE data
- Do NOT truncate or omit any questions
- Generate EXACTLY the specified count for each question type
- For each question type, generate ALL questions in the array
- Fill in all fields (question, answer, options, etc.) completely
- Do not stop early or use placeholders`;

  return prompt;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generic prompt for custom question types
// ─────────────────────────────────────────────────────────────────────────────
function getGenericQuestionPrompt(questionType, count, marks, difficultyLevel) {
  return `Generate ${count} ${questionType} questions (${marks} marks each, ${difficultyLevel} difficulty):
[${Array.from({ length: count }, (_, i) => `{"questionNumber":${i + 1},"question":"","answer":"","marks":${marks}}`).join(",")}]
CRITICAL: You MUST generate all ${count} questions. Do not stop early. Fill in all question and answer fields completely.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Parse JSON from Azure response content
// ─────────────────────────────────────────────────────────────────────────────
function parseQuestionsFromContent(content) {
  let jsonStr = content;
  const markdownMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (markdownMatch) {
    jsonStr = markdownMatch[1];
  } else {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];
  }
  jsonStr = jsonStr.replace(/[\n\r\t]/g, " ").replace(/\s+/g, " ");
  return JSON.parse(jsonStr);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Call Azure OpenAI
// ─────────────────────────────────────────────────────────────────────────────
async function callAzureOpenAI(systemMessage, userMessage, cancelToken) {
  const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;
  const start = Date.now();
  const response = await axios.post(
    azureUrl,
    {
      messages: [
        { role: "system", content: systemMessage },
        { role: "user",   content: userMessage },
      ],
      max_tokens:  16384,
      temperature: 0.3,
    },
    {
      headers: {
        "api-key":      AZURE_OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
      timeout:     300000,
      cancelToken,
    }
  );
  console.log("[QuestionPaper] Azure responded in", Date.now() - start, "ms");
  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Merge per-section results, re-numbering questions sequentially
// ─────────────────────────────────────────────────────────────────────────────
function mergeQuestionsFromSections(allSectionResults) {
  const merged = {};
  allSectionResults.forEach(({ sectionTitle, questions }) => {
    Object.keys(questions).forEach((qType) => {
      if (!merged[qType]) merged[qType] = [];
      if (Array.isArray(questions[qType])) {
        const offset = merged[qType].length;
        questions[qType].forEach((q, i) => {
          merged[qType].push({
            ...q,
            questionNumber: offset + i + 1,
            sourceSection: sectionTitle,
          });
        });
      }
    });
  });
  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generate images for visual question types
// ─────────────────────────────────────────────────────────────────────────────
async function generateVisualImages(questions) {
  if (questions.diagramBased && Array.isArray(questions.diagramBased)) {
    for (let i = 0; i < questions.diagramBased.length; i++) {
      const q = questions.diagramBased[i];
      if (q.diagramInstructions || q.diagramImageUrl) {
        try {
          console.log(`[QuestionPaper] Processing diagram image ${i + 1}/${questions.diagramBased.length}`);
          q.diagramImage = await generateImageFromInstructions(
            q.diagramInstructions || "Generate a simple diagram",
            250, 250, "diagram", q.diagramImageUrl
          );
        } catch (err) {
          console.error(`[QuestionPaper] Error processing diagram image ${i + 1}:`, err.message);
          q.diagramImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
        }
      }
    }
  }

  if (questions.mapBased && Array.isArray(questions.mapBased)) {
    for (let i = 0; i < questions.mapBased.length; i++) {
      const q = questions.mapBased[i];
      if (q.mapInstructions || q.mapImageUrl) {
        try {
          console.log(`[QuestionPaper] Processing map image ${i + 1}/${questions.mapBased.length}`);
          q.mapImage = await generateImageFromInstructions(
            q.mapInstructions || "Generate a map of India",
            280, 300, "map", q.mapImageUrl
          );
        } catch (err) {
          console.error(`[QuestionPaper] Error processing map image ${i + 1}:`, err.message);
          q.mapImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
        }
      }
    }
  }

  if (questions.dataInterpretation && Array.isArray(questions.dataInterpretation)) {
    for (let i = 0; i < questions.dataInterpretation.length; i++) {
      const q = questions.dataInterpretation[i];
      if (q.dataInstructions || q.dataImageUrl) {
        try {
          console.log(`[QuestionPaper] Processing data interpretation image ${i + 1}/${questions.dataInterpretation.length}`);
          q.dataImage = await generateImageFromInstructions(
            q.dataInstructions || "Generate a data chart",
            280, 220, "data", q.dataImageUrl
          );
        } catch (err) {
          console.error(`[QuestionPaper] Error processing data interpretation image ${i + 1}:`, err.message);
          q.dataImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
async function generateQuestionPaper(req, res) {
  const timeoutSource = axios.CancelToken.source();
  const timeoutId = setTimeout(() => timeoutSource.cancel("Timeout after 300s"), 300000);

  try {
    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Azure OpenAI configuration missing (AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_CONTENT_DEPLOYMENT3)",
      });
    }

    const {
      chunks = [],
      perSectionMode = false,
      sectionJobs = [],
      duration = 60,
      difficultyLevel = "medium",
      subject = "",
      contentTypeId,
      documentId,
      userId,
      sectionIds = [],
      sectionNumbers = [],
      sectionTitles = [],
      topic,
      learningStyle = "visual",
      maxTokens = 16384,
      mcq,
      shortAnswer,
      fillups,
      longans,
      match,
      trueorfalse,
      essay,
      internalChoice,
      veryShortAnswer,
      assertionReason,
      caseStudy,
      diagramBased,
      mapBased,
      dataInterpretation,
      differentiate,
      sequencing,
      geometry,
      outputLanguage = "english",
    } = req.body;

    console.log("outputlanguage:", outputLanguage);
    console.log("perSectionMode:", perSectionMode, "| sectionJobs count:", sectionJobs.length);

    if (!chunks || chunks.length === 0) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Missing required field: chunks (array of chunk objects with text)",
      });
    }

    // Detect custom question type keys from request body
    const predefinedBodyKeys = [
      "fileIds", "chunks", "perSectionMode", "sectionJobs", "duration",
      "difficultyLevel", "subject", "contentTypeId", "documentId", "userId",
      "sectionIds", "sectionNumbers", "sectionTitles", "topic", "learningStyle",
      "maxTokens", "mcq", "shortAnswer", "fillups", "longans", "match",
      "trueorfalse", "essay", "internalChoice", "veryShortAnswer", "assertionReason",
      "caseStudy", "diagramBased", "mapBased", "dataInterpretation", "differentiate",
      "sequencing", "geometry", "outputLanguage",
    ];
    const customQuestionTypeKeys = Object.keys(req.body).filter(
      (key) => !predefinedBodyKeys.includes(key)
    );
    const customTypes = {};
    customQuestionTypeKeys.forEach((key) => {
      if (req.body[key] && req.body[key].count > 0) {
        customTypes[key] = req.body[key];
      }
    });

    let questions;
    let totalUsage = { prompt_tokens: 0, completion_tokens: 0 };

    // ════════════════════════════════════════════════════════════════════════
    // MODE A: PER-SECTION GENERATION (Using sectionJobs from frontend)
    // ════════════════════════════════════════════════════════════════════════
    if (perSectionMode && sectionJobs.length > 0) {
      console.log(`[QuestionPaper] PER-SECTION MODE: processing ${sectionJobs.length} section job(s)`);
      const allSectionResults = [];

      for (let jobIdx = 0; jobIdx < sectionJobs.length; jobIdx++) {
        const job = sectionJobs[jobIdx];
        const { sectionId, sectionTitle, questionTypes } = job;
        
        // Find the actual content for this section from chunks
        const sectionChunks = chunks.filter(chunk => 
          chunk.sectionId === sectionId || 
          chunk.id === sectionId ||
          chunk.sectionTitle === sectionTitle
        );
        
        if (sectionChunks.length === 0) {
          console.warn(`[QuestionPaper] No content found for section: ${sectionTitle}`);
          continue;
        }
        
        if (!questionTypes || Object.keys(questionTypes).length === 0) {
          console.warn(`[QuestionPaper] No question types for section: ${sectionTitle}`);
          continue;
        }
        
        console.log(`[QuestionPaper] Section ${jobIdx + 1}/${sectionJobs.length}: "${sectionTitle}"`);
        console.log(`  Question types:`, Object.keys(questionTypes));
        
        const predefinedQTypes = [
          "mcq", "shortAnswer", "fillups", "longans", "match", "trueorfalse",
          "essay", "internalChoice", "veryShortAnswer", "assertionReason",
          "caseStudy", "diagramBased", "mapBased", "dataInterpretation",
          "differentiate", "sequencing", "geometry",
        ];

        const sectionTypeConfigs = {
          mcq:                questionTypes.mcq                || null,
          shortAnswer:        questionTypes.shortAnswer        || null,
          fillups:            questionTypes.fillups            || null,
          longans:            questionTypes.longans            || null,
          match:              questionTypes.match              || null,
          trueorfalse:        questionTypes.trueorfalse        || null,
          essay:              questionTypes.essay              || null,
          internalChoice:     questionTypes.internalChoice     || null,
          veryShortAnswer:    questionTypes.veryShortAnswer    || null,
          assertionReason:    questionTypes.assertionReason    || null,
          caseStudy:          questionTypes.caseStudy          || null,
          diagramBased:       questionTypes.diagramBased       || null,
          mapBased:           questionTypes.mapBased           || null,
          dataInterpretation: questionTypes.dataInterpretation || null,
          differentiate:      questionTypes.differentiate      || null,
          sequencing:         questionTypes.sequencing         || null,
          geometry:           questionTypes.geometry           || null,
          customTypes:        {},
        };

        // Attach any custom types for this section
        Object.keys(questionTypes).forEach((key) => {
          if (!predefinedQTypes.includes(key)) {
            sectionTypeConfigs.customTypes[key] = questionTypes[key];
          }
        });

        const sectionCombinedPrompt = buildCombinedPrompt(
          sectionTypeConfigs, difficultyLevel, subject, true, outputLanguage
        );

        const sectionContextText = sectionChunks
          .map((chunk, idx) => `
==============================
CONTENT ${idx + 1}: ${chunk.sectionTitle || sectionTitle || "Topic"}
==============================

${chunk.text}
`)
          .join("\n\n");

        const sectionUserMessage = `${sectionCombinedPrompt}\n\nUse ONLY the following content to generate questions for this section:\n\n${sectionContextText}`;
        
        // System message for single section mode
        const singleSectionSystemMessage = `You are a question paper generator. Output ONLY valid JSON, nothing else.

🚨 IMPORTANT: You are generating questions for ONLY ONE section of content.
- Generate questions ONLY from this section's content
- Do NOT assume multiple sections exist
- Use ONLY the content provided below

🚨 STRICT RULES:
- Use ONLY the provided content
- DO NOT use external knowledge or assumptions
- Generate EXACTLY the requested number of questions
- Each question must be traceable to the content

⚠️ LANGUAGE: Generate all content in ${outputLanguage.toUpperCase()}

Return ONLY the JSON object. No markdown, no explanations.`;

        try {
          const sectionResponse = await callAzureOpenAI(
            singleSectionSystemMessage, 
            sectionUserMessage, 
            timeoutSource.token
          );
          
          const sectionContent = sectionResponse.data?.choices?.[0]?.message?.content ?? "";
          const sectionUsage = sectionResponse.data?.usage;
          
          totalUsage.prompt_tokens += sectionUsage?.prompt_tokens || 0;
          totalUsage.completion_tokens += sectionUsage?.completion_tokens || 0;
          
          const sectionQuestions = parseQuestionsFromContent(sectionContent);
          allSectionResults.push({
            sectionTitle: sectionTitle,
            questions: sectionQuestions
          });
          
          console.log(`[QuestionPaper] Section "${sectionTitle}" complete - keys:`, Object.keys(sectionQuestions));
          
        } catch (sectionErr) {
          console.error(`[QuestionPaper] Error generating section "${sectionTitle}":`, sectionErr.message);
          // Continue with other sections
        }
      }
      
      if (allSectionResults.length === 0) {
        clearTimeout(timeoutId);
        return res.status(500).json({
          success: false,
          message: "Failed to generate questions for any section"
        });
      }
      
      // Merge all section results
      questions = mergeQuestionsFromSections(allSectionResults);
      console.log(`[QuestionPaper] Per-section merge complete — final types: ${Object.keys(questions).join(", ")}`);
      
    } else {
      // ════════════════════════════════════════════════════════════════════════
      // MODE B: STANDARD — all chunks combined (original behaviour)
      // ════════════════════════════════════════════════════════════════════════
      console.log("[QuestionPaper] STANDARD MODE: all chunks combined into one prompt");
      
      const typeConfigs = {
        mcq, shortAnswer, fillups, longans, match, trueorfalse,
        essay, internalChoice, veryShortAnswer, assertionReason,
        caseStudy, diagramBased, mapBased, dataInterpretation,
        differentiate, sequencing, geometry, customTypes,
      };
      
      const combinedPrompt = buildCombinedPrompt(typeConfigs, difficultyLevel, subject, false, outputLanguage);
      
      const contextText = chunks
        .map((chunk, idx) => `
==============================
SECTION ${idx + 1}: ${chunk.sectionTitle || "Topic"}
==============================

${chunk.text}
`)
        .join("\n\n");
      
      const systemMessage = `You are a question paper generator. Output ONLY valid JSON, nothing else.

🚨 STRICT CONTENT COVERAGE (MANDATORY):
- Use ONLY the provided document context (chunks)
- DO NOT use prior knowledge, assumptions, or general knowledge
- DO NOT introduce new concepts not present in the source content
- Every question and answer MUST be directly traceable to the given content
- Ensure ALL important concepts from the content are covered through questions

🚨 MULTI-SECTION DISTRIBUTION (CRITICAL):
- The input contains MULTIPLE SECTIONS
- Generate questions from EACH section
- Ensure ALL sections are represented
- Each section must contribute questions
- Do NOT generate all questions from one section

🚨 OUTPUT RULES:
- Output ONLY the JSON object
- No explanations, no markdown, no extra text
- Start with { and end with }
- Do NOT truncate output

🚨 COUNT RULE:
- Generate EXACT number of questions for EACH type

⚠️ LANGUAGE: Generate all content in ${outputLanguage.toUpperCase()}
Do NOT mix languages`;

      const userMessage = `${combinedPrompt}\n\nUse the following context from the document to generate questions:\n\n${contextText}`;
      
      console.log(`[QuestionPaper] Calling Azure OpenAI (deployment: ${AZURE_OPENAI_DEPLOYMENT} | maxTokens: ${maxTokens})...`);
      
      const response = await callAzureOpenAI(systemMessage, userMessage, timeoutSource.token);
      clearTimeout(timeoutId);
      
      const content = response.data?.choices?.[0]?.message?.content ?? "";
      const finishReason = response.data?.choices?.[0]?.finish_reason;
      const usage = response.data?.usage;
      
      totalUsage.prompt_tokens = usage?.prompt_tokens || 0;
      totalUsage.completion_tokens = usage?.completion_tokens || 0;
      
      try {
        questions = parseQuestionsFromContent(content);
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        const wasTruncated = usage?.completion_tokens >= 16000 || finishReason === "length";
        
        clearTimeout(timeoutId);
        return res.status(500).json({
          success: false,
          message: wasTruncated
            ? "Response was truncated due to length. Please reduce the number of questions or simplify the requirements."
            : "Failed to parse question paper response",
          error: parseError.message,
          wasTruncated,
          tokenUsage: {
            inputTokens: usage?.prompt_tokens || 0,
            outputTokens: usage?.completion_tokens || 0,
            totalTokens: (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0),
          },
        });
      }
      
      // Validation for standard mode
      const predefinedQKeys = [
        "mcq", "shortAnswer", "fillups", "longans", "match", "trueorfalse",
        "essay", "internalChoice", "veryShortAnswer", "assertionReason",
        "caseStudy", "diagramBased", "mapBased", "dataInterpretation",
        "differentiate", "sequencing", "geometry", "customQuestions",
      ];
      
      const mismatches = [];
      if (mcq && mcq.count > 0 && (!questions.mcq || questions.mcq.length < mcq.count)) {
        mismatches.push(`mcq: requested ${mcq.count}, received ${questions.mcq?.length || 0}`);
      }
      if (shortAnswer && shortAnswer.count > 0 && (!questions.shortAnswer || questions.shortAnswer.length < shortAnswer.count)) {
        mismatches.push(`shortAnswer: requested ${shortAnswer.count}, received ${questions.shortAnswer?.length || 0}`);
      }
      if (longans && longans.count > 0 && (!questions.longans || questions.longans.length < longans.count)) {
        mismatches.push(`longans: requested ${longans.count}, received ${questions.longans?.length || 0}`);
      }
      
      if (mismatches.length > 0) {
        console.warn("WARNING: Question count mismatches detected:", mismatches);
      }
    }
    
    clearTimeout(timeoutId);
    
    // Generate images for visual question types
    console.log("[QuestionPaper] Generating images for visual questions...");
    await generateVisualImages(questions);
    console.log("[QuestionPaper] Image generation complete");
    
    // Exam details
    const examDetailsData = getExamDetailsPrompt({
      duration, difficultyLevel, subject,
      mcq, shortAnswer, fillups, longans, match, trueorfalse,
      essay, internalChoice, veryShortAnswer, assertionReason,
      caseStudy, diagramBased, mapBased, dataInterpretation,
      differentiate, sequencing, geometry,
    });
    
    // Final response
    const finalResponse = {
      success: true,
      data: {
        examDetails: examDetailsData.examDetails,
        sections: examDetailsData.sections,
        questions,
      },
      tokenUsage: {
        inputTokens: totalUsage.prompt_tokens,
        outputTokens: totalUsage.completion_tokens,
        totalTokens: totalUsage.prompt_tokens + totalUsage.completion_tokens,
      },
    };
    
    return res.status(200).json(finalResponse);
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (axios.isCancel(error)) {
      console.error("API request timeout (300s exceeded)");
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: "The question paper generation took too long. Please try again.",
      });
    }
    
    const azureMsg = error?.response?.data?.error?.message;
    console.error("Question paper generation error:", azureMsg || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate question paper",
      error: azureMsg || error.message,
    });
  }
}

module.exports = {
  generateQuestionPaper,
};
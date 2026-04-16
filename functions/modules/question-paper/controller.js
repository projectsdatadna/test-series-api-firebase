// require("dotenv").config();
// const {
//   getMCQPrompt,
//   getShortAnswerPrompt,
//   getFillUpsPrompt,
//   getLongAnswerPrompt,
//   getMatchPrompt,
//   getTrueOrFalsePrompt,
//   getEssayPrompt,
//   getInternalChoicePrompt,
//   getExamDetailsPrompt,
//   getVeryShortAnswerPrompt,
//   getAssertionReasonPrompt,
//   getCaseStudyPrompt,
//   getDiagramBasedPrompt,
//   getMapBasedPrompt,
//   getDataInterpretationPrompt,
//   getDifferentiatePrompt,
//   getSequencingPrompt,
//   getGeometryPrompt,
// } = require("./prompts");

// const { generateImageFromInstructions } = require("./imageGenerator");

// // Use native fetch (Node.js 18+) or import node-fetch
// let fetch;
// try {
//   fetch = globalThis.fetch;
// } catch (e) {
//   fetch = require("node-fetch");
// }

// // Generate question paper from uploaded file
// async function generateQuestionPaper(req, res) {
//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 second timeout

//   try {
//     const apiKey = process.env.CLAUDE_API_KEY;
//     if (!apiKey) {
//       clearTimeout(timeoutId);
//       return res.status(400).json({
//         success: false,
//         message: "Anthropic API key not configured",
//       });
//     }

//     // Extract parameters from request body
//     const {
//       chunks = [],
//       duration = 60,
//       difficultyLevel = "medium",
//       subject = "",
//       contentTypeId,
//       documentId,
//       userId,
//       sectionIds = [],
//       sectionNumbers = [],
//       sectionTitles = [],
//       topic,
//       learningStyle = "visual",
//       maxTokens = 16384,
//       mcq,
//       shortAnswer,
//       fillups,
//       longans,
//       match,
//       trueorfalse,
//       essay,
//       internalChoice,
//       veryShortAnswer,
//       assertionReason,
//       caseStudy,
//       diagramBased,
//       mapBased,
//       dataInterpretation,
//       differentiate,
//       sequencing,
//       geometry,
//     } = req.body;

//     // Validate required fields - chunks must be provided
//     if (!chunks || chunks.length === 0) {
//       clearTimeout(timeoutId);
//       return res.status(400).json({
//         success: false,
//         message: "Missing required field: chunks (array of chunk objects with text)",
//       });
//     }

//     // Get exam details and sections
//     const examDetailsData = getExamDetailsPrompt({
//       duration,
//       difficultyLevel,
//       subject,
//       mcq,
//       shortAnswer,
//       fillups,
//       longans,
//       match,
//       trueorfalse,
//       essay,
//       internalChoice,
//       veryShortAnswer,
//       assertionReason,
//       caseStudy,
//       diagramBased,
//       mapBased,
//       dataInterpretation,
//       differentiate,
//       sequencing,
//       geometry,
//     });

//     // Build combined prompt with all question types
//     let combinedPrompt =
//       "Generate all question types below in a single JSON response.\n\n";

//     if (mcq && mcq.count > 0) {
//       combinedPrompt +=
//         getMCQPrompt({
//           count: mcq.count,
//           marks: mcq.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (shortAnswer && shortAnswer.count > 0) {
//       combinedPrompt +=
//         getShortAnswerPrompt({
//           count: shortAnswer.count,
//           marks: shortAnswer.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (fillups && fillups.count > 0) {
//       combinedPrompt +=
//         getFillUpsPrompt({
//           count: fillups.count,
//           marks: fillups.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (longans && longans.count > 0) {
//       combinedPrompt +=
//         getLongAnswerPrompt({
//           count: longans.count,
//           marks: longans.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (match && match.count > 0) {
//       combinedPrompt +=
//         getMatchPrompt({
//           count: match.count,
//           marks: match.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (trueorfalse && trueorfalse.count > 0) {
//       combinedPrompt +=
//         getTrueOrFalsePrompt({
//           count: trueorfalse.count,
//           marks: trueorfalse.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (essay && essay.count > 0) {
//       combinedPrompt +=
//         getEssayPrompt({
//           count: essay.count,
//           marks: essay.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (internalChoice && internalChoice.count > 0) {
//       combinedPrompt +=
//         getInternalChoicePrompt({
//           count: internalChoice.count,
//           marks: internalChoice.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (veryShortAnswer && veryShortAnswer.count > 0) {
//       combinedPrompt +=
//         getVeryShortAnswerPrompt({
//           count: veryShortAnswer.count,
//           marks: veryShortAnswer.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (assertionReason && assertionReason.count > 0) {
//       combinedPrompt +=
//         getAssertionReasonPrompt({
//           count: assertionReason.count,
//           marks: assertionReason.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (caseStudy && caseStudy.count > 0) {
//       combinedPrompt +=
//         getCaseStudyPrompt({
//           marks: caseStudy.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (diagramBased && diagramBased.count > 0) {
//       combinedPrompt +=
//         getDiagramBasedPrompt({
//           count: diagramBased.count,
//           marks: diagramBased.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (mapBased && mapBased.count > 0) {
//       combinedPrompt +=
//         getMapBasedPrompt({
//           count: mapBased.count,
//           marks: mapBased.marks,
//           difficultyLevel,
//         }) + "\n\n";
//     }

//     if (dataInterpretation && dataInterpretation.count > 0) {
//       combinedPrompt +=
//         getDataInterpretationPrompt({
//           marks: dataInterpretation.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (differentiate && differentiate.count > 0) {
//       combinedPrompt +=
//         getDifferentiatePrompt({
//           count: differentiate.count,
//           marks: differentiate.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (sequencing && sequencing.count > 0) {
//       combinedPrompt +=
//         getSequencingPrompt({
//           count: sequencing.count,
//           marks: sequencing.marks,
//           difficultyLevel,
//           subject,
//         }) + "\n\n";
//     }

//     if (geometry && geometry.count > 0) {
//       combinedPrompt +=
//         getGeometryPrompt({
//           count: geometry.count,
//           marks: geometry.marks,
//           difficultyLevel,
//         }) + "\n\n";
//     }

//     // Helper function to generate generic prompt for undefined question types
//     function getGenericQuestionPrompt(questionType, count, marks, difficultyLevel) {
//       return `Generate ${count} ${questionType} questions (${marks} marks each, ${difficultyLevel} difficulty):
// [${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","answer":"","marks":${marks}}`).join(',')}]
// CRITICAL: You MUST generate all ${count} questions. Do not stop early. Fill in all question and answer fields completely.`;
//     }

//     // Handle any additional custom question types from request body
//     const predefinedKeys = ['fileIds', 'chunks', 'duration', 'difficultyLevel', 'subject', 'contentTypeId', 'documentId', 'userId', 'sectionIds', 'sectionNumbers', 'sectionTitles', 'topic', 'learningStyle', 'maxTokens', 'mcq', 'shortAnswer', 'fillups', 'longans', 'match', 'trueorfalse', 'essay', 'internalChoice', 'veryShortAnswer', 'assertionReason', 'caseStudy', 'diagramBased', 'mapBased', 'dataInterpretation', 'differentiate', 'sequencing', 'geometry'];
//     const customQuestionTypes = Object.keys(req.body).filter(key => !predefinedKeys.includes(key));
    
//     customQuestionTypes.forEach(questionType => {
//       const config = req.body[questionType];
//       if (config && config.count > 0) {
//         combinedPrompt += getGenericQuestionPrompt(
//           questionType,
//           config.count,
//           config.marks || 1,
//           difficultyLevel
//         ) + "\n\n";
//       }
//     });

//     // Add response format instructions
//     const requestedKeys = [];
//     if (mcq && mcq.count > 0) requestedKeys.push('"mcq"');
//     if (shortAnswer && shortAnswer.count > 0)
//       requestedKeys.push('"shortAnswer"');
//     if (fillups && fillups.count > 0) requestedKeys.push('"fillups"');
//     if (longans && longans.count > 0) requestedKeys.push('"longans"');
//     if (match && match.count > 0)
//       requestedKeys.push('"match"');
//     if (trueorfalse && trueorfalse.count > 0)
//       requestedKeys.push('"trueorfalse"');
//     if (essay && essay.count > 0) requestedKeys.push('"essay"');
//     if (internalChoice && internalChoice.count > 0)
//       requestedKeys.push('"internalChoice"');
//     if (veryShortAnswer && veryShortAnswer.count > 0)
//       requestedKeys.push('"veryShortAnswer"');
//     if (assertionReason && assertionReason.count > 0)
//       requestedKeys.push('"assertionReason"');
//     if (caseStudy && caseStudy.count > 0)
//       requestedKeys.push('"caseStudy"');
//     if (diagramBased && diagramBased.count > 0)
//       requestedKeys.push('"diagramBased"');
//     if (mapBased && mapBased.count > 0)
//       requestedKeys.push('"mapBased"');
//     if (dataInterpretation && dataInterpretation.count > 0)
//       requestedKeys.push('"dataInterpretation"');
//     if (differentiate && differentiate.count > 0)
//       requestedKeys.push('"differentiate"');
//     if (sequencing && sequencing.count > 0)
//       requestedKeys.push('"sequencing"');
//     if (geometry && geometry.count > 0)
//       requestedKeys.push('"geometry"');
    
//     // Add custom question types to requested keys
//     customQuestionTypes.forEach(questionType => {
//       const config = req.body[questionType];
//       if (config && config.count > 0) {
//         requestedKeys.push(`"${questionType}"`);
//       }
//     });

//     combinedPrompt += `RETURN RESPONSE WITH EXACTLY THESE KEYS: {${requestedKeys.join(", ")}}. 
// CRITICAL REQUIREMENTS:
// - Include ALL requested keys with COMPLETE data
// - Do NOT truncate or omit any questions
// - Generate EXACTLY the specified count for each question type
// - For each question type, generate ALL questions in the array
// - Fill in all fields (question, answer, options, etc.) completely
// - Do not stop early or use placeholders`;

//     // Make single API call with combined prompt
//     const contentArray = [
//       {
//         type: "text",
//         text: combinedPrompt,
//       },
//     ];

//     // Format chunks as context text
//     const contextText = chunks
//       .map((chunk, idx) => `[Context ${idx + 1}] ${chunk.text}`)
//       .join("\n\n");
    
//     contentArray.push({
//       type: "text",
//       text: `\n\nUse the following context from the document to generate questions:\n\n${contextText}`,
//     });

//     const response = await fetch("https://api.anthropic.com/v1/messages", {
//       method: "POST",
//       headers: {
//         "x-api-key": apiKey,
//         "anthropic-version": "2023-06-01",
//         "content-type": "application/json",
//       },
//       body: JSON.stringify({
//         model: "claude-haiku-4-5",
//         max_tokens: 16384, // Increased from 8192 to handle large question papers
//         temperature: 0.3,
//         system: `You are a question paper generator. Output ONLY valid JSON, nothing else.

// CRITICAL RULES:
// - Output ONLY the JSON object. No explanations, no text before or after, no markdown code blocks.
// - Do NOT wrap JSON in triple backticks or markdown formatting.
// - Generate EXACTLY the number of questions specified for EACH type - DO NOT TRUNCATE.
// - All questions must be based on provided document content only.
// - Never truncate or use placeholders - generate COMPLETE questions.
// - Return complete, filled data for ALL questions.
// - Ensure ALL requested question types are present in response.
// - Start with { and end with } - nothing else.
// - IMPORTANT: If you are asked to generate 12 Short Answer questions, you MUST generate exactly 12, not 10 or fewer.
// - Keep answers concise to fit within token limits while maintaining quality.`,
//         messages: [
//           {
//             role: "user",
//             content: contentArray,
//           },
//         ],
//       }),
//       signal: controller.signal,
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       console.error("Claude API Error Status:", response.status);
//       console.error(
//         "Claude API Error Response:",
//         JSON.stringify(error, null, 2),
//       );
//       clearTimeout(timeoutId);
//       return res.status(response.status).json({
//         success: false,
//         message: "Failed to generate question paper",
//         error: error.error?.message || error.message || "API request failed",
//       });
//     }

//     const data = await response.json();
//     const content =
//       data.content && data.content.length > 0 ? data.content[0].text : "";

//     let questions;
//     try {
//       // Extract JSON from response, handling markdown code blocks and text
//       let jsonStr = content;

//       // Try to extract from markdown code block first
//       const markdownMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
//       if (markdownMatch) {
//         jsonStr = markdownMatch[1];
//       } else {
//         // Fallback: extract JSON object
//         const jsonMatch = content.match(/\{[\s\S]*\}/);
//         if (jsonMatch) {
//           jsonStr = jsonMatch[0];
//         }
//       }

//       // Clean control characters and fix newlines in strings
//       jsonStr = jsonStr.replace(/[\n\r\t]/g, " ");
//       jsonStr = jsonStr.replace(/\s+/g, " ");

//       questions = JSON.parse(jsonStr);

//       // Define predefined question type keys
//       const predefinedKeys = ['mcq', 'shortAnswer', 'fillups', 'longans', 'match', 'trueorfalse', 'essay', 'internalChoice', 'veryShortAnswer', 'assertionReason', 'caseStudy', 'diagramBased', 'mapBased', 'dataInterpretation', 'differentiate', 'sequencing', 'geometry', 'customQuestions'];
      
//       // Validate question counts
//       const validation = {
//         mcq: {
//           requested: mcq?.count || 0,
//           received: questions.mcq?.length || 0,
//         },
//         shortAnswer: {
//           requested: shortAnswer?.count || 0,
//           received: questions.shortAnswer?.length || 0,
//         },
//         fillups: {
//           requested: fillups?.count || 0,
//           received: questions.fillups?.length || 0,
//         },
//         longans: {
//           requested: longans?.count || 0,
//           received: questions.longans?.length || 0,
//         },
//         match: {
//           requested: match?.count || 0,
//           received: Array.isArray(questions.match) ? questions.match.length : 0,
//         },
//         trueorfalse: {
//           requested: trueorfalse?.count || 0,
//           received: questions.trueorfalse?.length || 0,
//         },
//         essay: {
//           requested: essay?.count || 0,
//           received: questions.essay?.length || 0,
//         },
//         internalChoice: {
//           requested: internalChoice?.count || 0,
//           received: questions.internalChoice?.length || 0,
//         },
//         veryShortAnswer: {
//           requested: veryShortAnswer?.count || 0,
//           received: questions.veryShortAnswer?.length || 0,
//         },
//         assertionReason: {
//           requested: assertionReason?.count || 0,
//           received: questions.assertionReason?.length || 0,
//         },
//         caseStudy: {
//           requested: caseStudy?.count || 0,
//           received: Array.isArray(questions.caseStudy) ? questions.caseStudy.length : 0,
//         },
//         diagramBased: {
//           requested: diagramBased?.count || 0,
//           received: questions.diagramBased?.length || 0,
//         },
//         mapBased: {
//           requested: mapBased?.count || 0,
//           received: questions.mapBased?.length || 0,
//         },
//         dataInterpretation: {
//           requested: dataInterpretation?.count || 0,
//           received: Array.isArray(questions.dataInterpretation) ? questions.dataInterpretation.length : 0,
//         },
//         differentiate: {
//           requested: differentiate?.count || 0,
//           received: questions.differentiate?.length || 0,
//         },
//         sequencing: {
//           requested: sequencing?.count || 0,
//           received: questions.sequencing?.length || 0,
//         },
//         geometry: {
//           requested: geometry?.count || 0,
//           received: questions.geometry?.length || 0,
//         },
//       };

//       // Add custom question types to validation
//       customQuestionTypes.forEach(questionType => {
//         const config = req.body[questionType];
//         validation[questionType] = {
//           requested: (config && config.count) || 0,
//           received: Array.isArray(questions[questionType]) ? questions[questionType].length : 0,
//         };
//       });

//       // Check for unexpected question types in response (not in predefined or custom)
//       const allExpectedKeys = [...predefinedKeys, ...customQuestionTypes];
//       const unexpectedKeys = Object.keys(questions).filter(key => !allExpectedKeys.includes(key));
//       if (unexpectedKeys.length > 0) {
//         console.warn("WARNING: Unexpected question types found in response:", unexpectedKeys);
//         unexpectedKeys.forEach(key => {
//           console.warn(`  ${key}: ${Array.isArray(questions[key]) ? questions[key].length : 'not an array'} items`);
//           // Keep unexpected keys in the response for flexibility
//           validation[key] = {
//             requested: 0,
//             received: Array.isArray(questions[key]) ? questions[key].length : 0,
//           };
//         });
//       }

//       // Check for mismatches
//       const mismatches = Object.entries(validation).filter(
//         ([key, val]) => val.requested > 0 && val.received < val.requested,
//       );
//       if (mismatches.length > 0) {
//         console.warn("WARNING: Question count mismatches detected:");
//         mismatches.forEach(([key, val]) => {
//           console.warn(
//             `  ${key}: Requested ${val.requested}, Received ${val.received}, Missing ${val.requested - val.received}`,
//           );
//         });
//       }

//       // Specific check for missing question types
//       if (
//         match &&
//         match.count > 0 &&
//         !questions.match
//       ) {
//         console.error(
//           "ERROR: Match the Following was requested but not found in response!",
//         );
//         console.error("Response keys:", Object.keys(questions));
//       }
//     } catch (parseError) {
//       console.error("Error parsing JSON response:", parseError);
//       console.error("Raw content length:", content.length);
//       console.error("Raw content preview (first 1000 chars):", content.substring(0, 1000));
//       console.error("Raw content end (last 500 chars):", content.substring(content.length - 500));
//       console.error(
//         "Token Usage - Input:",
//         data.usage?.input_tokens,
//         "Output:",
//         data.usage?.output_tokens,
//       );
      
//       // Check if response was truncated
//       const wasTruncated = data.usage?.output_tokens >= 16000 || data.stop_reason === 'max_tokens';
      
//       clearTimeout(timeoutId);
//       return res.status(500).json({
//         success: false,
//         message: wasTruncated 
//           ? "Response was truncated due to length. Please reduce the number of questions or simplify the requirements."
//           : "Failed to parse question paper response",
//         error: parseError.message,
//         wasTruncated,
//         tokenUsage: {
//           inputTokens: data.usage?.input_tokens || 0,
//           outputTokens: data.usage?.output_tokens || 0,
//           totalTokens:
//             (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
//         },
//         suggestion: wasTruncated 
//           ? "Try reducing the number of questions, especially for essay and long answer types, or split into multiple requests."
//           : "The response format may be invalid. Please try again.",
//       });
//     }

//     clearTimeout(timeoutId);

//     // Generate images for diagram-based, map-based, and data interpretation questions
//     console.log('[Question Paper] Generating images for visual questions...');
    
//     if (questions.diagramBased && Array.isArray(questions.diagramBased)) {
//       for (let i = 0; i < questions.diagramBased.length; i++) {
//         const q = questions.diagramBased[i];
//         if (q.diagramInstructions || q.diagramImageUrl) {
//           try {
//             console.log(`[Question Paper] Processing diagram image ${i + 1}/${questions.diagramBased.length}`);
//             q.diagramImage = await generateImageFromInstructions(
//               q.diagramInstructions || 'Generate a simple diagram',
//               250,
//               250,
//               'diagram',
//               q.diagramImageUrl
//             );
//           } catch (err) {
//             console.error(`[Question Paper] Error processing diagram image ${i + 1}:`, err.message);
//             q.diagramImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
//           }
//         }
//       }
//     }

//     if (questions.mapBased && Array.isArray(questions.mapBased)) {
//       for (let i = 0; i < questions.mapBased.length; i++) {
//         const q = questions.mapBased[i];
//         if (q.mapInstructions || q.mapImageUrl) {
//           try {
//             console.log(`[Question Paper] Processing map image ${i + 1}/${questions.mapBased.length}`);
//             q.mapImage = await generateImageFromInstructions(
//               q.mapInstructions || 'Generate a map of India',
//               280,
//               300,
//               'map',
//               q.mapImageUrl
//             );
//           } catch (err) {
//             console.error(`[Question Paper] Error processing map image ${i + 1}:`, err.message);
//             q.mapImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
//           }
//         }
//       }
//     }

//     if (questions.dataInterpretation && Array.isArray(questions.dataInterpretation)) {
//       for (let i = 0; i < questions.dataInterpretation.length; i++) {
//         const q = questions.dataInterpretation[i];
//         if (q.dataInstructions || q.dataImageUrl) {
//           try {
//             console.log(`[Question Paper] Processing data interpretation image ${i + 1}/${questions.dataInterpretation.length}`);
//             q.dataImage = await generateImageFromInstructions(
//               q.dataInstructions || 'Generate a data chart',
//               280,
//               220,
//               'data',
//               q.dataImageUrl
//             );
//           } catch (err) {
//             console.error(`[Question Paper] Error processing data interpretation image ${i + 1}:`, err.message);
//             q.dataImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
//           }
//         }
//       }
//     }

//     console.log('[Question Paper] Image generation complete');

//     // Combine all responses into final structure
//     const finalResponse = {
//       success: true,
//       data: {
//         examDetails: examDetailsData.examDetails,
//         sections: examDetailsData.sections,
//         questions,
//       },
//       tokenUsage: {
//         inputTokens: data.usage?.input_tokens || 0,
//         outputTokens: data.usage?.output_tokens || 0,
//         totalTokens:
//           (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
//       },
//     };

//     return res.status(200).json(finalResponse);
//   } catch (error) {
//     clearTimeout(timeoutId);

//     if (error.name === "AbortError") {
//       console.error("API request timeout (300s exceeded)");
//       return res.status(504).json({
//         success: false,
//         message: "Request timeout",
//         error: "The question paper generation took too long. Please try again.",
//       });
//     }

//     console.error("Question paper generation error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to generate question paper",
//       error: error.message,
//     });
//   }
// }

// module.exports = {
//   generateQuestionPaper,
// };

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

// ✅ Azure OpenAI env vars — replaces CLAUDE_API_KEY
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_CONTENT_DEPLOYMENT3;
const AZURE_OPENAI_API_KEY    = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT   = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_API_VERSION       = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";

// Generate question paper from uploaded file
async function generateQuestionPaper(req, res) {
  // ✅ axios CancelToken — replaces AbortController
  const timeoutSource = axios.CancelToken.source();
  const timeoutId = setTimeout(() => timeoutSource.cancel("Timeout after 300s"), 300000);

  try {
    // ✅ Azure env check — replaces CLAUDE_API_KEY check
    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Azure OpenAI configuration missing (AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_CONTENT_DEPLOYMENT3)",
      });
    }

    // Extract parameters from request body
    const {
      chunks = [],
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
    } = req.body;

    // Validate required fields - chunks must be provided
    if (!chunks || chunks.length === 0) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Missing required field: chunks (array of chunk objects with text)",
      });
    }

    // Get exam details and sections
    const examDetailsData = getExamDetailsPrompt({
      duration,
      difficultyLevel,
      subject,
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
    });

    // Build combined prompt with all question types
    let combinedPrompt =
      "Generate all question types below in a single JSON response.\n\n";

    if (mcq && mcq.count > 0) {
      combinedPrompt +=
        getMCQPrompt({
          count: mcq.count,
          marks: mcq.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (shortAnswer && shortAnswer.count > 0) {
      combinedPrompt +=
        getShortAnswerPrompt({
          count: shortAnswer.count,
          marks: shortAnswer.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (fillups && fillups.count > 0) {
      combinedPrompt +=
        getFillUpsPrompt({
          count: fillups.count,
          marks: fillups.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (longans && longans.count > 0) {
      combinedPrompt +=
        getLongAnswerPrompt({
          count: longans.count,
          marks: longans.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (match && match.count > 0) {
      combinedPrompt +=
        getMatchPrompt({
          count: match.count,
          marks: match.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (trueorfalse && trueorfalse.count > 0) {
      combinedPrompt +=
        getTrueOrFalsePrompt({
          count: trueorfalse.count,
          marks: trueorfalse.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (essay && essay.count > 0) {
      combinedPrompt +=
        getEssayPrompt({
          count: essay.count,
          marks: essay.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (internalChoice && internalChoice.count > 0) {
      combinedPrompt +=
        getInternalChoicePrompt({
          count: internalChoice.count,
          marks: internalChoice.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (veryShortAnswer && veryShortAnswer.count > 0) {
      combinedPrompt +=
        getVeryShortAnswerPrompt({
          count: veryShortAnswer.count,
          marks: veryShortAnswer.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (assertionReason && assertionReason.count > 0) {
      combinedPrompt +=
        getAssertionReasonPrompt({
          count: assertionReason.count,
          marks: assertionReason.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (caseStudy && caseStudy.count > 0) {
      combinedPrompt +=
        getCaseStudyPrompt({
          marks: caseStudy.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (diagramBased && diagramBased.count > 0) {
      combinedPrompt +=
        getDiagramBasedPrompt({
          count: diagramBased.count,
          marks: diagramBased.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (mapBased && mapBased.count > 0) {
      combinedPrompt +=
        getMapBasedPrompt({
          count: mapBased.count,
          marks: mapBased.marks,
          difficultyLevel,
        }) + "\n\n";
    }

    if (dataInterpretation && dataInterpretation.count > 0) {
      combinedPrompt +=
        getDataInterpretationPrompt({
          marks: dataInterpretation.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (differentiate && differentiate.count > 0) {
      combinedPrompt +=
        getDifferentiatePrompt({
          count: differentiate.count,
          marks: differentiate.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (sequencing && sequencing.count > 0) {
      combinedPrompt +=
        getSequencingPrompt({
          count: sequencing.count,
          marks: sequencing.marks,
          difficultyLevel,
          subject,
        }) + "\n\n";
    }

    if (geometry && geometry.count > 0) {
      combinedPrompt +=
        getGeometryPrompt({
          count: geometry.count,
          marks: geometry.marks,
          difficultyLevel,
        }) + "\n\n";
    }

    // Helper function to generate generic prompt for undefined question types
    function getGenericQuestionPrompt(questionType, count, marks, difficultyLevel) {
      return `Generate ${count} ${questionType} questions (${marks} marks each, ${difficultyLevel} difficulty):
[${Array.from({length: count}, (_, i) => `{"questionNumber":${i+1},"question":"","answer":"","marks":${marks}}`).join(',')}]
CRITICAL: You MUST generate all ${count} questions. Do not stop early. Fill in all question and answer fields completely.`;
    }

    // Handle any additional custom question types from request body
    const predefinedKeys = ['fileIds', 'chunks', 'duration', 'difficultyLevel', 'subject', 'contentTypeId', 'documentId', 'userId', 'sectionIds', 'sectionNumbers', 'sectionTitles', 'topic', 'learningStyle', 'maxTokens', 'mcq', 'shortAnswer', 'fillups', 'longans', 'match', 'trueorfalse', 'essay', 'internalChoice', 'veryShortAnswer', 'assertionReason', 'caseStudy', 'diagramBased', 'mapBased', 'dataInterpretation', 'differentiate', 'sequencing', 'geometry'];
    const customQuestionTypes = Object.keys(req.body).filter(key => !predefinedKeys.includes(key));

    customQuestionTypes.forEach(questionType => {
      const config = req.body[questionType];
      if (config && config.count > 0) {
        combinedPrompt += getGenericQuestionPrompt(
          questionType,
          config.count,
          config.marks || 1,
          difficultyLevel
        ) + "\n\n";
      }
    });

    // Add response format instructions
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

    customQuestionTypes.forEach(questionType => {
      const config = req.body[questionType];
      if (config && config.count > 0) {
        requestedKeys.push(`"${questionType}"`);
      }
    });

    combinedPrompt += `RETURN RESPONSE WITH EXACTLY THESE KEYS: {${requestedKeys.join(", ")}}. 
CRITICAL REQUIREMENTS:
- Include ALL requested keys with COMPLETE data
- Do NOT truncate or omit any questions
- Generate EXACTLY the specified count for each question type
- For each question type, generate ALL questions in the array
- Fill in all fields (question, answer, options, etc.) completely
- Do not stop early or use placeholders`;

    // Format chunks as context text
    const contextText = chunks
      .map((chunk, idx) => `[Context ${idx + 1}] ${chunk.text}`)
      .join("\n\n");

    // ✅ Build final user message — combines combinedPrompt + context
    // (Azure doesn't support content arrays like Claude, so we merge into one string)
    const userMessage = `${combinedPrompt}\n\nUse the following context from the document to generate questions:\n\n${contextText}`;

    const systemMessage = `You are a question paper generator. Output ONLY valid JSON, nothing else.

CRITICAL RULES:
- Output ONLY the JSON object. No explanations, no text before or after, no markdown code blocks.
- Do NOT wrap JSON in triple backticks or markdown formatting.
- Generate EXACTLY the number of questions specified for EACH type - DO NOT TRUNCATE.
- All questions must be based on provided document content only.
- Never truncate or use placeholders - generate COMPLETE questions.
- Return complete, filled data for ALL questions.
- Ensure ALL requested question types are present in response.
- Start with { and end with } - nothing else.
- IMPORTANT: If you are asked to generate 12 Short Answer questions, you MUST generate exactly 12, not 10 or fewer.
- Keep answers concise to fit within token limits while maintaining quality.`;

    console.log("[QuestionPaper] Calling Azure OpenAI (deployment:", AZURE_OPENAI_DEPLOYMENT, "| maxTokens:", maxTokens, ")...");

    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;
    const azureStart = Date.now();

    // ✅ Azure OpenAI call — replaces Claude fetch
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
        cancelToken: timeoutSource.token,
      }
    );
    clearTimeout(timeoutId);

    console.log("[QuestionPaper] Azure OpenAI responded in", Date.now() - azureStart, "ms");

    // ✅ Azure response shape
    const content      = response.data?.choices?.[0]?.message?.content ?? "";
    const finishReason = response.data?.choices?.[0]?.finish_reason;
    const usage        = response.data?.usage;

    let questions;
    try {
      // Extract JSON from response, handling markdown code blocks and text
      let jsonStr = content;

      const markdownMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (markdownMatch) {
        jsonStr = markdownMatch[1];
      } else {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      // Clean control characters and fix newlines in strings
      jsonStr = jsonStr.replace(/[\n\r\t]/g, " ");
      jsonStr = jsonStr.replace(/\s+/g, " ");

      questions = JSON.parse(jsonStr);

      // Define predefined question type keys
      const predefinedKeys = ['mcq', 'shortAnswer', 'fillups', 'longans', 'match', 'trueorfalse', 'essay', 'internalChoice', 'veryShortAnswer', 'assertionReason', 'caseStudy', 'diagramBased', 'mapBased', 'dataInterpretation', 'differentiate', 'sequencing', 'geometry', 'customQuestions'];

      // Validate question counts
      const validation = {
        mcq:                { requested: mcq?.count || 0,                received: questions.mcq?.length || 0 },
        shortAnswer:        { requested: shortAnswer?.count || 0,        received: questions.shortAnswer?.length || 0 },
        fillups:            { requested: fillups?.count || 0,            received: questions.fillups?.length || 0 },
        longans:            { requested: longans?.count || 0,            received: questions.longans?.length || 0 },
        match:              { requested: match?.count || 0,              received: Array.isArray(questions.match) ? questions.match.length : 0 },
        trueorfalse:        { requested: trueorfalse?.count || 0,        received: questions.trueorfalse?.length || 0 },
        essay:              { requested: essay?.count || 0,              received: questions.essay?.length || 0 },
        internalChoice:     { requested: internalChoice?.count || 0,     received: questions.internalChoice?.length || 0 },
        veryShortAnswer:    { requested: veryShortAnswer?.count || 0,    received: questions.veryShortAnswer?.length || 0 },
        assertionReason:    { requested: assertionReason?.count || 0,    received: questions.assertionReason?.length || 0 },
        caseStudy:          { requested: caseStudy?.count || 0,          received: Array.isArray(questions.caseStudy) ? questions.caseStudy.length : 0 },
        diagramBased:       { requested: diagramBased?.count || 0,       received: questions.diagramBased?.length || 0 },
        mapBased:           { requested: mapBased?.count || 0,           received: questions.mapBased?.length || 0 },
        dataInterpretation: { requested: dataInterpretation?.count || 0, received: Array.isArray(questions.dataInterpretation) ? questions.dataInterpretation.length : 0 },
        differentiate:      { requested: differentiate?.count || 0,      received: questions.differentiate?.length || 0 },
        sequencing:         { requested: sequencing?.count || 0,         received: questions.sequencing?.length || 0 },
        geometry:           { requested: geometry?.count || 0,           received: questions.geometry?.length || 0 },
      };

      // Add custom question types to validation
      customQuestionTypes.forEach(questionType => {
        const config = req.body[questionType];
        validation[questionType] = {
          requested: (config && config.count) || 0,
          received: Array.isArray(questions[questionType]) ? questions[questionType].length : 0,
        };
      });

      // Check for unexpected question types in response
      const allExpectedKeys = [...predefinedKeys, ...customQuestionTypes];
      const unexpectedKeys = Object.keys(questions).filter(key => !allExpectedKeys.includes(key));
      if (unexpectedKeys.length > 0) {
        console.warn("WARNING: Unexpected question types found in response:", unexpectedKeys);
        unexpectedKeys.forEach(key => {
          console.warn(`  ${key}: ${Array.isArray(questions[key]) ? questions[key].length : 'not an array'} items`);
          validation[key] = {
            requested: 0,
            received: Array.isArray(questions[key]) ? questions[key].length : 0,
          };
        });
      }

      // Check for mismatches
      const mismatches = Object.entries(validation).filter(
        ([key, val]) => val.requested > 0 && val.received < val.requested,
      );
      if (mismatches.length > 0) {
        console.warn("WARNING: Question count mismatches detected:");
        mismatches.forEach(([key, val]) => {
          console.warn(
            `  ${key}: Requested ${val.requested}, Received ${val.received}, Missing ${val.requested - val.received}`,
          );
        });
      }

      if (match && match.count > 0 && !questions.match) {
        console.error("ERROR: Match the Following was requested but not found in response!");
        console.error("Response keys:", Object.keys(questions));
      }
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.error("Raw content length:", content.length);
      console.error("Raw content preview (first 1000 chars):", content.substring(0, 1000));
      console.error("Raw content end (last 500 chars):", content.substring(content.length - 500));
      console.error(
        "Token Usage - Input:", usage?.prompt_tokens,    // ✅ Azure field
        "Output:",             usage?.completion_tokens, // ✅ Azure field
      );

      // ✅ Azure truncation flag is "length" (not "max_tokens")
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
          inputTokens:  usage?.prompt_tokens    || 0, // ✅ Azure field
          outputTokens: usage?.completion_tokens || 0, // ✅ Azure field
          totalTokens:  (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0),
        },
        suggestion: wasTruncated
          ? "Try reducing the number of questions, especially for essay and long answer types, or split into multiple requests."
          : "The response format may be invalid. Please try again.",
      });
    }

    clearTimeout(timeoutId);

    // Generate images for diagram-based, map-based, and data interpretation questions
    console.log('[Question Paper] Generating images for visual questions...');

    if (questions.diagramBased && Array.isArray(questions.diagramBased)) {
      for (let i = 0; i < questions.diagramBased.length; i++) {
        const q = questions.diagramBased[i];
        if (q.diagramInstructions || q.diagramImageUrl) {
          try {
            console.log(`[Question Paper] Processing diagram image ${i + 1}/${questions.diagramBased.length}`);
            q.diagramImage = await generateImageFromInstructions(
              q.diagramInstructions || 'Generate a simple diagram',
              250, 250, 'diagram', q.diagramImageUrl
            );
          } catch (err) {
            console.error(`[Question Paper] Error processing diagram image ${i + 1}:`, err.message);
            q.diagramImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
          }
        }
      }
    }

    if (questions.mapBased && Array.isArray(questions.mapBased)) {
      for (let i = 0; i < questions.mapBased.length; i++) {
        const q = questions.mapBased[i];
        if (q.mapInstructions || q.mapImageUrl) {
          try {
            console.log(`[Question Paper] Processing map image ${i + 1}/${questions.mapBased.length}`);
            q.mapImage = await generateImageFromInstructions(
              q.mapInstructions || 'Generate a map of India',
              280, 300, 'map', q.mapImageUrl
            );
          } catch (err) {
            console.error(`[Question Paper] Error processing map image ${i + 1}:`, err.message);
            q.mapImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
          }
        }
      }
    }

    if (questions.dataInterpretation && Array.isArray(questions.dataInterpretation)) {
      for (let i = 0; i < questions.dataInterpretation.length; i++) {
        const q = questions.dataInterpretation[i];
        if (q.dataInstructions || q.dataImageUrl) {
          try {
            console.log(`[Question Paper] Processing data interpretation image ${i + 1}/${questions.dataInterpretation.length}`);
            q.dataImage = await generateImageFromInstructions(
              q.dataInstructions || 'Generate a data chart',
              280, 220, 'data', q.dataImageUrl
            );
          } catch (err) {
            console.error(`[Question Paper] Error processing data interpretation image ${i + 1}:`, err.message);
            q.dataImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
          }
        }
      }
    }

    console.log('[Question Paper] Image generation complete');

    // Combine all responses into final structure
    const finalResponse = {
      success: true,
      data: {
        examDetails: examDetailsData.examDetails,
        sections:    examDetailsData.sections,
        questions,
      },
      tokenUsage: {
        inputTokens:  usage?.prompt_tokens    || 0, // ✅ Azure field
        outputTokens: usage?.completion_tokens || 0, // ✅ Azure field
        totalTokens:  (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0),
      },
    };

    return res.status(200).json(finalResponse);
  } catch (error) {
    clearTimeout(timeoutId);

    // ✅ axios cancel replaces AbortError
    if (axios.isCancel(error)) {
      console.error("API request timeout (300s exceeded)");
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: "The question paper generation took too long. Please try again.",
      });
    }

    // ✅ Azure-specific error extraction
    const azureMsg = error?.response?.data?.error?.message;
    console.error("Question paper generation error:", azureMsg || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate question paper",
      error: azureMsg || error.message,
    });
  }
}

module.exports = {
  generateQuestionPaper,
};
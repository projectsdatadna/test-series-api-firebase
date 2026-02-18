require("dotenv").config();
const {
  getMCQPrompt,
  getShortAnswerPrompt,
  getFillUpsPrompt,
  getLongAnswerPrompt,
  getMatchPrompt,
  getTrueOrFalsePrompt,
  getEssayPrompt,
  getExamDetailsPrompt,
} = require("./prompts");

// Use native fetch (Node.js 18+) or import node-fetch
let fetch;
try {
  fetch = globalThis.fetch;
} catch (e) {
  fetch = require("node-fetch");
}

// Generate question paper from uploaded file
async function generateQuestionPaper(req, res) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 second timeout

  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Anthropic API key not configured",
      });
    }

    // Extract parameters from request body
    const {
      fileIds = [],
      duration = 60,
      difficultyLevel = "medium",
      subject = "",
      mcq,
      shortAnswer,
      fillups,
      longans,
      matchthefollowing,
      trueorfalse,
      essay,
    } = req.body;

    // Validate required fields
    if (!fileIds || fileIds.length === 0) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Missing required field: fileIds",
      });
    }

    console.log("Starting question paper generation...");
    console.log(`Processing ${fileIds.length} file(s)...`);

    // Get exam details and sections
    const examDetailsData = getExamDetailsPrompt({
      duration,
      difficultyLevel,
      subject,
      mcq,
      shortAnswer,
      fillups,
      longans,
      matchthefollowing,
      trueorfalse,
      essay,
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

    if (matchthefollowing && matchthefollowing.count > 0) {
      combinedPrompt +=
        getMatchPrompt({
          count: matchthefollowing.count,
          marks: matchthefollowing.marks,
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

    // Add response format instructions
    const requestedKeys = [];
    if (mcq && mcq.count > 0) requestedKeys.push('"mcq"');
    if (shortAnswer && shortAnswer.count > 0)
      requestedKeys.push('"shortAnswer"');
    if (fillups && fillups.count > 0) requestedKeys.push('"fillups"');
    if (longans && longans.count > 0) requestedKeys.push('"longans"');
    if (matchthefollowing && matchthefollowing.count > 0)
      requestedKeys.push('"match"');
    if (trueorfalse && trueorfalse.count > 0)
      requestedKeys.push('"trueorfalse"');
    if (essay && essay.count > 0) requestedKeys.push('"essay"');

    combinedPrompt += `RETURN RESPONSE WITH EXACTLY THESE KEYS: {${requestedKeys.join(", ")}}. 
CRITICAL REQUIREMENTS:
- Include ALL requested keys with COMPLETE data
- Do NOT truncate or omit any questions
- Generate EXACTLY the specified count for each question type
- For each question type, generate ALL questions in the array
- Fill in all fields (question, answer, options, etc.) completely
- Do not stop early or use placeholders`;

    console.log(combinedPrompt, "combined prompt");

    // Make single API call with combined prompt
    const contentArray = [
      {
        type: "text",
        text: combinedPrompt,
      },
    ];

    fileIds.forEach((fId) => {
      contentArray.push({
        type: "document",
        source: {
          type: "file",
          file_id: fId,
        },
      });
    });

    console.log(combinedPrompt, "combined prompt");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "files-api-2025-04-14",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 8192,
        temperature: 0.3,
        system: `You are a question paper generator. Output ONLY valid JSON, nothing else.

CRITICAL RULES:
- Output ONLY the JSON object. No explanations, no text before or after, no markdown code blocks.
- Do NOT wrap JSON in triple backticks or markdown formatting.
- Generate EXACTLY the number of questions specified for EACH type - DO NOT TRUNCATE.
- All questions must be based on provided document content only.
- Never truncate or use placeholders - generate COMPLETE questions.
- Return complete, filled data for ALL questions.
- For Match the Following: Include ALL matching pairs with answers.
- Ensure ALL requested question types are present in response.
- Start with { and end with } - nothing else.
- IMPORTANT: If you are asked to generate 12 Short Answer questions, you MUST generate exactly 12, not 10 or fewer.`,
        messages: [
          {
            role: "user",
            content: contentArray,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Claude API Error Status:", response.status);
      console.error(
        "Claude API Error Response:",
        JSON.stringify(error, null, 2),
      );
      clearTimeout(timeoutId);
      return res.status(response.status).json({
        success: false,
        message: "Failed to generate question paper",
        error: error.error?.message || error.message || "API request failed",
      });
    }

    const data = await response.json();
    const content =
      data.content && data.content.length > 0 ? data.content[0].text : "";

    console.log("Claude Response Content:", content);

    let questions;
    try {
      // Extract JSON from response, handling markdown code blocks and text
      let jsonStr = content;

      // Try to extract from markdown code block first
      const markdownMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (markdownMatch) {
        jsonStr = markdownMatch[1];
      } else {
        // Fallback: extract JSON object
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      // Clean control characters and fix newlines in strings
      jsonStr = jsonStr.replace(/[\n\r\t]/g, " ");
      jsonStr = jsonStr.replace(/\s+/g, " ");

      questions = JSON.parse(jsonStr);

      // Validate question counts
      const validation = {
        mcq: {
          requested: mcq?.count || 0,
          received: questions.mcq?.length || 0,
        },
        shortAnswer: {
          requested: shortAnswer?.count || 0,
          received: questions.shortAnswer?.length || 0,
        },
        fillups: {
          requested: fillups?.count || 0,
          received: questions.fillups?.length || 0,
        },
        longans: {
          requested: longans?.count || 0,
          received: questions.longans?.length || 0,
        },
        match: {
          requested: matchthefollowing?.count || 0,
          received: questions.match?.length || 0,
        },
        trueorfalse: {
          requested: trueorfalse?.count || 0,
          received: questions.trueorfalse?.length || 0,
        },
        essay: {
          requested: essay?.count || 0,
          received: questions.essay?.length || 0,
        },
      };

      console.log(
        "Question Count Validation:",
        JSON.stringify(validation, null, 2),
      );

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

      // Specific check for missing question types
      if (
        matchthefollowing &&
        matchthefollowing.count > 0 &&
        !questions.match
      ) {
        console.error(
          "ERROR: Match the Following was requested but not found in response!",
        );
        console.error("Response keys:", Object.keys(questions));
      }
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.error("Raw content:", content.substring(0, 1000));
      console.error(
        "Token Usage - Input:",
        data.usage?.input_tokens,
        "Output:",
        data.usage?.output_tokens,
      );
      clearTimeout(timeoutId);
      return res.status(500).json({
        success: false,
        message: "Failed to parse question paper response",
        error: parseError.message,
        rawContent: content.substring(0, 1000),
        tokenUsage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
          totalTokens:
            (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
      });
    }

    clearTimeout(timeoutId);

    // Combine all responses into final structure
    const finalResponse = {
      success: true,
      data: {
        examDetails: examDetailsData.examDetails,
        sections: examDetailsData.sections,
        questions,
      },
      tokenUsage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalTokens:
          (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };

    console.log("Question paper generated successfully");
    console.log(
      "Token Usage - Input:",
      data.usage?.input_tokens,
      "Output:",
      data.usage?.output_tokens,
      "Total:",
      (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    );
    return res.status(200).json(finalResponse);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      console.error("API request timeout (300s exceeded)");
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: "The question paper generation took too long. Please try again.",
      });
    }

    console.error("Question paper generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate question paper",
      error: error.message,
    });
  }
}

module.exports = {
  generateQuestionPaper,
};

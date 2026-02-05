require("dotenv").config();
const { getQuestionPaperPrompt } = require("./prompts");

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

    console.log("API Key loaded:", apiKey ? "Yes (length: " + apiKey.length + ")" : "No");
    console.log("API Key starts with:", apiKey ? apiKey.substring(0, 20) : "N/A");

    // Extract parameters from request body
    const {
      fileId,
      duration = 60,
      mcqCount = 10,
      shortAnswerCount = 5,
      difficultyLevel = "medium",
      subject = "",
      topic = "",
    } = req.body;

    // Validate required fields
    if (!fileId) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "Missing required field: fileId",
      });
    }

    // Validate numeric fields
    if (mcqCount < 1 || shortAnswerCount < 1) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        message: "mcqCount and shortAnswerCount must be at least 1",
      });
    }

    console.log(req.body,'req.body')

    const prompt = getQuestionPaperPrompt({
      duration,
      mcqCount,
      shortAnswerCount,
      difficultyLevel,
      subject,
      topic,
    });

    console.log(prompt,'prompt')

    console.log("Calling Anthropic API for question paper generation...");

    // Call Anthropic Messages API with file reference
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
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "document",
                source: {
                  type: "file",
                  file_id: fileId,
                },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers));

    if (!response.ok) {
      const error = await response.json();
      console.error("Anthropic API error:", error);
      return res.status(response.status).json({
        success: false,
        message: "Failed to generate question paper",
        error: error.message || "API request failed",
        details: error,
      });
    }

    const data = await response.json();
    console.log("Question paper generated successfully");

    // Extract the content from the response
    const content =
      data.content && data.content.length > 0 ? data.content[0].text : "";

    // Parse JSON response
    let questionPaperData;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        questionPaperData = JSON.parse(jsonMatch[0]);
      } else {
        questionPaperData = JSON.parse(content);
      }

      console.log(jsonMatch, 'json match')
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      return res.status(500).json({
        success: false,
        message: "Failed to parse question paper response",
        error: parseError.message,
        rawContent: content.substring(0, 500),
      });
    }

    return res.status(200).json({
      success: true,
      data: questionPaperData,
    });
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

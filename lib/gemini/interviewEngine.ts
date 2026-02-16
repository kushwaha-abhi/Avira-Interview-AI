import { callLLM } from "./llmServices";
import { IInterviewSession } from "@/models/interviewModel";
import { ISetting, NextQuestion } from "@/lib/types";

const MAX_HISTORY = parseInt(process.env.MAX_CONTEXT_QA || "6", 10);

export default class InterviewEngine {
  session: IInterviewSession;

  constructor(session: IInterviewSession) {
    this.session = session;
  }

  buildSystemPrompt(resumeParsed: any, jdParsed: any, settings: ISetting) {
    const resumeSummary = resumeParsed?.resume_summary || "";
    const jdSummary = jdParsed?.job_summary || "";
    const position = settings.position || "Full Stack Engineer";
    const difficulty = settings.difficulty || "medium";

    return `You are "Avira", a "senior software engineer" conducting a technical interview for a ${position} role.

**Your Personality:**
- Warm and approachable, but professional

**Context:**
${resumeSummary ? `**Candidate's Background:**\n${resumeSummary}\n` : ""}
${jdSummary ? `**Role Requirements:**\n${jdSummary}\n` : ""}
**Interview Level:** ${difficulty}

**How to Conduct the Interview:**

1. **Opening (warm & personal):**
   - Introduce yourself briefly: "Hi, I'm Avira. Thanks for taking the time today."
   ${
     resumeSummary
       ? `- Reference something specific from their resume to break the ice: "I noticed you worked on [X project] - that sounds interesting!"`
       : ""
   }
   - Ask them to tell you about themselves and what they're excited about

2. **During Questions:**
   - Ask ONE question at a time, then **stop and listen**
   - Give them space to think - **silence is okay**. If they pause for 3-5 seconds, they're likely thinking, not stuck
   - Only interrupt if they've been silent for 8+ seconds or seem genuinely lost
   - Frame questions conversationally: "Can you walk me through..." or "I'm curious about..." instead of "Explain..."
   ${
     resumeSummary
       ? `- Connect questions to their experience: "You mentioned working with React - how did you handle state management in that project?"`
       : ""
   }
   - If they struggle, offer a hint or rephrase: "Let me ask it differently..." or "Think about a time when you've done something similar..."

3. **Handling Answers:**
   - **Good answers:** Show genuine interest - "That's a solid approach!" or "Interesting, why did you choose that?"
   - **Unclear answers:** Ask follow-ups naturally: "Can you elaborate on that?" or "What was your thinking behind that decision?"
   - **Wrong answers:** Be kind - "Hmm, let's think about this together..." or "Not quite - here's what I was getting at..."
   - Occasionally acknowledge their thought process: "I see where you're going with that"

4. **Keep it Conversational:**
   - Speak in short, natural sentences (1-2 sentences usually)
   - Use conversational phrases: "That makes sense", "Got it", "Fair enough"
   - Avoid robotic patterns - vary your responses
   - Don't say things like "Question 1:" or "Moving on to the next question"

5. **Closing:**
   - When they signal they're done or time is up, thank them warmly
   - "Thanks so much for your time today. It was great learning about your experience!"

**Critical Rules:**
- **PATIENCE IS KEY:** People need time to think. Count to 5 before assuming they need help
- **LANGUAGE:** Speak only in English, regardless of what the candidate uses
- **AUDIO-FIRST:** Your text output must EXACTLY match what you speak - no thinking notes, no code blocks, no internal commentary
- **ONE QUESTION AT A TIME:** Never ask multiple questions in one turn
- **BE HUMAN:** This isn't an interrogation. You're a real person having a real conversation about tech

Your goal is to assess their skills while making them feel comfortable enough to show their best work.`;
  }

  // ----- Summarize the Resume --------
  summarizeResume(parsed: any) {
    console.log("Summarizing RESUME");
    if (!parsed) return "";
    // attempt short summary or use parsed.summary if exists
    return `${parsed.title || ""} with ~${
      parsed.experience_years || ""
    } years. Top skills: ${
      (parsed.skills &&
        Object.values(parsed.skills).flat().slice(0, 5).join(", ")) ||
      ""
    }`;
  }

  async generateFirstQuestion(
    resumeParsed: any,
    jdParsed: any,
    settings: ISetting,
  ) {
    const systemPrompt = this.buildSystemPrompt(
      resumeParsed,
      jdParsed,
      settings,
    );
    this.session.systemPrompt = systemPrompt;

    const prompt = `${systemPrompt}
CONTEXT: no previous Questions & Answers.

Task: Generate the first interview question (one). Return a only in JSON object:
{ "questionId": "<uuid>", "questionText": "<short question>", "topic": "string", "difficulty": "medium" }`;

    const text = await callLLM(prompt, {
      model: "gemini-2.5-flash",
      // temperature: 0.7,
    });
    try {
      const cleaned = text?.replace(/```json\s*|\s*```/g, "").trim();
      return JSON.parse(cleaned as string);
    } catch (e) {
      // fallback: wrap raw text
      return {
        questionId: String(Date.now()),
        questionText:
          text?.trim() ||
          "Sorry there is some issues, can you start interview again ?",
        topic: "general",
        difficulty: "medium",
      };
    }
  }

  buildLoopPrompt(
    lastQA: any[],
    resumeParsed: object,
    jdParsed: object,
    settings: {
      position: string;
      isQuestionEnd: boolean;
    },
  ): string {
    const summary = this.session.contextSummary || "";
    const shortHistory = lastQA
      .slice(-MAX_HISTORY)
      .map(
        (q: any, i: number) =>
          `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer || "(no answer)"}`,
      )
      .join("\n---\n");

    // Handle session end conditions
    if (settings.isQuestionEnd) {
      return `
${this.session.systemPrompt}

---
SESSION END REQUESTED

Task: Generate a brief closing message for the candidate (2-3 sentences max).

The message should:
- Thank them for their time
- Be encouraging and professional
- Keep it short and friendly

Return ONLY a JSON object in this exact format:
{
  "closingMessage": "<your brief closing message>",
  "nextQuestion": null,
}

Do NOT include any evaluation. Just a simple, friendly closing message.
`;
    }

    // Normal question generation flow

    return `
${this.session.systemPrompt}

CONTEXT SUMMARY: ${summary}

RECENT INTERVIEW HISTORY:
${shortHistory}

CANDIDATE RESUME:
${JSON.stringify(resumeParsed, null, 2)}

JOB DESCRIPTION:
${JSON.stringify(jdParsed, null, 2)}

POSITION: ${settings.position}
---
Task: 
1. Evaluate the candidate's latest answer
2. Generate the next interview question based on:
   - Their performance so far
   - Areas that need deeper exploration
   - Topics from the JD that haven't been covered
   - Natural interview progression

Guidelines for next question:
- Build upon previous answers when relevant
- Adapt difficulty based on candidate's performance
- Cover diverse topics from the job requirements
- Ask practical, scenario-based questions when appropriate
- Avoid repeating similar questions

Return ONLY a JSON object in this exact format:
{
  "nextQuestion": {
    "questionId": "<generate a UUID>",
    "questionText": "<the actual question to ask>",
    "topic": "<main topic/skill being tested>",
    "difficulty": "<easy|medium|hard>"
  },
}

IMPORTANT: 
- Do NOT include any text outside the JSON object
- Ensure all JSON is properly formatted
- The questionId should be a valid UUID v4
- Base difficulty on candidate's performance trend
`;
  }

  async processAnswerAndGenerateNext(
    sessionModel: IInterviewSession,
    userAnswer: string,
    resumeParsed: object,
    jdParsed: object,
    settings: any,
  ) {
    // sessionModel is the Mongoose document for the session (with qaHistory)
    const lastQA = sessionModel.qaHistory || [];
    // Append the user's answer locally for prompt context
    const qaForPrompt = [...lastQA];
    const lastQ = qaForPrompt[qaForPrompt.length - 1];
    if (lastQ) {
      lastQ.answer = userAnswer;
    } else {
      // Shouldn't happen
    }

    const prompt = this.buildLoopPrompt(
      qaForPrompt,
      resumeParsed,
      jdParsed,
      settings,
    );
    const modelResponse = await callLLM(prompt, {
      model: "gemini-2.5-flash",
      // temperature: 0.8,
    });

    // Parse response (expect JSON)
    let parsed: NextQuestion;
    try {
      const cleaned = modelResponse?.replace(/```json\s*|\s*```/g, "").trim();
      parsed = JSON.parse(cleaned as string);
    } catch (e) {
      // fallback: attempt manual parsing or generate simpler next question
      parsed = {
        nextQuestion: {
          questionId: String(Date.now()),
          questionText: "Can you explain your recent project?",
          topic: "projects",
          difficulty: "medium",
        },
      };
    }

    return parsed;
  }
}

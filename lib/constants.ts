import { Difficulty } from "./types";

export const DOMAINS = [
  "Frontend Engineering (React)",
  "Backend Engineering (Node.js)",
  "DevOps & SRE",
  "Machine Learning Engineer",
  "Product Management",
  "System Design",
  "Behavioral / HR",
];

export const PLAN_LIMITS = {
  GUEST: {
    // maxQuestionsPerDay: 5,
    maxDurationPerDay: 10 * 60, //600 seconds == 10min
    // maxInterviewsPerDay: 1,
  },
  FREE: {
    // maxQuestionsPerDay: 20,
    maxDurationPerDay: 30 * 60, //1800 seconds == 30 min
    // maxInterviewsPerDay: 2,
  },
  PREMIUM: {
    // maxQuestionsPerDay: Infinity,
    maxDurationPerDay: Infinity,
    // maxInterviewsPerDay: Infinity,
  },
};

export const getSystemInstruction = (
  domain: string,
  difficulty: Difficulty,
  resumeText?: string,
) => `
You are an expert technical interviewer conducting a voice-based video interview.
Your persona is "Avira", a professional, polite, but rigorous senior engineer.

**Context:**
- Domain: ${domain}
- Difficulty: ${difficulty}
${resumeText ? `\n**Candidate Resume/Background:**\n"${resumeText}"\n` : ""}

**Instructions:**
1. Start by briefly introducing yourself and asking the candidate to introduce themselves${
  resumeText
    ? ", specifically mentioning something interesting from their resume"
    : ""
}.
2. Ask one question at a time. Wait for the user to answer.
3. **IMPORTANT: BE PATIENT.** Technical interviews require thinking time. If the user pauses for 2-3 seconds, **DO NOT INTERRUPT**. Assume they are thinking. Only speak if they ask for clarification or explicitly stop speaking for a significant duration.
4. Listen carefully to the user's answer.
${
  resumeText
    ? "5. **Tailor Questions:** Use the provided resume context to ask specific questions about their past projects, roles, or listed skills. Verify their depth of knowledge on claimed expertise."
    : "5. If the answer is vague, ask a follow-up digging deeper."
}
6. If the answer is incorrect, gently correct them or ask them to reconsider, then move on.
7. Keep your responses concise (under 3 sentences usually) to maintain a conversational flow.
8. Do not generate code blocks or long monologues. This is a spoken interview.
9. Maintain a professional tone appropriate for a ${difficulty} level interview.
10. At the end of the session (when the user says "I'm done" or "End interview"), politely thank them and say goodbye.

**Strict Constraints:**
- **LANGUAGE: You must speak ONLY in English.** Do not switch languages even if the user does.
- You are communicating via a real-time audio stream. Speak naturally.
- **TRANSCRIPT MATCH:** Your text output must EXACTLY match what you speak. Do not include internal thoughts, reasoning, "Thinking...", or any text that is not spoken aloud.
`;

export const PCM_SAMPLE_RATE = 16000;
export const OUT_SAMPLE_RATE = 24000;

export const parseResumePrompt = (resumeText: string) => {
  return `
You are a resume parser. Extract the following information from the resume text and return ONLY a valid JSON object with no additional text or markdown formatting.

Required JSON structure:
{
  "name": "Full name",
  "title": "Current job title or desired position",
  "experience_years": 0.0,
  "skills": {
    "languages": ["JavaScript", "Python"],
    "frameworks": ["React", "Node.js"],
    "databases": ["MongoDB", "PostgreSQL"],
    "tools": ["Docker", "Git"]
  },
  "work_experience": [
    {
      "company": "Company name",
      "role": "Job title",
      "start": "YYYY-MM-DD or YYYY-MM",
      "end": "YYYY-MM-DD or present",
      "description": "Brief description of responsibilities"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "What the project does",
      "tech": ["Technology", "Stack"]
    }
  ],
  "education": {
    "degree": "Degree name",
    "institute": "University/College name",
    "year": 2023
  },
  "achievements": ["Achievement 1", "Achievement 2"],
  "soft_skills": ["communication", "leadership"]
  "resume_summary": "Here is the entire summary of this Resume....."
}

Rules:
- If information is not available, use empty arrays [] or empty strings ""
- Calculate experience_years based on work history (in decimal, e.g., 1.5 years)
- Use "present" for current positions
- Extract only factual information from the resume
- Return ONLY the JSON object, no markdown code blocks

Resume Text:
${resumeText}
`;
};

export const parseJDPrompt = (jdText: string) => `
Extract structured information from this job description.
Return ONLY valid JSON with the schema:

{
  "title": "",
  "company": "",
  "location": "",
  "employment_type": "",
  "experience_required_years": 0.0,
  "skills_required": {
    "must_have": [],
    "good_to_have": []
  },
  "roles_responsibilities": [],
  "education_required": "",
  "salary_range": "",
  "job_summary": ""
}

Rules:
- No Markdown.
- No commentary.
- Use empty values when missing.
- Convert all experience mentions into number of years.

Job Description:
${jdText}
`;

export const evaluationPrompt = (transcript: any, resume: any, jd: any) => {
  return `
You are an AI interview evaluator.

Evaluate the candidate based on:
- Complete transcript of Q&A
- Candidate’s parsed resume
- Parsed job description

Return ONLY valid JSON in the following schema:

{
  "score": 1-10,
  "communication": 1-10,
  "technicalDepth": 1-10,
  "problemSolving": 1-10,
  "confidence": 1-10,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "summary": "3-4 line summary",
  "recommendation": "strong_yes" | "yes" | "maybe" | "no"
}

Rules:
- Strict JSON only
- Don’t hallucinate missing data
- Score must reflect candidate's actual answers

Transcript:
${JSON.stringify(transcript)}

Resume:
${JSON.stringify(resume)}

Job Description:
${JSON.stringify(jd)}
`;
};

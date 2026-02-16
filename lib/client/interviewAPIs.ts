import { StartResponse, NextResponse, SubmitUserResponse } from "../types";

/**
 * Start a new interview session
 * Backend creates session and returns first question
 */

const dummy = {
  success: true,
  sessionId: "123234",
  question: "What is Capital of India",
  questionId: "12345",
  progress: {
    current: 4,
    total: 40,
    remaining: 36,
  },
  end: false,
};
const dummy2 = {
  success: true,
  sessionId: "1232345",
  question: "What is Capital of Uttar Pradesh",
  questionId: "1234",
  progress: {
    current: 4,
    total: 40,
    remaining: 36,
  },
  end: false,
};

export async function startInterviewSession(
  userId: string,
): Promise<StartResponse> {
  // console.warn("[MOCK] startInterviewSession returning dummy data");

  // Simulate network latency (optional but recommended)
  // await new Promise((res) => setTimeout(res, 600));
  // return dummy;
  const response = await fetch("/api/interview/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  const data: StartResponse = await response.json();
  if (response.status === 500) {
    throw new Error(data.message || "Failed to submit answer");
  }

  return data;
}

/**
 * Submit user answer and get next question
 * Backend evaluates answer and returns next question or ends session
 */
export async function submitAnswerAndGetNext(params: {
  userId?: string;
  sessionId: string;
  questionId: string;
  answerText: string;
  end?: boolean;
}): Promise<NextResponse> {
  // console.warn("[MOCK] submitAnswerAndGetNext returning dummy data");

  // Simulate network latency (optional but recommended)
  // await new Promise((res) => setTimeout(res, 600));
  // return dummy2;
  const response = await fetch("/api/interview/next", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data: NextResponse = await response.json();
  if (response.status === 500) {
    throw new Error(data.message || "Failed to submit answer");
  }

  return data;
}

const dummySubmitUserResponse: SubmitUserResponse = {
  success: true,
  userId: "dummy-user-123",
  resumeId: "dummy-resume-456",
  jdId: "dummy-jd-789",
};

export async function submitUserResume(
  formData: FormData,
): Promise<SubmitUserResponse> {
  // console.warn("[MOCK] submitUserResume returning dummy data");

  // Simulate network latency (optional but recommended)
  // await new Promise((res) => setTimeout(res, 600));

  // return dummySubmitUserResponse;

  // REAL BACKEND CALL

  const response = await fetch("/api/users", {
    method: "POST",
    body: formData,
  });

  const data: SubmitUserResponse = await response.json();

  if (response.status === 500) {
    throw new Error(data.message || "Failed to submit answer");
  }

  return data;
}

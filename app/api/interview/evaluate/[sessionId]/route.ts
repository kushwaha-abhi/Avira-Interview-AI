import { evaluationPrompt } from "@/lib/constants";
import { callLLM } from "@/lib/gemini/llmServices";
import connectDB from "@/lib/server/mongodb";
import Evaluation from "@/models/evaluationModel";
import DocumentModel from "@/models/documentModel";
import InterviewModel from "@/models/interviewModel";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    await connectDB();

    const session = await InterviewModel.findById(sessionId)
      .populate({ path: "userId", select: "userType" })
      .lean();

    if (!session)
      return NextResponse.json(
        { success: false, message: "Invalid session" },
        { status: 404 }
      );
    if ((session.userId as any).userType == "GUEST")
      return NextResponse.json(
        { success: false, message: "Please login to for evaluation" },
        { status: 400 }
      );

    const existingEvaluation = await Evaluation.findOne({
      interviewId: sessionId,
    }).lean();

    if (existingEvaluation)
      return NextResponse.json(
        { success: true, evaluation: existingEvaluation },
        { status: 200 }
      );

    const resume = await DocumentModel.findById(session.resumeId).select(
      "parsed"
    );
    const jd = await DocumentModel.findById(session.jdId).select("parsed");

    const transcript = session.qaHistory.map((q) => {
      return {
        questionId: q.questionId,
        question: q.question,
        answer: q.answer || "",
      };
    });

    // 2. Generate prompt
    const prompt = evaluationPrompt(transcript, resume?.parsed, jd?.parsed);

    // 3. Call Gemini
    const text = await callLLM(prompt);
    const clean = text?.replace(/```json|```/g, "").trim();
    const evaluation = JSON.parse(clean as string);

    // // 4. Store evaluation
    await Evaluation.create({ interviewId: sessionId, ...evaluation });

    return NextResponse.json({ success: true, evaluation }, { status: 201 });
  } catch (err) {
    console.error("Error in /interview/evaluate/:sessionId", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

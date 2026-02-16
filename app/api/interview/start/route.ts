import { NextRequest, NextResponse } from "next/server";
import Document from "@/models/documentModel";
import InterviewSession from "@/models/interviewModel";
import InterviewEngine from "@/lib/gemini/interviewEngine";
import connectDB from "@/lib/server/mongodb";
import { v4 as uuidv4 } from "uuid";
import { ISetting } from "@/lib/types";
import User from "@/models/userModel";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Get userId from request body (will be sent from frontend)
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing userId" },
        { status: 400 }
      );
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Parallel: Fetch documents and create session
    const [documents, session] = await Promise.all([
      Document.find({ userId: user._id }).lean(), // .lean() for faster reads
      InterviewSession.create({
        userId: user._id,
        status: "ongoing",
        maxQuestion: 5,
        currentQuestion: 1,
        qaHistory: [],
        startedAt: new Date(),
      }),
    ]);

    // Find resume and JD
    const resumeDoc = documents.find((d) => d.type === "Resume") || null;
    const jdDoc = documents.find((d) => d.type === "JD") || null;

    // Update session with document IDs if found
    if (resumeDoc || jdDoc) {
      session.resumeId = resumeDoc?._id;
      session.jdId = jdDoc?._id;
    }

    // Build settings
    const settings: ISetting = {
      candidateName: user.name,
      position: user.role,
      language: user.language,
      difficulty: user.difficulty,
    };

    // Generate first question
    const engine = new InterviewEngine(session);
    const q = await engine.generateFirstQuestion(
      resumeDoc?.parsed || null,
      jdDoc?.parsed || null,
      settings
    );

    // Update session with first question and system prompt
    session.qaHistory = [
      {
        questionId: q.questionId || uuidv4(),
        question: q.questionText,
        createdAt: new Date(),
      },
    ];
    session.systemPrompt = engine.session.systemPrompt;

    // Single save
    await session.save();

    return NextResponse.json({
      success: true,
      sessionId: session._id,
      question: q.questionText,
      questionId: q.questionId,
      progress: {
        current: user.limits.durationUsed,
        total: user.limits.maxDurationPerDay,
        remaining: user.limits.maxDurationPerDay - user.limits.durationUsed,
      },
    });
  } catch (err: any) {
    console.error("Error in /interview/start:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

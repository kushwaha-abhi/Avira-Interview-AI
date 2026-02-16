import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/server/mongodb";
import User, { IUser } from "@/models/userModel";
import path from "path";
import { extractTextFromPdf } from "@/lib/textHandlers";
import DocumentModel from "@/models/documentModel";
import { parseWithGemini } from "@/lib/gemini/llmServices";
import { generateUniqueID } from "@/models/modelCounter";
import InterviewModel from "@/models/interviewModel";
import { PLAN_LIMITS } from "@/lib/constants";
import { writeFile, mkdir } from "fs/promises";

export async function GET(request: NextRequest) {
  await connectDB();
  const session = await InterviewModel.findById("69391a530b39d3dc68a304d1")
    .populate({ path: "userId", select: "userType" })
    .lean();
  console.log("sesssions", session?.userId);
  return NextResponse.json(session?.userId);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const formData = await request.formData();

    const file = formData.get("resume") as File;
    const name = formData.get("name") as string;
    const role = formData.get("role") as string;
    const email = formData.get("email") as string;
    const experience = formData.get("experience") as string;
    const difficulty = formData.get("difficulty") as string;
    const language = formData.get("language") as string;
    const jd = formData.get("jd") as string | null;
    // const questionLimit = (formData.get("questionLimit") as string) || "5";

    if (!file || !name || !role || !experience) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }
    // console.log("Handling File");
    // Convert PDF file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${file.name}-${Date.now()}`;
    const uploadsDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, fileName);

    // Ensure uploads directory exists
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(filePath, buffer);

    // Extract text from resume
    // console.log("Extracting Text from RESUME");
    const resumeRawText = await extractTextFromPdf(filePath);

    // Parse resume using Gemini
    // console.log("Parsing Resume");
    const resumeParsed = await parseWithGemini(resumeRawText, "Resume");

    const existingUser = await User.findOne({ email });

    let user: IUser | null;

    if (existingUser) {
      // Update existing user (exclude USRID & questionLimit)
      user = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            name,
            role,
            experience,
            difficulty,
            language,
          },
        },
        { new: true }
      );
    } else {
      // Create new user with USRID and default questionLimit
      const USRID = await generateUniqueID("USR");
      user = await User.create({
        USRID,
        name,
        email,
        role,
        experience,
        difficulty,
        language,
        userType: "GUEST",
        limits: PLAN_LIMITS.GUEST,
      });
    }

    // Save Resume Document
    // console.log("saving resume");
    // const resumeId = await generateUniqueID("RS");
    const resumeDoc = await DocumentModel.create({
      userId: user?._id,
      type: "Resume",
      rawText: resumeRawText,
      parsed: resumeParsed,
    });

    let jdDoc: any = null;
    if (jd) {
      // console.log("parsing JD");
      // const jdId = await generateUniqueID("JD");
      const jdParsed = await parseWithGemini(jd, "JD");

      // console.log("saving JD");
      jdDoc = await DocumentModel.create({
        userId: user?._id,
        type: "JD",
        rawText: jd,
        parsed: jdParsed,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "User setup complete",
        userId: user?._id,
        resumeId: resumeDoc._id,
        jdId: jdDoc?._id || null,
        ready: true,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.warn("Error in onboarding:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

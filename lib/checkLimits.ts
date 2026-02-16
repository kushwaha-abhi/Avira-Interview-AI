import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import User, { IUser } from "@/models/userModel";
import { IInterviewSession } from "@/models/interviewModel";

export async function checkAndUpdateDurationMiddleware(req: NextRequest) {
  // const session = await getServerSession(authOptions);
  // if (!session)
  //   return NextResponse.json(
  //     { success: false, message: "Unauthorized" },
  //     { status: 401 }
  //   );
  const {
    userId,
    sessionId,
    questionId,
    answerText,
    end = false,
  } = await req.json();

  const today = new Date().toISOString().split("T")[0];

  // Single DB call with update
  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      "dailyUsage.lastResetDate": { $ne: today }, // Reset if old date
    },
    {
      $set: {
        "limits.durationUsed": 0,
        "limits.lastResetDate": today,
      },
    },
    { new: true }
  );
  // If no update happened, fetch normally
  const finalUser = user || (await User.findById(userId));

  if (!finalUser)
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 }
    );

  // Check limit
  if (finalUser.limits.durationUsed >= finalUser.limits.maxDurationPerDay)
    return NextResponse.json(
      { success: false, message: "Daily duration limit exceeded" },
      { status: 403 }
    );

  return { user: finalUser, sessionId, questionId, answerText, end };
}

export async function updateUsage(session: IInterviewSession, user: IUser) {
  // Calculate current duration
  const currentDuration = Math.floor(
    (Date.now() - new Date(session.startedAt).getTime()) / 1000
  );

  // Check if session exceeded limit
  if (currentDuration >= user.limits.maxDurationPerDay) {
    // Auto-end session and update usage
    await User.findByIdAndUpdate(user._id, {
      $inc: { "limits.durationUsed": currentDuration },
    });

    session.status = "completed";
    session.endedAt = new Date();
    await session.save();

    return NextResponse.json(
      {
        success: false,
        message: "Session time limit reached",
        shouldEndSession: true,
        durationUsed: currentDuration,
      },
      { status: 403 }
    );
  }
}

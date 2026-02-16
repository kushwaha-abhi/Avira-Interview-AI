"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  PhoneOff,
  AlertCircle,
  MessageSquare,
  X,
  Loader2,
  Send,
  RefreshCw,
} from "lucide-react";
import { useInterview } from "../../context/InterviewContext";
import HolographicAvatar from "../../components/HolographicAvatar";
import { useGeminiAudio } from "../../hooks/useGeminiAudio";
import {
  startInterviewSession,
  submitAnswerAndGetNext,
} from "../../lib/client/interviewAPIs";
import { InterviewPhase, InterviewConfig } from "../../lib/types";

// HELPER: Load user config from localStorage
const loadUserConfig = (): InterviewConfig | null => {
  try {
    const stored = localStorage.getItem("user_data");
    if (!stored) {
      console.warn("⚠️ No user_data in localStorage");
      return null;
    }

    const parsed = JSON.parse(stored);
    console.log("📦 Parsed user config:", parsed);

    if (!parsed.userId || !parsed.resumeId) {
      console.error("❌ Invalid config - missing required fields");
      return null;
    }

    return {
      userId: parsed.userId,
      resumeId: parsed.resumeId,
      candidateName: parsed.candidateName || "",
      jdId: parsed.jdId || null,
      domain: parsed.domain || "",
    };
  } catch (error) {
    console.error("❌ Failed to load user config:", error);
    return null;
  }
};

// HELPER: Session state management
interface SessionState {
  sessionId: string;
  questionId: string;
  question: string;
  timestamp: number;
}

const saveSessionState = (state: SessionState) => {
  try {
    localStorage.setItem("currentSession", JSON.stringify(state));
    console.log("💾 Session state saved:", state);
  } catch (error) {
    console.error("❌ Failed to save session state:", error);
  }
};

const loadSessionState = (): SessionState | null => {
  try {
    const stored = localStorage.getItem("currentSession");
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    const age = Date.now() - parsed.timestamp;

    // Session expires after 1 hour
    if (age > 60 * 60 * 1000) {
      console.log("⏰ Session expired, clearing...");
      localStorage.removeItem("currentSession");
      return null;
    }

    console.log("📦 Loaded session state:", parsed);
    return parsed;
  } catch (error) {
    console.error("❌ Failed to load session state:", error);
    return null;
  }
};

// MAIN COMPONENT
export default function InterviewRoom() {
  const router = useRouter();
  const { transcript, addTranscriptItem } = useInterview();
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;

  // REFS - Persistent data that doesn't trigger re-renders
  const initializedRef = useRef(false);
  const phaseRef = useRef<InterviewPhase>("INIT");
  const configRef = useRef<InterviewConfig | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const currentQuestionIdRef = useRef<string | null>(null);
  const currentUserTextRef = useRef("");
  const isMicOnRef = useRef(true);
  const geminiAudioRef = useRef<ReturnType<typeof useGeminiAudio> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reconnectAttemptsRef = useRef(0);

  // STATE - UI data that triggers re-renders
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [streamingUserText, setStreamingUserText] = useState("");
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [isSessionClosed, setIsSessionClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitEnabled, setIsSubmitEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // SYNC: Keep refs in sync with state
  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    if (aiSpeaking) {
      phaseRef.current = "AI_SPEAKING";
    }
  }, [aiSpeaking]);

  // BUTTON STATE: Enable submit when user has spoken
  useEffect(() => {
    const hasText = streamingUserText.trim().length > 0;
    const isUserTurn = phaseRef.current === "USER_SPEAKING";
    const notProcessing = !isSubmitting;
    const shouldEnable = hasText && isUserTurn && notProcessing;

    setIsSubmitEnabled(shouldEnable);

    if (hasText && isUserTurn) {
      console.log(
        "[Interview] 🎤 User text accumulated:",
        streamingUserText.length,
        "chars",
      );
    }
  }, [streamingUserText, isSubmitting]);

  // CLEANUP: Clear text when AI interrupts
  useEffect(() => {
    if (
      phaseRef.current === "AI_SPEAKING" ||
      phaseRef.current === "PROCESSING_ANSWER"
    ) {
      if (currentUserTextRef.current) {
        console.log("[Interview] 🧹 Clearing text buffer due to phase change");
        currentUserTextRef.current = "";
        setStreamingUserText("");
        setIsSubmitEnabled(false);
      }
    }
  }, [aiSpeaking]);

  // RECONNECT HANDLER
  const handleReconnect = useCallback(async () => {
    console.log("[Interview] 🔄 Reconnect requested");

    // Increment attempt counter
    reconnectAttemptsRef.current += 1;

    // After 3 failed attempts, suggest refresh
    if (reconnectAttemptsRef.current > 3) {
      setError(
        "Multiple reconnection attempts failed. Please refresh the page.",
      );
      return;
    }

    setIsReconnecting(true);
    setError(null);

    try {
      // Step 1: Cleanup existing connection
      console.log("[Interview] 🧹 Cleaning up old connection...");
      geminiAudioRef.current?.cleanup();

      // Step 2: Wait a moment for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 3: Get current question from state or localStorage
      const currentQ = currentQuestion || loadSessionState()?.question;

      if (!currentQ) {
        throw new Error("No question to reconnect with");
      }

      console.log("[Interview] 📡 Reconnecting with question:", currentQ);

      // Step 4: Reconnect to Gemini
      await geminiAudio.connect(currentQ);

      console.log("[Interview] ✅ Reconnected successfully!");
      reconnectAttemptsRef.current = 0; // Reset counter on success
      setIsReconnecting(false);
    } catch (err: any) {
      console.error("[Interview] ❌ Reconnection failed:", err);
      setError(
        `Reconnection failed (attempt ${reconnectAttemptsRef.current}/3)`,
      );
      setIsReconnecting(false);
    }
  }, [currentQuestion]);

  // MANUAL SUBMIT HANDLER
  const handleManualSubmit = useCallback(async () => {
    console.log("[Interview] 🚀 Manual submit clicked");

    // Guard: No text
    if (!currentUserTextRef.current.trim()) {
      console.warn("[Interview] ⚠️ Cannot submit - no text");
      return;
    }

    // Guard: Wrong phase
    if (phaseRef.current !== "USER_SPEAKING") {
      console.warn(
        "[Interview] ⚠️ Cannot submit - wrong phase:",
        phaseRef.current,
      );
      return;
    }

    // Guard: Already processing
    if (isSubmitting) {
      console.warn("[Interview] ⚠️ Cannot submit - already processing");
      return;
    }

    // Lock submission
    setIsSubmitting(true);
    setIsSubmitEnabled(false);

    const answerText = currentUserTextRef.current.trim();
    console.log("[Interview] 📝 Submitting:", answerText.substring(0, 100));

    // Add to transcript
    addTranscriptItem({
      role: "user",
      text: answerText,
      timestamp: Date.now(),
    });

    // Clear buffers
    currentUserTextRef.current = "";
    setStreamingUserText("");

    // Submit to backend
    await handleAnswerComplete(answerText, false);

    setIsSubmitting(false);
  }, [isSubmitting]);

  // ANSWER COMPLETION HANDLER
  const handleAnswerComplete = async (
    answerText: string,
    endSession = false,
  ) => {
    console.log("[Interview] 📤 handleAnswerComplete called", {
      phase: phaseRef.current,
      answer: answerText.substring(0, 50),
      endSession,
    });

    // Guard: Missing IDs
    if (!sessionIdRef.current || !currentQuestionIdRef.current) {
      console.error("[Interview] ❌ Missing session or question ID");
      setIsSubmitting(false);
      return;
    }

    // Lock phase
    phaseRef.current = "PROCESSING_ANSWER";
    console.log("[Interview] 🔒 Phase locked to PROCESSING_ANSWER");

    try {
      // Call backend API
      console.log("[Interview] 📡 Calling backend API...");
      const data = await submitAnswerAndGetNext({
        userId: configRef.current!.userId,
        sessionId: sessionIdRef.current,
        questionId: currentQuestionIdRef.current,
        answerText,
        end: endSession,
      });

      console.log("[Interview] ✅ Backend response:", data);

      // Check if interview ended
      if (!data.success) {
        console.log("[Interview] 🏁 Interview ended");
        setError(`Failed to submit : ${data.message}`);
        phaseRef.current = "ENDED";
        setIsSessionEnded(true);
        geminiAudioRef.current?.cleanup();
        localStorage.removeItem("currentSession");
        router.push("/");
        return;
      }

      if (data.end) {
        setIsSessionClosed(true);
      }
      // Update refs and state
      currentQuestionIdRef.current = data.questionId!;
      setCurrentQuestion(data.question!);

      // Save to localStorage for recovery
      saveSessionState({
        sessionId: sessionIdRef.current,
        questionId: data.questionId!,
        question: data.question!,
        timestamp: Date.now(),
      });

      // Send next question to Gemini
      console.log("[Interview] 🎤 Sending next question to Gemini...");

      // CRITICAL FIX: Check if still connected before sending
      if (!geminiAudioRef.current) {
        console.error("[Interview] ❌ Gemini ref is null, reconnecting...");
        await handleReconnect();
        return;
      }

      geminiAudioRef.current.sendQuestion(data.question!);
    } catch (err: any) {
      console.error("[Interview] ❌ Submit failed:", err);

      // Restore text on error
      setError("Failed to submit. Please try again.");
      currentUserTextRef.current = answerText;
      setStreamingUserText(answerText);
      phaseRef.current = "USER_SPEAKING";
      setIsSubmitting(false);
      setIsSubmitEnabled(true);

      setTimeout(() => setError(null), 3000);
    }
  };

  // GEMINI AUDIO HOOK
  const geminiAudio = useGeminiAudio({
    apiKey,
    phaseRef,
    isMicOnRef,
    currentUserTextRef,

    onAiSpeakingChange: (speaking) => {
      console.log("[Gemini] 🔊 AI speaking:", speaking);
      setAiSpeaking(speaking);
    },

    onStreamingTextChange: (text) => {
      console.log("[Gemini] 📝 Streaming:", text.substring(0, 30));
      setStreamingUserText(text);
    },

    onTranscriptAdd: (item) => {
      console.log(
        "[Gemini] 📋 Transcript:",
        item.role,
        item.text.substring(0, 30),
      );
      addTranscriptItem(item);
    },

    onConnectedChange: (connected) => {
      console.log("[Gemini] 🔌 Connection:", connected);
      setIsConnected(connected);
    },

    onError: (errorMsg) => {
      console.error("[Gemini] ❌ Error:", errorMsg);
      setError(errorMsg);
    },
  });

  // Assign to ref for access
  useEffect(() => {
    geminiAudioRef.current = geminiAudio;
    return () => {
      geminiAudioRef.current = null;
    };
  }, [geminiAudio]);

  // INITIALIZATION (RUNS ONCE)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let cancelled = false;

    const init = async () => {
      console.log("[Interview] 🚀 Initializing interview room...");

      try {
        // STEP 1: Load user config
        console.log("[Interview] 📦 Loading user config...");
        const config = loadUserConfig();

        if (!config?.userId) {
          console.error("[Interview] ❌ No user config found");
          setError("User session not found");
          router.push("/setup");
          return;
        }

        configRef.current = config;
        console.log("[Interview] ✅ User config loaded:", config.userId);

        // STEP 2: Check for existing session (page reload case)
        console.log("[Interview] 🔍 Checking for existing session...");
        const existingSession = loadSessionState();

        let sessionData: any;

        if (existingSession) {
          console.log("[Interview] ♻️ Restoring existing session");
          setLoadingMessage("Restoring your session...");

          sessionData = existingSession;
        } else {
          console.log("[Interview] 🆕 Starting new session");
          setLoadingMessage("Starting interview session...");

          sessionData = await startInterviewSession(config.userId);

          if (cancelled) {
            console.log("[Interview] ⛔ Cancelled after session start");
            return;
          }

          console.log(
            "[Interview] ✅ New session created:",
            sessionData.sessionId,
          );

          // Save new session
          saveSessionState({
            sessionId: sessionData.sessionId,
            questionId: sessionData.questionId,
            question: sessionData.question,
            timestamp: Date.now(),
          });
        }

        // STEP 3: Set session refs
        sessionIdRef.current = sessionData.sessionId;
        currentQuestionIdRef.current = sessionData.questionId;
        setCurrentQuestion(sessionData.question);

        console.log("[Interview] 📌 Session state set:", {
          sessionId: sessionData.sessionId,
          questionId: sessionData.questionId,
        });

        // STEP 4: Connect to Gemini
        console.log("[Interview] 📡 Connecting to Gemini...");
        setLoadingMessage("Connecting to AI interviewer...");

        await geminiAudio.connect(sessionData.question);

        if (cancelled) {
          console.log("[Interview] ⛔ Cancelled after Gemini connect");
          return;
        }

        // STEP 5: Success!
        console.log("[Interview] ✅ Initialization complete!");
        setIsLoading(false);
        reconnectAttemptsRef.current = 0; // Reset reconnect counter
      } catch (err: any) {
        console.error("[Interview] ❌ Initialization error:", err);

        if (cancelled) return;

        // Set appropriate error message
        if (err?.message?.includes("429")) {
          setError("AI service unavailable. Please try again later.");
        } else if (err?.message?.includes("Microphone")) {
          setError("Microphone access denied. Please enable it and refresh.");
        } else if (err?.message?.includes("API Key")) {
          setError("Configuration error. Please contact support.");
        } else {
          setError("Failed to initialize. Please refresh and try again.");
        }

        setIsLoading(false);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      console.log("[Interview] 🧹 Component unmounting...");
      cancelled = true;

      if (phaseRef.current !== "ENDED") {
        phaseRef.current = "ENDED";
        geminiAudio.cleanup();
      }
    };
  }, []);

  // AUTO-SCROLL TRANSCRIPT
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, streamingUserText]);

  // END INTERVIEW HANDLER
  const handleEndInterview = async () => {
    console.log("[Interview] 🛑 Ending interview...");

    if (currentUserTextRef.current.trim()) {
      const answer =
        currentUserTextRef.current.trim() ||
        "I want to end this session, Thank you";
      console.log("[Interview] 📝 Submitting final answer");

      addTranscriptItem({
        role: "user",
        text: answer || "No Answer",
        timestamp: Date.now(),
      });

      await handleAnswerComplete(answer, true);
    } else {
      await handleAnswerComplete("", true);
    }

    if (isSessionClosed) {
      geminiAudio.cleanup();
      localStorage.removeItem("currentSession");
      router.push("/dashboard");
    }
  };

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-lg text-gray-300">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  // MAIN UI
  return (
    <div className="h-screen flex flex-col bg-linear-to-br from-gray-900 to-black relative">
      {/* Avatar */}
      <HolographicAvatar
        analyser={geminiAudio.analyser}
        isSpeaking={aiSpeaking}
      />

      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 max-w-md z-50">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400">{error}</p>
              {reconnectAttemptsRef.current <= 3 && (
                <button
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                  className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
                >
                  {isReconnecting ? "Reconnecting..." : "Try Reconnect"}
                </button>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Status + Reconnect Button */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        {/* Reconnect Button (show if disconnected) */}
        {!isConnected && !isLoading && (
          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="flex items-center gap-2 bg-orange-600/80 hover:bg-orange-700/80 backdrop-blur-sm px-3 py-2 rounded-full transition-colors"
            title="Reconnect to AI"
          >
            <RefreshCw
              className={`w-4 h-4 text-white ${isReconnecting ? "animate-spin" : ""}`}
            />
            <span className="text-xs text-white">
              {isReconnecting ? "Reconnecting..." : "Reconnect"}
            </span>
          </button>
        )}

        {/* Status Indicator */}
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-gray-300">
            {!isConnected
              ? "Disconnected"
              : aiSpeaking
                ? "AI Speaking"
                : phaseRef.current === "USER_SPEAKING"
                  ? "Your Turn"
                  : phaseRef.current === "PROCESSING_ANSWER"
                    ? "Processing..."
                    : "Ready"}
          </span>
        </div>
      </div>

      {/* Current Question */}
      {currentQuestion && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Current Question:</p>
            <p className="text-lg text-white">{currentQuestion}</p>
          </div>
        </div>
      )}

      {/* Live Transcription Display */}
      {streamingUserText && phaseRef.current === "USER_SPEAKING" && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4">
          <div className="bg-blue-600/20 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30">
            <p className="text-xs text-blue-400 mb-1">You're saying:</p>
            <p className="text-sm text-white">{streamingUserText}</p>
            <p className="text-xs text-gray-400 mt-2">
              {streamingUserText.split(" ").length} words
            </p>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4">
        {/* Transcript Toggle */}
        <button
          onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
          className="p-4 rounded-full bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm transition-colors"
          title="Toggle Transcript"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </button>

        {/* Mic Toggle */}
        <button
          onClick={() => setIsMicOn(!isMicOn)}
          className={`p-4 rounded-full backdrop-blur-sm transition-colors ${
            isMicOn
              ? "bg-blue-600/80 hover:bg-blue-700/80"
              : "bg-red-600/80 hover:bg-red-700/80"
          }`}
          title={isMicOn ? "Mute" : "Unmute"}
        >
          {isMicOn ? (
            <Mic className="w-6 h-6 text-white" />
          ) : (
            <MicOff className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Submit Answer */}
        <button
          onClick={handleManualSubmit}
          disabled={!isSubmitEnabled}
          className={`p-4 rounded-full backdrop-blur-sm transition-colors ${
            isSubmitEnabled
              ? "bg-green-600/80 hover:bg-green-700/80 cursor-pointer"
              : "bg-gray-600/50 cursor-not-allowed opacity-50"
          }`}
          title={
            isSubmitting
              ? "Submitting..."
              : isSubmitEnabled
                ? "Submit Answer"
                : "Speak to enable"
          }
        >
          {isSubmitting ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Send className="w-6 h-6 text-white" />
          )}
        </button>

        {/* End Interview */}
        <button
          onClick={handleEndInterview}
          className="p-4 rounded-full bg-red-600/80 hover:bg-red-700/80 backdrop-blur-sm transition-colors"
          title="End Interview"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Transcript Panel */}
      {isTranscriptVisible && (
        <div className="absolute left-4 top-4 w-96 max-h-[70vh] bg-black/80 backdrop-blur-sm rounded-lg overflow-hidden z-40">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Transcript</h3>
            <button
              onClick={() => setIsTranscriptVisible(false)}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div
            ref={scrollRef}
            className="p-4 space-y-3 overflow-y-auto max-h-[calc(70vh-60px)]"
          >
            {transcript.map((t, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg ${
                  t.role === "user"
                    ? "bg-blue-600/20 border border-blue-500/30"
                    : "bg-gray-700/20 border border-gray-600/30"
                }`}
              >
                <p className="text-xs text-gray-400 mb-1">
                  {t.role === "user" ? "You" : "AI"}
                </p>
                <p className="text-sm text-white">{t.text}</p>
              </div>
            ))}
            {streamingUserText && (
              <div className="p-3 rounded-lg bg-blue-600/20 border border-blue-500/30 animate-pulse">
                <p className="text-xs text-gray-400 mb-1">You (speaking...)</p>
                <p className="text-sm text-white">{streamingUserText}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Session Ended Overlay */}
      {isSessionEnded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Interview Complete
            </h2>
            <p className="text-gray-300 mb-6">
              Thank you for completing the interview. Your responses have been
              recorded.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              View Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

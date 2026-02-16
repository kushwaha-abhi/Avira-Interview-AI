import { useRef, useCallback } from "react";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { PCM_SAMPLE_RATE, OUT_SAMPLE_RATE } from "../lib/constants";
import {
  createPcmBlob,
  decodeAudioData,
  base64ToUint8Array,
} from "../lib/audioUtils";
import { InterviewPhase } from "@/lib/types";
import { TranscriptItem } from "@/lib/types";

interface UseGeminiAudioProps {
  apiKey: string;
  phaseRef: React.MutableRefObject<InterviewPhase>;
  isMicOnRef: React.MutableRefObject<boolean>;
  currentUserTextRef: React.MutableRefObject<string>;
  onAiSpeakingChange: (speaking: boolean) => void;
  onStreamingTextChange: (text: string) => void;
  onTranscriptAdd: (item: TranscriptItem) => void;
  onConnectedChange: (connected: boolean) => void;
  onError: (error: string) => void;
}

/**
 * Custom hook to manage Gemini Live API connection
 * STEP 1-2: Removed silence detection and onAnswerComplete
 * Hook now ONLY handles audio-to-text transcription
 */
export function useGeminiAudio({
  apiKey,
  phaseRef,
  isMicOnRef,
  currentUserTextRef,
  onAiSpeakingChange,
  onStreamingTextChange,
  onTranscriptAdd,
  onConnectedChange,
  onError,
}: UseGeminiAudioProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const activeSessionRef = useRef<any>(null);
  // STEP 8: Removed answerTimeoutRef - no more silence detection

  const cleanup = useCallback(() => {
    console.log("[Gemini Hook] Cleaning up...");

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (activeSessionRef.current) {
      try {
        activeSessionRef.current.close?.();
      } catch (e) {
        console.warn("[Gemini Hook] Failed to close session", e);
      }
      activeSessionRef.current = null;
    }

    console.log("[Gemini Hook] Cleanup complete");
  }, []);

  const sendQuestion = useCallback(
    (question: string) => {
      if (!activeSessionRef.current) {
        console.error("[Gemini Hook] Cannot send question - no active session");
        return;
      }

      console.log("[Gemini Hook] Sending question:", question);
      phaseRef.current = "AI_SPEAKING";

      activeSessionRef.current.sendRealtimeInput({
        text: `Ask the candidate this question: "${question}"`,
      });

      console.log("[Gemini Hook] Question sent, phase set to AI_SPEAKING");
    },
    [phaseRef],
  );

  const connect = useCallback(
    async (initialQuestion?: string) => {
      console.log("[Gemini Hook] Connecting...", { initialQuestion });

      if (!apiKey) {
        console.error("[Gemini Hook] No API key provided");
        onError("API Key Missing");
        return;
      }

      if (activeSessionRef.current) {
        console.log("[Gemini Hook] Closing existing session");
        try {
          activeSessionRef.current.close?.();
        } catch (e) {
          console.warn("[Gemini Hook] Failed to close previous session", e);
        }
        activeSessionRef.current = null;
      }

      try {
        const ai = new GoogleGenAI({ apiKey });

        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )({ sampleRate: OUT_SAMPLE_RATE });
        inputContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )({ sampleRate: PCM_SAMPLE_RATE });

        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 512;
        analyserRef.current = analyser;

        console.log("[Gemini Hook] Audio contexts created");

        const sessionPromise = ai.live.connect({
          model: "gemini-2.5-flash-native-audio-preview-09-2025",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
            },
            // Enable transcription for user speech
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [
                {
                  text: `You are a text-to-speech system for a structured interview application.

STRICT RULES:
1. You will ONLY receive messages that start with "Ask the candidate this question:"
2. When you receive such a message, extract the question and speak it clearly
3. After speaking the question, you are DONE - produce NO other output
4. You will NEVER receive or respond to the candidate's answers
5. The candidate's speech is being transcribed separately - you will not hear it
6. DO NOT generate any conversational responses, acknowledgments, or follow-ups
7. User will speaks in English only, if user speak any other language, listen carefully translate in english

Example:
Input: "Ask the candidate this question: Tell me about your experience?"
Your response: [Speak only] "Tell me about your experience?"
Then: Complete silence until next instruction.`,
                },
              ],
            },
          },
          callbacks: {
            onopen: async () => {
              console.log("[Gemini Hook] Connection opened");
              onConnectedChange(true);

              try {
                const stream = await navigator.mediaDevices.getUserMedia({
                  audio: true,
                });
                streamRef.current = stream;
                console.log("[Gemini Hook] Microphone access granted");

                if (!inputContextRef.current) {
                  console.error("[Gemini Hook] Input context not available");
                  return;
                }

                const source =
                  inputContextRef.current.createMediaStreamSource(stream);
                const processor = inputContextRef.current.createScriptProcessor(
                  4096,
                  1,
                  1,
                );

                processor.onaudioprocess = (e) => {
                  const currentPhase = phaseRef.current;
                  const micOn = isMicOnRef.current;

                  // 🔍 DEBUG: Detailed logging
                  if (Math.random() < 0.01) {
                    console.log(
                      "[Audio Pipeline] Running - Phase:",
                      currentPhase,
                      "Mic:",
                      micOn,
                    );
                  }

                  if (currentPhase !== "USER_SPEAKING") {
                    if (Math.random() < 0.02) {
                      console.warn(
                        "[Audio Pipeline] ⚠️ Blocked - Phase is:",
                        currentPhase,
                      );
                    }
                    return;
                  }

                  if (!micOn) {
                    if (Math.random() < 0.02) {
                      console.warn("[Audio Pipeline] ⚠️ Blocked - Mic is off");
                    }
                    return;
                  }

                  // Check audio levels
                  const inputData = e.inputBuffer.getChannelData(0);
                  const volume = Math.max(
                    ...Array.from(inputData).map(Math.abs),
                  );

                  // Log when we detect sound
                  if (volume > 0.01 && Math.random() < 0.05) {
                    console.log(
                      "[Audio Pipeline] 🎤 SOUND DETECTED! Volume:",
                      volume.toFixed(4),
                    );
                  }

                  const pcmBlob = createPcmBlob(inputData);

                  sessionPromise.then((session) => {
                    if (activeSessionRef.current === session) {
                      session.sendRealtimeInput({ media: pcmBlob });

                      if (Math.random() < 0.005) {
                        console.log("[Audio Pipeline] ✅ Audio sent to Gemini");
                      }
                    } else {
                      console.error(
                        "[Audio Pipeline] ❌ Session mismatch - not sending audio",
                      );
                    }
                  });
                };

                source.connect(processor);
                processor.connect(inputContextRef.current.destination);

                console.log(
                  "[Gemini Hook] ═══════════════════════════════════",
                );
                console.log("[Gemini Hook] ✅ AUDIO PIPELINE CONNECTED");
                console.log(
                  "[Gemini Hook] ═══════════════════════════════════",
                );
                console.log("[Gemini Hook] Source:", source);
                console.log("[Gemini Hook] Processor:", processor);
                console.log(
                  "[Gemini Hook] Input Context State:",
                  inputContextRef.current.state,
                );

                // Test if processor is working
                let testCounter = 0;
                const originalProcess = processor.onaudioprocess;
                processor.onaudioprocess = (e) => {
                  testCounter++;
                  if (testCounter === 1) {
                    console.log(
                      "[Gemini Hook] 🎉 FIRST AUDIO PROCESS EVENT FIRED!",
                    );
                  }
                  if (originalProcess) originalProcess.call(processor, e);
                };

                console.log("[Gemini Hook] Processor event handler attached");

                if (initialQuestion) {
                  console.log(
                    "[Gemini Hook] Sending initial question:",
                    initialQuestion,
                  );
                  sessionPromise.then((session) => {
                    if (activeSessionRef.current === session) {
                      setTimeout(() => {
                        phaseRef.current = "AI_SPEAKING";
                        session.sendRealtimeInput({
                          text: `Ask the candidate this question: "${initialQuestion}"`,
                        });
                        console.log("[Gemini Hook] Initial question sent");
                      }, 500);
                    }
                  });
                }
              } catch (err) {
                console.error("[Gemini Hook] Microphone access error:", err);
                onError("Microphone Access Denied");
              }
            },

            onmessage: async (msg: LiveServerMessage) => {
              const { serverContent } = msg;

              // Handle AI audio output
              const audioData =
                serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

              if (audioData && audioContextRef.current) {
                if (
                  phaseRef.current !== "AI_SPEAKING" &&
                  phaseRef.current !== "INIT"
                ) {
                  console.warn(
                    "[Gemini Hook] ⚠️ Ignoring AI audio - wrong phase:",
                    phaseRef.current,
                  );
                  return;
                }

                console.log("[Gemini Hook] Received audio data from AI");
                onAiSpeakingChange(true);

                const ctx = audioContextRef.current;
                nextStartTimeRef.current = Math.max(
                  nextStartTimeRef.current,
                  ctx.currentTime,
                );

                const audioBuffer = await decodeAudioData(
                  base64ToUint8Array(audioData),
                  ctx,
                  OUT_SAMPLE_RATE,
                );

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(analyserRef.current!);
                analyserRef.current!.connect(ctx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);

                source.onended = () => {
                  sourcesRef.current.delete(source);

                  if (sourcesRef.current.size === 0) {
                    console.log("[Gemini Hook] AI finished speaking");
                    onAiSpeakingChange(false);

                    // STEP 7: Hand control to user, wait for manual submit
                    phaseRef.current = "USER_SPEAKING";
                    currentUserTextRef.current = "";
                    onStreamingTextChange("");
                    console.log(
                      "[Gemini Hook] Phase set to USER_SPEAKING - Waiting for manual submit",
                    );
                  }
                };
              }

              // STEP 1: Handle user transcription WITHOUT silence detection
              const userInput = serverContent?.inputTranscription?.text;

              if (userInput) {
                console.log(
                  "[Gemini Hook] 📝 Received transcription:",
                  userInput,
                );

                if (phaseRef.current !== "USER_SPEAKING") {
                  console.log(
                    "[Gemini Hook] 🚫 Ignoring transcription - not user's turn, phase:",
                    phaseRef.current,
                  );
                  return;
                }

                console.log(
                  "[Gemini Hook] ✅ Processing user transcription:",
                  userInput,
                );

                // STEP 2: Just accumulate text, NO setTimeout, NO onAnswerComplete
                currentUserTextRef.current += userInput;
                onStreamingTextChange(currentUserTextRef.current);

                console.log(
                  "[Gemini Hook] 📊 Accumulated text length:",
                  currentUserTextRef.current.length,
                );
              }

              // Capture AI's spoken text for transcript
              const modelText = serverContent?.modelTurn?.parts?.[0]?.text;

              if (modelText) {
                console.log("[Gemini Hook] AI transcript:", modelText);
                onTranscriptAdd({
                  role: "model",
                  text: modelText,
                  timestamp: Date.now(),
                });
              }

              // Handle interruptions
              if (serverContent?.interrupted) {
                console.log("[Gemini Hook] AI interrupted, stopping audio");
                sourcesRef.current.forEach((source) => source.stop());
                sourcesRef.current.clear();
                onAiSpeakingChange(false);
                nextStartTimeRef.current = 0;
              }
            },

            onclose: () => {
              console.log("[Gemini Hook] Connection closed");
              console.warn(
                "[Gemini Hook] ⚠️ Connection closed unexpectedly - checking if intentional",
              );
              onConnectedChange(false);

              // Only show error if not intentionally closed
              if (activeSessionRef.current) {
                console.error("[Gemini Hook] Unexpected disconnect");
                onError("Connection lost. Please refresh the page.");
              }
            },

            onerror: (error) => {
              console.error("[Gemini Hook] Connection error:", error);
              console.error(
                "[Gemini Hook] Full error details:",
                JSON.stringify(error, null, 2),
              );
              onError("Connection Error - Check console for details");
            },
          },
        });

        sessionPromise
          .then((session) => {
            activeSessionRef.current = session;
            console.log("[Gemini Hook] ✅ Session established successfully");
            console.log("[Gemini Hook] Session object:", session);
          })
          .catch((err) => {
            console.error(
              "[Gemini Hook] ❌ Session establishment failed:",
              err,
            );
            onError("Failed to establish Gemini session");
          });
      } catch (e) {
        console.error("[Gemini Hook] Connection error:", e);
        console.error(
          "[Gemini Hook] Error stack:",
          e instanceof Error ? e.stack : "No stack",
        );
        onError("System Error");
      }
    },
    [
      apiKey,
      phaseRef,
      isMicOnRef,
      currentUserTextRef,
      onAiSpeakingChange,
      onStreamingTextChange,
      onTranscriptAdd,
      onConnectedChange,
      onError,
    ],
  );

  return {
    connect,
    sendQuestion,
    cleanup,
    analyser: analyserRef.current,
  };
}

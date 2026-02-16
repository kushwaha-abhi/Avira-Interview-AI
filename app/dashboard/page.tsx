"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInterview } from "../../context/InterviewContext";
import { GoogleGenAI } from "@google/genai";
import { AnalyticsSchema } from "../../lib/types";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { ArrowLeft, Download, Eye, Loader2 } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { config, transcript, analytics, setAnalytics } = useInterview();
  const [loading, setLoading] = useState(false);

  // useEffect(() => {
  //   const generateReport = async () => {
  //     if (analytics) {
  //       setLoading(false);
  //       return;
  //     }

  //     // If we have a sessionId, try to get analytics from backend
  //     if (config.sessionId) {
  //       try {
  //         const response = await fetch(
  //           `/api/interview/evaluate/${config.sessionId}`
  //         );
  //         const data = await response.json();

  //         if (data.success && data.evaluation) {
  //           // Map backend evaluation format to frontend analytics format
  //           const backendEval = data.evaluation;
  //           setAnalytics({
  //             score: backendEval.score || 0,
  //             technicalAccuracy: backendEval.technicalAccuracy || 0,
  //             communicationClarity: backendEval.communicationClarity || 0,
  //             domainKnowledge: backendEval.domainKnowledge || 0,
  //             strengths: backendEval.strengths || [],
  //             weaknesses: backendEval.weaknesses || [],
  //             summary: backendEval.summary || "No summary available",
  //           });
  //           setLoading(false);
  //           return;
  //         }
  //       } catch (err) {
  //         console.error("Failed to fetch backend evaluation:", err);
  //         // Fall through to client-side generation
  //       }
  //     }

  //     // Fallback: Generate analytics on client-side
  //     const apiKey =
  //       process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  //       process.env.NEXT_PUBLIC_API_KEY ||
  //       process.env.API_KEY;
  //     if (!apiKey) {
  //       setError("API Key Missing");
  //       return;
  //     }

  //     try {
  //       const ai = new GoogleGenAI({ apiKey });
  //       const conversationHistory = transcript
  //         .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
  //         .join("\n");
  //       const prompt = `
  //         Analyze this interview transcript for ${config.candidateName} (${
  //         config.domain
  //       }, ${config.difficulty}).
  //         ${config.resumeText ? `Resume Context: ${config.resumeText}` : ""}
  //         Transcript: ${conversationHistory}
  //         Return strictly JSON: { score (0-100), technicalAccuracy (0-100), communicationClarity (0-100), domainKnowledge (0-100), strengths (string[]), weaknesses (string[]), summary (string) }
  //       `;

  //       const response = await ai.models.generateContent({
  //         model: "gemini-2.5-flash",
  //         contents: prompt,
  //         config: {
  //           responseMimeType: "application/json",
  //           responseSchema: AnalyticsSchema,
  //         },
  //       });

  //       if (response.text) setAnalytics(JSON.parse(response.text));
  //     } catch (e) {
  //       console.error(e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   generateReport();
  // }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-txt-main">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-accent" />
        <p className="text-sm font-mono">Analyzing Results...</p>
      </div>
    );
  }

  if (!analytics) return null;

  const chartData = [
    { subject: "Tech", A: analytics.technicalAccuracy, fullMark: 100 },
    { subject: "Comm", A: analytics.communicationClarity, fullMark: 100 },
    { subject: "Know", A: analytics.domainKnowledge, fullMark: 100 },
    { subject: "Overall", A: analytics.score, fullMark: 100 },
  ];

  return (
    <div className="min-h-screen bg-bg text-txt-main font-sans p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Nav */}
        <div className="flex justify-between items-center border-b border-border pb-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm text-txt-sec hover:text-txt-main"
          >
            <ArrowLeft className="w-4 h-4" /> Exit
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm text-txt-sec hover:text-txt-main"
          >
            <Download className="w-4 h-4" /> Save Report
          </button>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-light mb-2">{config.candidateName}</h1>
          <p className="text-txt-sec font-mono text-sm">
            {config.domain} — {config.difficulty}
          </p>
        </div>
        {error && <p className="text-red-500">{error}</p>}
        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-[#1a1a1a] border border-border p-8 rounded-lg">
            <h3 className="text-xs font-mono text-accent uppercase mb-4">
              Assessment Summary
            </h3>
            <p className="text-lg text-txt-main leading-relaxed font-light">
              {analytics.summary}
            </p>

            <div className="mt-8 flex gap-8">
              <div>
                <span className="block text-4xl font-bold">
                  {analytics.score}
                </span>
                <span className="text-xs text-txt-sec uppercase">
                  Total Score
                </span>
              </div>
              <div className="w-px bg-border h-12"></div>
              <div>
                <span className="block text-4xl font-bold">
                  {analytics.technicalAccuracy}
                </span>
                <span className="text-xs text-txt-sec uppercase">
                  Technical
                </span>
              </div>
              <div className="w-px bg-border h-12 hidden sm:block"></div>
              <div className="hidden sm:block">
                <span className="block text-4xl font-bold">
                  {analytics.communicationClarity}
                </span>
                <span className="text-xs text-txt-sec uppercase">
                  Communication
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-border p-4 rounded-lg flex items-center justify-center">
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  data={chartData}
                >
                  <PolarGrid stroke="#444444" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#888888", fontSize: 10 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="Score"
                    dataKey="A"
                    stroke="#E0E0E0"
                    strokeWidth={2}
                    fill="#E0E0E0"
                    fillOpacity={0.1}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-mono text-accent uppercase mb-4 pb-2 border-b border-border">
              Key Strengths
            </h3>
            <ul className="space-y-3">
              {analytics.strengths.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-txt-main">
                  <span className="text-accent">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-mono text-accent uppercase mb-4 pb-2 border-b border-border">
              Areas for Improvement
            </h3>
            <ul className="space-y-3">
              {analytics.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-3 text-sm text-txt-main">
                  <span className="text-accent">•</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Transcript Toggle */}
        <div className="border border-border rounded-lg overflow-hidden">
          <details className="group">
            <summary className="flex items-center justify-between p-4 cursor-pointer bg-[#1a1a1a] hover:bg-[#252525] transition-colors">
              <span className="text-sm font-medium">View Full Transcript</span>
              <Eye className="w-4 h-4 text-txt-sec" />
            </summary>
            <div className="p-6 bg-bg border-t border-border max-h-96 overflow-y-auto space-y-4">
              {transcript.map((t, i) => (
                <div key={i} className="text-xs font-mono">
                  <span className="text-accent uppercase mr-2">{t.role}:</span>
                  <span className="text-txt-sec">{t.text}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

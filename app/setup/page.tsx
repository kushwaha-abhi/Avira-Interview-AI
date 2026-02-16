"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInterview } from "../../context/InterviewContext";
import { DOMAINS } from "../../lib/constants";
import { Difficulty } from "../../lib/types";
import { ArrowLeft, Check, Upload, Loader2, FileText } from "lucide-react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import { submitUserResume } from "@/lib/client/interviewAPIs";

// Use CDN for Worker in Next.js Client Component
GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";

export default function Setup() {
  const router = useRouter();
  const { config, setConfig, resetInterview } = useInterview();

  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MID);
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [experience, setExperience] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // If we have a resume file, use the backend API
      if (resumeFile) {
        const formData = new FormData();
        formData.append("resume", resumeFile);
        formData.append("name", name);
        formData.append("role", domain);
        formData.append(
          "email",
          email || `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        );
        formData.append("experience", experience || "0");
        formData.append("difficulty", difficulty);
        formData.append("language", "English");
        if (jd) formData.append("jd", jd);
        formData.append("questionLimit", "10");

        const data = await submitUserResume(formData);

        if (!data.success) {
          setError(data.message || "Failed to process your information");
          console.log("ERROR:", data.message);
          return;
        }
        console.log(data);

        // Store the user and document IDs in the config
        resetInterview();
        setConfig({
          candidateName: name,
          domain,
          difficulty,
          resumeText,
          jd,
          userId: data.userId,
          resumeId: data.resumeId,
          jdId: data.jdId,
        });
        const userData = {
          candidateName: name,
          userId: data.userId,
          resumeId: data.resumeId,
          jdId: data.jdId,
        };
        localStorage.setItem("user_data", JSON.stringify(userData));
        console.log("[Storage] User data saved:", userData);
        console.log("data stored in api");
      } else {
        // Fallback to client-side only mode (no backend)
        resetInterview();
        setConfig({
          candidateName: name,
          userId,
          domain,
          difficulty,
          resumeText,
          jd,
        });
      }

      router.push("/room");
    } catch (err: any) {
      console.error("Error submitting setup:", err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setIsProcessing(true);
    setResumeFile(file); // Store the file for backend upload

    try {
      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText +=
            textContent.items.map((item: any) => item.str).join(" ") + "\n";
        }
        setResumeText(fullText.trim());
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => setResumeText(ev.target?.result as string);
        reader.readAsText(file);
      }
    } catch (err) {
      console.error(err);
      setFileName("Error processing file");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-txt-main font-sans flex flex-col">
      <div className="w-full max-w-3xl mx-auto px-6 py-12 flex-1 flex flex-col">
        {/* Header */}
        <button
          onClick={() => router.push("/")}
          className="self-start mb-12 text-txt-sec hover:text-txt-main flex items-center gap-2 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-3xl font-light text-txt-main mb-2">
          Configure Session
        </h1>
        <p className="text-txt-sec text-sm mb-10">
          Set parameters for the interview simulation.
        </p>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-md p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-10">
          {/* Name Section */}
          <div className="space-y-4">
            <label className="block text-xs font-mono text-accent uppercase">
              Candidate Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-transparent border-b border-border py-2 text-xl text-txt-main placeholder-border focus:border-txt-main focus:outline-none transition-colors rounded-none"
            />
          </div>

          {/* Email Section (Optional) */}
          <div className="space-y-4">
            <label className="block text-xs font-mono text-accent uppercase">
              Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full bg-transparent border-b border-border py-2 text-lg text-txt-main placeholder-border focus:border-txt-main focus:outline-none transition-colors rounded-none"
            />
          </div>

          {/* Experience Section (Optional) */}
          <div className="space-y-4">
            <label className="block text-xs font-mono text-accent uppercase">
              Years of Experience (Optional)
            </label>
            <input
              type="number"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full bg-transparent border-b border-border py-2 text-lg text-txt-main placeholder-border focus:border-txt-main focus:outline-none transition-colors rounded-none"
            />
          </div>

          {/* Specialization Section */}
          <div className="space-y-4">
            <label className="block text-xs font-mono text-accent uppercase">
              Specialization
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DOMAINS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDomain(d)}
                  className={`text-left px-4 py-3 border rounded-md text-sm transition-all ${
                    domain === d
                      ? "border-txt-main bg-white/5 text-txt-main"
                      : "border-border text-txt-sec hover:border-accent"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty & Resume */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="block text-xs font-mono text-accent uppercase">
                Difficulty
              </label>
              <div className="flex flex-col gap-2">
                {Object.values(Difficulty).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`text-left px-4 py-3 border rounded-md text-sm transition-all flex justify-between ${
                      difficulty === level
                        ? "border-txt-main bg-white/5 text-txt-main"
                        : "border-border text-txt-sec hover:border-accent"
                    }`}
                  >
                    {level}
                    {difficulty === level && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-mono text-accent uppercase">
                Resume (Optional)
              </label>
              <div className="border border-dashed border-border rounded-md p-6 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors relative">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) =>
                    e.target.files?.[0] && processFile(e.target.files[0])
                  }
                />
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 text-txt-main animate-spin" />
                ) : fileName ? (
                  <div className="flex items-center gap-2 text-txt-main">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm underline">{fileName}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-border mb-2" />
                    <span className="text-sm text-txt-sec">Upload PDF/TXT</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Job Description Section */}
          <div className="space-y-4">
            <label className="block text-xs font-mono text-accent uppercase">
              Job Description
            </label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description here..."
              className="w-full px-4 py-3 border border-border rounded-md bg-transparent text-txt-main text-sm placeholder:text-txt-sec focus:border-accent focus:outline-none resize-none transition-all"
              rows={8}
            />
          </div>
        </div>

        {/* Action */}
        <div className="mt-16 flex justify-end">
          <button
            onClick={handleStart}
            disabled={!name.trim() || isProcessing || isSubmitting}
            className={`px-8 py-3 bg-txt-main text-bg font-semibold rounded-md cursor-pointer transition-all flex items-center gap-2 ${
              !name.trim() || isProcessing || isSubmitting
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-white"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Start Interview"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

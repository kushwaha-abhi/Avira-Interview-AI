"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mic, Cpu, Activity } from "lucide-react";

export default function Landing() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#050505] text-[#FAFAFA] font-sans selection:bg-white selection:text-black overflow-hidden">
      {/* Subtle Background Glow - Non-intrusive */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-white opacity-[0.03] blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 transition-all duration-1000 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <div className="text-sm font-bold tracking-widest uppercase">Avira</div>
        <button
          onClick={() => router.push("/setup")}
          className="text-xs font-medium text-neutral-400 hover:text-white cursor-pointer transition-colors tracking-wide"
        >
          Try it Out!
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-screen px-6 pt-20 pb-12">
        {/* Version Badge */}
        <div
          className={`mb-8 overflow-hidden transition-all duration-1000 delay-100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="px-3 py-1 text-[10px] font-mono text-neutral-500 border border-white/10 rounded-full bg-white/5 backdrop-blur-md">
            PROTOCOL v2.5
          </div>
        </div>

        {/* Hero Title */}
        <div className="text-center space-y-2 mb-8 max-w-4xl z-10">
          <h1
            className={`text-5xl md:text-8xl font-medium tracking-tighter leading-[0.9] transition-all duration-1000 delay-200 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            Technical interviews,
          </h1>
          <h1
            className={`text-5xl md:text-8xl font-medium tracking-tighter leading-[0.9] text-neutral-500 transition-all duration-1000 delay-300 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            reimagined.
          </h1>
        </div>

        {/* Subtext */}
        <p
          className={`max-w-xl text-center text-neutral-400 text-lg md:text-xl font-light leading-relaxed mb-12 transition-all duration-1000 delay-500 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Experience the next generation of candidate screening.{" "}
          <br className="hidden md:block" />
          Zero latency voice AI. Objective precision.
        </p>

        {/* CTA Button - Apple/Vercel style */}
        <div
          className={`transition-all duration-1000 delay-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <button
            onClick={() => router.push("/setup")}
            className="group relative flex items-center gap-3 px-8 py-3.5 cursor-pointer bg-white text-black rounded-full transition-all hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-sm font-semibold tracking-tight">
              Initialize Session
            </span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Minimal Features Grid - "Glass" Aesthetics */}
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-4 mt-24 w-full max-w-4xl transition-all duration-1000 delay-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          {[
            {
              icon: <Mic className="w-5 h-5" />,
              title: "Voice First",
              desc: "Natural language processing with sub-millisecond latency.",
            },
            {
              icon: <Cpu className="w-5 h-5" />,
              title: "Adaptive Core",
              desc: "Dynamic questioning engine that evolves with your answers.",
            },
            {
              icon: <Activity className="w-5 h-5" />,
              title: "Deep Analytics",
              desc: "Quantitative feedback on technical accuracy and tone.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-500 backdrop-blur-sm"
            >
              <div className="mb-4 text-neutral-500 group-hover:text-white transition-colors duration-500">
                {item.icon}
              </div>
              <h3 className="text-sm font-medium text-neutral-200 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed group-hover:text-neutral-400 transition-colors duration-500">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`absolute bottom-6 w-full text-center transition-all duration-1000 delay-[1200ms] ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest">
          Avira Systems Inc.
        </p>
      </footer>
    </div>
  );
}

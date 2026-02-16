"use client";

import { SessionProvider } from "next-auth/react";
import { InterviewProvider } from "../context/InterviewContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InterviewProvider>{children}</InterviewProvider>
    </SessionProvider>
  );
}

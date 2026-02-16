"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import {
  InterviewConfig,
  Difficulty,
  TranscriptItem,
  AnalyticsData,
} from "../lib/types";

interface InterviewContextType {
  config: InterviewConfig;
  setConfig: (config: InterviewConfig) => void;
  transcript: TranscriptItem[];
  addTranscriptItem: (item: TranscriptItem) => void;
  analytics: AnalyticsData | null;
  setAnalytics: (data: AnalyticsData) => void;
  resetInterview: () => void;
}

const defaultContext: InterviewContextType = {
  config: {
    userId: "",
    domain: "",
    difficulty: Difficulty.MID,
    candidateName: "",
    resumeText: "",
    jd: "",
  },
  setConfig: () => {},
  transcript: [],
  addTranscriptItem: () => {},
  analytics: null,
  setAnalytics: () => {},
  resetInterview: () => {},
};

const InterviewContext = createContext<InterviewContextType>(defaultContext);

export const InterviewProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<InterviewConfig>({
    domain: "",
    userId: "",
    difficulty: Difficulty.MID,
    candidateName: "",
    resumeText: "",
    jd: "",
  });
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const addTranscriptItem = useCallback((item: TranscriptItem) => {
    setTranscript((prev) => [...prev, item]);
  }, []);

  const resetInterview = useCallback(() => {
    setTranscript([]);
    setAnalytics(null);
  }, []);

  return (
    <InterviewContext.Provider
      value={{
        config,
        setConfig,
        transcript,
        addTranscriptItem,
        analytics,
        setAnalytics,
        resetInterview,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => useContext(InterviewContext);

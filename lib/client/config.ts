export interface IConfig {
  userId: string;
  resumeId: string;
  candidateName: string;
  jdId?: string | null;
  domain?: string;
}

export const loadUserConfig = (): IConfig | null => {
  try {
    const stored = localStorage.getItem("user_data");
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Type guard
    if (
      typeof parsed.userId === "string" &&
      typeof parsed.resumeId === "string" &&
      typeof parsed.candidateName === "string"
    ) {
      return parsed as IConfig;
    }

    return null;
  } catch (error) {
    console.error("Failed to load user config:", error);
    return null;
  }
};

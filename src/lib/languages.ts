export type AppLanguageCode = "zh" | "en" | "de" | "fr";

export const APP_LANGUAGES: Array<{ code: AppLanguageCode; label: string; promptName: string }> = [
  { code: "zh", label: "中文", promptName: "Chinese" },
  { code: "en", label: "英语", promptName: "English" },
  { code: "de", label: "德语", promptName: "German" },
  { code: "fr", label: "法语", promptName: "French" },
];

export function getLanguageLabel(code: AppLanguageCode) {
  return APP_LANGUAGES.find((item) => item.code === code)?.label || code;
}

export function getPromptLanguageName(code: AppLanguageCode) {
  return APP_LANGUAGES.find((item) => item.code === code)?.promptName || code;
}

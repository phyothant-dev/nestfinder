import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

type Language = "en" | "mm";

type LanguageStore = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  loadLanguage: () => Promise<void>;
};

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: "en",

  setLanguage: async (lang) => {
    await AsyncStorage.setItem("language", lang);
    set({ language: lang });
  },

  loadLanguage: async () => {
    const saved = await AsyncStorage.getItem("language");
    if (saved === "en" || saved === "mm") {
      set({ language: saved });
    }
  },
}));

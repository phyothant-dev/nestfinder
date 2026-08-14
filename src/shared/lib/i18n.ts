import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./translations/en.json";
import mm from "./translations/mm.json";

i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  lng: "en",
  fallbackLng: "en",

  resources: {
    en: {
      translation: en,
    },
    mm: {
      translation: mm,
    },
  },

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

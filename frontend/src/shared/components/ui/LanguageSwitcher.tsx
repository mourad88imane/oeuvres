import { useTranslation } from "react-i18next";
import { authApi } from "@modules/auth/api";

const LANGUAGES = [
  { code: "fr", label: "FR" },
  { code: "ar", label: "AR" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    // Sauvegarder la préférence côté backend
    authApi.updatePreferences({ language: code }).catch(() => {});
  };

  return (
    <div className="flex gap-1">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => handleChange(code)}
          className="px-2 py-1 text-xs rounded-xl transition-colors font-bold"
          style={{
            background: i18n.language === code || i18n.language?.startsWith(code) ? "#ffda2d" : "transparent",
            color: i18n.language === code || i18n.language?.startsWith(code) ? "#1a1917" : "#8a8882",
          }}
          onMouseEnter={e => { if (!(i18n.language === code || i18n.language?.startsWith(code))) { e.currentTarget.style.color = "#ffda2d"; e.currentTarget.style.background = "rgba(255,218,45,0.08)"; }}}
          onMouseLeave={e => { if (!(i18n.language === code || i18n.language?.startsWith(code))) { e.currentTarget.style.color = "#8a8882"; e.currentTarget.style.background = "transparent"; }}}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

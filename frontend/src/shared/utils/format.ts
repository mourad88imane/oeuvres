import i18n from "../i18n/i18n";

/** Locale du navigateur adaptée à la langue active (FR / AR). */
const getLocale = (): string => (i18n.language?.startsWith("ar") ? "ar-DZ" : "fr-DZ");

export const fmtDate = (d: string | null | undefined): string =>
  d ? new Date(d).toLocaleDateString(getLocale(), { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtDateTime = (d: string | null | undefined): string =>
  d ? new Date(d).toLocaleString(getLocale(), { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtDateLong = (d: string | null | undefined): string =>
  d ? new Date(d).toLocaleDateString(getLocale(), { day: "2-digit", month: "long", year: "numeric" }) : "—";

export const fmtTime = (d: string | null | undefined): string =>
  d ? new Date(d).toLocaleTimeString(getLocale(), { hour: "2-digit", minute: "2-digit" }) : "—";

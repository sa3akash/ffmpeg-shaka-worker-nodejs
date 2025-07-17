

export interface ResolutionProfile {
  name: string;
  width: number;
  height: number;
  bitrate: string;
}

export const RESOLUTION_PROFILES: ResolutionProfile[] = [
    {
      name: "240p",
      width: 426,
      height: 240,
      bitrate: "500k",
    },
    {
      name: "360p",
      width: 640,
      height: 360,
      bitrate: "800k",
    },
    {
      name: "480p",
      width: 854,
      height: 480,
      bitrate: "1200k",
    },
    {
      name: "720p",
      width: 1280,
      height: 720,
      bitrate: "2500k",
    },
    {
      name: "1080p",
      width: 1920,
      height: 1080,
      bitrate: "5000k",
    },
    {
      name: "2K",
      width: 2560,
      height: 1440,
      bitrate: "15000k",
    },
    { name: "4K", width: 3840, height: 2160, bitrate: "40000k" },
  ];

export const languageMap: Record<string, string> = {
  af: "Afrikaans",
  am: "Amharic",
  ar: "Arabic",
  az: "Azerbaijani",
  be: "Belarusian",
  bg: "Bulgarian",
  bn: "Bangla",
  bs: "Bosnian",
  ca: "Catalan",
  cs: "Czech",
  cy: "Welsh",
  da: "Danish",
  de: "German",
  el: "Greek",
  en: "English",
  eo: "Esperanto",
  es: "Spanish",
  et: "Estonian",
  fa: "Persian",
  fi: "Finnish",
  fil: "Filipino",
  fr: "French",
  ga: "Irish",
  gl: "Galician",
  gu: "Gujarati",
  he: "Hebrew",
  hi: "Hindi",
  hr: "Croatian",
  ht: "Haitian Creole",
  hu: "Hungarian",
  hy: "Armenian",
  id: "Indonesian",
  is: "Icelandic",
  it: "Italian",
  ja: "Japanese",
  jv: "Javanese",
  ka: "Georgian",
  kk: "Kazakh",
  km: "Khmer",
  kn: "Kannada",
  ko: "Korean",
  ku: "Kurdish",
  ky: "Kyrgyz",
  lo: "Lao",
  lt: "Lithuanian",
  lv: "Latvian",
  mk: "Macedonian",
  ml: "Malayalam",
  mn: "Mongolian",
  mr: "Marathi",
  ms: "Malay",
  my: "Burmese",
  ne: "Nepali",
  nl: "Dutch",
  no: "Norwegian",
  pa: "Punjabi",
  pl: "Polish",
  ps: "Pashto",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sd: "Sindhi",
  si: "Sinhala",
  sk: "Slovak",
  sl: "Slovenian",
  so: "Somali",
  sq: "Albanian",
  sr: "Serbian",
  su: "Sundanese",
  sv: "Swedish",
  sw: "Swahili",
  ta: "Tamil",
  te: "Telugu",
  tg: "Tajik",
  th: "Thai",
  tk: "Turkmen",
  tr: "Turkish",
  tt: "Tatar",
  ug: "Uyghur",
  uk: "Ukrainian",
  ur: "Urdu",
  uz: "Uzbek",
  vi: "Vietnamese",
  xh: "Xhosa",
  yi: "Yiddish",
  zh: "Chinese",
  zu: "Zulu",
};


export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  audioTracks: Array<{
    index: number;
    language?: string;
    codec: string;
    channels: number;
    sample_rate: number;
  }>;
}

export interface AudioTrack {
  path: string;
  lang: string;
  name: string;
  isDefault?: boolean;
}

export interface SubtitleTrack {
  path: string;
  lang: string;
  name: string;
}

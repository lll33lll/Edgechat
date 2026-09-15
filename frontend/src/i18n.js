import { computed, readonly, ref } from 'vue';

export const SIMPLIFIED_CHINESE_LOCALE = 'zh-CN';
export const TRADITIONAL_CHINESE_LOCALE = 'zh-TW';
export const ENGLISH_LOCALE = 'en-US';
// 保留旧名称，避免现有调用方把“简体中文”误当成全部中文后产生兼容改动。
export const CHINESE_LOCALE = SIMPLIFIED_CHINESE_LOCALE;
export const LOCALE_OPTIONS = Object.freeze([
  { value: SIMPLIFIED_CHINESE_LOCALE, label: '简体中文' },
  { value: TRADITIONAL_CHINESE_LOCALE, label: '繁體中文' },
  { value: ENGLISH_LOCALE, label: 'English' }
]);

const STORAGE_KEY = 'edgechat.locale';
const localeLoaders = {
  [SIMPLIFIED_CHINESE_LOCALE]: () => import('./locales/zh-CN.js'),
  [TRADITIONAL_CHINESE_LOCALE]: () => import('./locales/zh-TW.js'),
  [ENGLISH_LOCALE]: () => import('./locales/en-US.js')
};

function normalizeLocale(value) {
  return Object.hasOwn(localeLoaders, value) ? value : ENGLISH_LOCALE;
}

export function detectBrowserLocale(value) {
  const language = String(value || '').replaceAll('_', '-');
  if (!/^zh(?:-|$)/i.test(language)) return ENGLISH_LOCALE;
  return /(?:^|-)Hant(?:-|$)|(?:^|-)(?:TW|HK|MO)(?:-|$)/i.test(language)
    ? TRADITIONAL_CHINESE_LOCALE
    : SIMPLIFIED_CHINESE_LOCALE;
}

function initialLocale() {
  const storedLocale = typeof localStorage === 'undefined' ? '' : localStorage.getItem(STORAGE_KEY);
  if (Object.hasOwn(localeLoaders, storedLocale)) return storedLocale;
  const browserLanguage = globalThis.navigator?.languages?.[0] || globalThis.navigator?.language;
  return detectBrowserLocale(browserLanguage);
}

const locale = ref(initialLocale());
const localeLoading = ref(false);
const activeMessages = ref({});
let translateServerError = (message) => message;

function interpolate(template, params) {
  return template.replace(/\{([a-zA-Z][\w]*)\}/g, (match, key) =>
    Object.hasOwn(params, key) ? String(params[key]) : match
  );
}

function applyDocumentLocale() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale.value;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', t('app.description'));
}

export function t(key, params = {}) {
  const template = activeMessages.value[key] ?? key;
  return interpolate(template, params);
}

export function localizeServerError(value) {
  const message = String(value || '');
  return message ? translateServerError(message) : message;
}

export async function setLocale(value, { persist = true } = {}) {
  const nextLocale = normalizeLocale(value);
  localeLoading.value = true;
  try {
    const localeModule = await localeLoaders[nextLocale]();
    activeMessages.value = localeModule.default;
    translateServerError = localeModule.localizeServerError || ((message) => message);
    locale.value = nextLocale;
    if (persist && typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, nextLocale);
    applyDocumentLocale();
  } finally {
    localeLoading.value = false;
  }
}

export function initializeI18n() {
  return setLocale(locale.value, { persist: false });
}

export function formatDateTime(value, options = { dateStyle: 'medium', timeStyle: 'short' }) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(locale.value, options).format(date);
}

export function formatDate(value, options = { dateStyle: 'medium' }) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(locale.value, options).format(date);
}

export function formatTime(value, options = { hour: '2-digit', minute: '2-digit' }) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(locale.value, options).format(date);
}

export function compareLocalized(left, right) {
  return String(left).localeCompare(String(right), locale.value);
}

export function getLocale() {
  return locale.value;
}

export function useI18n() {
  return {
    locale: readonly(locale),
    localeLoading: readonly(localeLoading),
    isEnglish: computed(() => locale.value === ENGLISH_LOCALE),
    t,
    setLocale,
    formatDate,
    formatDateTime,
    formatTime,
    compareLocalized
  };
}

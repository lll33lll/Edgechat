import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import enUS from '../frontend/src/locales/en-US.js';
import zhCN from '../frontend/src/locales/zh-CN.js';
import zhTW from '../frontend/src/locales/zh-TW.js';
import {
  CHINESE_LOCALE,
  detectBrowserLocale,
  ENGLISH_LOCALE,
  formatDate,
  formatDateTime,
  getLocale,
  parseDateValue,
  setLocale,
  t,
  TRADITIONAL_CHINESE_LOCALE
} from '../frontend/src/i18n.js';
import { localizeErrorMessage } from '../frontend/src/localized-error.js';

test('语言运行时仅按需导入当前语言包', async () => {
  const source = await readFile(new URL('../frontend/src/i18n.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^import .+ from ['"].*locales/m);
  assert.match(source, /\(\) => import\('\.\/locales\/zh-CN\.js'\)/);
  assert.match(source, /\(\) => import\('\.\/locales\/zh-TW\.js'\)/);
  assert.match(source, /\(\) => import\('\.\/locales\/en-US\.js'\)/);
});

test('三种语言包保持相同键集合', () => {
  assert.deepEqual(Object.keys(enUS).sort(), Object.keys(zhCN).sort());
  assert.deepEqual(Object.keys(zhTW).sort(), Object.keys(zhCN).sort());
});

test('简繁中文界面支持插值与未知键回退', async () => {
  await setLocale(CHINESE_LOCALE);
  assert.equal(getLocale(), CHINESE_LOCALE);
  assert.equal(t('chat.memberCount', { count: 3 }), '3 位成员');
  await setLocale(TRADITIONAL_CHINESE_LOCALE);
  assert.equal(t('chat.memberCount', { count: 3 }), '3 位成員');
  assert.equal(t('missing.translation.key'), 'missing.translation.key');
});

test('浏览器中文语言按脚本和地区区分简繁，其余语言默认英文', () => {
  for (const language of ['zh', 'zh-CN', 'zh-SG', 'zh-MY', 'zh-Hans', 'zh-Hans-HK', 'zh-CHS']) {
    assert.equal(detectBrowserLocale(language), CHINESE_LOCALE);
  }
  for (const language of [
    'zh-TW',
    'zh-HK',
    'zh-MO',
    'zh-Hant',
    'zh-Hant-CN',
    'zh-CHT',
    'ZH_hant_tw'
  ]) {
    assert.equal(detectBrowserLocale(language), TRADITIONAL_CHINESE_LOCALE);
  }

  for (const language of ['en-US', 'en-HK', 'ms-MY', 'ja-JP', '']) {
    assert.equal(detectBrowserLocale(language), ENGLISH_LOCALE);
  }
});

test('语言切换会持久化选择', async () => {
  const stored = new Map();
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value)
  };

  try {
    await setLocale(TRADITIONAL_CHINESE_LOCALE);
    assert.equal(getLocale(), TRADITIONAL_CHINESE_LOCALE);
    assert.equal(stored.get('edgechat.locale'), TRADITIONAL_CHINESE_LOCALE);
    assert.equal(t('auth.signIn'), '登錄');
  } finally {
    await setLocale(CHINESE_LOCALE);
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
  }
});

test('日期格式跟随当前语言', async () => {
  const value = new Date('2026-08-18T12:00:00.000Z');
  const options = { dateStyle: 'long', timeZone: 'UTC' };

  await setLocale(CHINESE_LOCALE);
  const chinese = formatDate(value, options);
  await setLocale(ENGLISH_LOCALE);
  const english = formatDate(value, options);

  assert.equal(chinese, new Intl.DateTimeFormat(CHINESE_LOCALE, options).format(value));
  assert.equal(english, new Intl.DateTimeFormat(ENGLISH_LOCALE, options).format(value));
  assert.notEqual(chinese, english);
  await setLocale(CHINESE_LOCALE);
});

test('D1 时间按 UTC 解析并转换为客户端时区', async () => {
  const d1Value = '2026-09-16 12:34:56';
  const isoValue = '2026-09-16T12:34:56.000Z';
  const options = { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai' };

  assert.equal(parseDateValue(d1Value).toISOString(), isoValue);
  assert.equal(parseDateValue(isoValue).toISOString(), isoValue);
  assert.equal(formatDateTime(d1Value, options), formatDateTime(isoValue, options));
  assert.equal(formatDateTime('not-a-date', options), '');
});

test('服务端固定与动态错误会按当前语言本地化', async () => {
  await setLocale(ENGLISH_LOCALE);
  assert.equal(localizeErrorMessage('账号或密码错误'), 'Incorrect username or password');
  assert.equal(
    localizeErrorMessage('封禁时长必须是正整数分钟'),
    'Ban duration must be a positive integer number of minutes'
  );
  assert.equal(localizeErrorMessage('文件大小不能超过 16MB'), 'File size cannot exceed 16 MB');

  await setLocale(TRADITIONAL_CHINESE_LOCALE);
  assert.equal(localizeErrorMessage('账号或密码错误'), '賬號或密碼錯誤');
  assert.equal(localizeErrorMessage('文件大小不能超过 16MB'), '文件大小不能超過 16MB');

  await setLocale(CHINESE_LOCALE);
  assert.equal(localizeErrorMessage('账号或密码错误'), '账号或密码错误');
});

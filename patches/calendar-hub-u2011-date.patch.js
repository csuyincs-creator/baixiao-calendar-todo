#!/usr/bin/env node
/**
 * calendar-hub 补丁：让文件名日期兼容 Unicode 连字符变体
 * ---------------------------------------------------------------
 * 问题
 *   插件用 moment(文本, "YYYY-MM-DD", true) 严格模式从文件名里抠日期。
 *   格式串里的 "-" 只匹配 ASCII U+002D。若文件名日期用的是 U+2011
 *   （非断行连字符）等 Unicode 变体，解析直接失败，文件被静默跳过，
 *   永远不会出现在日历 / 列表里，也不报任何错。
 *
 * 本补丁
 *   在 getDateFromFilename 入口把 Unicode 连字符归一化成 ASCII "-"。
 *   只影响日期解析用的临时字符串，不碰磁盘上的文件名。
 *
 * 用法
 *   node "calendar-hub-u2011-date.patch.js"
 *
 * 幂等
 *   重复运行不会重复打补丁。插件升级会覆盖 main.js，升级后重跑一次即可。
 *   补丁前会自动备份为 main.js.bak-<yyyymmdd-hhmmss>。
 */

const fs = require('fs');
const path = require('path');

const VAULT_ROOT = path.resolve(__dirname, '..', '..');
// 目标插件目录。默认按「补丁放在 <vault>/.workbuddy/patches/ 下」推导；
// 也可以用环境变量直接指定，方便从仓库里对任意 vault 打补丁：
//   CALENDAR_HUB_PLUGIN_DIR="<vault>/.obsidian/plugins/calendar-hub" node xxx.patch.js
const PLUGIN_DIR = process.env.CALENDAR_HUB_PLUGIN_DIR
  ? path.resolve(process.env.CALENDAR_HUB_PLUGIN_DIR)
  : path.join(VAULT_ROOT, '.obsidian', 'plugins', 'calendar-hub');
const MAIN = path.join(PLUGIN_DIR, 'main.js');
const MARKER = 'normalizeDateSeparators';

if (!fs.existsSync(MAIN)) {
  console.error('找不到 main.js：' + MAIN);
  process.exit(1);
}

let src = fs.readFileSync(MAIN, 'utf8');

if (src.includes(MARKER)) {
  console.log('已打过补丁，无需重复操作。');
  console.log('  ' + MAIN);
  process.exit(0);
}

const ANCHOR = `function getDateFromFilename(basename, dailyNoteFormat, filenameDateFormat = "") {
  const exactDate = parseNoteDate(basename, dailyNoteFormat);`;

if (!src.includes(ANCHOR)) {
  console.error('锚点未匹配，插件源码可能已改版。请手动检查 getDateFromFilename。');
  process.exit(2);
}

const replacement = `function normalizeDateSeparators(text3) {
  return text3.replace(
    /[\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015\\u2212\\uFF0D\\uFE63\\u00AD\\u2043]/g,
    "-"
  );
}
function getDateFromFilename(basename, dailyNoteFormat, filenameDateFormat = "") {
  const normalizedBasename = normalizeDateSeparators(basename);
  const exactDate = parseNoteDate(normalizedBasename, dailyNoteFormat);`;

src = src.replace(ANCHOR, replacement);

const PAIRS = [
  ['for (let start = 0; start <= basename.length - length; start++) {',
   'for (let start = 0; start <= normalizedBasename.length - length; start++) {'],
  ['const candidate = basename.substring(start, start + length);',
   'const candidate = normalizedBasename.substring(start, start + length);'],
];

for (const [from, to] of PAIRS) {
  if (!src.includes(from)) {
    console.error('替换失败，未找到：' + from);
    process.exit(3);
  }
  src = src.replace(from, to);
}

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp =
  `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
  `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const backup = MAIN + '.bak-' + stamp;
fs.copyFileSync(MAIN, backup);
fs.writeFileSync(MAIN, src, 'utf8');

console.log('补丁已应用。');
console.log('  备份：' + path.basename(backup));
console.log('  目标：' + MAIN);
console.log('');
console.log('接下来：在 Obsidian 里重载插件（设置 → 社区插件 → calendar-hub 关闭再开启，');
console.log('或 Ctrl+P → "Reload app without saving"）即可生效。');

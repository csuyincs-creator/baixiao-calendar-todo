#!/usr/bin/env node
/**
 * calendar-hub 补丁（第四批）：active-fill
 * ---------------------------------------------------------------
 * 在前三批（u2011 日期归一化 + 待办面板 + 格子徽标 / layout-horizontal / note-dir）
 * 之上，给「当前正在看的那一天」在日历格子上填一块颜色：
 *
 *   1) main.js：新增 hubSelectedDayKey + hubSelectedDaySource。
 *      插件的 selectedDate（点某天更新，底部笔记面板显示的就是它）原本只喂给面板，
 *      没有传进日历格子，所以点某天格子毫无反馈。这里用 sources 扩展点把它变成
 *      格子上的一个 hub-selected class，不碰 Svelte 的 props 链。
 *
 *   2) main.js：四个入口同步 hubSelectedDayKey，并各带一句 sources = sources.slice()
 *      强制日历重算 metadata（不换引用，CalendarBase 不会重新调用 getDailyMetadata）：
 *        · handleClickDay              —— 点某天
 *        · handleClickWeek             —— 切到周视图时清掉
 *        · handleResetDisplayedMonth   —— 回到今天
 *        · $: if (!selectedDate && today) —— 面板重开时按默认值同步
 *
 *   3) main.js：把 hubSelectedDaySource 注册进 CalendarView.onOpen() 的 this.sources。
 *
 *   4) styles.css：末尾新增覆盖块（.container .calendar .day.hub-selected）。
 *      特异性必须写到 0,4,0 —— 插件运行时注入的 .active.svelte-q3wqg9 是 0,2,0，
 *      .day.active.svelte-q3wqg9:hover 是 0,4,0，短选择器压不住。
 *
 * 用法
 *   node "calendar-hub-active-fill.patch.js"
 *
 * 幂等
 *   重复运行不会重复打补丁。插件升级会覆盖 main.js / styles.css，
 *   升级后按顺序重跑第一批 ~ 这一批即可。补丁前自动备份。
 *
 * 配套文件（同目录）
 *   calendar-hub-active-fill.insert.js —— 要插入 main.js 的代码片段
 *   calendar-hub-active-fill.css       —— 要追加到 styles.css 末尾的覆盖样式
 *
 * 顺序要求
 *   必须在 calendar-hub-u2011-date.patch.js 和 calendar-hub-todo-panel.patch.js
 *   **之后**运行：main.js 的插入锚点是待办面板那块代码。
 *   与 layout / note-dir 两个补丁无先后依赖，但 CSS 块必须排在最后 ——
 *   本段「拥有」从自己的标记到 styles.css 末尾的全部内容。
 *   注意：note-dir 补丁的 BLOCK_END 指向本段的标记，两个补丁要一起更新。
 */

const fs = require('fs');
const path = require('path');

const PATCH_DIR = __dirname;
const VAULT_ROOT = path.resolve(__dirname, '..', '..');
// 目标插件目录。默认按「补丁放在 <vault>/.workbuddy/patches/ 下」推导；
// 也可以用环境变量直接指定，方便从仓库里对任意 vault 打补丁：
//   CALENDAR_HUB_PLUGIN_DIR="<vault>/.obsidian/plugins/calendar-hub" node xxx.patch.js
const PLUGIN_DIR = process.env.CALENDAR_HUB_PLUGIN_DIR
  ? path.resolve(process.env.CALENDAR_HUB_PLUGIN_DIR)
  : path.join(VAULT_ROOT, '.obsidian', 'plugins', 'calendar-hub');
const MAIN = path.join(PLUGIN_DIR, 'main.js');
const STYLES = path.join(PLUGIN_DIR, 'styles.css');
const INSERT_JS = path.join(PATCH_DIR, 'calendar-hub-active-fill.insert.js');
const APPEND_CSS = path.join(PATCH_DIR, 'calendar-hub-active-fill.css');

// main.js 用「代码签名」判断是否已打过补丁，比注释标记可靠。
// 用两个签名做交叉校验：只命中一个说明上次打到一半，必须报错而不是跳过。
const MARKER_JS_A = 'const hubSelectedDaySource = {';
const MARKER_JS_B = '      hubBadgeSource,\n      hubSelectedDaySource\n    ];';

// 本段补丁「拥有」从这一行到 styles.css 末尾的全部内容
const BLOCK_START = '/* ===== 本地定制：active-fill';

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp =
  `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
  `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

function need(p) {
  if (!fs.existsSync(p)) {
    console.error('缺少文件：' + p);
    process.exit(1);
  }
}

// 锚点必须唯一，否则 String.replace 只替换第一处，剩下的会被静默漏掉
function mustReplace(src, from, to, label) {
  const hits = src.split(from).length - 1;
  if (hits === 0) {
    console.error('锚点未匹配（' + label + '），插件源码可能已改版，或前置补丁没打。');
    console.error('未做任何修改。');
    process.exit(2);
  }
  if (hits > 1) {
    console.error('锚点不唯一（' + label + '）：命中 ' + hits + ' 处，期望 1 处。');
    console.error('未做任何修改。');
    process.exit(3);
  }
  // 用函数形式，避免替换串里的 $ 被当成特殊序列（代码中含 $$）
  return src.replace(from, () => to);
}

need(MAIN);
need(STYLES);
need(INSERT_JS);
need(APPEND_CSS);

let changedMain = false;
let changedCss = false;

// ---------- main.js ----------
let main = fs.readFileSync(MAIN, 'utf8');
const hasA = main.includes(MARKER_JS_A);
const hasB = main.includes(MARKER_JS_B);
if (hasA !== hasB) {
  console.error('检测到 main.js 的 active-fill 补丁只打了一半：');
  console.error('  ' + MARKER_JS_A + ' -> ' + hasA);
  console.error('  MARKER_JS_B -> ' + hasB);
  console.error('请从备份恢复 main.js 后重跑，未做任何修改。');
  process.exit(4);
}
if (hasA && hasB) {
  console.log('· main.js 已包含 active-fill，跳过');
} else {
  const insert = fs.readFileSync(INSERT_JS, 'utf8').replace(/\s+$/, '') + '\n\n';

  // 1) 模块级：hubSelectedDayKey + hubSelectedDaySource，插在待办面板那块本地定制代码之前
  const ANCHOR_TODO_PANEL =
    '// ===== 待办事项面板(本地定制:接入 06 每日灵感/00 清晨方白晓-待办事项.md) =====\n' +
    'var TODO_NOTE_PATH = "06 每日灵感/00 清晨方白晓-待办事项.md";';
  main = mustReplace(main, ANCHOR_TODO_PANEL, insert + ANCHOR_TODO_PANEL, 'active-fill 模块插入');

  // 2) 点某天：同步 key 并强制日历重算 metadata
  const ANCHOR_CLICK_DAY =
    '  function handleClickDay(date, isMetaPressed2) {\n' +
    '    $$invalidate(26, selectionMode = "day");\n' +
    '    $$invalidate(24, selectedDate = date.clone());\n' +
    '    void onClickDay(date, isMetaPressed2);\n' +
    '  }';
  main = mustReplace(
    main,
    ANCHOR_CLICK_DAY,
    '  function handleClickDay(date, isMetaPressed2) {\n' +
      '    $$invalidate(26, selectionMode = "day");\n' +
      '    $$invalidate(24, selectedDate = date.clone());\n' +
      '    hubSelectedDayKey = date.format("YYYY-MM-DD");\n' +
      '    $$invalidate(1, sources = sources.slice());\n' +
      '    void onClickDay(date, isMetaPressed2);\n' +
      '  }',
    'handleClickDay'
  );

  // 3) 切到周视图：没有「某一天」可填，清掉
  const ANCHOR_CLICK_WEEK =
    '  function handleClickWeek(date, isMetaPressed2) {\n' +
    '    $$invalidate(26, selectionMode = "week");\n' +
    '    $$invalidate(25, selectedWeek = date.clone());\n' +
    '    void onClickWeek(date, isMetaPressed2);\n' +
    '  }';
  main = mustReplace(
    main,
    ANCHOR_CLICK_WEEK,
    '  function handleClickWeek(date, isMetaPressed2) {\n' +
      '    $$invalidate(26, selectionMode = "week");\n' +
      '    $$invalidate(25, selectedWeek = date.clone());\n' +
      '    hubSelectedDayKey = null;\n' +
      '    $$invalidate(1, sources = sources.slice());\n' +
      '    void onClickWeek(date, isMetaPressed2);\n' +
      '  }',
    'handleClickWeek'
  );

  // 4) 回到今天
  const ANCHOR_RESET =
    '    $$invalidate(24, selectedDate = date.clone());\n' +
    '    const todaysNotes = getDailyNotesForDate(date, $dailyNotesByDate, $dailyNotes);';
  main = mustReplace(
    main,
    ANCHOR_RESET,
    '    $$invalidate(24, selectedDate = date.clone());\n' +
      '    hubSelectedDayKey = date.format("YYYY-MM-DD");\n' +
      '    $$invalidate(1, sources = sources.slice());\n' +
      '    const todaysNotes = getDailyNotesForDate(date, $dailyNotesByDate, $dailyNotes);',
    'handleResetDisplayedMonth'
  );

  // 5) 面板重开 / 首次渲染：selectedDate 走默认值 today 时同步 key
  const ANCHOR_INIT =
    '      $: if (!selectedDate && today) {\n' +
    '        $$invalidate(24, selectedDate = today.clone());\n' +
    '      }';
  main = mustReplace(
    main,
    ANCHOR_INIT,
    '      $: if (!selectedDate && today) {\n' +
      '        $$invalidate(24, selectedDate = today.clone());\n' +
      '        hubSelectedDayKey = today.format("YYYY-MM-DD");\n' +
      '      }',
    'selectedDate 默认值同步'
  );

  // 6) 注册 source
  const ANCHOR_SOURCES =
    '    this.sources = [\n' +
    '      customTagsSource,\n' +
    '      streakSource,\n' +
    '      noteCountSource,\n' +
    '      tasksSource,\n' +
    '      hubBadgeSource\n' +
    '    ];';
  main = mustReplace(
    main,
    ANCHOR_SOURCES,
    '    this.sources = [\n' +
      '      customTagsSource,\n' +
      '      streakSource,\n' +
      '      noteCountSource,\n' +
      '      tasksSource,\n' +
      '      hubBadgeSource,\n' +
      '      hubSelectedDaySource\n' +
      '    ];',
    'sources 注册'
  );

  // 打完自检：6 处改动必须都到位
  const selfCheck = [
    MARKER_JS_A,
    MARKER_JS_B,
    'hubSelectedDayKey = date.format("YYYY-MM-DD");',
    'hubSelectedDayKey = null;',
    'hubSelectedDayKey = today.format("YYYY-MM-DD");',
    '$$invalidate(1, sources = sources.slice());'
  ];
  const missing = selfCheck.filter((s) => !main.includes(s));
  if (missing.length) {
    console.error('自检失败：以下片段在打完补丁后仍然缺失 ——');
    missing.forEach((s) => console.error('  ' + JSON.stringify(s)));
    console.error('未写入文件。');
    process.exit(5);
  }

  fs.copyFileSync(MAIN, MAIN + '.bak-' + stamp);
  fs.writeFileSync(MAIN, main, 'utf8');
  changedMain = true;
  console.log('· main.js 已打补丁（备份 main.js.bak-' + stamp + '）');
}

// ---------- styles.css：追加 / 就地替换覆盖样式 ----------
// 这一段补丁「拥有」从 BLOCK_START 到文件末尾的全部内容：
//   没打过 → 追加；打过 → 就地替换成最新版本（所以改了片段重跑就能升级）。
// 约束：这个覆盖块必须留在 styles.css 最末尾，不要在它后面再追加别的东西。
let css = fs.readFileSync(STYLES, 'utf8');
const append = fs.readFileSync(APPEND_CSS, 'utf8');
const at = css.indexOf(BLOCK_START);
if (at >= 0) {
  const next = css.slice(0, at).replace(/\s+$/, '\n\n') + append;
  if (next === css) {
    console.log('· styles.css 的 active-fill 覆盖块已是最新，跳过');
  } else {
    fs.copyFileSync(STYLES, STYLES + '.bak-' + stamp);
    fs.writeFileSync(STYLES, next, 'utf8');
    changedCss = true;
    console.log('· styles.css 已就地更新覆盖块（备份 styles.css.bak-' + stamp + '）');
  }
} else {
  fs.copyFileSync(STYLES, STYLES + '.bak-' + stamp);
  css = css.replace(/\s+$/, '\n\n') + append;
  fs.writeFileSync(STYLES, css, 'utf8');
  changedCss = true;
  console.log('· styles.css 已追加覆盖样式（备份 styles.css.bak-' + stamp + '）');
}

console.log('');
if (changedMain || changedCss) {
  console.log('补丁完成。接下来在 Obsidian 里重载插件：');
  console.log('  设置 → 社区插件 → calendar-hub 关闭再开启，或 Ctrl+P → "Reload app without saving"');
} else {
  console.log('无需改动，已是最新状态。');
}

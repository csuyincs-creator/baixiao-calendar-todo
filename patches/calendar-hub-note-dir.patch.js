#!/usr/bin/env node
/**
 * calendar-hub 补丁（第三批）：note-dir
 * ---------------------------------------------------------------
 * 在第一批（u2011 日期归一化 + 待办面板 + 格子徽标）和第二批（layout-horizontal）
 * 之上，给笔记卡片右侧加上「文件所在的顶层目录名」：
 *
 *   1) main.js：新增 getNoteTopFolder(notePath) —— 取路径的**第一段**。
 *        "06 每日灵感/2026-09/2026-09-24.md"      -> "06 每日灵感"
 *        "03 知识库分析报告/01 日报/2026-09/x.md" -> "03 知识库分析报告"
 *      注意不是「直接父目录」——那会得到 "2026-09"，不是用户要的顶层分类目录。
 *
 *   2) main.js：给笔记列表项的 button 写一个 data-hub-dir 属性
 *      （c() 创建时一处 + p() 路径变化时一处）。
 *      用属性而不是新增 span —— 完全不碰 Svelte 的 append / text / 更新链，
 *      升级后最不容易碎。
 *
 *   3) styles.css：末尾新增覆盖块，用 ::after + attr() 渲染成 [目录名]。
 *      标题 flex: 1 1 auto 吃掉剩余宽度（把目录名推到最右、两者不紧挨）；
 *      目录名 flex: 0 0 auto + max-width: 45%，保证标题永远至少拿到 55%。
 *
 * 用法
 *   node "calendar-hub-note-dir.patch.js"
 *
 * 幂等
 *   重复运行不会重复打补丁。插件升级会覆盖 main.js / styles.css，
 *   升级后按顺序重跑第一批 + 第二批 + 这一批即可。补丁前自动备份。
 *
 * 配套文件（同目录）
 *   calendar-hub-note-dir.insert.js —— 要插入 main.js 的代码片段
 *   calendar-hub-note-dir.css       —— 要追加到 styles.css 末尾的覆盖样式
 *
 * 顺序要求
 *   必须在 calendar-hub-u2011-date.patch.js 和 calendar-hub-todo-panel.patch.js
 *   **之后**运行：main.js 的插入锚点是待办面板那块代码。
 *   与 calendar-hub-layout.patch.js 无先后依赖，但建议排在它后面 ——
 *   本段的 CSS 覆盖 layout 块里的 .calendar-note-list-item / .calendar-note-title，
 *   两者特异性相同，靠源码顺序生效。
 *   必须排在 calendar-hub-active-fill.patch.js **之前** ——
 *   本段的 BLOCK_END 指向 active-fill 块的标记。
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
const INSERT_JS = path.join(PATCH_DIR, 'calendar-hub-note-dir.insert.js');
const APPEND_CSS = path.join(PATCH_DIR, 'calendar-hub-note-dir.css');

// main.js 用「代码签名」判断是否已打过补丁，比注释标记可靠：
// 注释可能被改，这行代码不会。这行在打完补丁后会出现两次（c() 和 p()）。
const MARKER_JS = 'attr(button, "data-hub-dir", getNoteTopFolder(ctx[35].path));';

// 本段补丁「拥有」从 BLOCK_START 到 BLOCK_END 之间的全部内容。
// BLOCK_END 指向**下一个**覆盖块的起点。不划这条界，本补丁重跑时会把排在
// 它后面的 active-fill 块整段吃掉 —— 而且很难发现：内容没变时会走
// 「已是最新，跳过」分支，只有真的改了片段才走到替换分支。
const BLOCK_START = '/* ===== 本地定制：note-dir';
const BLOCK_END = '/* ===== 本地定制：active-fill';

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
if (main.includes(MARKER_JS)) {
  console.log('· main.js 已包含 note-dir，跳过');
} else {
  const insert = fs.readFileSync(INSERT_JS, 'utf8').replace(/\s+$/, '') + '\n\n';

  // 1) 函数定义：插在待办面板那块本地定制代码之前
  const ANCHOR_TODO_PANEL =
    '// ===== 待办事项面板(本地定制:接入 06 每日灵感/00 清晨方白晓-待办事项.md) =====\n' +
    'var TODO_NOTE_PATH = "06 每日灵感/00 清晨方白晓-待办事项.md";';
  main = mustReplace(main, ANCHOR_TODO_PANEL, insert + ANCHOR_TODO_PANEL, 'note-dir 函数插入');

  // 2) c()：元素创建时写入属性
  const ANCHOR_C =
    '      attr(button, "type", "button");\n' +
    '      attr(button, "title", button_title_value = /*note*/\n' +
    '      ctx[35].path);';
  main = mustReplace(
    main,
    ANCHOR_C,
    '      attr(button, "type", "button");\n' +
      '      attr(button, "data-hub-dir", getNoteTopFolder(ctx[35].path));\n' +
      '      attr(button, "title", button_title_value = /*note*/\n' +
      '      ctx[35].path);',
    'c() 写入属性'
  );

  // 3) p()：selectedNotes 变脏时同步更新
  const ANCHOR_P =
    '      if (dirty[0] & /*selectedNotes*/\n' +
    '      16 && button_title_value !== (button_title_value = /*note*/\n' +
    '      ctx[35].path)) {\n' +
    '        attr(button, "title", button_title_value);\n' +
    '      }';
  main = mustReplace(
    main,
    ANCHOR_P,
    ANCHOR_P +
      '\n      if (dirty[0] & /*selectedNotes*/\n' +
      '      16) {\n' +
      '        attr(button, "data-hub-dir", getNoteTopFolder(ctx[35].path));\n' +
      '      }',
    'p() 同步更新'
  );

  fs.copyFileSync(MAIN, MAIN + '.bak-' + stamp);
  fs.writeFileSync(MAIN, main, 'utf8');
  changedMain = true;
  console.log('· main.js 已打补丁（备份 main.js.bak-' + stamp + '）');
}

// ---------- styles.css：追加 / 就地替换覆盖样式 ----------
// 这一段补丁「拥有」从 BLOCK_START 到文件末尾的全部内容：
//   没打过 → 追加；打过 → 就地替换成最新版本（所以改了片段重跑就能升级）。
// 约束：这个覆盖块必须留在 styles.css 最末尾（特异性相同，靠源码顺序生效），
//       不要在它后面再追加别的东西，否则会被这次替换吃掉。
let css = fs.readFileSync(STYLES, 'utf8');
const append = fs.readFileSync(APPEND_CSS, 'utf8');
const at = css.indexOf(BLOCK_START);
const endAt = at >= 0 ? css.indexOf(BLOCK_END, at) : -1;
// 本段之后还有别的补丁块 → 原样保留（补一个换行，与片段末尾的 \n 合成空行）
const tail = endAt >= 0 ? '\n' + css.slice(endAt) : '';
if (at >= 0) {
  const next = css.slice(0, at).replace(/\s+$/, '\n\n') + append + tail;
  if (next === css) {
    console.log('· styles.css 的 note-dir 覆盖块已是最新，跳过');
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

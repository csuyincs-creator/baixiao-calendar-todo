#!/usr/bin/env node
/**
 * calendar-hub 补丁（第二批）：layout-horizontal
 * ---------------------------------------------------------------
 * 在第一批补丁（u2011 日期归一化 + 待办面板 + 格子徽标）之上，调整日历视图的布局：
 *
 *   1) 待办区：竖排一列 → 单行横排卡片串，高度按「显示几行」算出来
 *      · 原来 max-height: 46% 兜不住，待办一多就把上面的笔记区压没
 *      · 卡片正文最多 3 行，超出加省略号；无空格长串（中文长句/URL）也能断行
 *      · 卡片里的「来源 YYYY-MM-DD」不显示（面板标题已有日期）
 *      · 列表加了 wheel → scrollLeft 的转换，横向才滚得动
 *      · 尺寸只留两个旋钮：--hub-todo-lines（显示几行）/ --hub-todo-card-w（卡片宽），
 *        卡片高和待办区高都由行数算出来，避免「只调矮卡片 → 第三行被半截切断」
 *   2) 笔记列表：去掉路径行，标题一行 + 省略号，卡片变矮（约 50px → 31.5px）
 *
 * 用法
 *   node "calendar-hub-layout.patch.js"
 *
 * 幂等
 *   重复运行不会重复打补丁。插件升级会覆盖 main.js / styles.css，
 *   升级后按顺序重跑第一批 + 这一批即可。补丁前自动备份。
 *
 * 配套文件（同目录）
 *   calendar-hub-layout.css       —— 要追加到 styles.css 的覆盖样式
 *                                    （位置：文件末尾，但在 note-dir 块之前）
 *   calendar-hub-layout-wheel.js  —— 要插入 main.js 的滚轮横滚代码
 *
 * 顺序要求
 *   必须在 calendar-hub-u2011-date.patch.js 和 calendar-hub-todo-panel.patch.js
 *   **之后**运行：main.js 的插入锚点来自第一批补丁插入的代码。
 *
 *   styles.css 里本段的覆盖块后面还有 calendar-hub-note-dir.patch.js 的块，
 *   所以本脚本用 BLOCK_END 划出边界，只替换自己那一段，不会吃掉后面的。
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
const LAYOUT_CSS = path.join(PATCH_DIR, 'calendar-hub-layout.css');
const WHEEL_JS = path.join(PATCH_DIR, 'calendar-hub-layout-wheel.js');

// main.js 用「代码签名」判断是否已打过补丁，比注释标记可靠：
// 注释可能被改，这行代码不会。
const MARKER_JS = 'list.scrollLeft += event.deltaY';

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

function mustReplace(src, from, to, label) {
  if (!src.includes(from)) {
    console.error('锚点未匹配（' + label + '），插件源码可能已改版，或第一批补丁没打。');
    console.error('未做任何修改。');
    process.exit(2);
  }
  // 用函数形式，避免替换串里的 $ 被当成特殊序列（代码中含 $$）
  return src.replace(from, () => to);
}

need(MAIN);
need(STYLES);
need(LAYOUT_CSS);
need(WHEEL_JS);

let changedMain = false;
let changedCss = false;

// ---------- main.js：待办列表加滚轮横向滚动 ----------
let main = fs.readFileSync(MAIN, 'utf8');
if (main.includes(MARKER_JS)) {
  console.log('· main.js 已包含 layout-horizontal，跳过');
} else {
  const wheel = fs.readFileSync(WHEEL_JS, 'utf8').replace(/\s+$/, '') + '\n';
  main = mustReplace(
    main,
    '  const list = panel.createDiv("calendar-hub-todo-list");\n',
    '  const list = panel.createDiv("calendar-hub-todo-list");\n' + wheel,
    '待办列表创建点'
  );
  fs.copyFileSync(MAIN, MAIN + '.bak-' + stamp);
  fs.writeFileSync(MAIN, main, 'utf8');
  changedMain = true;
  console.log('· main.js 已打补丁（备份 main.js.bak-' + stamp + '）');
}

// ---------- styles.css：追加 / 就地替换覆盖样式 ----------
// 这一段补丁「拥有」[BLOCK_START, BLOCK_END) 之间的全部内容：
//   没打过 → 追加；打过 → 就地替换成最新版本（所以改了片段重跑就能升级）。
// 约束：这个覆盖块必须留在 styles.css 最末尾（特异性相同，靠源码顺序生效）。
//
// BLOCK_END 是**下一批补丁的起点**（calendar-hub-note-dir.patch.js 的块）。
// 有了它，本段补丁重跑时只替换自己这一段，不会把后面那段吃掉。
// 以后若还要在后面追加新的覆盖块，把它也加进这里的判断即可。
const BLOCK_START = '/* ===== 本地定制：layout-horizontal';
const BLOCK_END = '/* ===== 本地定制：note-dir';
let css = fs.readFileSync(STYLES, 'utf8');
const append = fs.readFileSync(LAYOUT_CSS, 'utf8');
const at = css.indexOf(BLOCK_START);
const endAt = at >= 0 ? css.indexOf(BLOCK_END, at) : -1;
// 本段之后还有别的补丁块 → 原样保留（补一个换行，与片段末尾的 \n 合成空行）
const tail = endAt >= 0 ? '\n' + css.slice(endAt) : '';
if (at >= 0) {
  const next = css.slice(0, at).replace(/\s+$/, '\n\n') + append + tail;
  if (next === css) {
    console.log('· styles.css 的 layout-horizontal 覆盖块已是最新，跳过');
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

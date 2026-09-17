#!/usr/bin/env node
/**
 * calendar-hub 补丁：待办面板 + 新增待办按钮 + 日历格子徽标 + 徽标外观设置项
 * ---------------------------------------------------------------------
 * 功能
 *   1) 在日历视图（CalendarView）的当天笔记列表下方追加一个待办面板，
 *      数据来自 06 每日灵感/00 清晨方白晓-待办事项.md 的「## 待办事项说明」段。
 *      · 跟随日历当前选中的日期显示当天待办
 *      · 勾选可写回 md（- [ ] ↔ - [x]）
 *      · 点击条目跳到来源笔记
 *      · 面板头部「+」按钮新增待办（日期 + 内容弹窗，写回 md）
 *      · md 改动后自动刷新
 *   2) 日历格子内部右上角显示本日笔记数（红，上）与未完成待办数（橙，下），
 *      通过 sources 的 dataAttributes 通道下发到 .day，CSS 伪元素绘制。
 *   3) 徽标外观（字体族 / 字号 / 字重 / 距右距离 X / 距顶距离 Y / 上下间距 / 两个颜色）
 *      暴露为插件设置项（设置 → 社区插件 → calendar-hub → Calendar cell badges），
 *      设置值由 applyHubBadgeSettings() 写进 document.body 的 --hub-badge-* CSS 变量，
 *      styles.css 里用 var() 消费。
 *
 * 用法
 *   node "calendar-hub-todo-panel.patch.js"
 *
 * 幂等
 *   重复运行不会重复打补丁。插件升级会覆盖 main.js / styles.css，
 *   升级后重跑一次即可（升级后锚点若变化会明确报错并中止，不会写坏文件）。
 *   补丁前自动备份。
 *
 * 配套文件（同目录）
 *   calendar-hub-todo-panel.insert.js      —— 要插入 main.js 的代码（面板 + 徽标 source + CSS 变量桥）
 *   calendar-hub-todo-panel.append.css     —— 要追加到 styles.css 的样式
 *   calendar-hub-badge-settings.insert.js  —— 要插入 main.js 的 addHubBadgeSettings() 方法体
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
const INSERT_JS = path.join(PATCH_DIR, 'calendar-hub-todo-panel.insert.js');
const APPEND_CSS = path.join(PATCH_DIR, 'calendar-hub-todo-panel.append.css');
const BADGE_JS = path.join(PATCH_DIR, 'calendar-hub-badge-settings.insert.js');

const MARKER = 'calendar-hub-todo-panel';

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
    console.error('锚点未匹配（' + label + '），插件源码可能已改版。');
    console.error('未做任何修改。');
    process.exit(2);
  }
  // 用函数形式，避免替换串里的 $ 被当成特殊序列（代码中含 $$）
  return src.replace(from, () => to);
}

need(MAIN);
need(STYLES);
need(INSERT_JS);
need(APPEND_CSS);
need(BADGE_JS);

let changedMain = false;
let changedCss = false;

// ---------- main.js ----------
let main = fs.readFileSync(MAIN, 'utf8');
if (main.includes(MARKER)) {
  console.log('· main.js 已包含待办面板，跳过');
} else {
  const insert = fs.readFileSync(INSERT_JS, 'utf8').replace(/\s+$/, '') + '\n';
  const badge = fs.readFileSync(BADGE_JS, 'utf8').replace(/\s+$/, '');

  // 1) 待办面板 + 徽标 source + CSS 变量桥：整段插在 CalendarView 定义之前
  main = mustReplace(
    main,
    '// src/view.ts\nvar CalendarView = class extends import_obsidian10.ItemView {',
    insert + '\n// src/view.ts\nvar CalendarView = class extends import_obsidian10.ItemView {',
    'CalendarView 定义'
  );

  // 2) 把格子徽标 source 挂进 sources 数组（日历格子上的笔记数/待办数）
  main = mustReplace(
    main,
    `    this.sources = [
      customTagsSource,
      streakSource,
      noteCountSource,
      tasksSource
    ];`,
    `    this.sources = [
      customTagsSource,
      streakSource,
      noteCountSource,
      tasksSource,
      hubBadgeSource
    ];`,
    'onOpen sources 数组'
  );

  // 3) 每次渲染视图后挂载待办面板
  main = mustReplace(
    main,
    `    if (this.modeAction) {
      const title = mode === "calendar" ? "Switch to list view" : "Switch to calendar view";
      (0, import_obsidian10.setIcon)(this.modeAction, mode === "calendar" ? "list" : "calendar");
      this.modeAction.setAttribute("aria-label", title);
    }
  }`,
    `    if (this.modeAction) {
      const title = mode === "calendar" ? "Switch to list view" : "Switch to calendar view";
      (0, import_obsidian10.setIcon)(this.modeAction, mode === "calendar" ? "list" : "calendar");
      this.modeAction.setAttribute("aria-label", title);
    }
    mountTodoPanel(this);
  }`,
    'renderMode 尾部'
  );

  // 4) 销毁视图时清理面板
  main = mustReplace(
    main,
    `    (_b = this.listPanel) == null ? void 0 : _b.$destroy();
    this.listPanel = null;
  }`,
    `    (_b = this.listPanel) == null ? void 0 : _b.$destroy();
    this.listPanel = null;
    destroyTodoPanel(this);
  }`,
    'destroyModeComponents'
  );

  // 5) 默认设置：追加徽标外观字段
  main = mustReplace(
    main,
    `  localeOverride: "system-default"
});`,
    `  localeOverride: "system-default",
  hubBadgeFontFamily: "",
  hubBadgeFontSize: 9,
  hubBadgeFontWeight: 500,
  hubBadgeOffsetX: 3,
  hubBadgeOffsetY: 2,
  hubBadgeGap: 1,
  hubBadgeNoteColor: "#e05252",
  hubBadgeTodoColor: "#e8964a"
});`,
    'defaultSettings 徽标字段'
  );

  // 6) 设置面板：display() 里加调用 + 插入 addHubBadgeSettings() 方法体
  main = mustReplace(
    main,
    `    this.addLocaleOverrideSetting();
  }
  addWeekStartSetting() {`,
    `    this.addLocaleOverrideSetting();
    this.addHubBadgeSettings();
  }
${badge}
  addWeekStartSetting() {`,
    'display 尾部 + addHubBadgeSettings 方法'
  );

  fs.copyFileSync(MAIN, MAIN + '.bak-' + stamp);
  fs.writeFileSync(MAIN, main, 'utf8');
  changedMain = true;
  console.log('· main.js 已打补丁（备份 main.js.bak-' + stamp + '）');
}

// ---------- styles.css ----------
let css = fs.readFileSync(STYLES, 'utf8');
if (css.includes('.calendar-hub-todo-panel')) {
  console.log('· styles.css 已包含待办面板样式，跳过');
} else {
  const append = fs.readFileSync(APPEND_CSS, 'utf8');
  fs.copyFileSync(STYLES, STYLES + '.bak-' + stamp);
  css = css.replace(/\s+$/, '\n\n') + append;
  fs.writeFileSync(STYLES, css, 'utf8');
  changedCss = true;
  console.log('· styles.css 已追加样式（备份 styles.css.bak-' + stamp + '）');
}

console.log('');
if (changedMain || changedCss) {
  console.log('补丁完成。接下来在 Obsidian 里重载插件：');
  console.log('  设置 → 社区插件 → calendar-hub 关闭再开启，或 Ctrl+P → "Reload app without saving"');
} else {
  console.log('无需改动，已是最新状态。');
}

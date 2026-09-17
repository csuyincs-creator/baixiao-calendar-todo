// ===== 待办事项面板(本地定制:接入 06 每日灵感/00 清晨方白晓-待办事项.md) =====
var TODO_NOTE_PATH = "06 每日灵感/00 清晨方白晓-待办事项.md";
function parseTodoNoteContent(content) {
  const byDate = {};
  const lines = content.split("\n");
  let inSection = false;
  let currentDate = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+待办事项说明/.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^##\s+/.test(line)) {
      break;
    }
    if (!inSection) {
      continue;
    }
    const dateMatch = /^###\s+(\d{4}-\d{2}-\d{2})\s*$/.exec(line);
    if (dateMatch) {
      currentDate = dateMatch[1];
      continue;
    }
    const taskMatch = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
    if (!taskMatch || !currentDate) {
      continue;
    }
    const item = {
      text: taskMatch[2].trim(),
      done: taskMatch[1].toLowerCase() === "x",
      line: i,
      source: ""
    };
    for (let j = i + 1; j < lines.length; j++) {
      const sub = lines[j];
      if (!/^\s+\S/.test(sub)) {
        break;
      }
      const srcMatch = /来源[：:]\s*(\[\[[^\]]+\]\])/.exec(sub);
      if (srcMatch && !item.source) {
        item.source = srcMatch[1];
      }
    }
    (byDate[currentDate] = byDate[currentDate] || []).push(item);
  }
  return byDate;
}
function getTodoDateKey(view) {
  const ctx = view.calendar && view.calendar.$$ && view.calendar.$$.ctx;
  const candidate = ctx && ctx[24];
  if (candidate && typeof candidate.isValid === "function" && candidate.isValid()) {
    return candidate.format("YYYY-MM-DD");
  }
  return window.moment().format("YYYY-MM-DD");
}
function getTodoSourceLabel(source) {
  if (!source) {
    return "";
  }
  const raw = source.replace(/^\[\[|\]\]$/g, "").split("|")[0];
  const base = raw.split("#")[0].split("/").pop().replace(/\.md$/, "");
  return base ? "来源 " + base : "";
}
function destroyTodoPanel(view) {
  var _a;
  if ((_a = view.todoObserver) == null ? void 0 : _a.disconnect) {
    view.todoObserver.disconnect();
  }
  view.todoObserver = null;
  if (view.todoRef) {
    view.app.vault.offref(view.todoRef);
    view.todoRef = null;
  }
  view.todoPanelEl = null;
  view.todoByDate = null;
  view.todoDateKey = null;
}
function renderTodoPanel(view) {
  const panel = view.todoPanelEl;
  if (!panel) {
    return;
  }
  const dateKey = getTodoDateKey(view);
  view.todoDateKey = dateKey;
  const items = view.todoByDate && view.todoByDate[dateKey] || [];
  panel.empty();
  const header = panel.createDiv("calendar-hub-todo-panel-header");
  const titleWrap = header.createDiv("calendar-hub-todo-title");
  titleWrap.createSpan({ text: "待办事项" });
  const addButton = titleWrap.createEl("button", { cls: "calendar-hub-todo-add" });
  addButton.setAttribute("type", "button");
  addButton.setAttribute("aria-label", "新增待办");
  (0, import_obsidian10.setIcon)(addButton, "plus");
  addButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openTodoInput(view);
  });
  header.createSpan({
    cls: "calendar-hub-todo-count",
    text: dateKey + " · " + items.length + " 项"
  });
  const list = panel.createDiv("calendar-hub-todo-list");
  if (!items.length) {
    list.createDiv({ cls: "calendar-hub-todo-empty", text: "这天没有待办" });
    return;
  }
  for (const item of items) {
    const row = list.createDiv({
      cls: "calendar-hub-todo-item" + (item.done ? " is-done" : "")
    });
    row.setAttribute("tabindex", "0");
    const check = row.createEl("input", { cls: "calendar-hub-todo-check", type: "checkbox" });
    check.checked = item.done;
    check.addEventListener("click", (event) => {
      event.stopPropagation();
      void setTodoDone(view, item, !item.done);
    });
    const body = row.createDiv("calendar-hub-todo-body");
    body.createDiv({ cls: "calendar-hub-todo-text", text: item.text });
    const meta = getTodoSourceLabel(item.source);
    if (meta) {
      body.createDiv({ cls: "calendar-hub-todo-meta", text: meta });
    }
    row.addEventListener("click", () => openTodoSource(view, item));
  }
}
async function refreshTodoPanel(view) {
  const file = view.app.vault.getAbstractFileByPath(TODO_NOTE_PATH);
  if (!(file instanceof import_obsidian10.TFile)) {
    view.todoByDate = {};
    renderTodoPanel(view);
    return;
  }
  const content = await view.app.vault.cachedRead(file);
  view.todoByDate = parseTodoNoteContent(content);
  renderTodoPanel(view);
}
async function setTodoDone(view, item, done) {
  const file = view.app.vault.getAbstractFileByPath(TODO_NOTE_PATH);
  if (!(file instanceof import_obsidian10.TFile)) {
    return;
  }
  const flip = (line) => done ? line.replace(/^(\s*[-*]\s+)\[ \]/, "$1[x]") : line.replace(/^(\s*[-*]\s+)\[[xX]\]/, "$1[ ]");
  const isTask = (line) => /^\s*[-*]\s+\[[ xX]\]/.test(line);
  await view.app.vault.process(file, (content) => {
    const lines = content.split("\n");
    if (lines[item.line] && isTask(lines[item.line]) && lines[item.line].includes(item.text)) {
      lines[item.line] = flip(lines[item.line]);
      return lines.join("\n");
    }
    for (let i = 0; i < lines.length; i++) {
      if (isTask(lines[i]) && lines[i].includes(item.text)) {
        lines[i] = flip(lines[i]);
        return lines.join("\n");
      }
    }
    return content;
  });
}
function openTodoSource(view, item) {
  if (item.source) {
    const target = item.source.replace(/^\[\[|\]\]$/g, "").split("|")[0];
    void view.app.workspace.openLinkText(target, TODO_NOTE_PATH, false);
    return;
  }
  void view.app.workspace.openLinkText(TODO_NOTE_PATH, "", false);
}
var TodoInputModal = class extends import_obsidian3.Modal {
  constructor(app, opts) {
    super(app);
    this.opts = opts;
    this.dateValue = opts.dateKey;
    this.textValue = "";
    this.contentEl.createEl("h2", { text: "新增待办" });
    new import_obsidian3.Setting(this.contentEl).setName("日期").setDesc("格式 YYYY-MM-DD，默认跟随日历当前选中的日期").addText((text4) => {
      text4.setValue(this.dateValue);
      text4.inputEl.style.width = "150px";
      text4.onChange((value) => {
        this.dateValue = value.trim();
      });
    });
    new import_obsidian3.Setting(this.contentEl).setName("待办内容").addTextArea((area) => {
      area.setPlaceholder("要做什么…");
      area.inputEl.rows = 3;
      area.inputEl.style.width = "100%";
      area.onChange((value) => {
        this.textValue = value;
      });
      window.setTimeout(() => area.inputEl.focus(), 0);
    });
    const buttons = this.contentEl.createDiv("modal-button-container");
    buttons.createEl("button", { text: "取消" }).addEventListener("click", () => this.close());
    buttons.createEl("button", { cls: "mod-cta", text: "添加" }).addEventListener("click", () => {
      void this.submit();
    });
    this.contentEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void this.submit();
      }
    });
  }
  async submit() {
    const dateKey = this.dateValue;
    const text4 = this.textValue.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      new import_obsidian3.Notice("日期格式应为 YYYY-MM-DD");
      return;
    }
    if (!text4) {
      new import_obsidian3.Notice("待办内容不能为空");
      return;
    }
    await this.opts.onSubmit(dateKey, text4);
    this.close();
  }
};
function openTodoInput(view) {
  new TodoInputModal(view.app, {
    dateKey: getTodoDateKey(view),
    onSubmit: (dateKey, text4) => addTodoItem(view, dateKey, text4)
  }).open();
}
async function addTodoItem(view, dateKey, text4) {
  const taskText = String(text4 == null ? "" : text4).trim();
  if (!taskText) {
    new import_obsidian3.Notice("待办内容不能为空");
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    new import_obsidian3.Notice("日期格式应为 YYYY-MM-DD");
    return;
  }
  const file = view.app.vault.getAbstractFileByPath(TODO_NOTE_PATH);
  if (!(file instanceof import_obsidian10.TFile)) {
    new import_obsidian3.Notice("找不到待办文件：" + TODO_NOTE_PATH);
    return;
  }
  let ok = false;
  await view.app.vault.process(file, (content) => {
    const lines = content.split("\n");
    const block = ["- [ ] " + taskText, "  来源：", "  完成说明："];
    const headerIdx = lines.findIndex((line) => line.trim() === "### " + dateKey);
    if (headerIdx >= 0) {
      let end = lines.length;
      for (let i = headerIdx + 1; i < lines.length; i++) {
        if (/^#{2,3}\s/.test(lines[i])) {
          end = i;
          break;
        }
      }
      let insertAt = end;
      while (insertAt > headerIdx + 1 && lines[insertAt - 1].trim() === "") {
        insertAt--;
      }
      lines.splice(insertAt, 0, "", ...block);
      ok = true;
      return lines.join("\n");
    }
    const sectionIdx = lines.findIndex((line) => /^##\s+待办事项说明/.test(line));
    if (sectionIdx < 0) {
      return content;
    }
    let insertAt = lines.length;
    for (let i = sectionIdx + 1; i < lines.length; i++) {
      const match = /^###\s+(\d{4}-\d{2}-\d{2})\s*$/.exec(lines[i]);
      if (match && match[1] < dateKey) {
        insertAt = i;
        break;
      }
      if (/^##\s+/.test(lines[i])) {
        insertAt = i;
        break;
      }
    }
    while (insertAt > sectionIdx + 1 && lines[insertAt - 1].trim() === "") {
      insertAt--;
    }
    lines.splice(insertAt, 0, "", "### " + dateKey, "", ...block);
    ok = true;
    return lines.join("\n");
  });
  if (!ok) {
    new import_obsidian3.Notice("待办文件里找不到「## 待办事项说明」段落");
    return;
  }
  await refreshTodoPanel(view);
}
// ===== 格子徽标外观(本地定制:字体/位置/颜色走设置项,写进 CSS 变量) =====
var HUB_BADGE_VARS = {
  font: "--hub-badge-font",
  size: "--hub-badge-size",
  weight: "--hub-badge-weight",
  x: "--hub-badge-offset-x",
  y: "--hub-badge-offset-y",
  gap: "--hub-badge-gap",
  noteColor: "--hub-badge-note-color",
  todoColor: "--hub-badge-todo-color"
};
var hubBadgeUnsub = null;
function applyHubBadgeSettings() {
  if (typeof document === "undefined" || !document.body) {
    return;
  }
  const opts = get_store_value(settings) || {};
  const root = document.body.style;
  const setVar = (name, value) => {
    if (value === void 0 || value === null || value === "") {
      root.removeProperty(name);
      return;
    }
    root.setProperty(name, String(value));
  };
  const px = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n + "px" : fallback + "px";
  };
  setVar(HUB_BADGE_VARS.font, opts.hubBadgeFontFamily || "");
  setVar(HUB_BADGE_VARS.size, px(opts.hubBadgeFontSize, 9));
  setVar(HUB_BADGE_VARS.weight, opts.hubBadgeFontWeight || 500);
  setVar(HUB_BADGE_VARS.x, px(opts.hubBadgeOffsetX, 3));
  setVar(HUB_BADGE_VARS.y, px(opts.hubBadgeOffsetY, 2));
  setVar(HUB_BADGE_VARS.gap, px(opts.hubBadgeGap, 1));
  setVar(HUB_BADGE_VARS.noteColor, opts.hubBadgeNoteColor || "");
  setVar(HUB_BADGE_VARS.todoColor, opts.hubBadgeTodoColor || "");
}
function ensureHubBadgeSettingsSync() {
  if (hubBadgeUnsub) {
    applyHubBadgeSettings();
    return;
  }
  hubBadgeUnsub = settings.subscribe(() => {
    applyHubBadgeSettings();
  });
}

var todoBadgeCache = null;
async function getTodoBadgeByDate() {
  const app = window.app;
  const file = app.vault.getAbstractFileByPath(TODO_NOTE_PATH);
  if (!(file instanceof import_obsidian10.TFile)) {
    return {};
  }
  if (todoBadgeCache && todoBadgeCache.mtime === file.stat.mtime) {
    return todoBadgeCache.byDate;
  }
  const content = await app.vault.cachedRead(file);
  const byDate = parseTodoNoteContent(content);
  todoBadgeCache = { mtime: file.stat.mtime, byDate };
  return byDate;
}
var hubBadgeSource = {
  getDailyMetadata: async (date) => {
    const dataAttributes = {};
    const notes = getDailyNotesForDate(
      date,
      get_store_value(dailyNotesByDate),
      get_store_value(dailyNotes)
    );
    if (notes.length) {
      dataAttributes["data-hub-notes"] = String(notes.length);
    }
    const byDate = await getTodoBadgeByDate();
    const todos = (byDate[date.format("YYYY-MM-DD")] || []).filter((item) => !item.done).length;
    if (todos) {
      dataAttributes["data-hub-todos"] = String(todos);
    }
    return { dataAttributes };
  },
  getWeeklyMetadata: () => Promise.resolve({ dataAttributes: {} })
};
function mountTodoPanel(view) {
  destroyTodoPanel(view);
  ensureHubBadgeSettingsSync();
  if (!view.calendar) {
    return;
  }
  view.todoPanelEl = view.contentEl.createDiv("calendar-hub-todo-panel");
  void refreshTodoPanel(view);
  view.todoRef = view.app.vault.on("modify", (file) => {
    if (file.path === TODO_NOTE_PATH) {
      todoBadgeCache = null;
      void refreshTodoPanel(view);
      if (view.calendar) {
        view.calendar.$set({ sources: view.sources.slice() });
      }
    }
  });
  const header = view.contentEl.querySelector(".calendar-note-panel-header");
  if (!header) {
    return;
  }
  view.todoObserver = new MutationObserver(() => {
    if (getTodoDateKey(view) !== view.todoDateKey) {
      renderTodoPanel(view);
    }
  });
  view.todoObserver.observe(header, { childList: true, characterData: true, subtree: true });
}

# 补丁脚本

这一套脚本用来把本仓库的定制**重新打回上游原版**，主要场景是：上游发了新版本，
Obsidian 更新后覆盖了 `main.js` / `styles.css`，定制没了。

详细原理见 [../docs/二开说明.md](../docs/二开说明.md#7-补丁脚本怎么工作)。

## 用法

```bash
# 在插件目录（<vault>/.obsidian/plugins/calendar-hub/）的上一级跑，或直接改脚本里的路径
node calendar-hub-u2011-date.patch.js
node calendar-hub-todo-panel.patch.js
node calendar-hub-layout.patch.js
node calendar-hub-note-dir.patch.js
```

或者用附带的 shell 脚本（它会自己按顺序跑全部四个）：

```bash
bash apply-all.sh "<vault>/.obsidian/plugins/calendar-hub"
```

## 顺序不能变

| 顺序 | 脚本 | 作用 |
|---|---|---|
| 1 | `calendar-hub-u2011-date.patch.js` | 文件名日期分隔符归一化（容错非标准连字符） |
| 2 | `calendar-hub-todo-panel.patch.js` | 待办面板 + 新增按钮 + 格子徽标 + 徽标设置项 |
| 3 | `calendar-hub-layout.patch.js` | 待办横排 + 笔记卡片瘦身 + 滚轮横滚 |
| 4 | `calendar-hub-note-dir.patch.js` | 笔记卡片右侧显示顶层目录名 |

后一批补丁的插入锚点**来自前一批插入的代码**，所以顺序反了会直接报「锚点未匹配」。

## 配套片段文件

补丁脚本本身只做「锚点替换 + 幂等判断」，实际内容在片段文件里：

| 片段 | 被谁用 |
|---|---|
| `calendar-hub-todo-panel.insert.js` | 待办面板那一整段 JS |
| `calendar-hub-todo-panel.append.css` | 待办面板 + 徽标的样式 |
| `calendar-hub-badge-settings.insert.js` | 徽标设置面板的方法体 |
| `calendar-hub-layout.css` | 布局覆盖块（追加到 `styles.css`，在 note-dir 块**之前**） |
| `calendar-hub-layout-wheel.js` | 滚轮横滚那几行 JS |
| `calendar-hub-note-dir.insert.js` | 取顶层目录名的 `getNoteTopFolder()` |
| `calendar-hub-note-dir.css` | 目录名覆盖块（`styles.css` **最末尾**） |

**改定制内容 = 改这些片段，然后重跑补丁**，不要去改 `main.js` / `styles.css` 本体
（下次重放会被覆盖）。

## 每个补丁的行为

1. **幂等** —— 打过就跳过。`main.js` 用**代码签名**判断（如 `list.scrollLeft += event.deltaY`），
   `styles.css` 用注释里的标记（`calendar-hub-layout` / `calendar-hub-note-dir`）。
2. **锚点不匹配就中止** —— 明确报错、**不做任何修改**，不会写坏文件。
   锚点命中多于一处的也会中止（避免只替换第一处、剩下的被静默漏掉）。
3. **自动备份** —— 写入前备份成 `main.js.bak-<YYYYMMDD-HHMMSS>`，还原直接覆盖回去。
4. **可重放** —— 从上游原版跑一遍，产物应与本仓库根目录的 `main.js` / `styles.css` 逐字节一致。
5. **样式是「就地替换」** —— 每个补丁拥有从自己的注释标记起、到**下一个块起点**为止的内容。
   改了片段重跑即可升级，内容一样就跳过、不产生多余备份。

> ⚠️ `styles.css` 末尾目前是两段相邻的覆盖块，顺序是 `layout-horizontal` → `note-dir`。
> 靠源码顺序覆盖（特异性相同时后写的赢），所以顺序不能乱。
> 以后要在末尾再加新块，记得同时把它加进前一段的 `BLOCK_END` 判断，否则前一段重跑会把它吃掉。

## 出问题了怎么恢复

```bash
cp main.js.bak-20260318-101500 main.js
cp styles.css.bak-20260318-101500 styles.css
# 然后重新跑补丁
```

**不要手工去删「插重了」的那一段** —— 手工改的东西下次重放就对不上了，
而且下次重跑补丁时幂等判断会失效。

# baixiao-calendar-todo

> 在 [Calendar Hub](https://github.com/HWY1dot0/calendar-hub) 0.2.3 基础上做的**本地定制版**：
> 日历格子上直接显示「当天有多少条笔记、还有几件待办没做」，日历下面挂一个能勾选、能新增的待办面板。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A5%201.7.2-7b6cd9)

> **截图说明**：下面所有截图都使用**虚构的演示数据**（虚构的月份、笔记名、待办内容），
> 界面由插件真实样式渲染，不含任何真实 vault 内容。

![日历视图](screenshots/01-日历视图.png)

---

## 这个定制版做了什么

原版 Calendar Hub 能在一个日历里汇总「某一天的所有笔记」，但它不告诉你**那天有多少条**、
也管不了**待办**。这个版本补了四件事：

### 1. 日历格子右上角的计数徽标

每个日期格子的右上角显示两个很小的数字：

- **红色**（上面）= 当天笔记数
- **橙色**（下面）= 当天**未完成**待办数

两个数字都只在大于 0 时才出现。日期仍然居中、插件原本的圆点位置不变。

**外观全部可调**（设置 → 社区插件 → Calendar Hub → *Calendar cell badges*）：

| 设置项 | 范围 | 默认 | 说明 |
|---|---|---|---|
| Badge font family | 文本 | 空 | 留空 = 继承主题字体 |
| Badge font size | 6–11 | `9` | 格子竖直空间只有约 17px，9 是甜点值 |
| Badge font weight | 400 / 500 / 600 / 700 | `500` | |
| Badge offset X | 0–40 | `3` | 距格子右边缘（往左挪） |
| Badge offset Y | 0–6 | `2` | 距格子顶边缘（往下挪） |
| Badge gap | 0–8 | `1` | 两个数字之间的间距 |
| Note count color | 取色器 | `#e05252` | |
| To-do count color | 取色器 | `#e8964a` | |

改完即时生效，不用重载插件。

### 2. 日历下方的待办面板

- **跟随日历选中的日期**显示当天待办
- **勾选即写回** md 文件（`- [ ]` ↔ `- [x]`）
- 点条目跳到来源笔记
- 标题栏的 **「+」新增待办**（日期 + 内容弹窗，直接写进 md）
- md 被改动后自动刷新
- **横向卡片排列**：卡片尺寸固定，待办再多也只是横向滚动，**不会挤压上面的笔记区**
- 正文超出按行截断加省略号；中文长句、超长英文单词、不带空格的 URL 都能正确断行

![待办长文本截断](screenshots/02-待办长文本截断.png)

待办多的时候横向滚动（滚轮直接可用）：

![待办横向滚动](screenshots/03-待办横向滚动.png)

卡片宽度可调（`--hub-todo-card-w`）：

![卡片宽度可调](screenshots/05-卡片宽度可调.png)

### 3. 笔记列表瘦身

原版每条笔记卡片显示「标题 + 完整路径」两行。路径双击就能看到，所以这里去掉了，
标题改成一行 + 省略号 —— 卡片高度从约 50px 降到 31.5px，同屏能多看四成条数。
路径没丢：鼠标悬停在卡片上仍会显示完整路径。

![笔记列表](screenshots/06-笔记列表.png)

### 4. 日期解析容错

原版用 moment 的**严格模式**解析文件名里的日期。如果你的文件名里用了
非标准连字符（U+2010 ~ U+2015、U+2212、U+FF0D、U+FE63、U+00AD、U+2043），
这些笔记会被静默跳过、不计入日历。

这个版本在唯一的入口处把这些字符统一归一化成 `-`。
（实测某个 477 篇笔记的 vault 里有 33 个文件受影响。）

---

## 安装

手动安装（这个定制版不在 Obsidian 社区插件列表里）：

```bash
cd "<你的 vault>/.obsidian/plugins/"
git clone https://github.com/csuyincs-creator/baixiao-calendar-todo.git calendar-hub
```

> ⚠️ **文件夹名必须是 `calendar-hub`** —— 要跟 `manifest.json` 里的 `id` 一致。

然后 **设置 → 社区插件 → 已安装插件**，打开 Calendar Hub（需要先关闭「受限模式」）。

**想和官方版共存？** 改 `manifest.json` 的 `id`（比如 `baixiao-calendar-todo`）
并把文件夹改成同名即可。代价是设置不会从官方版继承过来。

---

## 待办数据从哪来

待办面板读的是一个**普通的 Markdown 文件**，格式很简单：

```markdown
## 待办事项说明

### 2026-03-18

- [ ] 整理上周的会议纪要并归档
  来源：[[2026-03-18.md#^I-20260318-2136d0e1f2|来源]]
  完成说明：

- [x] 给设计稿补上暗色模式
  来源：[[2026-03-18.md#^I-20260318-0418e5f6a7|来源]]
  完成说明：
```

- `### YYYY-MM-DD` 开头的三级标题 = 一天
- `- [ ]` / `- [x]` = 未完成 / 已完成
- 缩进的 `来源：[[...]]` 会被解析成来源笔记（点条目可以跳过去）
- `## 待办事项说明` 之前的任何内容（比如索引图）都会被跳过

> ⚠️ **路径是写死的**：默认读 `06 每日灵感/00 清晨方白晓-待办事项.md`。
> 换成你自己的路径只需改 `main.js` 里的一行：
> ```js
> var TODO_NOTE_PATH = "06 每日灵感/00 每日待办.md";
> ```
> 详见 [二开说明](docs/二开说明.md#1-待办文件路径写死了)。

---

## 目录结构

```
.
├── main.js            # 打包产物（已含全部定制），直接装
├── styles.css         # 样式（末尾是定制覆盖块）
├── manifest.json      # 插件清单
├── patches/           # 可重放的补丁脚本 —— 上游升级后用它恢复定制
├── docs/
│   └── 二开说明.md     # 二次开发文档（改哪里、怎么验证、踩过什么坑）
└── screenshots/       # 演示截图（虚构数据）
```

---

## 上游升级了怎么办

这个仓库是**打包产物 + 补丁脚本**，不是源码 fork —— 因为上游只发布编译后的 `main.js`。

Obsidian 检测到上游发新版本时会提示更新，**更新会覆盖 `main.js` / `styles.css`，定制就没了**。
恢复只要两步：

```bash
# 1. 先把新版 main.js / styles.css 拷回插件目录（Obsidian 更新时已经做了）
# 2. 重跑补丁（脚本会自动备份，锚点对不上会明确报错并中止，不会写坏文件）
cd <vault>/.workbuddy/patches     # 或本仓库的 patches/
node calendar-hub-u2011-date.patch.js
node calendar-hub-todo-panel.patch.js
node calendar-hub-layout.patch.js
```

**顺序不能变** —— 后一批补丁的插入锚点来自前一批插入的代码。
补丁是幂等的，重复跑不会重复插入。

如果某个补丁报「锚点未匹配」，说明上游改了那段代码，需要按
[二开说明](docs/二开说明.md) 重新侦察并更新锚点。

---

## 二开（继续改这个插件）

改之前请读 [docs/二开说明.md](docs/二开说明.md)。里面写了：

- 为什么是「补丁」而不是 fork 源码，以及这套做法的取舍
- 怎么读一个 25 万字节的打包产物、去哪找扩展点
- 四个定制点各自改在哪个函数、什么原理
- **怎么做真实验证**（无头浏览器 + 真实 CSS + 重放比对）
- 一路踩过的坑清单（特异性陷阱、`$$` 替换、滚动条吃掉高度、`box-sizing` 对不上……）

---

## 致谢

- [Calendar Hub](https://github.com/HWY1dot0/calendar-hub) — HWY1dot0，本项目的上游
- [obsidian-calendar-plugin](https://github.com/liamcain/obsidian-calendar-plugin) — Liam Cain，Calendar Hub 的前身
- [obsidian-calendar-ui](https://github.com/liamcain/obsidian-calendar-ui)、[obsidian-daily-notes-interface](https://github.com/liamcain/obsidian-daily-notes-interface) — Liam Cain，上游内联打包的两个库

上游项目是 MIT 许可，本仓库的定制部分同样以 MIT 发布，原始版权声明保留在 [LICENSE](LICENSE)。

## 许可

[MIT](LICENSE)

// ===== 笔记卡片目录名(本地定制:note-dir) =====
// 取笔记路径的「第一段」作为顶层目录名,供笔记卡片右侧显示。
//   "06 每日灵感/2026-09/2026-09-24.md"        -> "06 每日灵感"
//   "03 知识库分析报告/01 日报/2026-09/x.md"   -> "03 知识库分析报告"
// 直接位于库根目录的文件没有目录,返回 null;此时不写 data-hub-dir 属性,
// CSS 的 ::after 选择器匹配不上,自然就不渲染,不会出现空的 "[]"。
function getNoteTopFolder(notePath) {
  const segments = String(notePath || "").split("/");
  return segments.length > 1 && segments[0] ? segments[0] : null;
}


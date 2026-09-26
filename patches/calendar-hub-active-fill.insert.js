// ===== 选中日填充(本地定制:active-fill) =====
// 「当前正在看的那一天」在插件内部叫 selectedDate —— 点某天时更新,底部笔记面板
// 显示的就是这天。但它只喂给了笔记面板,从来没有传进日历格子,
// 所以点某天时格子上没有任何视觉反馈。
//
// 这里借 sources 扩展点把它变成格子上的一个 class,完全不碰 Svelte 的 props 链:
//   sources 里每个 source 形如 { getDailyMetadata(date) => { classes, dataAttributes, dots } },
//   metadataReducer 会把各个 source 返回的 classes 合并进 day div 的 class。
//
// 两个必须注意的点:
//   1. source 绝不能返回 null。metadataReducer 里直接写的是 meta2.classes,
//      返回 null 会当场抛错。不匹配时返回 {} 即可。
//   2. 改完 hubSelectedDayKey 必须让日历重算一次 metadata,否则 class 加不上。
//      重算的开关是 sources 的引用:CalendarView.p() 只在 sources 变脏时才往下传,
//      CalendarBase 那边也是 (dirty & /*sources, month, today*/) 命中才重新调用
//      getDailyMetadata。所以下面每个入口都配了一句 sources = sources.slice()。
let hubSelectedDayKey = null;
if (window.moment) {
  hubSelectedDayKey = window.moment().format("YYYY-MM-DD");
}

const hubSelectedDaySource = {
  getDailyMetadata(date) {
    if (!hubSelectedDayKey) return {};
    if (date.format("YYYY-MM-DD") !== hubSelectedDayKey) return {};
    return { classes: ["hub-selected"] };
  }
};

#!/usr/bin/env bash
# 按顺序把全部补丁打到指定的插件目录。
#
# 用法：
#   bash apply-all.sh "<vault>/.obsidian/plugins/calendar-hub"
#
# 不带参数时，按「补丁位于 <vault>/.workbuddy/patches/」推导目标目录
# （也就是这个仓库原来的部署方式）。
#
# 补丁是幂等的，重复跑不会重复插入；每次写入前会自动备份成 main.js.bak-<时间戳>。

set -euo pipefail

# Git Bash 下 pwd 给的是 /x/... 这种 POSIX 路径，而 node 是 Windows 程序、
# 只认 X:/... 。所以统一转成 Windows 路径（非 Git Bash 环境自动退回普通 pwd）。
posix_to_native() {
  local p="$1"
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$p"
  else
    printf '%s' "$p"
  fi
}

HERE_RAW="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HERE="$(posix_to_native "$HERE_RAW")"
NODE_BIN="${NODE_BIN:-node}"

if [ "$#" -ge 1 ]; then
  TARGET="$(posix_to_native "$1")"
  if [ ! -f "$TARGET/main.js" ]; then
    echo "找不到 $TARGET/main.js" >&2
    echo "参数应该是插件目录，例如 <vault>/.obsidian/plugins/calendar-hub" >&2
    exit 1
  fi
  export CALENDAR_HUB_PLUGIN_DIR="$TARGET"
  echo "目标插件目录：$TARGET"
else
  echo "未指定插件目录，按脚本位置推导（补丁应位于 <vault>/.workbuddy/patches/）"
fi

PATCHES=(
  calendar-hub-u2011-date.patch.js
  calendar-hub-todo-panel.patch.js
  calendar-hub-layout.patch.js
)

for p in "${PATCHES[@]}"; do
  echo ""
  echo "=== $p ==="
  "$NODE_BIN" "$HERE/$p"
done

echo ""
echo "全部补丁处理完成。接下来在 Obsidian 里重载插件："
echo '  设置 → 社区插件 → Calendar Hub 关闭再开启，或 Ctrl+P → "Reload app without saving"'

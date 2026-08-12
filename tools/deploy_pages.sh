#!/usr/bin/env bash
# 一键部署到 GitHub Pages（gh-pages 分支方式）
# 用法: bash tools/deploy_pages.sh
# 说明: 当前 token 无 workflow 权限，Actions 自动部署暂不可用，
#       故采用本地构建 + 推送 gh-pages 分支的经典方式。
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
WT=/tmp/hy-pages
git worktree remove --force "$WT" 2>/dev/null || true
if git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add "$WT" gh-pages
else
  git worktree add "$WT" -b gh-pages
fi
(
  cd "$WT"
  git rm -rf . --quiet 2>/dev/null || true
  cp -R "$OLDPWD/dist/"* .
  touch .nojekyll
  git add -A
  git -c user.name="Huayan Bot" -c user.email="noreply@local" \
      commit -m "pages: deploy $(date '+%Y-%m-%d %H:%M')" --quiet
  git push origin gh-pages
)
git worktree remove --force "$WT"
echo "deployed -> https://hosuke.github.io/huanyuan/"

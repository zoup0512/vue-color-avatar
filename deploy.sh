#!/usr/bin/env bash
#
# deploy.sh — 一键构建并发布 vue-color-avatar 到服务器（Nginx 静态托管）
#
# 用法:
#   ./deploy.sh               完整构建（含单元测试）后发布
#   ./deploy.sh --no-test     跳过单元测试，直接 vite build 后发布（更快）
#   ./deploy.sh --dry-run     只构建 + 打包，不上传（本地验证用）
#
# 首次使用前:
#   1. 修改下方配置区为你的服务器信息
#   2. 配置本地 SSH 免密登录（步骤见 DEPLOY.md）
#   3. 服务器一次性配置 Nginx（见 deploy/nginx.conf 与 DEPLOY.md）

set -euo pipefail

# ==================== 配置区（改成你自己的） ====================
SERVER_HOST="124.220.35.87"          # 服务器 IP 或域名（必填）
SERVER_USER="root"      # SSH 登录用户名
SERVER_PORT="22"        # SSH 端口
SERVER_PATH="/var/www/vue-color-avatar" # Nginx 站点目录，需与 nginx.conf 的 root 一致
SSH_KEY=""              # 私钥文件路径（如 ~/.ssh/id_rsa），留空用默认密钥；脚本不支持密码登录
# ==============================================================

# -------------------- 以下一般无需修改 --------------------
SKIP_TEST=0
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --no-test) SKIP_TEST=1 ;;
    --dry-run) DRY_RUN=1 ;;
    *)
      echo "❌ 未知参数: $arg（仅支持 --no-test / --dry-run）" >&2
      exit 1
      ;;
  esac
done

if [ "$DRY_RUN" -ne 1 ] && [ -z "$SERVER_HOST" ]; then
  echo "❌ 请先修改 deploy.sh 顶部的配置区（SERVER_HOST 必填）" >&2
  exit 1
fi

# 注意: ssh 用 -p，scp 用 -P，端口参数不能混用
# BatchMode 禁止交互式密码提示：免密失效时快速失败，而不是挂起等待输入
COMMON_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes"
SSH_OPTS="$COMMON_OPTS -p $SERVER_PORT"
SCP_OPTS="$COMMON_OPTS -P $SERVER_PORT"
if [ -n "$SSH_KEY" ]; then
  SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
  SCP_OPTS="$SCP_OPTS -i $SSH_KEY"
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [ "$SKIP_TEST" -eq 1 ]; then
  echo "==> [1/4] 构建项目（跳过单测）..."
  npx vite build
else
  echo "==> [1/4] 构建项目（含单元测试）..."
  npm run build
fi

echo "==> [2/4] 打包 dist/ ..."
mkdir -p .deploy
TARBALL=".deploy/vue-color-avatar.tar.gz"
rm -f "$TARBALL"
tar -czf "$TARBALL" -C dist .

if [ "$DRY_RUN" -eq 1 ]; then
  echo "✅ (dry-run) 构建并打包完成，未上传。产物: $TARBALL"
  exit 0
fi

echo "==> [3/4] 测试 SSH 连接 $SERVER_USER@$SERVER_HOST ..."
ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" 'echo "   连接成功"'

echo "==> [4/4] 上传并发布到 $SERVER_HOST:$SERVER_PATH ..."
scp $SCP_OPTS "$TARBALL" "$SERVER_USER@$SERVER_HOST:/tmp/vue-color-avatar.tar.gz"

ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" "
  set -e
  mkdir -p \"$SERVER_PATH\"
  # 先解压到临时目录再整体替换，避免发布中途页面短暂 404
  rm -rf \"$SERVER_PATH.tmp\"
  mkdir -p \"$SERVER_PATH.tmp\"
  tar -xzf /tmp/vue-color-avatar.tar.gz -C \"$SERVER_PATH.tmp\"
  rm -rf \"$SERVER_PATH.bak\"
  if [ -d \"$SERVER_PATH\" ]; then
    mv \"$SERVER_PATH\" \"$SERVER_PATH.bak\"
  fi
  mv \"$SERVER_PATH.tmp\" \"$SERVER_PATH\"
  rm -rf \"$SERVER_PATH.bak\" /tmp/vue-color-avatar.tar.gz
  echo '   服务器端目录:'
  ls \"$SERVER_PATH\"
"

rm -f "$TARBALL"
echo ""
echo "🎉 发布完成！访问: http://$SERVER_HOST"

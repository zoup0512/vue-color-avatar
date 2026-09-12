#!/usr/bin/env bash
#
# build-bundle.sh — 组装局域网 Docker 部署包
#
# 在项目根目录执行:  ./deploy/docker/build-bundle.sh
# 产物: .deploy/vue-color-avatar-docker.tar.gz
#
# 包内容: docker-compose.yml + api/（Dockerfile+服务端源码）+ web/（Dockerfile+nginx.conf+dist）
# 注意: 不包含 api.env（内含 GRSAI_API_KEY），部署时单独放置，
#       例如从腾讯云服务器 /etc/vue-color-avatar-api.env 获取。
#
# 目标机解压后目录:  docker compose up -d --build
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -f dist/index.html ]; then
  echo "==> dist/ 不存在，先构建（含单测）..."
  npm run build
fi

STAGE=".deploy/docker-bundle"
rm -rf "$STAGE"
mkdir -p "$STAGE/api" "$STAGE/web"

cp deploy/docker/docker-compose.yml "$STAGE/"
cp deploy/docker/api.Dockerfile "$STAGE/api/Dockerfile"
cp server/package.json server/index.cjs server/grsai.cjs server/history.cjs "$STAGE/api/"
cp deploy/docker/web.Dockerfile "$STAGE/web/Dockerfile"
cp deploy/docker/nginx.docker.conf "$STAGE/web/nginx.conf"
cp -r dist "$STAGE/web/dist"

TARBALL=".deploy/vue-color-avatar-docker.tar.gz"
rm -f "$TARBALL"
tar -czf "$TARBALL" -C "$STAGE" .

echo "✅ 部署包已生成: $TARBALL"
echo "   目标机操作:"
echo "   1) scp $TARBALL root@<目标机>:/vol1/docker/vue-color-avatar/"
echo "   2) 准备 api.env（含 GRSAI_API_KEY=...）"
echo "   3) tar -xzf vue-color-avatar-docker.tar.gz && docker compose up -d --build"

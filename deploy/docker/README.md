# 局域网 Docker 部署

把 vue-color-avatar（前端静态 + Node API）以两个容器部署到局域网机器，不占用 80/443。

## 架构

- `api` 容器: node:22-alpine，运行 `server/index.cjs`，监听容器内 8787，
  **不对外发布端口**，仅 compose 内网可访问；生图历史挂载在 `./data/history`。
- `web` 容器: nginx:alpine，托管 `dist/`（路径 `/avatar/`），并把 `/avatar/api/*`
  反代到 `http://api:8787`；宿主机端口 **8081** → 容器 80。

## 文件

| 文件 | 用途 |
| --- | --- |
| `api.Dockerfile` | API 镜像（构建上下文 = server 源码目录） |
| `web.Dockerfile` | 前端镜像（构建上下文 = nginx.conf + dist/） |
| `nginx.docker.conf` | 容器内 nginx 配置（反代指向 compose 服务名 `api`） |
| `docker-compose.yml` | 编排：端口、卷、环境变量 |
| `build-bundle.sh` | 本地组装部署包 tar.gz |

## 部署步骤

1. 项目根目录执行 `./deploy/docker/build-bundle.sh`，得到
   `.deploy/vue-color-avatar-docker.tar.gz`。
2. 传到目标机并解压（示例目录 `/vol1/docker/vue-color-avatar`）。
3. 在解压目录放置 `api.env`（内容至少 `GRSAI_API_KEY=...`，
   可从腾讯云 `/etc/vue-color-avatar-api.env` 获取；`PORT`/`HISTORY_DIR`
   已由 compose 范写，无需填写）。
4. `docker compose up -d --build`。
5. 验证: `curl http://<目标机IP>:8081/avatar/` 与 `/avatar/api/history`。

## 更新版本

重新执行步骤 1、2 后，在目标机 `docker compose up -d --build` 即可，
历史数据在 `./data/history` 卷中不受影响。

## 端口选择说明

默认 8081。若目标机该端口被占用，改 `docker-compose.yml` 里 web 服务的
`ports` 映射（保持容器内 80 不变），api 无需改动。

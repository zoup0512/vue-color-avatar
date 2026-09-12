# vue-color-avatar 前端静态托管镜像（nginx）
# 构建上下文需包含: nginx.conf + dist/
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html/avatar

EXPOSE 80

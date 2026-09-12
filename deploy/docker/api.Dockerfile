# vue-color-avatar API 服务镜像
# 构建上下文需包含: package.json + index.cjs / grsai.cjs / history.cjs
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev --registry=https://registry.npmjs.org

COPY index.cjs grsai.cjs history.cjs ./

ENV PORT=8787 \
    HISTORY_DIR=/data/history

EXPOSE 8787
CMD ["node", "index.cjs"]

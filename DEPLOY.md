# 一键部署到腾讯云服务器（Nginx 静态托管，子路径 /avatar/）

目标：把 vue-color-avatar 发布到 `https://www.razor123.site/avatar/`。
你的服务器已有 HTTPS 站点（Nginx + sites-enabled），本项目**不改动现有站点**，
只往你域名的 server 块里追加几个 location 片段，挂在 `/avatar/` 子路径下。

原理：
- 本地构建（Vite 已配置 `base = '/avatar/'`，产物资源路径自带前缀）
- 打包 `dist/` 上传到服务器 `/var/www/vue-color-avatar/`
- Nginx 把 `/avatar/xxx` 映射到该目录（alias），HTTPS 由你现有站点配置负责

## 一、服务器一次性配置（只需做一次）

### 1. 创建站点目录

```bash
ssh root@124.220.35.87 "mkdir -p /var/www/vue-color-avatar"
```

> 路径要与 `deploy.sh` 的 `SERVER_PATH` 一致（已一致，无需改）。

### 2. 更新站点配置（✅ 已完成，仅记录参考）

本项目的 `/avatar/` 托管已在 `www.razor123.site` 的 443 server 块中生效
（服务器 `/etc/nginx/conf.d/www.razor123.site.conf`，原配置备份为同目录 `.bak`）。

nginx 侧的配置片段（3 个 location）见 `deploy/nginx.conf`，以后若在新服务器部署，
把片段粘贴进目标站点的 `server { }` 块，然后：

```bash
nginx -t && systemctl reload nginx
```

> 出问题可回滚：`cp /etc/nginx/conf.d/www.razor123.site.conf.bak /etc/nginx/conf.d/www.razor123.site.conf && systemctl reload nginx`

### 3. 配置 SSH 免密登录（**重要，脚本不支持密码**）

```bash
# 已有密钥可跳过
ssh-keygen -t ed25519

# 把公钥装到服务器（会要求输一次密码）
cat ~/.ssh/id_ed25519.pub | ssh root@124.220.35.87 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

验证：`ssh root@124.220.35.87` 不再要求输密码即成功。

> ⚠️ 不要把服务器密码写进 deploy.sh 或任何会被提交到 GitHub 的文件。
> 之前误填在 `SSH_KEY` 字段的密码已移除，该密码已出现在对话/文件中，
> **建议到腾讯云控制台修改服务器密码**。

### 4. 确认域名解析

`ping www.razor123.site` 应解析到 `124.220.35.87`（腾讯云控制台 → DNS 解析里添加
A 记录，若域名在其他平台解析则去对应平台加）。

## 二、日常发布（一键）

在项目根目录（Git Bash）执行：

```bash
./deploy.sh          # 单测 + 构建 + 发布
./deploy.sh --no-test  # 跳过单测，更快
```

发布后访问 `https://www.razor123.site/avatar/`。

## 三、常见问题

| 现象 | 原因 / 解决 |
| --- | --- |
| `Permission denied (publickey)` | SSH 免密没配好，重做「配置 SSH 免密登录」 |
| 发布成功但 /avatar/ 打不开 | location 没加进 server 块或没 reload；先 `nginx -t` 看报错 |
| 页面能开但样式/图片全 404 | 构建没带 `/avatar/` 前缀：确认 `vite.config.ts` 里 `base: '/avatar/'` 后再 `./deploy.sh` |
| 资源 404 但构建前缀正确 | 站点里可能有其他正则 location 抢先匹配 /avatar/ 路径，把冲突规则放最后或加 `^~` |
| 页面还是旧的 | 浏览器缓存，强制刷新（Ctrl+F5）；或静态资源缓存设置过久 |
| `Connection timed out` | 22 端口未放行 / IP 不对；确认安全组放行 SSH |
| 报 `'\r': command not found` | 脚本被转成 Windows 换行。仓库已加 `.gitattributes` 保证 LF；若手动改过执行 `sed -i 's/\r$//' deploy.sh` |

## 四、以后想改回根路径或换域名

改 `vite.config.ts` 的 `base` 和 `deploy/nginx.conf` 的 location 前缀为对应路径
（如 `base: '/'` + `location / { root ... }`），重新构建发布即可。

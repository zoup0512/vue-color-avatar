import vue from '@vitejs/plugin-vue'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // 部署在 https://www.razor123.site/avatar/ 子路径下，资源 URL 必须加前缀
  // （需与服务器 nginx 的 location /avatar/ 对应，否则 js/css 全部 404）
  base: '/avatar/',

  plugins: [
    vue(),
    ...(mode === 'prerelease'
      ? [
          visualizer({
            open: true,
            gzipSize: true,
            brotliSize: true,
            template: 'sunburst',
          }),
        ]
      : []),
  ],

  server: {
    proxy: {
      '/avatar/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  define: {
    __VUE_I18N_FULL_INSTALL__: false,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
}))

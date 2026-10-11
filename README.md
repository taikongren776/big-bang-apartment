# 公寓里的小宇宙 · Apartment 4A

《生活大爆炸》中 Leonard 与 Sheldon 公寓的低多边形微缩模型。根据拍摄现场的客厅、厨房及窗边工作区照片重建；当前版本已修正电视朝向、L 形厨房及纵向岛台，来源和对应修正见 [REFERENCES.md](REFERENCES.md)。保留低多边形风格，尺寸由照片估算，不声称是测绘级复刻。

## 打开

双击根目录的 **index.html**，在最新版 Chrome、Edge 或 Firefox 中打开即可。无需安装软件、联网或启动服务器。浏览器须支持 WebGL 2 并启用硬件加速。

- 鼠标拖动：旋转模型；滚轮：缩放。
- 触屏：单指旋转，双指缩放。
- 下方按钮：切换晴天、雨天和夜景；右下按钮：重置视角。
- 键盘 Tab 可聚焦按钮；Enter / 空格激活。聚焦场景后，方向键旋转，`+` / `-` 缩放，Home 重置。
- 系统启用“减少动态效果”时，环境立即切换，雨线保持静态。

## 开发

需要 Node.js 20 或更新版本。首次安装构建依赖需要网络，交付的 HTML 不需要网络。

```sh
npm ci
npm run build
npm run preview
```

本地预览地址：http://127.0.0.1:4173。关闭预览服务不影响双击 HTML 使用。

- `src/replica.js`：根据实景照片重建的家具、布局、程序化纹理与静态几何合并。
- `src/main.js`：场景、OrbitControls、环境过渡、雨线与渲染生命周期。
- `src/template.html` / `src/style.css`：界面与响应式布局。
- `scripts/build.mjs`：将全部代码、样式和依赖内联到根目录 `index.html`。

Three.js 0.180.0 和 esbuild 0.25.10 的版本由 package-lock.json 固定。所有纹理通过 Canvas 本地生成，不使用外部图片、模型、字体或接口。页面不会收集数据，也不会发起网络请求。

`window.apartment4A.inspect()` 提供只读诊断，便于检查视角、环境、雨线范围、渲染调用数和资源数量。时间标签用于表现环境氛围，并非实时时钟。

Three.js 采用 MIT 许可证，其许可声明保留在生成文件中。

// 全屏背景的需要导入这些js
const { root: siteRoot = "/" } = hexo.config;
hexo.extend.injector.register("body_begin", `<div id="web_bg"></div>`);
hexo.extend.injector.register(
    "body_end",
    `<script src="${siteRoot}js/backgroundize.js"></script>
  <link defer rel="stylesheet" href="${siteRoot}css/backgroundize.css" />
  `
);

hexo.extend.injector.register('body_end', `
  <script src="/js/timevalid.js"></script>
`)

hexo.extend.injector.register('body_end', `
  <script src="/js/reward.js"></script>
`)

hexo.extend.injector.register('head_end', `<script src="/js/statistics.js"></script>`)

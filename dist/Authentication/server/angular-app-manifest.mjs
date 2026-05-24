
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 1,
    "redirectTo": "/signup",
    "route": "/"
  },
  {
    "renderMode": 1,
    "route": "/signup"
  },
  {
    "renderMode": 1,
    "route": "/login"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 24643, hash: '10abeb14fc7807ddb4e53a1c2c427133820c585543080bd68ed45063061730d1', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 17159, hash: '65ca594e4e46479a423552be872c32beb6222c9bb52b6a6341005445d0d0a19b', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-VJKSJKRD.css': {size: 13417, hash: '8DDC9dmFSnQ', text: () => import('./assets-chunks/styles-VJKSJKRD_css.mjs').then(m => m.default)}
  },
};

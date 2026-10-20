import { onRequestGet as __api_products_js_onRequestGet } from "C:\\Users\\Admin\\Desktop\\ulov100pudov\\functions\\api\\products.js"

export const routes = [
    {
      routePath: "/api/products",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_products_js_onRequestGet],
    },
  ]
// Görünen içerikleri templates/*.html içinde düzenleyin.
import shell from "../templates/storefront.html?raw";
import productList from "../templates/product-list.html?raw";
import collectionLayout from "../templates/collection.html?raw";
import materialsContent from "../templates/materials.html?raw";
import worldContent from "../templates/our-world.html?raw";
import regionPanel from "../templates/region-panel.html?raw";
import accountContent from "../templates/account.html?raw";
import utilityLayout from "../templates/utility.html?raw";
import favoritesContent from "../templates/favorites.html?raw";
import cartContent from "../templates/cart.html?raw";
import loginContent from "../templates/login.html?raw";
import { createPageRenderer } from "./page-renderer.js";
export const storefrontPages = createPageRenderer({
  shell: shell.replace("<!-- REGION_PANEL -->", regionPanel),
  accountContent,
  productList,
  collectionLayout,
  materialsContent,
  worldContent,
  utilityLayout,
  utilityContent: { favorites: favoritesContent, cart: cartContent, login: loginContent },
});
export default storefrontPages.home;

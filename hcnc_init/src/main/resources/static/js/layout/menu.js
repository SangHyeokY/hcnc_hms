import { menuData } from "../data/menuData.js";

const CONTEXT_PATH = (window.__CONTEXT_PATH__ ).replace(/\/$/, "");
const appendBasePath = (path = "") => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!CONTEXT_PATH) return normalized;
  return normalized.startsWith(CONTEXT_PATH)
    ? normalized
    : `${CONTEXT_PATH}${normalized}`;
};
const normalizePath = (path = "") => {
  if (CONTEXT_PATH && path.startsWith(CONTEXT_PATH)) {
    const trimmed = path.slice(CONTEXT_PATH.length);
    return trimmed || "/";
  }
  return path || "/";
};

const Menu = {
  init() {
    const navWrap = document.querySelector(".lnb-menu");
    if (!navWrap) {
      console.error("lnb-menu 없음");
      return;
    }
    navWrap.innerHTML = this.createMenu(menuData);
    this.toggleMenu();
    this.activeMenu();
  },

  createMenu(menuDataList, depth = 1) {
    let html = "";
    menuDataList.forEach((menu) => {
      if (menu.title === "시스템" && LOGIN_AUTH.value !== "01") return;

      if (menu.visible === false) return;
      const hasChildren =
        menu.children && menu.children.some((chi) => chi.visible !== false);
      const itemClass = hasChildren ? "has-children" : "no-children";
      const href = menu.path
        ? appendBasePath(menu.path)
        : "javascript:void(0);";
      html += `
            <li class="${itemClass}" data-name="${menu.name}">
                <a href="${href}">
                    <span class="menu-title">${menu.title}</span>
                </a>
            `;
      if (hasChildren) {
        html += `<ul class="dep${depth + 1}">`;
        html += this.createMenu(menu.children, depth + 1);
        html += `</ul>`;
      }
      html += `</li>`;
    });
    if (depth === 1) {
      return `<ul class="dep${depth}">${html}</ul>`;
    }
    return html;
  },

  toggleMenu() {
    const dep1Paths = document.querySelectorAll(".dep1 > li > a");
    dep1Paths.forEach((path) => {
      path.addEventListener("click", (e) => {
        const parentLi = e.currentTarget.parentElement;
        const dep2 = parentLi.querySelector(".dep2");
        if (dep2) {
          e.preventDefault();
          document.querySelectorAll(".dep1 > li").forEach((li) => {
            if (li !== parentLi) {
              li.classList.remove("on");
              const otherDep2 = li.querySelector(".dep2");
              if (otherDep2) otherDep2.style.display = "none";
            }
          });
          parentLi.classList.toggle("on");
          dep2.style.display = parentLi.classList.contains("on")
            ? "block"
            : "none";
        }
      });
    });

    const dep2Paths = document.querySelectorAll(".dep2 > li > a");
    dep2Paths.forEach((path) => {
      path.addEventListener("click", (e) => {
        const parentLi = e.currentTarget.parentElement;
        const dep3 = parentLi.querySelector(".dep3");
        if (dep3) {
          e.preventDefault();
          document.querySelectorAll(".dep2 > li").forEach((li) => {
            if (li !== parentLi) {
              li.classList.remove("on");
              const otherDep3 = li.querySelector(".dep3");
              if (otherDep3) otherDep3.style.display = "none";
            }
          });
          parentLi.classList.toggle("on");
          dep3.style.display = parentLi.classList.contains("on")
            ? "block"
            : "none";
        }
      });
    });

    const dep3Paths = document.querySelectorAll(".dep3 > li > a");
    dep3Paths.forEach((path) => {
      path.addEventListener("click", (e) => {
        const parentLi = e.currentTarget.parentElement;
        const dep4 = parentLi.querySelector(".dep4");
        if (dep4) {
          e.preventDefault();
          parentLi.classList.toggle("on");
          dep4.style.display = parentLi.classList.contains("on")
            ? "block"
            : "none";
          e.currentTarget.classList.toggle("on");
        }
      });
    });
  },

  activeMenu() {
    const currentPath = normalizePath(window.location.pathname);
    const allMenuLinks = document.querySelectorAll(".lnb-menu a[href]");

    let activeLink = this.findActiveLink(allMenuLinks, currentPath);

    // activeLink를 visible false일때 못불러오는듯 부모 페이지로 찾기
    if (!activeLink) {
      const currentPageCode = currentPath.split("/").pop();
      const parentPageCode = this.findParentPage(currentPageCode);

      if (parentPageCode) {
        activeLink = this.findActiveLink(allMenuLinks, "/" + parentPageCode);
      }
    }

    if (!activeLink) {
      return;
    }

    this.activateMenuItem(activeLink);
    this.activateParentFromData(currentPath, allMenuLinks);
    this.openParentMenus(activeLink);
  },

  findActiveLink(links, currentPath) {
    let activeLink = null;
    let maxMatchLength = 0;

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href === "javascript:void(0);") return;

      const normalizedHref = normalizePath(href);
      if (!normalizedHref || !currentPath.includes(normalizedHref)) return;

      if (normalizedHref.length > maxMatchLength) {
        maxMatchLength = normalizedHref.length;
        activeLink = link;
      }
    });

    return activeLink;
  },

  activateMenuItem(link) {
    const item = link.closest("li");
    item.classList.add("active");
    link.classList.add("active");

    if (!item.querySelector("ul")) {
      item.classList.add("on");
      link.classList.add("on");
    }
  },

  activateParentFromData(currentPath, allMenuLinks) {
    const currentPageCode = currentPath.split("/").pop();
    if (!currentPageCode) return;

    const parentPageCode = this.findParentPage(currentPageCode);
    if (!parentPageCode) return;

    allMenuLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      if (href.includes(parentPageCode)) {
        const parentItem = link.closest("li");
        if (parentItem) {
          parentItem.classList.add("on");
          link.classList.add("on");
        }
      }
    });
  },

  findParentPage(pageCode) {
    if (!pageCode || pageCode.length <= 2) return null;

    const secondChar = pageCode.charAt(1).toUpperCase();

    if (secondChar === "F") {
      const currentFilePage = pageCode.charAt(0) + pageCode.substring(2);
      return currentFilePage;
    }

    return null;
  },

  openParentMenus(activeItem) {
    let parent = activeItem.closest("li").parentElement;

    while (parent && !parent.classList.contains("lnb-menu")) {
      if (parent.tagName === "UL" && !parent.classList.contains("dep1")) {
        parent.style.display = "block";

        const parentLi = parent.closest("li");
        if (parentLi) {
          parentLi.classList.add("on");
          const parentLink = parentLi.querySelector(":scope > a");
          if (parentLink) {
            parentLink.classList.add("on");
          }
        }
      }
      parent = parent.parentElement;
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Menu.init();
});

window.Menu = Menu;

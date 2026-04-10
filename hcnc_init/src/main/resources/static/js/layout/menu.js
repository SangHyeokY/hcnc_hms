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
    // this.restoreExpandedMenus();
    this.activeMenu();
    this.saveExpandedMenus();
  },

  getExpandedMenuStorageKey() {
    const basePath = CONTEXT_PATH || "/";
    return `hcnc:lnb:expanded:${basePath}`;
  },

  getMenuItemKey(menuLi) {
    if (!menuLi) return "";
    return menuLi.dataset.menuKey || "";
  },

  saveExpandedMenus() {
    const expandedKeys = Array.from(
      document.querySelectorAll(".lnb-menu li.has-children.on")
    )
      .map((item) => this.getMenuItemKey(item))
      .filter(Boolean);

    try {
      sessionStorage.setItem(
        this.getExpandedMenuStorageKey(),
        JSON.stringify(expandedKeys)
      );
    } catch (err) {
      console.warn("메뉴 열린 상태 저장 실패", err);
    }
  },

  restoreExpandedMenus() {
    let expandedKeys = [];
    try {
      const saved = sessionStorage.getItem(this.getExpandedMenuStorageKey());
      expandedKeys = saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.warn("메뉴 열린 상태 복원 실패", err);
      expandedKeys = [];
    }

    if (!Array.isArray(expandedKeys) || expandedKeys.length === 0) return;
    const expandedKeySet = new Set(expandedKeys.filter(Boolean));

    document.querySelectorAll(".lnb-menu li.has-children").forEach((item) => {
      const itemKey = this.getMenuItemKey(item);
      if (!itemKey || !expandedKeySet.has(itemKey)) return;

      item.classList.add("on");
      const itemLink = item.querySelector(":scope > a");
      if (itemLink) itemLink.classList.add("on");

      const submenu = item.querySelector(":scope > ul");
      if (submenu) this.showSubMenuInstant(submenu);
    });
  },

  openSubMenu(submenu) {
    if (!submenu) return;

    submenu.style.display = "block";
    submenu.style.overflow = "hidden";
    submenu.style.maxHeight = "0px";
    submenu.style.opacity = "0";
    submenu.style.transform = "translateY(-4px)";

    // reflow를 강제해서 transition 시작점을 확정
    void submenu.offsetHeight;

    submenu.style.maxHeight = `${submenu.scrollHeight}px`;
    submenu.style.opacity = "1";
    submenu.style.transform = "translateY(0)";

    const onEnd = (e) => {
      if (e.propertyName !== "max-height") return;
      submenu.removeEventListener("transitionend", onEnd);
      // 열린 상태에서는 내부 콘텐츠 높이 변화가 자연스럽게 반영되도록 제한 해제
      submenu.style.maxHeight = "none";
    };
    submenu.addEventListener("transitionend", onEnd);
  },

  closeSubMenu(submenu) {
    if (!submenu) return;
    if (window.getComputedStyle(submenu).display === "none") return;

    // 열린 상태(maxHeight:none)인 경우 현재 높이를 px로 고정 후 닫기
    submenu.style.maxHeight = `${submenu.scrollHeight}px`;
    submenu.style.opacity = "1";
    submenu.style.transform = "translateY(0)";
    submenu.style.overflow = "hidden";

    // reflow를 강제해서 transition 시작점을 확정
    void submenu.offsetHeight;

    submenu.style.maxHeight = "0px";
    submenu.style.opacity = "0";
    submenu.style.transform = "translateY(-4px)";

    const onEnd = (e) => {
      if (e.propertyName !== "max-height") return;
      submenu.removeEventListener("transitionend", onEnd);
      submenu.style.display = "none";
    };
    submenu.addEventListener("transitionend", onEnd);
  },

  showSubMenuInstant(submenu) {
    if (!submenu) return;
    submenu.style.display = "block";
    submenu.style.maxHeight = "none";
    submenu.style.opacity = "1";
    submenu.style.transform = "translateY(0)";
    submenu.style.overflow = "visible";
  },

  createMenu(menuDataList, depth = 1, parentKey = "") {
    let html = "";
    menuDataList.forEach((menu, idx) => {
      if (menu.adminOnly && LOGIN_AUTH.value !== "01") return;

      if (menu.visible === false) return;
      const hasChildren =
        menu.children && menu.children.some((chi) => chi.visible !== false);
      const itemClass = hasChildren ? "has-children" : "no-children";
      const menuKey = parentKey ? `${parentKey}.${idx}` : `${idx}`;
      const href = menu.path
        ? appendBasePath(menu.path)
        : "javascript:void(0);";
      const icon = menu.icon || "dashboard";
      html += `
            <li class="${itemClass}" data-menu-key="${menuKey}">
                <a href="${href}" class="menu-link" data-icon="${icon}">
                    <span class="menu-icon" aria-hidden="true"></span>
                    <span class="menu-title">${menu.title}</span>
                </a>
            `;
      if (hasChildren) {
        html += `<ul class="dep${depth + 1}">`;
        html += this.createMenu(menu.children, depth + 1, menuKey);
        html += `</ul>`;
      }
      html += `</li>`;
    });
    if (depth === 1) {
      return `<ul class="dep${depth}">${html}</ul>`;
    }
    return html;
  },

  toggleMenuItem(parentLi, submenu, shouldOpen, toggleLinkOn = false) {
    const parentUl = parentLi.parentElement;

    // 같은 depth의 다른 열린 메뉴 닫기
    if (shouldOpen && parentUl) {
      const siblings = parentUl.querySelectorAll(":scope > li.on");

      siblings.forEach((sibling) => {
        if (sibling === parentLi) return;

        sibling.classList.remove("on");

        const siblingSub = sibling.querySelector(":scope > ul");
        if (siblingSub) {
          this.closeSubMenu(siblingSub);
        }

        const siblingLink = sibling.querySelector(":scope > a");
        if (siblingLink) {
          siblingLink.classList.remove("on");
        }
      });
    }

    // 기존 동작
    parentLi.classList.toggle("on", shouldOpen);

    if (shouldOpen) {
      this.openSubMenu(submenu);
    } else {
      this.closeSubMenu(submenu);
    }

    if (toggleLinkOn) {
      const link = parentLi.querySelector(":scope > a");
      if (link) link.classList.toggle("on", shouldOpen);
    }
  },

  bindSubmenuToggle(linkSelector, submenuSelector, toggleLinkOn = false) {
    const links = document.querySelectorAll(linkSelector);
    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        const parentLi = e.currentTarget.parentElement;
        if (!parentLi) return;
        const submenu = parentLi.querySelector(submenuSelector);
        if (!submenu) return;

        e.preventDefault();
        const shouldOpen = !parentLi.classList.contains("on");
        this.toggleMenuItem(parentLi, submenu, shouldOpen, toggleLinkOn);
        this.saveExpandedMenus();
      });
    });
  },

  toggleMenu() {
    this.bindSubmenuToggle(".dep1 > li > a", ":scope > .dep2");
    this.bindSubmenuToggle(".dep2 > li > a", ":scope > .dep3");
    this.bindSubmenuToggle(".dep3 > li > a", ":scope > .dep4", true);
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
    this.saveExpandedMenus();
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
    if (!pageCode) return null;
    // 특정 페이지는 같은 묶음으로 처리
    const pageMap = {
      "hr011": "hr010",
      "hr012": "hr010",
      "hr011v2": "hr010" // 임시로 추가... 추후 삭제
    };
    if (pageMap[pageCode]) {
      return pageMap[pageCode];
    }

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
        this.showSubMenuInstant(parent);

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

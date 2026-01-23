import { menuData } from "../data/menuData.js";

const CONTEXT_PATH = (window.__CONTEXT_PATH__ ).replace(/\/$/, "");
const normalizePath = (path = "") => {
  if (CONTEXT_PATH && path.startsWith(CONTEXT_PATH)) {
    const trimmed = path.slice(CONTEXT_PATH.length);
    return trimmed || "/";
  }
  return path || "/";
};
const appendBasePath = (path = "") => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!CONTEXT_PATH) return normalized;
  return normalized.startsWith(CONTEXT_PATH)
    ? normalized
    : `${CONTEXT_PATH}${normalized}`;
};
const currentPath = normalizePath(window.location.pathname);

const PageCommon = {
  currentPage: {
    depth1: null,
    depth2: null
  },

  //  메뉴 init
  init() {
    this.chkPagePath(currentPath);
    this.updatePageCommon();
    this.updatePageTitle();
  },

  // 현재페이지 경로체크
  chkPagePath(path) {
    menuData.forEach((depth1) => {
      if (depth1.path === path) {
        this.currentPage = { depth1, depth2: null,  path };
        return;
      }

      if (depth1.children) {
        for (let depth2 of depth1.children) {
          if (depth2.path === path) {
            this.currentPage = { depth1, depth2, path };
            return;
          }
        }
      }
    });
  },

  // pageinfo 셋팅 (타이틀, 네비게이션, 서브타이틀)
  updatePageCommon() {
    const pageTitle = document.querySelector(".page-title");
    if (pageTitle) {
      const title = this.currentPage.depth1?.title;
      pageTitle.textContent = title;
    }

    // 경로 네비게이션 업데이트
    const navBox = document.querySelector(".page-nav .navi-box");
    if (navBox) {
      navBox.innerHTML = this.createNav();
    }
  },

  updatePageTitle() {
    const pageSubTitle = document.querySelector(".page-sub-title");
    if (pageSubTitle) {
      // depth3 > depth2 > depth1 순으로 메인 타이틀 표시
      const title =
        this.currentPage.depth2?.title ||
        this.currentPage.depth1?.title;
      pageSubTitle.textContent = title;
    }
  },

  //우상단 네비게이션 HTML 생성 및 추가
  createNav() {
    let html = ``;

    // 1depth
    if (this.currentPage.depth1) {
      html += `<li><a href="${appendBasePath(
        this.currentPage.depth1.path || ""
      )}">
                            ${this.currentPage.depth1.title}
                     </a></li>`;
    }
    // 2depth
    if (this.currentPage.depth2) {
      html += `<li><a href="${appendBasePath(
        this.currentPage.depth2.path || ""
      )}">
                            ${this.currentPage.depth2.title}
                     </a></li>`;
    }

    return html;
  },
};

document.addEventListener("DOMContentLoaded", () => {
  PageCommon.init();
});

//전역설정
window.PageCommon = PageCommon;

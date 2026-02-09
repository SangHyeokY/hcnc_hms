import { menuData } from "../data/menuData.js";

// 정적 뷰(HTML)는 컨텍스트 경로 없이 루트 기준으로 가져온다.
const withBasePath = (path = "") => {
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("/") ? path : `/${path}`;
};

const Layout = {
  // 초기화
  init() {
    this.initSidebarToggle();

    const contentsWrap = document.querySelector(".contents-wrap");
    const article = document.querySelector("article");

    // 초기 페이지의 경우 PageCommon 정보로 이동
    if (window.PageCommon && window.PageCommon.currentPage) {
      const currentPageInfo = window.PageCommon.currentPage;

      // depth2 > depth1 순으로 현재 페이지 메뉴 아이템 찾기
      const menuItem =
        currentPageInfo.depth2 ||
        currentPageInfo.depth1;
      if (menuItem) {
        this.loadMenu(menuItem, contentsWrap, article);
      } else {
        console.warn("현재 페이지 정보를 찾을 수 없습니다");
        const fallbackItem = menuData[0].children[0];
        this.loadMenu(fallbackItem, contentsWrap, article);
      }
    } else {
      console.warn("PageCommon 정보가 없습니다.");
      const fallbackItem = menuData[0].children[0];
      this.loadMenu(fallbackItem, contentsWrap, article);
    }
  },

  loadMenu(menuItem, contentsWrap, article) {
    if (!menuItem) {
      return;
    }

    const pageSubTitle = document.querySelector(".page-sub-title");
    if (pageSubTitle && menuItem.title) {
      pageSubTitle.textContent = menuItem.title;
    }
  },

  initSidebarToggle() {
    const containerWrap = document.querySelector(".container-wrap");
    const toggleBtn = document.querySelector(".lnb-toggle-handle");
    const toggleIcon = document.querySelector(".lnb-toggle-icon");
    if (!containerWrap || !toggleBtn || !toggleIcon) {
      return;
    }

    const key = "sidebarShow";
    const saved = localStorage.getItem(key);
    const isExpanded = saved !== "N";
    this.applySidebarState(containerWrap, toggleIcon, isExpanded);

    toggleBtn.addEventListener("click", () => {
      const nextExpanded = containerWrap.classList.contains("is-collapsed");
      this.applySidebarState(containerWrap, toggleIcon, nextExpanded);
      localStorage.setItem(key, nextExpanded ? "Y" : "N");
    });
  },

  applySidebarState(containerWrap, toggleIcon, isExpanded) {
    containerWrap.classList.toggle("is-collapsed", !isExpanded);
    toggleIcon.textContent = isExpanded ? "◀" : "▶";
    this.refreshResponsiveLayout();
  },

  refreshResponsiveLayout() {
    // 토글 직후 프레임에서 레이아웃 기준으로 테이블 폭을 다시 계산한다.
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      this.redrawTabulators();
    });
  },

  redrawTabulators() {
    Object.keys(window).forEach((key) => {
      const value = window[key];
      if (!value || typeof value !== "object") {
        return;
      }
      if (typeof value.redraw !== "function") {
        return;
      }
      if (typeof value.getData !== "function") {
        return;
      }
      try {
        value.redraw(true);
      } catch (e) {
        // 페이지별 초기화 시점 차이로 redraw가 실패할 수 있어 무시한다.
      }
    });
  },


  async loadPageData(pageName, pageType) {
    function getItem(pageName) {
      let pageType = pageName.replace(/\d/g, "");
      let url = `/${pageType}GetItem`;
      let param = { code: pageName };
      return $.ajax({
        url: url,
        type: "POST",
        data: param,
        success: (response) => {
          return response;
        },
        error: (xhr, status, error) => {
          alert("error: " + error + "status: " + status + "xhr: " + xhr);
        },
      });
    }
    try {
      const nameRegex = pageName.replace(/\d/gi, "");
      const module = await import(
        `../data/pageData/${nameRegex}/${pageName}.js`
      );
      const pageConfig = module[pageName];
      const result = await getItem(pageName);
      const optionValue = pageType == "F" ? result.res : result.res.CHK_OPT;
      console.log(result);
      RenderByType.render(
        pageType,
        pageConfig.data,
        pageConfig.pName,
        optionValue
      );
    } catch (err) {
      console.error(`${pageName} 데이터 로드 실패:`, err);
    }
  },
};

// 로드할때 init하기
document.addEventListener("DOMContentLoaded", () => {
  Layout.init();
});

// 전체 뿌리기
window.Layout = Layout;

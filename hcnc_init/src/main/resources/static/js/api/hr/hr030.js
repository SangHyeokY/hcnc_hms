(function () {
    var dashboardData = window.HR030_DASHBOARD_DATA;

    if (!dashboardData) {
        return;
    }

    // 대시보드 전역 메타 정보와 화면 상태값
    var employeeStatusMap = {
        "투입중": true,
        "대기중": true,
        "제안중": true,
        "검토중": true,
        "종료예정": true
    };

    var statusToneMap = {
        "검토중": "warning",
        "확정": "success",
        "보류": "danger",
        "투입중": "primary",
        "대기중": "slate",
        "제안중": "info",
        "종료예정": "danger",
        "높음": "danger",
        "보통": "slate",
        "금융권 운영": "primary",
        "커머스 고도화": "info",
        "대형 SI": "warning",
        "공공": "slate",
        "차세대": "warning",
        "운영 보강": "info"
    };

    var availabilityStatusMeta = [
        { label: "투입중", color: "#4f6ff7" },
        { label: "대기중", color: "#f3b44f" },
        { label: "종료예정", color: "#a173ff" }
    ];

    var careerBandMeta = [
        { key: "junior", label: "초급", description: "4년 이하", color: "#7c9af8" },
        { key: "mid", label: "중급", description: "5~7년", color: "#4f6ff7" },
        { key: "senior", label: "고급", description: "8~10년", color: "#1fb6a6" },
        { key: "lead", label: "특급", description: "11년 이상", color: "#f3b44f" }
    ];

    var skillColorPalette = ["#4f6ff7", "#1fb6a6", "#f3b44f", "#a173ff", "#eb8079", "#4cb0ff", "#33c18d"];
    var dashboardFontFamily = '"Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif';
    var regionMapSvgPath = "/images/common/korea-map.svg";
    var regionProvinceMap = {
        seoul: ["seoul"],
        gyeonggi: ["gyeonggi"],
        incheon: ["incheon"],
        gangwon: ["gangwon"],
        chungcheong: ["daejeon", "sejong", "chungbuk", "chungnam"],
        jeolla: ["gwangju", "jeonbuk", "jeonnam"],
        gyeongsang: ["daegu", "gyeongbuk", "gyeongnam"],
        busan: ["busan", "ulsan"]
    };
    var regionBadgeOffsetMap = {
        seoul: { dx: 16, dy: -18 },
        gyeonggi: { dx: -12, dy: 8 },
        incheon: { dx: -26, dy: -4 },
        gangwon: { dx: 16, dy: -4 },
        chungcheong: { dx: -4, dy: 10 },
        jeolla: { dx: -10, dy: 10 },
        gyeongsang: { dx: 10, dy: 10 },
        busan: { dx: 24, dy: 22 }
    };
    var regionToneMap = {
        seoul: { fill: "#dfe6ff", hover: "#c8d5ff", active: "#5e79f7", badge: "rgba(244, 247, 255, 0.98)", badgeStroke: "#cfd9ff" },
        gyeonggi: { fill: "#d8f1ff", hover: "#bfe7ff", active: "#2ea4e6", badge: "rgba(242, 251, 255, 0.98)", badgeStroke: "#c4eaff" },
        incheon: { fill: "#e7e2ff", hover: "#d8cfff", active: "#8168f3", badge: "rgba(247, 244, 255, 0.98)", badgeStroke: "#ddd2ff" },
        gangwon: { fill: "#dff6ef", hover: "#c9eedf", active: "#22a882", badge: "rgba(244, 255, 250, 0.98)", badgeStroke: "#cfeedd" },
        chungcheong: { fill: "#fff0dc", hover: "#ffe1b9", active: "#f0a232", badge: "rgba(255, 249, 241, 0.98)", badgeStroke: "#f4ddba" },
        jeolla: { fill: "#ffe5eb", hover: "#ffd2dd", active: "#e86f91", badge: "rgba(255, 245, 247, 0.98)", badgeStroke: "#f3d5de" },
        gyeongsang: { fill: "#ede5ff", hover: "#ddd0ff", active: "#8a68f0", badge: "rgba(249, 246, 255, 0.98)", badgeStroke: "#ddd3f8" },
        busan: { fill: "#dff4ff", hover: "#c9ebff", active: "#389be0", badge: "rgba(244, 251, 255, 0.98)", badgeStroke: "#cfe7f6" }
    };

    var kpiIconMap = {
        total: "users",
        employee: "user",
        freelancer: "briefcase",
        available: "zap",
        available_s: "user-check",
        available_f: "user-pen"
    };

    var state = {
        query: "",
        statusFilter: "all",
        selectedRegionId: dashboardData.map.defaultRegionId || "all",
        skillViewMode: "all",
        availabilityCardFilter: "all",
        skillCatalogLoaded: false,
        skillCatalogRequested: false,
        skillCatalogMap: {},
        skillCatalogLabels: [],
        mapSvgMarkup: "",
        mapSvgRequested: false,
        mapSvgFailed: false,
        mapSvgElement: null,
        mapSvgContainer: null,
        mapRegionGroupMap: {},
        mapRegionBoundsMap: {},
        mapBadgeGroupMap: {},
        mapSelectionRipple: null,
        mapRippleAnimationFrame: null,
        mapRippleCleanup: null,
        regionRatioValue: 0,
        regionRatioAnimationFrame: null,
        skillChartEnterTimer: null,
        skillTreemapMorphTimer: null,
        employeeTable: null,
        charts: {
            skills: null,
            availability: null,
            category: null
        }
    };

    const today = new Date();
    document.getElementById("todayDate").textContent = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 기준`;

    // 공통 포맷터와 작은 렌더링 헬퍼
    // 아이디로 DOM 요소를 빠르게 조회한다.
    function byId(id) {
        return document.getElementById(id);
    }

    // 사용자 문자열을 안전한 HTML 문자열로 변환한다.
    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // 숫자를 한글 로케일 기준으로 포맷한다.
    function formatNumber(value) {
        return new Intl.NumberFormat("ko-KR").format(value || 0);
    }

    // 퍼센트 값을 소수 첫째 자리까지 맞춘다.
    function formatPercent(value) {
        return (Math.round((value || 0) * 10) / 10).toFixed(1);
    }

    // 비교용 문자열을 공백 제거와 소문자 기준으로 정규화한다.
    function normalizeText(value) {
        return String(value == null ? "" : value).replace(/\s+/g, "").toLowerCase();
    }

    // 오늘 날짜를 상단 기준 문구용 형식으로 만든다.
    function getTodayLabel() {
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long"
        }).format(new Date());
    }

    // 프로필 아바타에 들어갈 두 글자 텍스트를 만든다.
    function getAvatarText(name) {
        var cleanName = String(name || "").trim();

        if (cleanName.length < 2) {
            return cleanName || "관리";
        }

        return cleanName.slice(-2);
    }

    // 상태 라벨에 맞는 톤 클래스를 찾는다.
    function getToneClass(label) {
        return statusToneMap[label] || "slate";
    }

    // 상태 라벨을 배지 마크업으로 렌더링한다.
    function renderStatusBadge(label) {
        return '<span class="hr030-status-badge is-' + getToneClass(label) + '">' + escapeHtml(label) + "</span>";
    }

    // SVG 네임스페이스 기준으로 새 노드를 만든다.
    function createSvgNode(tagName) {
        return document.createElementNS("http://www.w3.org/2000/svg", tagName);
    }

    // SVG 속성값에 넣기 좋은 숫자 문자열로 정리한다.
    function formatSvgNumber(value) {
        return String(Math.round((Number(value) || 0) * 10) / 10);
    }

    // 여러 SVG 도형의 범위를 하나의 bounding box로 합친다.
    function mergeBounds(currentBounds, nextBounds) {
        var minX;
        var minY;
        var maxX;
        var maxY;

        if (!nextBounds || !isFinite(nextBounds.x) || !isFinite(nextBounds.y) || !isFinite(nextBounds.width) || !isFinite(nextBounds.height)) {
            return currentBounds;
        }

        if (!currentBounds) {
            return {
                x: nextBounds.x,
                y: nextBounds.y,
                width: nextBounds.width,
                height: nextBounds.height
            };
        }

        minX = Math.min(currentBounds.x, nextBounds.x);
        minY = Math.min(currentBounds.y, nextBounds.y);
        maxX = Math.max(currentBounds.x + currentBounds.width, nextBounds.x + nextBounds.width);
        maxY = Math.max(currentBounds.y + currentBounds.height, nextBounds.y + nextBounds.height);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    // SVG 노드의 안전한 bounding box를 구한다.
    function getNodeBounds(node) {
        if (!node || typeof node.getBBox !== "function") {
            return null;
        }

        try {
            return node.getBBox();
        } catch (error) {
            return null;
        }
    }

    // SVG 지도에서 클릭 좌표와 권역 범위를 계산하는 유틸
    function getSvgPointFromEvent(svgEl, event) {
        var point;
        var matrix;

        if (!svgEl || !event || typeof svgEl.createSVGPoint !== "function" || typeof svgEl.getScreenCTM !== "function") {
            return null;
        }

        matrix = svgEl.getScreenCTM();

        if (!matrix || typeof matrix.inverse !== "function") {
            return null;
        }

        point = svgEl.createSVGPoint();
        point.x = Number(event.clientX || 0);
        point.y = Number(event.clientY || 0);

        try {
            return point.matrixTransform(matrix.inverse());
        } catch (error) {
            return null;
        }
    }

    function getBoundsMaxRadius(bounds, centerX, centerY) {
        var corners;

        if (!bounds) {
            return 0;
        }

        corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
        ];

        return corners.reduce(function (maxDistance, corner) {
            var dx = corner.x - centerX;
            var dy = corner.y - centerY;
            var distance = Math.sqrt((dx * dx) + (dy * dy));

            return Math.max(maxDistance, distance);
        }, 0);
    }

    // 클릭 지점을 권역 내부로 보정해 리플 시작점이 튀지 않게 맞춘다
    function clampPointToBounds(bounds, point, padding) {
        var inset = Number(padding || 0);
        var minX;
        var maxX;
        var minY;
        var maxY;

        if (!bounds || !point) {
            return point;
        }

        minX = bounds.x + inset;
        maxX = bounds.x + bounds.width - inset;
        minY = bounds.y + inset;
        maxY = bounds.y + bounds.height - inset;

        if (minX > maxX) {
            minX = bounds.x;
            maxX = bounds.x + bounds.width;
        }

        if (minY > maxY) {
            minY = bounds.y;
            maxY = bounds.y + bounds.height;
        }

        return {
            x: Math.min(Math.max(point.x, minX), maxX),
            y: Math.min(Math.max(point.y, minY), maxY)
        };
    }

    // 도형 크기에 맞춰 리플 시작점 보정 패딩을 너무 크지 않게 계산한다.
    function getRippleClampPadding(bounds) {
        var minSide;

        if (!bounds) {
            return 4;
        }

        minSide = Math.min(Number(bounds.width || 0), Number(bounds.height || 0));
        return Math.max(2, Math.min(8, minSide * 0.08));
    }

    // 실제 도형 밖을 눌렀을 때 가장 가까운 도형 경계점으로 리플 시작점을 보정한다.
    function resolveRippleStartPoint(regionGroup, point, eventTarget) {
        var provinceNode;
        var provinceNodes;
        var nearestPoint = null;
        var nearestDistance = Infinity;

        if (!point) {
            return null;
        }

        provinceNode = eventTarget && typeof eventTarget.closest === "function"
            ? eventTarget.closest(".hr030-map-province-shape")
            : null;

        if (provinceNode) {
            return { x: point.x, y: point.y };
        }

        if (!regionGroup) {
            return { x: point.x, y: point.y };
        }

        provinceNodes = Array.prototype.slice.call(regionGroup.querySelectorAll(".hr030-map-province-shape"));

        provinceNodes.forEach(function (shapeNode) {
            var bounds = getNodeBounds(shapeNode);
            var projectedX;
            var projectedY;
            var dx;
            var dy;
            var distance;

            if (!bounds) {
                return;
            }

            projectedX = Math.min(Math.max(point.x, bounds.x), bounds.x + bounds.width);
            projectedY = Math.min(Math.max(point.y, bounds.y), bounds.y + bounds.height);
            dx = point.x - projectedX;
            dy = point.y - projectedY;
            distance = Math.sqrt((dx * dx) + (dy * dy));

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestPoint = { x: projectedX, y: projectedY };
            }
        });

        return nearestPoint || { x: point.x, y: point.y };
    }

    // 권역 선택 시 클릭 위치 기준으로 색이 퍼지는 리플을 재생한다
    function animateMapSelectionRipple(circleNode, targetRadius, onComplete) {
        var startTime;
        var duration = 760;
        var startRadius = 8;

        if (!circleNode) {
            if (typeof onComplete === "function") {
                onComplete();
            }
            return;
        }

        if (state.mapRippleAnimationFrame) {
            window.cancelAnimationFrame(state.mapRippleAnimationFrame);
            state.mapRippleAnimationFrame = null;
        }

        // 리플 반경을 매 프레임 부드럽게 확장한다.
        function step(timestamp) {
            var elapsed;
            var progress;
            var eased;
            var radius;

            if (!startTime) {
                startTime = timestamp;
            }

            elapsed = timestamp - startTime;
            progress = Math.min(elapsed / duration, 1);
            eased = progress < 0.5
                ? 4 * Math.pow(progress, 3)
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            radius = startRadius + ((targetRadius - startRadius) * eased);
            circleNode.setAttribute("r", formatSvgNumber(radius));

            if (progress < 1) {
                state.mapRippleAnimationFrame = window.requestAnimationFrame(step);
                return;
            }

            state.mapRippleAnimationFrame = null;

            if (typeof onComplete === "function") {
                onComplete();
            }
        }

        circleNode.setAttribute("r", formatSvgNumber(startRadius));
        state.mapRippleAnimationFrame = window.requestAnimationFrame(step);
    }

    // 선택된 권역 위에 활성 색 레이어를 올려 SVG 리플 효과를 만든다
    function playRegionSelectionRipple(svgEl, targetRegionGroup, targetBounds, rippleConfig, onComplete) {
        var defs;
        var clipPath;
        var circle;
        var overlayGroup;
        var overlayShapeNodes;
        var badgeGroup;
        var clipId;
        var targetRadius;
        var rippleCenter;

        if (!svgEl || !targetRegionGroup || !targetBounds || !rippleConfig) {
            return;
        }

        if (typeof state.mapRippleCleanup === "function") {
            state.mapRippleCleanup();
            state.mapRippleCleanup = null;
        }

        defs = svgEl.querySelector("defs");

        if (!defs) {
            defs = createSvgNode("defs");
            svgEl.insertBefore(defs, svgEl.firstChild);
        }

        rippleCenter = rippleConfig && Number.isFinite(rippleConfig.x) && Number.isFinite(rippleConfig.y)
            ? { x: rippleConfig.x, y: rippleConfig.y }
            : {
                x: targetBounds.x + (targetBounds.width / 2),
                y: targetBounds.y + (targetBounds.height / 2)
            };

        clipId = "hr030-map-ripple-" + String(Date.now()) + "-" + String(Math.floor(Math.random() * 10000));
        clipPath = createSvgNode("clipPath");
        clipPath.setAttribute("id", clipId);

        overlayGroup = createSvgNode("g");
        overlayGroup.setAttribute("class", "hr030-map-ripple-overlay");
        overlayGroup.setAttribute("clip-path", "url(#" + clipId + ")");

        overlayShapeNodes = Array.prototype.slice.call(targetRegionGroup.querySelectorAll(".hr030-map-province-shape"));
        overlayShapeNodes.forEach(function (shapeNode) {
            var clone = shapeNode.cloneNode(true);

            clone.removeAttribute("class");
            clone.removeAttribute("style");
            clone.removeAttribute("filter");
            clone.removeAttribute("stroke");
            clone.removeAttribute("fill");
            clipPath.appendChild(clone);
        });
        defs.appendChild(clipPath);

        circle = createSvgNode("circle");
        circle.setAttribute("class", "hr030-map-ripple-circle");
        circle.setAttribute("cx", formatSvgNumber(rippleCenter.x));
        circle.setAttribute("cy", formatSvgNumber(rippleCenter.y));
        circle.setAttribute("r", "0");
        overlayGroup.appendChild(circle);

        badgeGroup = targetRegionGroup.querySelector(".hr030-map-badge");

        if (badgeGroup) {
            targetRegionGroup.insertBefore(overlayGroup, badgeGroup);
        } else {
            targetRegionGroup.appendChild(overlayGroup);
        }

        targetRadius = getBoundsMaxRadius(targetBounds, rippleCenter.x, rippleCenter.y) + 8;
        state.mapRippleCleanup = function () {
            if (overlayGroup.parentNode) {
                overlayGroup.parentNode.removeChild(overlayGroup);
            }

            if (clipPath.parentNode) {
                clipPath.parentNode.removeChild(clipPath);
            }

            state.mapRippleCleanup = null;
        };
        animateMapSelectionRipple(circle, targetRadius, function () {
            targetRegionGroup.classList.add("is-active");

            if (badgeGroup) {
                badgeGroup.classList.add("is-active");
            }

            if (typeof state.mapRippleCleanup === "function") {
                state.mapRippleCleanup();
            }

            if (typeof onComplete === "function") {
                onComplete();
            }
        });
    }

    // SVG 지도의 활성 권역 클래스와 배지 상태만 빠르게 동기화한다.
    function syncRegionMapSelectionState() {
        var selectedId = state.selectedRegionId;
        var selectionRipple = state.mapSelectionRipple;
        var svgEl = state.mapSvgElement;
        var regionGroupMap = state.mapRegionGroupMap || {};
        var badgeGroupMap = state.mapBadgeGroupMap || {};
        var regionBoundsMap = state.mapRegionBoundsMap || {};
        var targetRegionGroup;
        var targetBounds;

        Object.keys(regionGroupMap).forEach(function (regionId) {
            var regionGroup = regionGroupMap[regionId];
            var badgeGroup = badgeGroupMap[regionId];
            var shouldAnimateSelection = selectionRipple && selectionRipple.regionId === regionId;
            var isActive = selectedId === regionId && !shouldAnimateSelection;

            if (regionGroup) {
                regionGroup.classList.toggle("is-active", isActive);
            }

            if (badgeGroup) {
                badgeGroup.classList.toggle("is-active", isActive);
            }
        });

        if (selectionRipple && selectionRipple.regionId && regionGroupMap[selectionRipple.regionId] && regionBoundsMap[selectionRipple.regionId]) {
            targetRegionGroup = regionGroupMap[selectionRipple.regionId];
            targetBounds = regionBoundsMap[selectionRipple.regionId];

            playRegionSelectionRipple(svgEl, targetRegionGroup, targetBounds, selectionRipple, function () {
                state.mapSelectionRipple = null;
            });
            return;
        }

        state.mapSelectionRipple = null;
    }

    // 권역별 기본색과 활성색 CSS 변수를 만든다.
    function getRegionToneStyle(regionId) {
        var tone = regionToneMap[regionId] || {
            fill: "#dfe8ff",
            hover: "#bfd0ff",
            active: "#4f6ff7",
            badge: "rgba(255, 255, 255, 0.98)",
            badgeStroke: "#d7e2f2"
        };

        return [
            "--hr030-map-fill:" + tone.fill,
            "--hr030-map-fill-hover:" + tone.hover,
            "--hr030-map-fill-active:" + tone.active,
            "--hr030-map-badge-fill:" + tone.badge,
            "--hr030-map-badge-stroke:" + tone.badgeStroke,
            "--hr030-map-badge-active-fill:" + tone.active
        ].join(";");
    }

    // 카드 헤더 공통 마크업을 렌더링한다.
    function renderSectionHeader(options) {
        return [
            '<div class="hr030-section-head">',
            '  <div class="hr030-section-copy">',
            '    <h5>' + escapeHtml(options.title) + "</h5>",
            '    <p>' + escapeHtml(options.description) + "</p>",
            "  </div>",
            options.controlHtml || ('  <span class="hr030-section-meta">' + escapeHtml(options.meta) + "</span>"),
            "</div>"
        ].join("");
    }

    // 카드 헤더 우측의 공통 select 마크업을 만든다.
    function renderHeaderSelect(config) {
        var attributes = [
            'class="hr030-card-select"',
            'data-dashboard-select="' + escapeHtml(config.type) + '"'
        ];

        if (config.card) {
            attributes.push('data-card="' + escapeHtml(config.card) + '"');
        }

        return [
            '<label class="hr030-card-select-wrap">',
            '  <span class="blind">' + escapeHtml(config.label || "보기 기준 선택") + "</span>",
            '  <select ' + attributes.join(" ") + ">",
            (config.options || []).map(function (option) {
                var selected = option.value === config.value ? ' selected' : "";

                return '<option value="' + escapeHtml(option.value) + '"' + selected + ">" + escapeHtml(option.label) + "</option>";
            }).join(""),
            "  </select>",
            "</label>"
        ].join("");
    }

    // 부서 문자열에서 대표 카테고리만 추출한다.
    function getPrimaryCategory(item) {
        var raw = item && item.department ? item.department : "";

        return String(raw).split("·")[0].trim() || "기타";
    }

    // 경력 문자열에서 연차 숫자만 파싱한다.
    function parseCareerYears(position) {
        var matched = String(position || "").match(/\d+/);

        return matched ? Number(matched[0]) : null;
    }

    // 인력 데이터를 경력 구간 메타로 매핑한다.
    function getCareerBand(item) {
        var years = parseCareerYears(item && item.position);

        if (years === null || years <= 4) {
            return careerBandMeta[0];
        }

        if (years <= 7) {
            return careerBandMeta[1];
        }

        if (years <= 10) {
            return careerBandMeta[2];
        }

        return careerBandMeta[3];
    }

    // 공통코드 기반 기술 카탈로그를 검색용 맵으로 정리한다.
    function buildSkillCatalog(items) {
        var catalogMap = {};
        var catalogLabels = [];

        (items || []).forEach(function (item) {
            var label = String(item && (item.cd_nm || item.label || item.name || item.cd) || "").trim();
            var normalized;

            if (!label) {
                return;
            }

            normalized = normalizeText(label);
            catalogMap[normalized] = label;

            if (catalogLabels.indexOf(label) === -1) {
                catalogLabels.push(label);
            }
        });

        state.skillCatalogMap = catalogMap;
        state.skillCatalogLabels = catalogLabels;
        state.skillCatalogLoaded = Object.keys(catalogMap).length > 0;
    }

    // 공통코드 기반 실제 기술 태그 목록을 먼저 불러온다
    function loadSkillCatalog() {
        if (state.skillCatalogRequested || typeof getComCode !== "function") {
            return;
        }

        state.skillCatalogRequested = true;
        getComCode("skl_id", "", function (res) {
            buildSkillCatalog(Array.isArray(res) ? res : []);
            renderDashboard();
        });
    }

    // 외부 SVG 대한민국 지도를 한 번만 불러와 이후 렌더에 재사용한다
    function loadRegionMapSvg() {
        if (state.mapSvgRequested || state.mapSvgFailed || typeof window.fetch !== "function") {
            return;
        }

        state.mapSvgRequested = true;

        window.fetch(regionMapSvgPath, { credentials: "same-origin" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("SVG load failed");
                }

                return response.text();
            })
            .then(function (svgMarkup) {
                state.mapSvgMarkup = svgMarkup || "";

                if (!state.mapSvgMarkup) {
                    throw new Error("SVG markup is empty");
                }

                renderDashboard();
            })
            .catch(function () {
                state.mapSvgFailed = true;
                renderDashboard();
            });
    }

    // 원천 기술명을 대시보드용 대표 기술 태그 집합으로 정규화한다
    // 원천 기술명에서 대표 기술 후보군을 넓게 뽑아낸다.
    function buildSkillCandidates(label) {
        var raw = String(label || "").trim();
        var normalized = normalizeText(raw);
        var candidates = [];

        if (!raw) {
            return candidates;
        }

        // 후보 배열에 중복 없이 기술명을 추가한다.
        function pushCandidate(value) {
            if (value && candidates.indexOf(value) === -1) {
                candidates.push(value);
            }
        }

        pushCandidate(raw);

        if (normalized.indexOf("java") > -1 || normalized.indexOf("spring") > -1) {
            pushCandidate("Java/Spring");
            pushCandidate("Java");
            pushCandidate("Spring");
        }

        if (normalized.indexOf("react") > -1 || normalized.indexOf("vue") > -1) {
            pushCandidate("React/Vue");
            pushCandidate("React");
            pushCandidate("Vue");
        }

        if (normalized.indexOf("javascript") > -1 || normalized.indexOf("typescript") > -1) {
            pushCandidate("JavaScript");
            pushCandidate("TypeScript");
        }

        if (normalized.indexOf("python") > -1 || normalized.indexOf("data") > -1) {
            pushCandidate("Python/Data");
            pushCandidate("Python");
            pushCandidate("Data");
        }

        if (normalized.indexOf("qa") > -1 || normalized.indexOf("테스트") > -1 || normalized.indexOf("test") > -1) {
            pushCandidate("QA/테스트");
            pushCandidate("QA");
            pushCandidate("테스트");
        }

        if (normalized.indexOf("퍼블") > -1 || normalized.indexOf("publishing") > -1 || normalized.indexOf("html") > -1 || normalized.indexOf("css") > -1) {
            pushCandidate("웹퍼블리싱");
            pushCandidate("퍼블리싱");
            pushCandidate("HTML/CSS");
        }

        if (normalized.indexOf("pm") > -1 || normalized.indexOf("pl") > -1 || normalized.indexOf("pmo") > -1 || normalized.indexOf("기획") > -1) {
            pushCandidate("PM/PL");
            pushCandidate("PMO");
        }

        return candidates;
    }

    // 카탈로그가 없을 때 기술명을 대표 라벨로 대체한다.
    function getFallbackTechnicalSkillLabel(label) {
        var normalized = normalizeText(label);

        if (normalized.indexOf("java") > -1 || normalized.indexOf("spring") > -1) {
            return "Java/Spring";
        }

        if (normalized.indexOf("react") > -1 || normalized.indexOf("vue") > -1 ||
            normalized.indexOf("javascript") > -1 || normalized.indexOf("typescript") > -1) {
            return "React/Vue";
        }

        if (normalized.indexOf("python") > -1 || normalized.indexOf("data") > -1) {
            return "Python/Data";
        }

        if (normalized.indexOf("qa") > -1 || normalized.indexOf("테스트") > -1 || normalized.indexOf("test") > -1) {
            return "QA/테스트";
        }

        if (normalized.indexOf("퍼블") > -1 || normalized.indexOf("publishing") > -1 ||
            normalized.indexOf("html") > -1 || normalized.indexOf("css") > -1) {
            return "웹퍼블리싱";
        }

        return "";
    }

    // 기술 라벨을 상위 기술군 규칙으로 매핑한다.
    function getSkillFamilyRule(label) {
        var normalized = normalizeText(label);

        if (!normalized) {
            return null;
        }

        if ((normalized.indexOf("java") > -1 || normalized.indexOf("spring") > -1) && normalized.indexOf("javascript") === -1) {
            return {
                include: ["springboot", "spring", "java", "jsp", "jpa", "mybatis", "egov", "전자정부"],
                exclude: ["javascript"],
                priority: ["springboot", "spring", "java", "jpa", "mybatis", "jsp", "egov", "전자정부"]
            };
        }

        if (normalized.indexOf("react") > -1 || normalized.indexOf("vue") > -1 ||
            normalized.indexOf("javascript") > -1 || normalized.indexOf("typescript") > -1) {
            return {
                include: ["react", "vue", "typescript", "javascript", "next", "nuxt", "angular"],
                exclude: [],
                priority: ["react", "vue", "typescript", "javascript", "next", "nuxt", "angular"]
            };
        }

        if (normalized.indexOf("python") > -1 || normalized.indexOf("data") > -1) {
            return {
                include: ["python", "pandas", "spark", "airflow", "django", "flask", "data", "etl"],
                exclude: [],
                priority: ["python", "pandas", "spark", "airflow", "django", "flask", "data", "etl"]
            };
        }

        if (normalized.indexOf("qa") > -1 || normalized.indexOf("테스트") > -1 || normalized.indexOf("test") > -1) {
            return {
                include: ["qa", "test", "테스트", "selenium", "cypress", "jmeter", "xray"],
                exclude: [],
                priority: ["qa", "test", "테스트", "selenium", "cypress", "jmeter", "xray"]
            };
        }

        if (normalized.indexOf("퍼블") > -1 || normalized.indexOf("publishing") > -1 ||
            normalized.indexOf("html") > -1 || normalized.indexOf("css") > -1) {
            return {
                include: ["html", "css", "scss", "sass", "publishing", "퍼블", "웹접근성"],
                exclude: [],
                priority: ["html", "css", "scss", "sass", "publishing", "퍼블", "웹접근성"]
            };
        }

        return null;
    }

    // 기술군 기본 시드 라벨 집합을 반환한다.
    function getSkillFamilySeedLabels(label) {
        var normalized = normalizeText(label);

        if (!normalized) {
            return [];
        }

        if ((normalized.indexOf("java") > -1 || normalized.indexOf("spring") > -1) && normalized.indexOf("javascript") === -1) {
            return ["Java", "Spring", "Spring Boot", "JPA"];
        }

        if (normalized.indexOf("react") > -1 || normalized.indexOf("vue") > -1 ||
            normalized.indexOf("javascript") > -1 || normalized.indexOf("typescript") > -1) {
            return ["React", "Vue", "TypeScript", "JavaScript"];
        }

        if (normalized.indexOf("python") > -1 || normalized.indexOf("data") > -1) {
            return ["Python", "Pandas", "ETL"];
        }

        if (normalized.indexOf("qa") > -1 || normalized.indexOf("테스트") > -1 || normalized.indexOf("test") > -1) {
            return ["QA", "테스트자동화"];
        }

        if (normalized.indexOf("퍼블") > -1 || normalized.indexOf("publishing") > -1 ||
            normalized.indexOf("html") > -1 || normalized.indexOf("css") > -1) {
            return ["HTML", "CSS", "웹접근성"];
        }

        return [];
    }

    // 역할성 라벨인지 판단해 기술 통계에서 제외한다.
    function isRoleSkillLabel(label) {
        var normalized = normalizeText(label);

        return normalized === "pm" ||
            normalized === "pl" ||
            normalized.indexOf("pm/") === 0 ||
            normalized.indexOf("pmo") > -1 ||
            normalized.indexOf("projectmanager") > -1 ||
            normalized.indexOf("manager") > -1 ||
            normalized.indexOf("기획") > -1 ||
            normalized.indexOf("관리") > -1;
    }

    // 실제 기술 통계에 포함할 기술 라벨인지 판별한다.
    function isTechnicalSkillLabel(label) {
        var familyRule = getSkillFamilyRule(label);

        return !!label && !isRoleSkillLabel(label) && !!familyRule;
    }

    // 원천 기술명을 카탈로그 기준 대표 기술명으로 해석한다.
    function resolveTechnicalSkillLabel(label) {
        var candidates = buildSkillCandidates(label);
        var resolved = "";

        candidates.some(function (candidate) {
            var match = state.skillCatalogMap[normalizeText(candidate)];

            if (match) {
                resolved = match;
                return true;
            }

            return false;
        });

        if (resolved) {
            return resolved;
        }

        if (state.skillCatalogLoaded) {
            return "";
        }

        return getFallbackTechnicalSkillLabel(label);
    }

    // 기술군 후보를 우선순위 기준으로 점수화한다.
    function getCatalogSkillScore(label, familyRule) {
        var normalized = normalizeText(label);
        var score = 0;

        (familyRule.priority || []).forEach(function (keyword, index) {
            if (normalized.indexOf(keyword) > -1) {
                score += (familyRule.priority.length - index) * 10;
            }
        });

        if (label.indexOf("/") > -1 || label.indexOf("·") > -1) {
            score -= 8;
        }

        score -= normalized.length / 100;
        return score;
    }

    // 기술 라벨 배열에 중복 없이 값을 추가한다.
    function appendUniqueSkillLabel(target, label) {
        if (label && target.indexOf(label) === -1) {
            target.push(label);
        }
    }

    // 시드 라벨을 실제 카탈로그에 있는 기술명으로 보정한다.
    function resolveCatalogSkillSeedLabel(seedLabel) {
        var normalizedSeed = normalizeText(seedLabel);
        var candidates;

        if (!normalizedSeed || !state.skillCatalogLoaded) {
            return seedLabel;
        }

        if (state.skillCatalogMap[normalizedSeed]) {
            return state.skillCatalogMap[normalizedSeed];
        }

        candidates = state.skillCatalogLabels.filter(function (catalogLabel) {
            return isTechnicalSkillLabel(catalogLabel) && normalizeText(catalogLabel).indexOf(normalizedSeed) > -1;
        }).sort(function (a, b) {
            var exactA = normalizeText(a) === normalizedSeed ? 1 : 0;
            var exactB = normalizeText(b) === normalizedSeed ? 1 : 0;
            var atomicA = (a.indexOf("/") === -1 && a.indexOf("·") === -1) ? 1 : 0;
            var atomicB = (b.indexOf("/") === -1 && b.indexOf("·") === -1) ? 1 : 0;

            if (exactA !== exactB) {
                return exactB - exactA;
            }

            if (atomicA !== atomicB) {
                return atomicB - atomicA;
            }

            return a.length - b.length;
        });

        return candidates[0] || seedLabel;
    }

    // 한 원천 기술값을 여러 대표 기술 라벨로 분해한다.
    function buildResolvedTechnicalSkillLabels(label) {
        var familyRule = getSkillFamilyRule(label);
        var exactMatch = resolveTechnicalSkillLabel(label);
        var matches = [];
        var atomicMatches;
        var preferredSeeds = getSkillFamilySeedLabels(label);

        if (!state.skillCatalogLoaded) {
            if (preferredSeeds.length) {
                return preferredSeeds.slice(0, 4);
            }

            return exactMatch ? [exactMatch] : [];
        }

        if (!familyRule) {
            return exactMatch && isTechnicalSkillLabel(exactMatch) ? [exactMatch] : [];
        }

        matches = state.skillCatalogLabels.filter(function (catalogLabel) {
            var normalized = normalizeText(catalogLabel);

            if (!isTechnicalSkillLabel(catalogLabel)) {
                return false;
            }

            if ((familyRule.exclude || []).some(function (keyword) {
                return normalized.indexOf(keyword) > -1;
            })) {
                return false;
            }

            return (familyRule.include || []).some(function (keyword) {
                return normalized.indexOf(keyword) > -1;
            });
        }).sort(function (a, b) {
            return getCatalogSkillScore(b, familyRule) - getCatalogSkillScore(a, familyRule);
        });

        if (exactMatch && isTechnicalSkillLabel(exactMatch) && matches.indexOf(exactMatch) === -1) {
            matches.unshift(exactMatch);
        }

        preferredSeeds.forEach(function (seedLabel) {
            appendUniqueSkillLabel(matches, resolveCatalogSkillSeedLabel(seedLabel));
        });

        atomicMatches = matches.filter(function (catalogLabel) {
            return catalogLabel.indexOf("/") === -1 && catalogLabel.indexOf("·") === -1;
        });

        if (atomicMatches.length) {
            matches = atomicMatches.concat(matches.filter(function (catalogLabel) {
                return atomicMatches.indexOf(catalogLabel) === -1;
            }));
        }

        return matches.slice(0, 3);
    }

    // 기술 분해 시 개수에 따라 가중치 분포를 만든다.
    function getSkillDistributionWeights(size) {
        if (size <= 1) {
            return [1];
        }

        if (size === 2) {
            return [0.58, 0.42];
        }

        if (size === 3) {
            return [0.5, 0.3, 0.2];
        }

        if (size === 4) {
            return [0.35, 0.26, 0.22, 0.17];
        }

        if (size === 5) {
            return [0.3, 0.24, 0.19, 0.15, 0.12];
        }

        if (size === 6) {
            return [0.26, 0.21, 0.17, 0.14, 0.12, 0.1];
        }

        return Array.apply(null, { length: size }).map(function (_, index) {
            return size - index;
        }).map(function (value, _, arr) {
            var total = arr.reduce(function (sum, current) {
                return sum + current;
            }, 0);

            return value / total;
        });
    }

    // 하나의 기술 값을 여러 대표 라벨로 비율 배분한다.
    function splitSkillValue(total, labels) {
        var weights = getSkillDistributionWeights(labels.length);
        var rows = labels.map(function (label, index) {
            var raw = total * (weights[index] || 0);
            return {
                label: label,
                value: Math.floor(raw),
                remainder: raw - Math.floor(raw)
            };
        });
        var allocated = rows.reduce(function (sum, item) {
            return sum + item.value;
        }, 0);
        var remaining = total - allocated;
        var cursor = 0;

        rows.sort(function (a, b) {
            return b.remainder - a.remainder;
        });

        while (remaining > 0 && rows.length) {
            rows[cursor % rows.length].value += 1;
            cursor += 1;
            remaining -= 1;
        }

        return rows.filter(function (item) {
            return item.value > 0;
        }).sort(function (a, b) {
            return b.value - a.value;
        });
    }

    // 대표 기술 라벨에 맞는 시각 색상을 반환한다.
    function getTechnicalSkillColor(label, index) {
        var normalized = normalizeText(label);

        if (label === "기타") {
            return "#909090";
        }

        if (normalized.indexOf("java") > -1 || normalized.indexOf("spring") > -1) {
            return "#4f6ff7";
        }

        if (normalized.indexOf("react") > -1 || normalized.indexOf("vue") > -1 ||
            normalized.indexOf("javascript") > -1 || normalized.indexOf("typescript") > -1) {
            return "#1fb6a6";
        }

        if (normalized.indexOf("python") > -1 || normalized.indexOf("data") > -1) {
            return "#f3b44f";
        }

        if (normalized.indexOf("qa") > -1 || normalized.indexOf("테스트") > -1 || normalized.indexOf("test") > -1) {
            return "#eb8079";
        }

        if (normalized.indexOf("퍼블") > -1 || normalized.indexOf("publishing") > -1 ||
            normalized.indexOf("html") > -1 || normalized.indexOf("css") > -1) {
            return "#a173ff";
        }

        return skillColorPalette[index % skillColorPalette.length];
    }

    // 권역 기술 데이터를 treemap용 대표 기술 분포로 집계한다.
    function buildRegionSkillDistribution(regionSkills) {
        var isAllView = state.skillViewMode === "all";
        var skillMap = {};
        var otherValue = 0;
        var maxVisible = state.skillViewMode === "top3" ? 3 : state.skillViewMode === "top5" ? 5 : 20;
        var minShare = isAllView ? 3 : 0;
        var skills;
        var total;

        (regionSkills || []).forEach(function (item) {
            var value = Number(item && item.value || 0);
            var resolvedLabels = buildResolvedTechnicalSkillLabels(item && item.label);
            var distributedSkills;

            if (!value) {
                return;
            }

            if (!resolvedLabels.length) {
                if (isAllView) {
                    otherValue += value;
                }
                return;
            }

            distributedSkills = splitSkillValue(value, resolvedLabels);

            distributedSkills.forEach(function (distributedItem) {
                if (!skillMap[distributedItem.label]) {
                    skillMap[distributedItem.label] = {
                        label: distributedItem.label,
                        value: 0
                    };
                }

                skillMap[distributedItem.label].value += distributedItem.value;
            });
        });

        skills = Object.keys(skillMap).map(function (key) {
            return skillMap[key];
        }).sort(function (a, b) {
            return (b.value || 0) - (a.value || 0);
        });

        total = skills.reduce(function (sum, item) {
            return sum + (item.value || 0);
        }, 0);

        if (skills.length > maxVisible) {
            if (isAllView) {
                skills.slice(maxVisible).forEach(function (item) {
                    otherValue += item.value || 0;
                });
            }
            skills = skills.slice(0, maxVisible);
        }

        skills = skills.filter(function (item, index) {
            var share = total ? (item.value / total) * 100 : 0;

            if (index < maxVisible && item.value >= 2 && share >= minShare) {
                return true;
            }

            if (isAllView) {
                otherValue += item.value || 0;
            }
            return false;
        });

        skills = skills.map(function (item, index) {
            return {
                label: item.label,
                value: item.value,
                color: getTechnicalSkillColor(item.label, index)
            };
        });

        if (isAllView && otherValue > 0) {
            skills.push({
                label: "기타",
                value: otherValue,
                color: getTechnicalSkillColor("기타", skills.length)
            });
        }

        return skills;
    }

    // 기술 태그를 트리맵에서 쓰는 상위 카테고리 구조로 묶는다
    function getSkillCategoryMeta(label) {
        var normalized = normalizeText(label);

        if (label === "기타") {
            return { key: "other", label: "기타", color: "#cbd5e1" };
        }

        if ((normalized.indexOf("java") > -1 || normalized.indexOf("spring") > -1 || normalized.indexOf("jpa") > -1 || normalized.indexOf("mybatis") > -1) && normalized.indexOf("javascript") === -1) {
            return { key: "backend", label: "백엔드", color: "#4f6ff7" };
        }

        if (normalized.indexOf("react") > -1 || normalized.indexOf("vue") > -1 || normalized.indexOf("typescript") > -1 || normalized.indexOf("javascript") > -1) {
            return { key: "frontend", label: "프론트엔드", color: "#1fb6a6" };
        }

        if (normalized.indexOf("qa") > -1 || normalized.indexOf("test") > -1 || normalized.indexOf("테스트") > -1) {
            return { key: "qa", label: "QA", color: "#eb8079" };
        }

        if (normalized.indexOf("html") > -1 || normalized.indexOf("css") > -1 || normalized.indexOf("퍼블") > -1 || normalized.indexOf("접근성") > -1) {
            return { key: "publishing", label: "퍼블리싱", color: "#a173ff" };
        }

        if (normalized.indexOf("python") > -1 || normalized.indexOf("data") > -1 || normalized.indexOf("etl") > -1 || normalized.indexOf("pandas") > -1) {
            return { key: "data", label: "데이터", color: "#f3b44f" };
        }

        return { key: "other", label: "기타", color: "#94a3b8" };
    }

    // 대표 기술 분포를 treemap 계층 구조로 변환한다.
    function buildSkillTreemapData(skills) {
        var grouped = {};

        (skills || []).forEach(function (item) {
            var groupMeta = getSkillCategoryMeta(item.label);

            if (!grouped[groupMeta.key]) {
                grouped[groupMeta.key] = {
                    name: groupMeta.label,
                    value: 0,
                    itemStyle: {
                        color: groupMeta.color,
                        borderColor: "#ffffff",
                        borderWidth: 3,
                        gapWidth: 3
                    },
                    children: []
                };
            }

            grouped[groupMeta.key].value += Number(item.value || 0);
            grouped[groupMeta.key].children.push({
                name: item.label,
                value: Number(item.value || 0),
                itemStyle: {
                    color: item.color,
                    borderColor: "#ffffff",
                    borderWidth: 2,
                    gapWidth: 2
                }
            });
        });

        return Object.keys(grouped).map(function (key) {
            return grouped[key];
        }).sort(function (a, b) {
            return (b.value || 0) - (a.value || 0);
        });
    }

    // 첫 진입 시 트리맵 움직임을 보여주기 위한 균등 seed 데이터를 만든다
    function buildSkillTreemapSeedData(treemapData) {
        return (treemapData || []).map(function (group) {
            var children = (group.children || []).map(function (child) {
                return {
                    name: child.name,
                    value: 1,
                    itemStyle: child.itemStyle
                };
            });

            return {
                name: group.name,
                value: Math.max(children.length, 1),
                itemStyle: group.itemStyle,
                children: children
            };
        });
    }

    // 도넛 차트 중앙 텍스트를 그리는 Chart.js 플러그인을 만든다.
    function buildCenterLabelPlugin(pluginId, primaryText, secondaryText) {
        return {
            id: pluginId,
            afterDraw: function (chart) {
                var ctx = chart.ctx;
                var meta = chart.getDatasetMeta(0);
                var centerPoint = meta && meta.data && meta.data[0];
                var x;
                var y;

                if (!centerPoint) {
                    return;
                }

                x = centerPoint.x;
                y = centerPoint.y;

                ctx.save();
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#18253f";
                ctx.font = '700 23px "Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif';
                ctx.fillText(primaryText, x, y - 8);
                ctx.fillStyle = "#7f776c";
                ctx.font = '600 11px "Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif';
                ctx.fillText(secondaryText, x, y + 15);
                ctx.restore();
            }
        };
    }

    // KPI 카드 한 장의 마크업을 렌더링한다.
    function renderDashboardCard(item) {
        var iconName = kpiIconMap[item.key] || "circle";

        return [
            '<article class="hr030-kpi-card" data-kpi-key="' + escapeHtml(item.key || "") + '" aria-label="' + escapeHtml(item.label) + " " + formatNumber(item.value) + "명" + '">',
            '  <span class="hr030-kpi-icon" aria-hidden="true"><i data-lucide="' + escapeHtml(iconName) + '"></i></span>',
            '  <div class="hr030-kpi-copy">',
            '    <span class="hr030-kpi-label">' + escapeHtml(item.label) + "</span>",
            '    <strong class="hr030-kpi-value"><span class="hr030-kpi-number">' + formatNumber(item.value) + '</span><span class="hr030-kpi-unit">명</span></strong>',
            '    <span class="hr030-kpi-description">' + escapeHtml(item.description) + "</span>",
            "  </div>",
            "</article>"
        ].join("");
    }

    // 현재 화면 조건에 맞는 데이터 가공
    function getCurrentRegion() {
        var selectedId = state.selectedRegionId;
        var region;

        if (!selectedId || selectedId === "all") {
            return dashboardData.map.overview;
        }

        region = dashboardData.map.regions.find(function (item) {
            return item.id === selectedId;
        });

        return region || dashboardData.map.overview;
    }

    // 현재 검색어와 전달된 필드들이 일치하는지 확인한다.
    function matchesSearch(fields) {
        if (!state.query) {
            return true;
        }

        return normalizeText(fields.join(" ")).indexOf(normalizeText(state.query)) > -1;
    }

    // 현재 필터 조건에 맞는 인력 목록만 추린다.
    function getVisibleEmployees() {
        return dashboardData.recentEmployees.filter(function (item) {
            var matchesRegion = state.selectedRegionId === "all" || item.regionId === state.selectedRegionId;
            var matchesStatus = !employeeStatusMap[state.statusFilter] || item.status === state.statusFilter;

            return matchesRegion && matchesStatus && matchesSearch([
                item.employeeId,
                item.name,
                item.department,
                item.region,
                item.position,
                item.employmentType,
                item.status
            ]);
        });
    }

    // 현재 필터 조건에 맞는 운영 이슈 목록만 추린다.
    function getVisibleIssues() {
        return dashboardData.issues.filter(function (item) {
            var matchesRegion = state.selectedRegionId === "all" || item.regionId === state.selectedRegionId;
            var matchesStatus = !employeeStatusMap[state.statusFilter] || item.status === state.statusFilter;

            return matchesRegion && matchesStatus && matchesSearch([
                item.issueId,
                item.title,
                item.summary,
                item.region,
                item.status,
                item.severity
            ]);
        });
    }

    // 검색 결과 요약 문구를 상단에 갱신한다.
    function updateSearchResultNote(employeeRows, issueRows) {
        var noteEl = byId("hr030SearchResultNote");
        var regionLabel = getCurrentRegion().name;

        if (!noteEl) {
            return;
        }

        if (!state.query) {
            noteEl.textContent = "";
            noteEl.classList.add("is-empty");
            return;
        }

        noteEl.textContent = regionLabel + " 검색 결과 인력 " + formatNumber(employeeRows.length) + "명 · 운영 이슈 " + formatNumber(issueRows.length) + "건";
        noteEl.classList.remove("is-empty");
    }

    // 날짜 문자열을 월.일 형식의 짧은 표기로 바꾼다.
    function formatShortDate(value) {
        var parts = String(value || "").split("-");

        if (parts.length !== 3) {
            return value || "-";
        }

        return parts[1] + "." + parts[2];
    }

    // 인력 테이블 렌더링과 폴백 처리
    function employeeNameFormatter(cell) {
        var row = cell.getRow().getData();

        return [
            '<div class="hr030-cell-user">',
            '  <strong>' + escapeHtml(row.name) + "</strong>",
            '  <span>' + escapeHtml(row.department) + "</span>",
            "</div>"
        ].join("");
    }

    function statusBadgeFormatter(cell) {
        return '<div class="hr030-status-cell">' + renderStatusBadge(cell.getValue()) + "</div>";
    }

    // Tabulator가 있을 때 인력 테이블을 초기화한다.
    function initEmployeeTable(dataRows) {
        if (typeof Tabulator !== "function") {
            renderEmployeeTableFallback(dataRows);
            return;
        }

        state.employeeTable = new Tabulator("#hr030RecentEmployeeTable", {
            data: dataRows,
            layout: "fitColumns",
            height: "100%",
            pagination: "local",
            paginationSize: 2,
            paginationSizeSelector: false,
            paginationButtonCount: 5,
            placeholder: "조건에 맞는 인력 데이터가 없습니다.",
            headerHozAlign: "center",
            movableColumns: false,
            reactiveData: false,
            columns: [
                { title: "인력ID", field: "employeeId", width: 108, hozAlign: "center", headerSort: true },
                { title: "이름 / 기술", field: "name", minWidth: 240, formatter: employeeNameFormatter, headerSort: true },
                { title: "지역", field: "region", width: 88, hozAlign: "center", headerSort: true },
                { title: "경력", field: "position", width: 86, hozAlign: "center", headerSort: true },
                { title: "가용일", field: "availableDate", width: 88, hozAlign: "center", headerSort: true },
                { title: "희망단가", field: "employmentType", width: 104, hozAlign: "center", headerSort: true },
                { title: "상태", field: "status", width: 108, minWidth: 108, hozAlign: "center", headerSort: true, formatter: statusBadgeFormatter }
            ]
        });
    }

    // Tabulator가 없을 때 기본 HTML 테이블로 폴백한다.
    function renderEmployeeTableFallback(dataRows) {
        var container = byId("hr030RecentEmployeeTable");
        var rowsHtml = dataRows.map(function (item) {
            return [
                "<tr>",
                "  <td>" + escapeHtml(item.employeeId) + "</td>",
                '  <td><div class="hr030-cell-user"><strong>' + escapeHtml(item.name) + "</strong><span>" + escapeHtml(item.department) + "</span></div></td>",
                "  <td>" + escapeHtml(item.region) + "</td>",
                "  <td>" + escapeHtml(item.position) + "</td>",
                "  <td>" + escapeHtml(item.availableDate) + "</td>",
                "  <td>" + escapeHtml(item.employmentType) + "</td>",
                '  <td><div class="hr030-status-cell">' + renderStatusBadge(item.status) + "</div></td>",
                "</tr>"
            ].join("");
        }).join("");

        if (!rowsHtml) {
            rowsHtml = '<tr><td colspan="7" class="hr030-table-empty">조건에 맞는 인력 데이터가 없습니다.</td></tr>';
        }

        container.innerHTML = [
            '<table class="hr030-fallback-table">',
            "  <thead>",
            "    <tr>",
            "      <th>인력ID</th>",
            "      <th>이름 / 기술</th>",
            "      <th>지역</th>",
            "      <th>경력</th>",
            "      <th>가용일</th>",
            "      <th>희망단가</th>",
            "      <th>상태</th>",
            "    </tr>",
            "  </thead>",
            "  <tbody>",
            rowsHtml,
            "  </tbody>",
            "</table>"
        ].join("");
    }

    // 인력 테이블 데이터를 현재 조건에 맞게 다시 그린다.
    function renderEmployeeTable(dataRows) {
        byId("hr030EmployeeTableMeta").textContent = "이름, 기술, 지역 기준으로 빠르게 인력을 확인할 수 있습니다.";

        if (state.employeeTable) {
            state.employeeTable.setData(dataRows).then(function () {
                if (typeof state.employeeTable.setPage === "function") {
                    state.employeeTable.setPage(1);
                }
            });
            return;
        }

        initEmployeeTable(dataRows);
    }

    // 좌측 카드: 지역 지도와 권역 상세 렌더링
    // 좌측 지도 카드의 폴백 지도를 간단한 SVG 형태로 렌더링한다
    function renderRegionMapFallback() {
        var container = byId("hr030RegionMap");
        var selectedId = state.selectedRegionId;
        var regionsSvg = dashboardData.map.regions.map(function (region) {
            var isActive = selectedId === region.id;

            return [
                '<g class="hr030-map-region' + (isActive ? " is-active" : "") + '" data-region-id="' + escapeHtml(region.id) + '" role="button" tabindex="0" aria-label="' + escapeHtml(region.name) + ' ' + formatNumber(region.headcount) + '명">',
                '  <polygon class="hr030-map-shape" points="' + escapeHtml(region.points) + '"></polygon>',
                '  <text class="hr030-map-label" x="' + escapeHtml(region.labelX) + '" y="' + escapeHtml(region.labelY) + '">' + escapeHtml(region.name) + "</text>",
                '  <text class="hr030-map-value" x="' + escapeHtml(region.labelX) + '" y="' + escapeHtml(region.labelY + 18) + '">' + formatNumber(region.headcount) + "</text>",
                "</g>"
            ].join("");
        }).join("");

        container.innerHTML = [
            '<svg class="hr030-map-svg" viewBox="30 42 238 272" preserveAspectRatio="xMidYMid meet" aria-hidden="true">',
            '  <g class="hr030-map-backdrop">',
            '    <path d="M76 54 L136 42 L204 54 L248 92 L256 160 L244 254 L222 300 L170 314 L116 304 L74 278 L44 220 L38 156 L48 94 Z"></path>',
            "  </g>",
            regionsSvg,
            "</svg>"
        ].join("");
    }

    // SVG 지도가 준비되기 전까지 로딩 상태를 보여준다
    function renderRegionMapLoading() {
        var container = byId("hr030RegionMap");

        if (!container) {
            return;
        }

        container.innerHTML = '<div class="hr030-map-loading" aria-hidden="true"><span class="hr030-map-loading-dot"></span><span class="hr030-map-loading-text">지도를 불러오는 중입니다</span></div>';
    }

    // 선택 상태만 갱신하면서 지역 지도와 배지를 그린다
    function renderRegionMap() {
        var container = byId("hr030RegionMap");
        var noteEl = byId("hr030RegionMapNote");
        var parser;
        var svgDoc;
        var svgEl;
        var provinceNodes;
        var provinceLayer;
        var unmappedGroup;
        var usedProvinceIds = {};
        var overallBounds;
        var badgeLayouts = [];
        var regionGroupMap = {};
        var regionBoundsMap = {};
        var badgeGroupMap = {};

        if (!container) {
            return;
        }

        if (!state.mapSvgMarkup && !state.mapSvgFailed) {
            renderRegionMapLoading();
        } else if (!state.mapSvgMarkup || typeof window.DOMParser !== "function") {
            renderRegionMapFallback();
        } else if (state.mapSvgElement && state.mapSvgContainer === container) {
            if (!state.mapSvgElement.isConnected) {
                container.innerHTML = "";
                container.appendChild(state.mapSvgElement);
            }

            syncRegionMapSelectionState();
        } else {
            try {
                parser = new window.DOMParser();
                svgDoc = parser.parseFromString(state.mapSvgMarkup, "image/svg+xml");
                svgEl = svgDoc.documentElement;

                if (!svgEl || String(svgEl.nodeName || "").toLowerCase() !== "svg") {
                    throw new Error("Invalid SVG root");
                }

                svgEl.removeAttribute("width");
                svgEl.removeAttribute("height");
                svgEl.removeAttribute("enable-background");
                svgEl.setAttribute("class", "hr030-map-svg hr030-map-svg--regional");
                svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
                svgEl.setAttribute("aria-hidden", "true");

                provinceNodes = Array.prototype.slice.call(svgEl.querySelectorAll("path[id], polyline[id], polygon[id]"));
                provinceLayer = createSvgNode("g");
                provinceLayer.setAttribute("class", "hr030-map-province-layer");
                unmappedGroup = createSvgNode("g");
                unmappedGroup.setAttribute("class", "hr030-map-unmapped");

                dashboardData.map.regions.forEach(function (region) {
                    var provinceIds = regionProvinceMap[region.id] || [];
                    var regionGroup = createSvgNode("g");
                    var regionMatched = false;

                    regionGroup.setAttribute("class", "hr030-map-region");
                    regionGroup.setAttribute("data-region-id", region.id);
                    regionGroup.setAttribute("role", "button");
                    regionGroup.setAttribute("tabindex", "0");
                    regionGroup.setAttribute("aria-label", region.name + " " + formatNumber(region.headcount) + "명");
                    regionGroup.setAttribute("style", getRegionToneStyle(region.id));

                    provinceIds.forEach(function (provinceId) {
                        var provinceNode = svgEl.querySelector("#" + provinceId);

                        if (!provinceNode) {
                            return;
                        }

                        provinceNode.removeAttribute("style");
                        provinceNode.removeAttribute("fill");
                        provinceNode.removeAttribute("stroke");
                        provinceNode.setAttribute("vector-effect", "non-scaling-stroke");
                        provinceNode.setAttribute("class", "hr030-map-shape hr030-map-province-shape");
                        regionGroup.appendChild(provinceNode);
                        usedProvinceIds[provinceId] = true;
                        regionMatched = true;
                    });

                    if (regionMatched) {
                        provinceLayer.appendChild(regionGroup);
                        regionGroupMap[region.id] = regionGroup;
                    }
                });

                provinceNodes.forEach(function (provinceNode) {
                    if (usedProvinceIds[provinceNode.id]) {
                        return;
                    }

                    provinceNode.removeAttribute("style");
                    provinceNode.removeAttribute("fill");
                    provinceNode.removeAttribute("stroke");
                    provinceNode.setAttribute("vector-effect", "non-scaling-stroke");
                    provinceNode.setAttribute("class", "hr030-map-shape hr030-map-province-shape is-muted");
                    unmappedGroup.appendChild(provinceNode);
                });

                if (unmappedGroup.childNodes.length) {
                    provinceLayer.appendChild(unmappedGroup);
                }

                while (svgEl.firstChild) {
                    svgEl.removeChild(svgEl.firstChild);
                }

                svgEl.appendChild(provinceLayer);

                container.innerHTML = "";
                container.appendChild(svgEl);

                overallBounds = getNodeBounds(provinceLayer);

                dashboardData.map.regions.forEach(function (region) {
                    var regionGroup = provinceLayer.querySelector('[data-region-id="' + region.id + '"]');
                    var regionBounds = getNodeBounds(regionGroup);
                    var offset = regionBadgeOffsetMap[region.id] || {};
                    var badgeWidth;
                    var badgeHeight;
                    var centerX;
                    var centerY;
                    var badgeBounds;

                    if (!regionBounds) {
                        return;
                    }

                    regionBoundsMap[region.id] = regionBounds;

                    badgeWidth = Math.max(44, Math.min(82, region.name.length * 11 + 18));
                    badgeHeight = 44;
                    centerX = regionBounds.x + regionBounds.width / 2 + (offset.dx || 0);
                    centerY = regionBounds.y + regionBounds.height / 2 + (offset.dy || 0);
                    badgeBounds = {
                        x: centerX - badgeWidth / 2,
                        y: centerY - badgeHeight / 2,
                        width: badgeWidth,
                        height: badgeHeight
                    };

                    badgeLayouts.push({
                        region: region,
                        x: centerX,
                        y: centerY,
                        width: badgeWidth,
                        height: badgeHeight
                    });
                    overallBounds = mergeBounds(overallBounds, badgeBounds);
                });

                if (overallBounds) {
                    svgEl.setAttribute("viewBox", [
                        formatSvgNumber(overallBounds.x - 10),
                        formatSvgNumber(overallBounds.y - 12),
                        formatSvgNumber(overallBounds.width + 20),
                        formatSvgNumber(overallBounds.height + 24)
                    ].join(" "));
                }

                badgeLayouts.forEach(function (badgeLayout) {
                    var targetRegionGroup = regionGroupMap[badgeLayout.region.id];
                    var hitArea = createSvgNode("rect");
                    var badgeGroup = createSvgNode("g");
                    var badgeBody = createSvgNode("g");
                    var badgeRect = createSvgNode("rect");
                    var nameText = createSvgNode("text");
                    var valueText = createSvgNode("text");
                    var hitWidth = Math.max(66, Math.min(92, badgeLayout.width + 18));
                    var hitHeight = Math.max(48, Math.min(62, badgeLayout.height + 18));

                    hitArea.setAttribute("class", "hr030-map-hit-area");
                    hitArea.setAttribute("x", formatSvgNumber(-hitWidth / 2));
                    hitArea.setAttribute("y", formatSvgNumber(-hitHeight / 2));
                    hitArea.setAttribute("width", formatSvgNumber(hitWidth));
                    hitArea.setAttribute("height", formatSvgNumber(hitHeight));
                    hitArea.setAttribute("rx", "20");

                    badgeGroup.setAttribute("class", "hr030-map-badge");
                    badgeGroup.setAttribute("transform", "translate(" + formatSvgNumber(badgeLayout.x) + " " + formatSvgNumber(badgeLayout.y) + ")");
                    badgeBody.setAttribute("class", "hr030-map-badge-body");

                    badgeRect.setAttribute("x", formatSvgNumber(-badgeLayout.width / 2));
                    badgeRect.setAttribute("y", formatSvgNumber(-badgeLayout.height / 2));
                    badgeRect.setAttribute("width", formatSvgNumber(badgeLayout.width));
                    badgeRect.setAttribute("height", formatSvgNumber(badgeLayout.height));
                    badgeRect.setAttribute("rx", "15");

                    nameText.setAttribute("class", "hr030-map-badge-name");
                    nameText.setAttribute("x", "0");
                    nameText.setAttribute("y", "-10");
                    nameText.textContent = badgeLayout.region.name;

                    valueText.setAttribute("class", "hr030-map-badge-value");
                    valueText.setAttribute("x", "0");
                    valueText.setAttribute("y", "14");
                    valueText.textContent = formatNumber(badgeLayout.region.headcount);

                    badgeBody.appendChild(badgeRect);
                    badgeBody.appendChild(nameText);
                    badgeBody.appendChild(valueText);
                    badgeGroup.appendChild(hitArea);
                    badgeGroup.appendChild(badgeBody);

                    if (targetRegionGroup) {
                        targetRegionGroup.appendChild(badgeGroup);
                        badgeGroupMap[badgeLayout.region.id] = badgeGroup;
                    }
                });

                state.mapSvgElement = svgEl;
                state.mapSvgContainer = container;
                state.mapRegionGroupMap = regionGroupMap;
                state.mapRegionBoundsMap = regionBoundsMap;
                state.mapBadgeGroupMap = badgeGroupMap;

                syncRegionMapSelectionState();
            } catch (error) {
                renderRegionMapFallback();
            }
        }

        if (noteEl) {
            noteEl.innerHTML = "";
        }
    }

    // 선택한 권역의 핵심 수치와 투입 가능 비율 카드를 렌더링한다
    // 선택한 권역의 상세 KPI와 비율 바를 렌더링한다.
    function renderRegionDetail() {
        var region = getCurrentRegion();
        var detailEl = byId("hr030RegionDetail");
        var availableRatio = region.headcount ? Math.round((region.available / region.headcount) * 100) : 0;
        var previousRatio = Number(state.regionRatioValue || 0);
        var stats = [
            { label: "총 인원", value: formatNumber(region.headcount) + "명" },
            { label: "투입 가능", value: formatNumber(region.available) + "명" },
            { label: "현재 투입", value: formatNumber(region.active) + "명" },
            { label: "평균 경력", value: escapeHtml(region.avgCareer) }
        ];
        detailEl.innerHTML = [
            '<div class="hr030-region-detail-head hr030-region-detail-head--compact">',
            '  <span class="hr030-region-detail-skill">주력 ' + escapeHtml(region.leadSkill) + "</span>",
            "</div>",
            '<div class="hr030-region-stat-grid">',
            stats.map(function (item) {
                return [
                    '<div class="hr030-region-stat-card">',
                    '  <span>' + escapeHtml(item.label) + "</span>",
                    '  <strong>' + item.value + "</strong>",
                    "</div>"
                ].join("");
            }).join(""),
            "</div>",
            '<div class="hr030-region-summary-grid">',
            '  <div class="hr030-region-summary-card hr030-region-summary-card--ratio">',
            '    <span>투입 가능 비율</span>',
            '    <div class="hr030-region-ratio-row">',
            '      <strong>' + formatNumber(availableRatio) + "%</strong>",
            '      <div class="hr030-region-ratio-bar"><i style="width:' + escapeHtml(previousRatio) + '%" data-target-width="' + escapeHtml(availableRatio) + '"></i></div>',
            "    </div>",
            "  </div>",
            "</div>"
        ].join("");

        animateRegionRatioBar(detailEl, availableRatio);
    }

    // 권역 상세 카드의 투입 가능 비율 바를 이전 값에서 다음 값으로 부드럽게 이동시킨다
    function animateRegionRatioBar(detailEl, nextRatio) {
        var ratioBarFill;

        if (!detailEl) {
            return;
        }

        ratioBarFill = detailEl.querySelector(".hr030-region-ratio-bar i");

        if (!ratioBarFill) {
            state.regionRatioValue = nextRatio;
            return;
        }

        if (state.regionRatioAnimationFrame) {
            window.cancelAnimationFrame(state.regionRatioAnimationFrame);
            state.regionRatioAnimationFrame = null;
        }

        state.regionRatioAnimationFrame = window.requestAnimationFrame(function () {
            ratioBarFill.style.width = String(nextRatio) + "%";
            state.regionRatioValue = nextRatio;
            state.regionRatioAnimationFrame = null;
        });
    }

    // 차트 공통 설정과 중앙 카드 차트 렌더링
    // 차트 인스턴스를 안전하게 정리해 메모리 누수를 막는다.
    function destroyChart(chartKey) {
        if (state.charts[chartKey]) {
            if (typeof state.charts[chartKey].dispose === "function") {
                state.charts[chartKey].dispose();
            } else if (typeof state.charts[chartKey].destroy === "function") {
                state.charts[chartKey].destroy();
            }
            state.charts[chartKey] = null;
        }
    }

    // 같은 DOM이면 기존 ECharts 인스턴스를 재사용하고 아니면 새로 만든다.
    function getOrCreateEChart(chartKey, chartEl, initOptions) {
        var chart = state.charts[chartKey];
        var existingChart;

        if (!chartEl || typeof echarts !== "object" || typeof echarts.init !== "function") {
            return null;
        }

        if (chart && typeof chart.getDom === "function" && chart.getDom() === chartEl) {
            return chart;
        }

        existingChart = typeof echarts.getInstanceByDom === "function" ? echarts.getInstanceByDom(chartEl) : null;

        if (existingChart) {
            state.charts[chartKey] = existingChart;
            return existingChart;
        }

        destroyChart(chartKey);
        chartEl.innerHTML = "";
        state.charts[chartKey] = echarts.init(chartEl, null, initOptions || { renderer: "svg" });
        return state.charts[chartKey];
    }

    // 같은 canvas를 쓰는 Chart.js 인스턴스를 재사용하고 아니면 새로 만든다.
    function getOrCreateChartJs(chartKey, canvas, config) {
        var chart = state.charts[chartKey];

        if (!canvas || typeof Chart !== "function") {
            return null;
        }

        if (chart && chart.canvas === canvas) {
            return chart;
        }

        destroyChart(chartKey);
        state.charts[chartKey] = new Chart(canvas, config);
        return state.charts[chartKey];
    }

    // Chart.js 공통 폰트와 색상 기본값을 적용한다.
    function applyChartDefaults() {
        if (typeof Chart !== "function") {
            return;
        }

        Chart.defaults.font.family = dashboardFontFamily;
        Chart.defaults.font.size = 12;
        Chart.defaults.color = "#64748b";
    }

    // 브라우저 리사이즈 시 모든 차트 크기를 다시 맞춘다.
    function resizeCharts() {
        Object.keys(state.charts).forEach(function (chartKey) {
            var chart = state.charts[chartKey];

            if (chart && typeof chart.resize === "function") {
                chart.resize();
            }
        });
    }

    // 주력 기술 카드 진입 애니메이션 클래스를 다시 실행한다.
    function replaySkillChartEntry(chartEl) {
        var chartWrap = chartEl && chartEl.closest(".hr030-skill-chart-wrap");

        if (!chartWrap) {
            return;
        }

        chartWrap.classList.remove("is-entering");
        void chartWrap.offsetWidth;
        chartWrap.classList.add("is-entering");

        if (state.skillChartEnterTimer) {
            window.clearTimeout(state.skillChartEnterTimer);
        }

        state.skillChartEnterTimer = window.setTimeout(function () {
            chartWrap.classList.remove("is-entering");
            state.skillChartEnterTimer = null;
        }, 820);
    }

    // 중앙 카드의 주력 기술 트리맵과 우측 요약 리스트를 함께 갱신한다
    function renderSkillDistribution() {
        var currentRegion = getCurrentRegion();
        var chartEl = byId("hr030SkillChart");
        var skillChart;
        var listEl = byId("hr030SkillList");
        var skills = buildRegionSkillDistribution(currentRegion.skills);
        var summarySkills;
        var summaryLabel;
        var treemapData;
        var total;
        var topSkill;
        var shouldPlayEntry;
        var baseOption;

        total = skills.reduce(function (sum, item) {
            return sum + (item.value || 0);
        }, 0);
        topSkill = skills.reduce(function (best, item) {
            if (!best || (item.value || 0) > (best.value || 0)) {
                return item;
            }

            return best;
        }, null);
        summarySkills = skills.filter(function (item) {
            return item.label !== "기타";
        });
        summaryLabel = state.skillViewMode === "top3" ? "상위 3개" : state.skillViewMode === "top5" ? "상위 5개" : "기타 제외 전체";

        if (listEl && !summarySkills.length) {
            listEl.innerHTML = '<div class="hr030-empty-state">표시할 주요 기술 태그가 없습니다.</div>';
        }

        if (listEl && summarySkills.length) {
            listEl.innerHTML = [
                '<div class="hr030-skill-summary-label">' + summaryLabel + "</div>",
                summarySkills.map(function (item) {
                var percent = total ? ((item.value / total) * 100).toFixed(1) : "0.0";

                return [
                    '<div class="hr030-skill-item">',
                    '  <div class="hr030-skill-item-head">',
                    '    <div class="hr030-skill-item-main">',
                    '      <span class="hr030-skill-dot" style="background:' + escapeHtml(item.color) + '"></span>',
                    '      <div class="hr030-skill-copy">',
                    '        <strong>' + escapeHtml(item.label) + "</strong>",
                    "      </div>",
                    "    </div>",
                    '    <div class="hr030-skill-side">',
                    '      <span class="hr030-skill-count">' + formatNumber(item.value) + "명</span>",
                    '      <strong class="hr030-skill-share">' + percent + "%</strong>",
                    "    </div>",
                    "  </div>",
                    '  <span class="hr030-skill-bar"><i style="width:' + percent + '%;background:' + escapeHtml(item.color) + '"></i></span>',
                    "</div>"
                ].join("");
            }).join("")
            ].join("");
        }

        if (!chartEl) {
            return;
        }

        if (!skills.length) {
            destroyChart("skills");
            chartEl.innerHTML = '<div class="hr030-empty-state">표시할 기술 스택 데이터가 없습니다.</div>';
            return;
        }

        if (typeof echarts !== "object" || typeof echarts.init !== "function") {
            return;
        }

        treemapData = buildSkillTreemapData(skills);
        shouldPlayEntry = !(state.charts.skills && typeof state.charts.skills.getDom === "function" && state.charts.skills.getDom() === chartEl);
        skillChart = getOrCreateEChart("skills", chartEl, { renderer: "svg" });

        if (!skillChart) {
            return;
        }

        baseOption = {
            animation: true,
            animationDuration: 240,
            animationDurationUpdate: 900,
            animationEasing: "quarticOut",
            animationEasingUpdate: "quarticOut",
            tooltip: {
                backgroundColor: "rgba(15, 23, 42, 0.92)",
                borderWidth: 0,
                textStyle: {
                    color: "#ffffff",
                    fontFamily: dashboardFontFamily
                },
                formatter: function (params) {
                    var value = Number(params.value || 0);
                    var share = total ? formatPercent((value / total) * 100) : "0.0";
                    var path = (params.treePathInfo || []).map(function (item) {
                        return item.name;
                    }).filter(Boolean).slice(1).join(" / ");

                        return [
                        '<div style="display:grid;gap:4px;min-width:120px;">',
                        '  <strong style="font-size:14px;font-weight:700;">' + escapeHtml(params.name || "") + "</strong>",
                        path ? '  <span style="font-size:12px;opacity:0.78;">' + escapeHtml(path) + "</span>" : "",
                        '  <span style="font-size:13px;">' + formatNumber(value) + "명 · " + share + "%</span>",
                        "</div>"
                    ].join("");
                }
            },
            series: [{
                type: "treemap",
                cursor: "default",
                left: 0,
                right: 0,
                top: 4,
                bottom: 0,
                width: "100%",
                height: "100%",
                roam: false,
                nodeClick: false,
                emphasis: {
                    disabled: true
                },
                breadcrumb: { show: false },
                visibleMin: 20,
                sort: "desc",
                squareRatio: 1,
                label: {
                    show: true,
                    formatter: function (params) {
                        var value = Number(params.value || 0);

                        if (value < 2) {
                            return "";
                        }

                        return params.name;
                    },
                    color: "#ffffff",
                    fontFamily: dashboardFontFamily,
                    fontSize: 14,
                    fontWeight: 700
                },
                upperLabel: {
                    show: true,
                    height: 18,
                    color: "#334155",
                    fontFamily: dashboardFontFamily,
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 16
                },
                itemStyle: {
                    borderColor: "#ffffff",
                    borderWidth: 1,
                    gapWidth: 1,
                    borderRadius: 2
                },
                levels: [
                    {
                        itemStyle: {
                            borderColor: "transparent",
                            borderWidth: 0,
                            gapWidth: 1
                        }
                    },
                    {
                        upperLabel: {
                            show: true,
                            height: 18,
                            color: "#24304a",
                            fontFamily: dashboardFontFamily,
                            fontSize: 12,
                            fontWeight: 700,
                            lineHeight: 16
                        },
                        itemStyle: {
                            borderColor: "#ffffff",
                            borderWidth: 1,
                            gapWidth: 1,
                            borderRadius: 2
                        }
                    },
                    {
                        label: {
                            show: true,
                            color: "#ffffff",
                            fontFamily: dashboardFontFamily,
                            fontSize: 14,
                            fontWeight: 700
                        },
                        itemStyle: {
                            borderColor: "#ffffff",
                            borderWidth: 1,
                            gapWidth: 1,
                            borderRadius: 2
                        }
                    }
                ],
                universalTransition: true,
                data: shouldPlayEntry ? buildSkillTreemapSeedData(treemapData) : treemapData
            }]
        };

        skillChart.setOption(baseOption, { notMerge: true, lazyUpdate: true });

        if (shouldPlayEntry) {
            replaySkillChartEntry(chartEl);
        }

        if (state.skillTreemapMorphTimer) {
            window.clearTimeout(state.skillTreemapMorphTimer);
        }

        if (shouldPlayEntry) {
            state.skillTreemapMorphTimer = window.setTimeout(function () {
                if (!state.charts.skills) {
                    return;
                }

                state.charts.skills.setOption({
                    series: [{
                        type: "treemap",
                        universalTransition: true,
                        data: treemapData
                    }]
                });
            }, 60);
        }

        requestAnimationFrame(function () {
            if (skillChart && typeof skillChart.resize === "function") {
                skillChart.resize();
            }
        });
    }

    // 우측 카드: 가용 인력 요약 차트와 리스트 렌더링
    // 우측 카드의 가용 인력 차트와 리스트를 같은 기준으로 렌더링한다
    function renderAvailabilityPanel(employeeRows) {
        var canvas = byId("hr030AvailabilityChart");
        var availabilityChart;
        var summaryEl = byId("hr030AvailabilitySummary");
        var listEl = byId("hr030AvailabilityList");
        var availabilityStatuses = {
            "투입중": true,
            "대기중": true,
            "종료예정": true
        };
        var statusSortOrder = {
            "대기중": 0,
            "종료예정": 1,
            "투입중": 2
        };
        var relevantRows = employeeRows.filter(function (item) {
            if (!availabilityStatuses[item.status]) {
                return false;
            }

            if (state.availabilityCardFilter !== "all" && item.status !== state.availabilityCardFilter) {
                return false;
            }

            return true;
        }).slice().sort(function (a, b) {
            var toneDiff = (statusSortOrder[a.status] || 99) - (statusSortOrder[b.status] || 99);

            if (toneDiff !== 0) {
                return toneDiff;
            }

            return String(a.availableDate || "").localeCompare(String(b.availableDate || ""));
        });
        var summaryData = availabilityStatusMeta.map(function (item) {
            var value = relevantRows.filter(function (row) {
                return row.status === item.label;
            }).length;

            return {
                label: item.label,
                value: value,
                color: item.color
            };
        }).filter(function (item) {
            return state.availabilityCardFilter === "all" || item.label === state.availabilityCardFilter;
        });
        var total = summaryData.reduce(function (sum, item) {
            return sum + item.value;
        }, 0);

        if (summaryEl) {
            summaryEl.innerHTML = summaryData.map(function (item) {
                var share = total ? formatPercent((item.value / total) * 100) : "0.0";

                return [
                    '<div class="hr030-status-card">',
                    '  <span class="hr030-status-card-label"><i style="background:' + escapeHtml(item.color) + '"></i>' + escapeHtml(item.label) + "</span>",
                    '  <strong>' + formatNumber(item.value) + "명</strong>",
                    '  <span class="hr030-status-card-meta">' + share + "%</span>",
                    "</div>"
                ].join("");
            }).join("");
        }

        if (listEl) {
            if (!relevantRows.length) {
                listEl.innerHTML = '<div class="hr030-empty-state">조건에 맞는 가용 인력 데이터가 없습니다.</div>';
            } else {
                listEl.innerHTML = relevantRows.map(function (item) {
                    return [
                        '<div class="hr030-person-row">',
                        '  <div class="hr030-person-main">',
                        '    <strong>' + escapeHtml(item.name) + "</strong>",
                        '    <span>' + escapeHtml(getPrimaryCategory(item)) + " · " + escapeHtml(item.region) + " · " + escapeHtml(item.availableDate) + "</span>",
                        "  </div>",
                        '  <div class="hr030-person-actions">',
                        "    " + renderStatusBadge(item.status),
                        '    <button type="button" class="hr030-person-detail-button" data-detail-name="' + escapeHtml(item.name) + '" data-detail-region="' + escapeHtml(item.regionId || "") + '">상세보기</button>',
                        "  </div>",
                        "</div>"
                    ].join("");
                }).join("");
            }
        }

        if (typeof Chart !== "function" || !canvas) {
            return;
        }

        applyChartDefaults();
        availabilityChart = getOrCreateChartJs("availability", canvas, {
            type: "bar",
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderRadius: 999,
                    borderSkipped: false,
                    borderWidth: 0,
                    barThickness: 16,
                    maxBarThickness: 16
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 420,
                    easing: "easeOutCubic"
                },
                layout: {
                    padding: {
                        left: 2,
                        right: 6,
                        top: 2,
                        bottom: 2
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        displayColors: false,
                        callbacks: {}
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        border: { display: false },
                        grid: {
                            color: "rgba(235, 227, 215, 0.9)",
                            drawTicks: false
                        },
                        ticks: {
                            precision: 0,
                            color: "#8e887d",
                            font: {
                                family: dashboardFontFamily,
                                size: 11
                            },
                            callback: function (value) {
                                return value + "명";
                            }
                        }
                    },
                    y: {
                        border: { display: false },
                        grid: { display: false },
                        ticks: {
                            color: "#5f5b55",
                            font: {
                                family: dashboardFontFamily,
                                size: 12,
                                weight: 700
                            }
                        }
                    }
                }
            }
        });

        if (!availabilityChart) {
            return;
        }

        availabilityChart.data.labels = summaryData.map(function (item) { return item.label; });
        availabilityChart.data.datasets[0].data = summaryData.map(function (item) { return item.value; });
        availabilityChart.data.datasets[0].backgroundColor = summaryData.map(function (item) { return item.color; });
        availabilityChart.options.plugins.tooltip.callbacks.label = function (context) {
            var value = Number(context.raw || 0);
            var share = total ? formatPercent((value / total) * 100) : "0.0";

            return context.label + " " + formatNumber(value) + "명 (" + share + "%)";
        };
        availabilityChart.update();
    }

    // 경력 구간 분포 차트와 리스트를 렌더링한다.
    function renderCategoryDistribution(employeeRows) {
        var canvas = byId("hr030CategoryChart");
        var categoryChart;
        var listEl = byId("hr030CategoryList");
        var categories = careerBandMeta.map(function (item) {
            return {
                key: item.key,
                label: item.label,
                description: item.description,
                color: item.color,
                value: 0
            };
        });
        var total;

        employeeRows.forEach(function (item) {
            var band = getCareerBand(item);
            var target = categories.find(function (category) {
                return category.key === band.key;
            });

            if (target) {
                target.value += 1;
            }
        });

        total = categories.reduce(function (sum, item) {
            return sum + item.value;
        }, 0);

        if (listEl) {
            if (!total) {
                listEl.innerHTML = '<div class="hr030-empty-state">표시할 경력 기준 데이터가 없습니다.</div>';
            } else {
                listEl.innerHTML = categories.map(function (item) {
                    var percent = total ? ((item.value / total) * 100).toFixed(1) : "0.0";

                    return [
                        '<div class="hr030-skill-item">',
                        '  <div class="hr030-skill-item-head">',
                        '    <div class="hr030-skill-item-main">',
                        '      <span class="hr030-skill-dot" style="background:' + escapeHtml(item.color) + '"></span>',
                        '      <div class="hr030-skill-copy">',
                        '        <strong>' + escapeHtml(item.label) + "</strong>",
                        '        <span>' + escapeHtml(item.description) + "</span>",
                        "      </div>",
                        "    </div>",
                        '    <div class="hr030-skill-side">',
                        '      <span class="hr030-skill-count">' + formatNumber(item.value) + "명</span>",
                        '      <strong class="hr030-skill-share">' + percent + "%</strong>",
                        "    </div>",
                        "  </div>",
                        '  <span class="hr030-skill-bar"><i style="width:' + percent + '%;background:' + escapeHtml(item.color) + '"></i></span>',
                        "</div>"
                    ].join("");
                }).join("");
            }
        }

        if (typeof Chart !== "function" || !canvas) {
            return;
        }

        applyChartDefaults();
        categoryChart = getOrCreateChartJs("category", canvas, {
            type: "bar",
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderRadius: 8,
                    borderSkipped: false,
                    borderWidth: 0,
                    barThickness: 14,
                    maxBarThickness: 14
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 2,
                        right: 4,
                        top: 0,
                        bottom: 0
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        displayColors: false,
                        callbacks: {}
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        border: { display: false },
                        grid: {
                            color: "rgba(235, 227, 215, 0.72)",
                            drawTicks: false
                        },
                        ticks: {
                            precision: 0,
                            color: "#8e887d",
                            font: {
                                family: dashboardFontFamily,
                                size: 11
                            },
                            callback: function (value) {
                                return value + "명";
                            }
                        }
                    },
                    y: {
                        border: { display: false },
                        grid: { display: false },
                        ticks: {
                            color: "#5f5b55",
                            font: {
                                family: dashboardFontFamily,
                                size: 12,
                                weight: 700
                            }
                        }
                    }
                }
            }
        });

        if (!categoryChart) {
            return;
        }

        categoryChart.data.labels = categories.map(function (item) { return item.label; });
        categoryChart.data.datasets[0].data = categories.map(function (item) { return item.value; });
        categoryChart.data.datasets[0].backgroundColor = categories.map(function (item) { return item.color; });
        categoryChart.options.plugins.tooltip.callbacks.label = function (context) {
            var value = Number(context.raw || 0);
            var share = total ? formatPercent((value / total) * 100) : "0.0";

            return context.label + " " + formatNumber(value) + "명 (" + share + "%)";
        };
        categoryChart.update();
    }

    // 예비 위젯용 운영 이슈 렌더러
    function renderIssueSummary(issueRows) {
        var summaryEl = byId("hr030IssueSummary");
        var reviewCount = issueRows.filter(function (item) { return item.status === "검토중"; }).length;
        var endingCount = issueRows.filter(function (item) { return item.status === "종료예정"; }).length;

        summaryEl.innerHTML = [
            '<div class="hr030-issue-summary-card">',
            '  <span>검토중</span>',
            '  <strong>' + formatNumber(reviewCount) + "건</strong>",
            "</div>",
            '<div class="hr030-issue-summary-card">',
            '  <span>종료예정</span>',
            '  <strong>' + formatNumber(endingCount) + "건</strong>",
            "</div>"
        ].join("");
    }

    function renderIssueList(issueRows) {
        var container = byId("hr030IssueList");

        if (!issueRows.length) {
            container.innerHTML = '<div class="hr030-empty-state">조건에 맞는 운영 이슈가 없습니다.</div>';
            return;
        }

        container.innerHTML = issueRows.map(function (item) {
            return [
                '<article class="hr030-list-item hr030-issue-item">',
                '  <div class="hr030-list-main">',
                '    <div class="hr030-list-title-row">',
                "      " + renderStatusBadge(item.severity),
                "      " + renderStatusBadge(item.status),
                "    </div>",
                '    <strong>' + escapeHtml(item.title) + "</strong>",
                '    <p>' + escapeHtml(item.summary) + "</p>",
                "  </div>",
                '  <div class="hr030-list-side">',
                '    <span class="hr030-list-code">' + escapeHtml(item.region) + " · " + escapeHtml(item.requestedAt) + "</span>",
                '    <span class="hr030-list-due">' + escapeHtml(item.dueText) + "</span>",
                "  </div>",
                "</article>"
            ].join("");
        }).join("");
    }

    // 카드 헤더와 상단 고정 콘텐츠 갱신
    function setStaticContent() {
        var alertButton = document.querySelector(".hr030-admin-alert");
        var alertCount = dashboardData.alertCount || 0;
        var alertCountEl = byId("hr030AlertCount");

        if (alertCountEl) {
            alertCountEl.textContent = alertCount > 0 ? String(alertCount) : "";
        }

        if (alertButton) {
            alertButton.setAttribute("aria-label", alertCount > 0 ? "알림 " + alertCount + "건" : "알림");
        }

        byId("hr030KpiGrid").innerHTML = dashboardData.kpis.map(renderDashboardCard).join("");
        initializeIcons();
    }

    // 화면 헤더와 카드 제목, 선택 콤보 상태를 현재 조건에 맞춰 갱신한다
    function updateHeaders(employeeRows) {
        var currentRegion = getCurrentRegion();
        var regionOptions = [{ value: "all", label: "전체" }].concat(dashboardData.map.regions.map(function (region) {
            return { value: region.id, label: region.name };
        }));
        var skillOptions = [
            { value: "all", label: "전체" },
            { value: "top5", label: "상위 5개" },
            { value: "top3", label: "상위 3개" }
        ];
        var availabilityOptions = [
            { value: "all", label: "전체" },
            { value: "투입중", label: "투입중" },
            { value: "대기중", label: "대기중" },
            { value: "종료예정", label: "종료예정" }
        ];
        var availabilityCount = employeeRows.filter(function (item) {
            return item.status === "투입중" || item.status === "대기중" || item.status === "종료예정";
        }).filter(function (item) {
            return state.availabilityCardFilter === "all" || item.status === state.availabilityCardFilter;
        }).length;
        var regionHeader = byId("hr030RegionHeader");
        var detailHeader = byId("hr030DetailHeader");
        var skillHeader = byId("hr030SkillHeader");
        var availabilityHeader = byId("hr030AvailabilityHeader");
        var placeholderHeader = byId("hr030PlaceholderHeader");
        var availabilityListHeader = byId("hr030AvailabilityListHeader");

        if (regionHeader) {
            regionHeader.innerHTML = renderSectionHeader({
                title: "지역별 인력 지도",
                description: "권역을 클릭하면 상세 지표와 주력 기술 구성이 함께 바뀝니다.",
                controlHtml: renderHeaderSelect({
                    type: "region",
                    card: "map",
                    label: "지역 선택",
                    value: state.selectedRegionId,
                    options: regionOptions
                })
            });
        }

        if (detailHeader) {
            detailHeader.innerHTML = renderSectionHeader({
                title: state.selectedRegionId === "all" ? "전체 권역 상세" : currentRegion.name + " 상세",
                description: "선택한 권역의 주요 운영 수치를 확인합니다.",
                controlHtml: renderHeaderSelect({
                    type: "region",
                    card: "detail",
                    label: "상세 지역 선택",
                    value: state.selectedRegionId,
                    options: regionOptions
                })
            });
        }

        if (skillHeader) {
            skillHeader.innerHTML = renderSectionHeader({
                title: "주력 기술 분포",
                description: currentRegion.name + " 권역 기준 실제 기술태그 상위 분포",
                controlHtml: renderHeaderSelect({
                    type: "skill-view",
                    card: "skills",
                    label: "기술 보기 기준",
                    value: state.skillViewMode,
                    options: skillOptions
                })
            });
        }

        if (availabilityHeader) {
            availabilityHeader.innerHTML = renderSectionHeader({
                title: "가용 인력 / 투입 가능 인원",
                description: currentRegion.name + " 기준 상태별 인원 요약과 즉시 확인 리스트",
                controlHtml: renderHeaderSelect({
                    type: "availability-view",
                    card: "availability",
                    label: "가용 인력 보기 기준",
                    value: state.availabilityCardFilter,
                    options: availabilityOptions
                })
            });
        }

        if (placeholderHeader) {
            placeholderHeader.innerHTML = renderSectionHeader({
                title: "추가 카드",
                description: "추후 운영 위젯을 배치할 수 있는 준비 영역입니다.",
                controlHtml: renderHeaderSelect({
                    type: "placeholder-view",
                    card: "placeholder",
                    label: "추가 카드 보기 기준",
                    value: "all",
                    options: [{ value: "all", label: "전체" }]
                })
            });
        }

        if (availabilityListHeader) {
            availabilityListHeader.innerHTML = "<strong>가용 인력 리스트</strong><span>조건 일치 " + formatNumber(availabilityCount) + "명</span>";
        }
    }

    // 현재 필터 상태 기준으로 지도, 상세, 차트, 리스트를 한 번에 다시 그린다
    function renderDashboard() {
        var employeeRows = getVisibleEmployees();
        var issueRows = getVisibleIssues();

        updateHeaders(employeeRows);
        updateSearchResultNote(employeeRows, issueRows);
        renderRegionMap();
        renderRegionDetail();
        renderAvailabilityPanel(employeeRows);
        renderSkillDistribution();
    }

    // 사용자 입력과 카드 인터랙션 이벤트를 묶어서 연결한다
    // 검색창 입력을 대시보드 재렌더와 연결한다.
    function bindSearch() {
        var searchInput = byId("hr030DashboardSearch");

        if (!searchInput) {
            return;
        }

        searchInput.addEventListener("input", function (event) {
            state.query = event.target.value || "";
            renderDashboard();
        });
    }

    // 상태 필터 버튼 클릭을 현재 화면 필터와 연결한다.
    function bindStatusFilter() {
        var filterGroup = byId("hr030StatusFilterGroup");

        if (!filterGroup) {
            return;
        }

        filterGroup.addEventListener("click", function (event) {
            var target = event.target.closest("button[data-status-filter]");

            if (!target) {
                return;
            }

            state.statusFilter = target.getAttribute("data-status-filter") || "all";

            Array.prototype.forEach.call(filterGroup.querySelectorAll("button"), function (button) {
                button.classList.toggle("is-active", button === target);
            });

            renderDashboard();
        });
    }

    function bindRegionSelection() {
        var mapEl = byId("hr030RegionMap");
        var resetButton = byId("hr030RegionReset");

        // 이벤트가 걸린 노드에서 권역 id를 거슬러 찾아낸다.
        function findRegionId(target) {
            var node = target;

            while (node && node !== mapEl) {
                if (node.dataset && node.dataset.regionId) {
                    return node.dataset.regionId;
                }

                node = node.parentNode;
            }

            return "";
        }

        if (mapEl) {
            mapEl.addEventListener("click", function (event) {
                var regionId = findRegionId(event.target);
                var svgEl = mapEl.querySelector(".hr030-map-svg--regional");
                var clickPoint = getSvgPointFromEvent(svgEl, event);
                var regionGroup = regionId ? state.mapRegionGroupMap[regionId] : null;
                var ripplePoint = resolveRippleStartPoint(regionGroup, clickPoint, event.target);

                if (!regionId) {
                    return;
                }

                state.mapSelectionRipple = ripplePoint ? {
                    regionId: regionId,
                    x: ripplePoint.x,
                    y: ripplePoint.y
                } : null;
                state.selectedRegionId = regionId;
                renderDashboard();
            });

            mapEl.addEventListener("keydown", function (event) {
                var regionId = findRegionId(event.target);

                if (!regionId || (event.key !== "Enter" && event.key !== " ")) {
                    return;
                }

                event.preventDefault();
                state.selectedRegionId = regionId;
                renderDashboard();
            });
        }

        if (resetButton) {
            resetButton.addEventListener("click", function () {
                state.selectedRegionId = "all";
                renderDashboard();
            });
        }
    }

    // 카드별 select 변경을 공통 상태값과 동기화한다.
    function bindCardSelects() {
        var dashboard = byId("hr030-dashboard");

        if (!dashboard) {
            return;
        }

        dashboard.addEventListener("change", function (event) {
            var target = event.target;
            var selectType;
            var value;

            if (!target || target.tagName !== "SELECT") {
                return;
            }

            selectType = target.getAttribute("data-dashboard-select");
            value = target.value || "all";

            if (selectType === "region") {
                state.selectedRegionId = value;
                renderDashboard();
                return;
            }

            if (selectType === "skill-view") {
                state.skillViewMode = value;
                renderDashboard();
                return;
            }

            if (selectType === "availability-view") {
                state.availabilityCardFilter = value;
                renderDashboard();
            }
        });
    }

    // Lucide 아이콘을 현재 DOM 기준으로 다시 그린다.
    function initializeIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    // 초기 진입 시점 부트스트랩
    // 첫 진입 시 정적 영역, 데이터 로드, 이벤트 바인딩을 한 번에 부트스트랩한다
    function initialize() {
        setStaticContent();
        loadRegionMapSvg();
        renderDashboard();
        loadSkillCatalog();
        bindSearch();
        bindStatusFilter();
        bindRegionSelection();
        bindCardSelects();
        window.addEventListener("resize", resizeCharts);
        initializeIcons();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();

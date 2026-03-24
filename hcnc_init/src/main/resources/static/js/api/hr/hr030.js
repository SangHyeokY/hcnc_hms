(function () {
    var dashboardData = window.HR030_DASHBOARD_DATA;

    if (!dashboardData) {
        return;
    }

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

    var state = {
        query: "",
        statusFilter: "all",
        selectedRegionId: dashboardData.map.defaultRegionId || "all",
        employeeTable: null,
        charts: {
            skills: null
        }
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("ko-KR").format(value || 0);
    }

    function formatPercent(value) {
        return (Math.round((value || 0) * 10) / 10).toFixed(1);
    }

    function normalizeText(value) {
        return String(value == null ? "" : value).replace(/\s+/g, "").toLowerCase();
    }

    function getTodayLabel() {
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long"
        }).format(new Date());
    }

    function getAvatarText(name) {
        var cleanName = String(name || "").trim();

        if (cleanName.length < 2) {
            return cleanName || "관리";
        }

        return cleanName.slice(-2);
    }

    function getToneClass(label) {
        return statusToneMap[label] || "slate";
    }

    function renderStatusBadge(label) {
        return '<span class="hr030-status-badge is-' + getToneClass(label) + '">' + escapeHtml(label) + "</span>";
    }

    function renderSectionHeader(options) {
        return [
            '<div class="hr030-section-head">',
            '  <div class="hr030-section-copy">',
            '    <h5>' + escapeHtml(options.title) + "</h5>",
            '    <p>' + escapeHtml(options.description) + "</p>",
            "  </div>",
            '  <span class="hr030-section-meta">' + escapeHtml(options.meta) + "</span>",
            "</div>"
        ].join("");
    }

    function renderDashboardCard(item) {
        return [
            '<article class="hr030-kpi-card" aria-label="' + escapeHtml(item.label) + '">',
            '  <div class="hr030-kpi-top">',
            '    <span class="hr030-kpi-label">' + escapeHtml(item.label) + "</span>",
            '    <span class="hr030-kpi-delta is-' + escapeHtml(item.deltaTone) + '">' + escapeHtml(item.delta) + "</span>",
            "  </div>",
            '  <strong class="hr030-kpi-value">' + formatNumber(item.value) + "</strong>",
            '  <p class="hr030-kpi-description">' + escapeHtml(item.description) + "</p>",
            "</article>"
        ].join("");
    }

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

    function matchesSearch(fields) {
        if (!state.query) {
            return true;
        }

        return normalizeText(fields.join(" ")).indexOf(normalizeText(state.query)) > -1;
    }

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

    function formatShortDate(value) {
        var parts = String(value || "").split("-");

        if (parts.length !== 3) {
            return value || "-";
        }

        return parts[1] + "." + parts[2];
    }

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

    function renderRegionMap() {
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

        byId("hr030RegionMapNote").textContent = (selectedId === "all" ? "전체 권역" : getCurrentRegion().name) + " 기준 상세와 주력 기술이 함께 바뀝니다.";
    }

    function renderRegionDetail() {
        var region = getCurrentRegion();
        var detailEl = byId("hr030RegionDetail");
        var isOverview = region.id === "all";
        var projectRows = isOverview ? region.projects.slice(0, 2) : region.projects;
        var stats = [
            { label: "총 인원", value: formatNumber(region.headcount) + "명" },
            { label: "즉시 제안 가능", value: formatNumber(region.available) + "명" },
            { label: "현재 투입", value: formatNumber(region.active) + "명" },
            { label: "운영 이슈", value: formatNumber(region.issueCount) + "건" },
            { label: "평균 경력", value: escapeHtml(region.avgCareer) },
            { label: "평균 희망단가", value: escapeHtml(region.avgRate) }
        ];

        detailEl.classList.toggle("is-overview", isOverview);

        detailEl.innerHTML = [
            '<div class="hr030-region-detail-head">',
            '  <div class="hr030-region-detail-copy">',
            '    <h6>' + escapeHtml(region.name) + ' 상세</h6>',
            '    <p>' + escapeHtml(region.note) + "</p>",
            "  </div>",
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
            '<div class="hr030-region-meta-row">',
            '  <div class="hr030-region-industry-list">',
            region.industries.map(renderStatusBadge).join(""),
            "  </div>",
            '  <div class="hr030-region-ending">종료 예정 ' + formatNumber(region.endingSoon) + "건</div>",
            "</div>",
            '<div class="hr030-region-project-box">',
            '  <div class="hr030-region-project-title">' + (isOverview ? "대표 진행 현황" : "주요 진행 현황") + "</div>",
            '  <div class="hr030-region-project-list">',
            projectRows.map(function (item) {
                return [
                    '<div class="hr030-region-project-item">',
                    '  <div class="hr030-region-project-main">',
                    '    <strong>' + escapeHtml(item.client) + "</strong>",
                    '    <p>' + escapeHtml(item.role) + "</p>",
                    "  </div>",
                    '  <div class="hr030-region-project-side">',
                    "    " + renderStatusBadge(item.status),
                    '    <span>' + escapeHtml(item.dueText) + "</span>",
                    "  </div>",
                    "</div>"
                ].join("");
            }).join(""),
            "  </div>",
            "</div>"
        ].join("");
    }

    function destroyChart(chartKey) {
        if (state.charts[chartKey]) {
            state.charts[chartKey].destroy();
            state.charts[chartKey] = null;
        }
    }

    function renderSkillDistribution() {
        var currentRegion = getCurrentRegion();
        var canvas = byId("hr030SkillChart");
        var listEl = byId("hr030SkillList");
        var skills = currentRegion.skills.slice().sort(function (a, b) {
            return (b.value || 0) - (a.value || 0);
        });
        var total = skills.reduce(function (sum, item) {
            return sum + (item.value || 0);
        }, 0);
        var topSkill = skills.reduce(function (best, item) {
            if (!best || (item.value || 0) > (best.value || 0)) {
                return item;
            }

            return best;
        }, null);
        var topSkillPercent = total && topSkill ? (topSkill.value / total) * 100 : 0;
        var centerLabelPlugin = {
            id: "hr030SkillCenterLabel",
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
                ctx.font = '700 24px "Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif';
                ctx.fillText(formatPercent(topSkillPercent) + "%", x, y - 8);
                ctx.fillStyle = "#75829b";
                ctx.font = '600 11px "Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif';
                ctx.fillText(topSkill ? topSkill.label : "주력 비중", x, y + 16);
                ctx.restore();
            }
        };

        listEl.innerHTML = skills.map(function (item) {
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
        }).join("");

        if (typeof Chart !== "function" || !canvas) {
            return;
        }

        destroyChart("skills");

        Chart.defaults.font.family = '"Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif';
        Chart.defaults.color = "#64748b";

        state.charts.skills = new Chart(canvas, {
            type: "doughnut",
            plugins: [centerLabelPlugin],
            data: {
                labels: skills.map(function (item) { return item.label; }),
                datasets: [{
                    data: skills.map(function (item) { return item.value; }),
                    backgroundColor: skills.map(function (item) { return item.color; }),
                    borderWidth: 0,
                    hoverOffset: 3,
                    spacing: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "54%",
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

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

    function setStaticContent() {
        var alertButton = document.querySelector(".hr030-admin-alert");
        var userName = window.LOGIN_USER && window.LOGIN_USER.name ? window.LOGIN_USER.name : "프리랜서 운영 관리자";
        var alertCount = dashboardData.alertCount || 0;

        byId("hr030TodayLabel").textContent = getTodayLabel();
        byId("hr030AlertCount").textContent = String(alertCount);
        byId("hr030UserName").textContent = userName;
        byId("hr030UserAvatar").textContent = getAvatarText(userName);

        if (alertButton) {
            alertButton.setAttribute("aria-label", "알림 " + alertCount + "건");
        }

        byId("hr030KpiGrid").innerHTML = dashboardData.kpis.map(renderDashboardCard).join("");
    }

    function updateHeaders(employeeRows, issueRows) {
        var currentRegion = getCurrentRegion();

        byId("hr030RegionHeader").innerHTML = renderSectionHeader({
            title: "지역별 인력 지도",
            description: "권역을 클릭하면 상세 지표와 하단 목록이 함께 바뀝니다.",
            meta: state.selectedRegionId === "all" ? "전체 8개 권역" : currentRegion.name
        });

        byId("hr030SkillHeader").innerHTML = renderSectionHeader({
            title: "주력 기술 분포",
            description: currentRegion.name + " 기준 기술 스택 비중",
            meta: "주력 " + currentRegion.leadSkill
        });

        byId("hr030EmployeeHeader").innerHTML = renderSectionHeader({
            title: "최근 등록 인력 목록",
            description: currentRegion.name + " 기준 최근 등록 또는 검색된 인력",
            meta: "총 " + formatNumber(employeeRows.length) + "명"
        });

        byId("hr030IssueHeader").innerHTML = renderSectionHeader({
            title: "운영 이슈 패널",
            description: currentRegion.name + " 기준 지금 확인할 운영 이슈",
            meta: "총 " + formatNumber(issueRows.length) + "건"
        });
    }

    function renderDashboard() {
        var employeeRows = getVisibleEmployees();
        var issueRows = getVisibleIssues();

        updateHeaders(employeeRows, issueRows);
        updateSearchResultNote(employeeRows, issueRows);
        renderRegionMap();
        renderRegionDetail();
        renderSkillDistribution();
        renderEmployeeTable(employeeRows);
        renderIssueSummary(issueRows);
        renderIssueList(issueRows);
    }

    function bindSearch() {
        var searchInput = byId("hr030DashboardSearch");

        searchInput.addEventListener("input", function (event) {
            state.query = event.target.value || "";
            renderDashboard();
        });
    }

    function bindStatusFilter() {
        var filterGroup = byId("hr030StatusFilterGroup");

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

                if (!regionId) {
                    return;
                }

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

    function initializeIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    function initialize() {
        setStaticContent();
        renderDashboard();
        bindSearch();
        bindStatusFilter();
        bindRegionSelection();
        initializeIcons();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();

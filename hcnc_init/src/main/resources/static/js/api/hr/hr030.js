(function () {
    var dashboardData = window.HR030_DASHBOARD_DATA;

    if (!dashboardData) {
        return;
    }

    var employeeStatusMap = {
        "투입중": true,
        "대기중": true,
        "제안중": true,
        "검토중": true
    };

    var approvalStatusMap = {
        "검토중": true,
        "확정": true,
        "보류": true
    };

    var statusToneMap = {
        "검토중": "warning",
        "확정": "success",
        "보류": "danger",
        "투입중": "primary",
        "대기중": "slate",
        "제안중": "info",
        "종료예정": "danger",
        "공유": "slate",
        "인터뷰": "info",
        "미팅": "primary",
        "마감": "warning",
        "투입": "primary",
        "계약": "success",
        "제안": "info",
        "단가": "slate"
    };

    var state = {
        query: "",
        statusFilter: "all",
        employeeTable: null,
        charts: {
            departments: null,
            trend: null,
            attendance: null
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
        return '<span class="hr030-status-badge is-' + getToneClass(label) + '">' + escapeHtml(label) + '</span>';
    }

    function renderSectionHeader(options) {
        return [
            '<div class="hr030-section-head">',
            '  <div class="hr030-section-copy">',
            '    <h5>' + escapeHtml(options.title) + '</h5>',
            '    <p>' + escapeHtml(options.description) + '</p>',
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

    function setStaticContent() {
        var alertButton = document.querySelector(".hr030-admin-alert");
        var userName = window.LOGIN_USER && window.LOGIN_USER.name ? window.LOGIN_USER.name : "프리랜서 운영 관리자";
        var totalEmployees = dashboardData.kpis[0] ? dashboardData.kpis[0].value : 0;
        var alertCount = dashboardData.alertCount || 0;

        byId("hr030TodayLabel").textContent = getTodayLabel();
        byId("hr030AlertCount").textContent = String(alertCount);
        byId("hr030UserName").textContent = userName;
        byId("hr030UserAvatar").textContent = getAvatarText(userName);

        if (alertButton) {
            alertButton.setAttribute("aria-label", "알림 " + alertCount + "건");
        }

        byId("hr030KpiGrid").innerHTML = dashboardData.kpis.map(renderDashboardCard).join("");

        byId("hr030DeptHeader").innerHTML = renderSectionHeader({
            title: "직무별 인원 현황",
            description: "현재 등록 프리랜서 직무 분포",
            meta: "총 " + formatNumber(totalEmployees) + "명"
        });

        byId("hr030TrendHeader").innerHTML = renderSectionHeader({
            title: "최근 6개월 등록/종료 추이",
            description: "등록(블루)과 종료(그레이) 흐름 비교",
            meta: "최근 6개월"
        });

        byId("hr030AttendanceHeader").innerHTML = renderSectionHeader({
            title: "가동 상태 분포",
            description: "투입·제안·대기·종료예정 상태 요약",
            meta: "현재 기준"
        });
    }

    function updateDynamicHeaders(employeeRows, approvalRows, scheduleRows) {
        byId("hr030EmployeeHeader").innerHTML = renderSectionHeader({
            title: "최근 등록 인력 목록",
            description: "기술과 상태를 바로 확인하는 인력 테이블",
            meta: "총 " + formatNumber(employeeRows.length) + "명"
        });

        byId("hr030ApprovalHeader").innerHTML = renderSectionHeader({
            title: "투입 검토 요청 리스트",
            description: "지금 확인할 제안/계약 검토 항목",
            meta: "총 " + formatNumber(approvalRows.length) + "건"
        });

        byId("hr030ScheduleHeader").innerHTML = renderSectionHeader({
            title: "오늘 일정 · 공지",
            description: "미팅, 인터뷰, 공유 일정을 묶어 표시",
            meta: "총 " + formatNumber(scheduleRows.length) + "건"
        });
    }

    function matchesSearch(item, fields) {
        if (!state.query) {
            return true;
        }

        return normalizeText(fields.join(" ")).indexOf(normalizeText(state.query)) > -1;
    }

    function getFilteredEmployees() {
        return dashboardData.recentEmployees.filter(function (item) {
            var matchesStatus = !employeeStatusMap[state.statusFilter] || item.status === state.statusFilter;

            return matchesStatus && matchesSearch(item, [
                item.employeeId,
                item.name,
                item.department,
                item.position,
                item.employmentType,
                item.status
            ]);
        });
    }

    function getFilteredApprovals() {
        return dashboardData.approvals.filter(function (item) {
            var matchesStatus = !approvalStatusMap[state.statusFilter] || item.status === state.statusFilter;

            return matchesStatus && matchesSearch(item, [
                item.requestId,
                item.title,
                item.employeeName,
                item.department,
                item.type,
                item.status
            ]);
        });
    }

    function getFilteredSchedule() {
        return dashboardData.schedule.filter(function (item) {
            return matchesSearch(item, [
                item.time,
                item.category,
                item.title,
                item.description
            ]);
        });
    }

    function updateSearchResultNote(employeeRows, approvalRows, scheduleRows) {
        var noteEl = byId("hr030SearchResultNote");

        if (!noteEl) {
            return;
        }

        if (!state.query) {
            noteEl.textContent = "이름, 기술, 프로젝트, 요청번호 기준으로 빠르게 찾을 수 있습니다.";
            return;
        }

        noteEl.textContent = "검색 결과 인력 " + formatNumber(employeeRows.length) + "명 · 검토 요청 " + formatNumber(approvalRows.length) + "건 · 일정 " + formatNumber(scheduleRows.length) + "건";
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
            placeholder: "조건에 맞는 인력 데이터가 없습니다.",
            headerHozAlign: "center",
            movableColumns: false,
            reactiveData: false,
            columns: [
                { title: "인력ID", field: "employeeId", width: 112, hozAlign: "center", headerSort: true },
                { title: "이름 / 기술", field: "name", minWidth: 220, formatter: employeeNameFormatter, headerSort: true },
                { title: "경력", field: "position", width: 88, hozAlign: "center", headerSort: true },
                { title: "등록일", field: "joinDate", width: 92, hozAlign: "center", headerSort: true, formatter: function (cell) { return formatShortDate(cell.getValue()); } },
                { title: "희망단가", field: "employmentType", width: 104, hozAlign: "center", headerSort: true },
                { title: "상태", field: "status", width: 112, minWidth: 112, widthShrink: 0, hozAlign: "center", headerSort: true, formatter: statusBadgeFormatter }
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
                "  <td>" + escapeHtml(item.position) + "</td>",
                "  <td>" + escapeHtml(formatShortDate(item.joinDate)) + "</td>",
                "  <td>" + escapeHtml(item.employmentType) + "</td>",
                '  <td><div class="hr030-status-cell">' + renderStatusBadge(item.status) + "</div></td>",
                "</tr>"
            ].join("");
        }).join("");

        if (!rowsHtml) {
            rowsHtml = '<tr><td colspan="6" class="hr030-table-empty">조건에 맞는 인력 데이터가 없습니다.</td></tr>';
        }

        container.innerHTML = [
            '<table class="hr030-fallback-table">',
            "  <thead>",
            "    <tr>",
            "      <th>인력ID</th>",
            "      <th>이름 / 기술</th>",
            "      <th>경력</th>",
            "      <th>등록일</th>",
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
        byId("hr030EmployeeTableMeta").textContent = "이름, 기술, 상태 기준으로 정렬할 수 있습니다.";

        if (state.employeeTable) {
            state.employeeTable.setData(dataRows);
            return;
        }

        initEmployeeTable(dataRows);
    }

    function renderApprovalList(dataRows) {
        var container = byId("hr030ApprovalList");

        if (!dataRows.length) {
            container.innerHTML = '<div class="hr030-empty-state">조건에 맞는 검토 요청이 없습니다.</div>';
            return;
        }

        container.innerHTML = dataRows.map(function (item) {
            return [
                '<article class="hr030-list-item hr030-approval-item">',
                '  <div class="hr030-list-main">',
                '    <div class="hr030-list-title-row">',
                "      " + renderStatusBadge(item.status),
                "      " + renderStatusBadge(item.type),
                "    </div>",
                '    <strong>' + escapeHtml(item.title) + "</strong>",
                '    <p>' + escapeHtml(item.employeeName) + " · " + escapeHtml(item.department) + " · 접수 " + escapeHtml(item.requestedAt) + "</p>",
                "  </div>",
                '  <div class="hr030-list-side">',
                '    <span class="hr030-list-code">' + escapeHtml(item.requestId) + "</span>",
                '    <span class="hr030-list-due">' + escapeHtml(item.dueText) + "</span>",
                "  </div>",
                "</article>"
            ].join("");
        }).join("");
    }

    function renderScheduleList(dataRows) {
        var container = byId("hr030ScheduleList");

        if (!dataRows.length) {
            container.innerHTML = '<div class="hr030-empty-state">조건에 맞는 일정이나 공지가 없습니다.</div>';
            return;
        }

        container.innerHTML = dataRows.map(function (item) {
            return [
                '<article class="hr030-list-item hr030-schedule-item">',
                '  <div class="hr030-schedule-time">' + escapeHtml(item.time) + "</div>",
                '  <div class="hr030-list-main">',
                '    <div class="hr030-list-title-row">',
                "      " + renderStatusBadge(item.category),
                "    </div>",
                '    <strong>' + escapeHtml(item.title) + "</strong>",
                '    <p>' + escapeHtml(item.description) + "</p>",
                "  </div>",
                "</article>"
            ].join("");
        }).join("");
    }

    function renderAttendanceLegend() {
        var legendEl = byId("hr030AttendanceLegend");

        legendEl.innerHTML = dashboardData.charts.attendance.map(function (item) {
            return [
                '<div class="hr030-attendance-legend-item">',
                '  <span class="hr030-attendance-dot" style="background:' + escapeHtml(item.color) + '"></span>',
                '  <div class="hr030-attendance-copy">',
                '    <strong>' + escapeHtml(item.label) + '</strong>',
                '    <span>' + formatNumber(item.value) + '명</span>',
                "  </div>",
                "</div>"
            ].join("");
        }).join("");
    }

    function renderAttendanceDonut() {
        var host = document.querySelector(".hr030-attendance-chart");
        var canvas = byId("hr030AttendanceChart");
        var total = (dashboardData.charts.attendance || []).reduce(function (sum, item) {
            return sum + (item.value || 0);
        }, 0);
        var centerTextPlugin = {
            id: "hr030AttendanceCenterText",
            afterDraw: function (chart) {
                var meta = chart.getDatasetMeta(0);
                var point = meta && meta.data && meta.data[0];
                var ctx;
                var x;
                var y;

                if (!point) {
                    return;
                }

                ctx = chart.ctx;
                x = point.x;
                y = point.y;

                ctx.save();
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#1f2937";
                ctx.font = "700 22px Pretendard Variable, Pretendard, Noto Sans KR, sans-serif";
                ctx.fillText(formatNumber(total), x, y - 4);
                ctx.fillStyle = "#8d97a5";
                ctx.font = "600 10px Pretendard Variable, Pretendard, Noto Sans KR, sans-serif";
                ctx.fillText("합계", x, y + 16);
                ctx.restore();
            }
        };

        if (!host) {
            return;
        }

        if (!canvas || String(canvas.tagName || "").toLowerCase() !== "canvas") {
            host.innerHTML = '<canvas id="hr030AttendanceChart" aria-label="가동 상태 분포 차트"></canvas>';
            canvas = byId("hr030AttendanceChart");
        }

        state.charts.attendance = new Chart(canvas, {
            type: "doughnut",
            data: {
                labels: dashboardData.charts.attendance.map(function (item) { return item.label; }),
                datasets: [{
                    data: dashboardData.charts.attendance.map(function (item) { return item.value; }),
                    backgroundColor: dashboardData.charts.attendance.map(function (item) { return item.color; }),
                    borderWidth: 0,
                    hoverOffset: 2,
                    spacing: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "42%",
                layout: {
                    padding: 2
                },
                plugins: {
                    legend: { display: false }
                }
            },
            plugins: [centerTextPlugin]
        });
    }

    function destroyChart(chartKey) {
        if (state.charts[chartKey]) {
            state.charts[chartKey].destroy();
            state.charts[chartKey] = null;
        }
    }

    function renderCharts() {
        if (typeof Chart !== "function") {
            return;
        }

        Chart.defaults.font.family = '"Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif';
        Chart.defaults.color = "#64748b";

        destroyChart("departments");
        destroyChart("trend");
        destroyChart("attendance");

        state.charts.departments = new Chart(byId("hr030DeptChart"), {
            type: "bar",
            data: {
                labels: dashboardData.charts.departments.map(function (item) { return item.label; }),
                datasets: [{
                    data: dashboardData.charts.departments.map(function (item) { return item.value; }),
                    backgroundColor: "#4f6ff7",
                    borderRadius: 6,
                    maxBarThickness: 24,
                    categoryPercentage: 0.72,
                    barPercentage: 0.82
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: "#94a3b8", font: { size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: "#edf2f8" },
                        border: { display: false },
                        ticks: { color: "#334155", font: { size: 11, weight: 600 } }
                    }
                }
            }
        });

        state.charts.trend = new Chart(byId("hr030TrendChart"), {
            type: "line",
            data: {
                labels: dashboardData.charts.hiringTrend.map(function (item) { return item.month; }),
                datasets: [
                    {
                        label: "등록",
                        data: dashboardData.charts.hiringTrend.map(function (item) { return item.hired; }),
                        borderColor: "#4f6ff7",
                        backgroundColor: "rgba(79, 111, 247, 0.08)",
                        borderWidth: 2,
                        pointBackgroundColor: "#ffffff",
                        pointBorderColor: "#4f6ff7",
                        pointBorderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 4,
                        tension: 0.35,
                        fill: false
                    },
                    {
                        label: "종료",
                        data: dashboardData.charts.hiringTrend.map(function (item) { return item.exited; }),
                        borderColor: "#1fb6a6",
                        backgroundColor: "rgba(31, 182, 166, 0.06)",
                        borderWidth: 2,
                        pointBackgroundColor: "#ffffff",
                        pointBorderColor: "#1fb6a6",
                        pointBorderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 4,
                        tension: 0.35,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: "#94a3b8", font: { size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: "#edf2f8" },
                        border: { display: false },
                        ticks: { stepSize: 1, color: "#94a3b8", font: { size: 11 } }
                    }
                }
            }
        });

        renderAttendanceDonut();
    }

    function renderDashboard() {
        var employeeRows = getFilteredEmployees();
        var approvalRows = getFilteredApprovals();
        var scheduleRows = getFilteredSchedule();

        updateDynamicHeaders(employeeRows, approvalRows, scheduleRows);
        updateSearchResultNote(employeeRows, approvalRows, scheduleRows);
        renderEmployeeTable(employeeRows);
        renderApprovalList(approvalRows);
        renderScheduleList(scheduleRows);
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

    function initializeIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    function initialize() {
        setStaticContent();
        renderAttendanceLegend();
        renderCharts();
        renderDashboard();
        bindSearch();
        bindStatusFilter();
        initializeIcons();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();

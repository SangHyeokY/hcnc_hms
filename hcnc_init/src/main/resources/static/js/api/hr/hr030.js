var HR030_CONTEXT_PATH = String(window.__CONTEXT_PATH__ || "").replace(/\/$/, "");

var hr030PendingState = {
    perspective: "ops",
    period: "week"
};

var hr030ApplyTimer = 0;

var hr030State = {
    perspective: "ops",
    period: "week",
    activeMetricKey: "deploy",
    activeQueueId: "",
    queueItems: [],
    currentScenario: null
};

var hr030MetricConfig = {
    deploy: { label: "오늘 투입 예정", suffix: "명", desc: "당일 바로 확인해야 할 투입 인원입니다." },
    unassigned: { label: "프로젝트 미배정", suffix: "명", desc: "우선 매칭이 필요한 가용 인원입니다." },
    approval: { label: "승인 대기", suffix: "건", desc: "승인 지연 시 일정 영향이 커지는 항목입니다." },
    risk: { label: "리스크 확인", suffix: "건", desc: "누락이나 지연이 발생하기 쉬운 경고 신호입니다." }
};

var hr030ScenarioBase = {
    ops: {
        kicker: "전체 운영",
        title: "오늘 먼저 확인해야 할 항목",
        desc: "투입 예정, 프로젝트 미배정, 승인 대기, 리스크 확인만 먼저 보여줍니다.",
        metrics: { deploy: 8, unassigned: 3, approval: 5, risk: 2 },
        trends: [
            { label: "신규 인력 등록", count: 6 },
            { label: "프로젝트 배정", count: 4 },
            { label: "승인 완료", count: 5 }
        ],
        queue: [
            {
                id: "ops-1",
                badge: "긴급",
                badgeTone: "danger",
                title: "오늘 투입 예정 인원 확인",
                desc: "투입일이 임박했지만 프로젝트 정보가 아직 확정되지 않은 인원이 있습니다.",
                checks: ["투입 예정 인원 확인", "프로젝트 배정 여부 재확인", "담당자와 고객사 회신 상태 점검"]
            },
            {
                id: "ops-2",
                badge: "확인",
                badgeTone: "cool",
                title: "프로젝트 미배정 인원 정리",
                desc: "가용 인원 중 아직 프로젝트가 비어 있는 대상을 먼저 정리해야 합니다.",
                checks: ["미배정 인원 기술 확인", "우선 투입 후보 정리", "필요 시 희망 단가 재검토"]
            },
            {
                id: "ops-3",
                badge: "승인",
                badgeTone: "slate",
                title: "승인 대기 건 처리",
                desc: "승인 지연이 길어질수록 상세 수정과 투입 일정에 영향을 줄 수 있습니다.",
                checks: ["승인 대기 건 우선순위 확인", "보류 사유 누락 여부 확인", "완료 후 관련자 공유"]
            },
            {
                id: "ops-4",
                badge: "주의",
                badgeTone: "warn",
                title: "리스크 입력 누락 확인",
                desc: "상세 탭 값이 비어 있을 가능성이 있는 항목을 먼저 확인해야 합니다.",
                checks: ["최근 수정 이력 확인", "상세 팝업 값 비교", "누락이면 담당자에게 정정 요청"]
            }
        ]
    },
    people: {
        kicker: "인력 운영",
        title: "투입 예정과 미배정 인원을 먼저 정리해야 합니다",
        desc: "인력 운영에서 실제 일정에 영향을 주는 항목만 추려서 보여줍니다.",
        metrics: { deploy: 11, unassigned: 4, approval: 3, risk: 1 },
        trends: [
            { label: "신규 인력 등록", count: 9 },
            { label: "투입 확정", count: 7 },
            { label: "단가 협의", count: 3 }
        ],
        queue: [
            {
                id: "people-1",
                badge: "긴급",
                badgeTone: "danger",
                title: "이번 주 투입 예정 인원 확인",
                desc: "투입 예정일이 가까운 인원부터 고객사 확인 상태를 점검해야 합니다.",
                checks: ["D-2 대상부터 우선 확인", "고객사 회신 여부 확인", "미확정 건은 우선순위 재조정"]
            },
            {
                id: "people-2",
                badge: "확인",
                badgeTone: "cool",
                title: "프로젝트 미배정 인원 정리",
                desc: "기술과 경력에 맞는 프로젝트 후보를 우선 매칭해야 합니다.",
                checks: ["주 기술 태그 확인", "가용 시점 비교", "우선 프로젝트 후보 정리"]
            },
            {
                id: "people-3",
                badge: "승인",
                badgeTone: "slate",
                title: "승인 대기 인력 정보 정리",
                desc: "승인 중인 정보가 길어지면 투입과 단가 협의가 함께 밀릴 수 있습니다.",
                checks: ["승인 대기 사유 확인", "누락 입력값 정리", "완료 후 즉시 반영"]
            },
            {
                id: "people-4",
                badge: "주의",
                badgeTone: "warn",
                title: "희망 단가와 리스크 후보 점검",
                desc: "희망 단가와 리스크 신호가 함께 있는 인원은 따로 확인이 필요합니다.",
                checks: ["고단가 대상 우선 확인", "리스크 메모 여부 확인", "조정 필요 건 분류"]
            }
        ]
    },
    project: {
        kicker: "프로젝트 운영",
        title: "배정, 승인, 리스크를 먼저 끊어봐야 합니다",
        desc: "프로젝트 운영에서 일정에 직접 영향 주는 항목만 남긴 화면입니다.",
        metrics: { deploy: 6, unassigned: 2, approval: 6, risk: 3 },
        trends: [
            { label: "프로젝트 등록", count: 5 },
            { label: "배정 완료", count: 6 },
            { label: "선택 팝업 수정", count: 2 }
        ],
        queue: [
            {
                id: "project-1",
                badge: "긴급",
                badgeTone: "danger",
                title: "투입 예정 프로젝트 배정 확인",
                desc: "투입일이 임박한 프로젝트부터 인력 배정 상태를 다시 확인해야 합니다.",
                checks: ["투입 예정 프로젝트 우선 확인", "인력 배정 상태 검토", "누락 시 바로 담당자 확인"]
            },
            {
                id: "project-2",
                badge: "확인",
                badgeTone: "cool",
                title: "당사 프로젝트 선택 조건 재확인",
                desc: "프로젝트 선택 팝업에서 당사 여부 조건이 의도대로 동작하는지 다시 점검합니다.",
                checks: ["Y/N 행 동작 확인", "선택 제한 문구 확인", "적용 버튼 방어 로직 점검"]
            },
            {
                id: "project-3",
                badge: "승인",
                badgeTone: "slate",
                title: "프로젝트 승인 대기 처리",
                desc: "승인 지연 시 신규 등록과 배정 작업이 함께 밀릴 수 있습니다.",
                checks: ["승인 대기 건 우선순위 확인", "보류 사유 확인", "완료 후 목록 재확인"]
            },
            {
                id: "project-4",
                badge: "주의",
                badgeTone: "warn",
                title: "리스크 프로젝트 후보 점검",
                desc: "일정 지연 또는 정보 누락 가능성이 있는 프로젝트를 먼저 확인합니다.",
                checks: ["최근 수정 프로젝트 점검", "리스크 메모 확인", "필요 시 담당자 공유"]
            }
        ]
    }
};

var hr030PeriodConfig = {
    day: { label: "오늘", metricFactor: 0.45, trendFactor: 0.5 },
    week: { label: "이번 주", metricFactor: 1, trendFactor: 1 },
    month: { label: "이번 달", metricFactor: 1.7, trendFactor: 1.8 }
};

function initHr030Dashboard() {
    var dashboard = document.getElementById("hr030-dashboard");
    var containerWrap = document.querySelector(".container-wrap");
    var contentsWrap = dashboard ? dashboard.closest(".contents-wrap") : null;
    var resizeObserver = null;
    var layoutObserver = null;
    if (!dashboard) {
        return;
    }

    document.body.classList.add("hr030-dashboard-page");
    bindHr030FilterChips();
    bindHr030MetricCards();
    bindHr030QuickActions();
    bindHr030Dock();
    bindHr030ScrollAids();
    prepareHr030Reveal();
    renderHr030Dashboard();
    scheduleHr030DockSync();
    window.addEventListener("resize", scheduleHr030DockSync);

    if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(function () {
            scheduleHr030DockSync();
        });
        resizeObserver.observe(dashboard);
        if (contentsWrap) {
            resizeObserver.observe(contentsWrap);
        }
    }

    if (containerWrap) {
        containerWrap.addEventListener("transitionend", function (event) {
            if (event.propertyName === "grid-template-columns" || event.propertyName === "width") {
                scheduleHr030DockSync();
            }
        });

        if ("MutationObserver" in window) {
            layoutObserver = new MutationObserver(function () {
                scheduleHr030DockSync();
            });
            layoutObserver.observe(containerWrap, {
                attributes: true,
                attributeFilter: ["class"]
            });
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHr030Dashboard);
} else {
    initHr030Dashboard();
}

function bindHr030FilterChips() {
    bindHr030ChipGroup("#hr030PerspectiveGroup .hr030-filter-chip", "perspective");
    bindHr030ChipGroup("#hr030PeriodGroup .hr030-filter-chip", "period");
}

function bindHr030ChipGroup(selector, key) {
    var chips = document.querySelectorAll(selector);
    chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
            var nextValue = String(chip.dataset[key] || "");
            var currentValue = String(hr030PendingState[key] || "");
            if (!nextValue) {
                return;
            }

            if (currentValue === nextValue) {
                pressHr030Element(chip);
                return;
            }

            hr030PendingState[key] = nextValue;
            updateHr030ChipState(selector, key, nextValue);
            pressHr030Element(chip);
            scheduleHr030AutoApply();
        });
    });
}

function updateHr030ChipState(selector, key, activeValue) {
    document.querySelectorAll(selector).forEach(function (chip) {
        chip.classList.toggle("is-active", String(chip.dataset[key] || "") === activeValue);
    });
}

function bindHr030MetricCards() {
    document.querySelectorAll(".hr030-metric-card").forEach(function (card) {
        card.addEventListener("click", function () {
            var metricKey = String(card.dataset.metricKey || "");
            var panelId = String(card.dataset.panelTarget || "hr030PanelInsight");
            if (!metricKey) {
                return;
            }

            hr030State.activeMetricKey = metricKey;
            updateHr030ActiveMetricCard();
            renderHr030Focus(hr030State.currentScenario || buildHr030Scenario());
            focusHr030QueueByMetric(metricKey, false);
            updateHr030HeroPulse("현재 포커스: " + getHr030MetricLabel(metricKey));
            clearHr030DockState();
            updateHr030PanelState(panelId);
            pulseHr030Panel(panelId);
            pressHr030Element(card);
        });
    });
}

function bindHr030QuickActions() {
    document.querySelectorAll(".hr030-quick-action").forEach(function (button) {
        button.addEventListener("click", function () {
            var targetHref = String(button.dataset.actionHref || "");
            updateHr030HeroPulse(String(button.dataset.actionLabel || "바로 이동") + " 준비 완료");
            updateHr030DockState("hr030PanelFocus");
            pressHr030Element(button);

            if (!targetHref) {
                return;
            }

            setTimeout(function () {
                window.location.href = withHr030BasePath(targetHref);
            }, 180);
        });
    });
}

function bindHr030Dock() {
    var topButton = document.getElementById("hr030DockTop");

    if (topButton) {
        topButton.addEventListener("click", function () {
            var scrollContainer = getHr030ScrollContainer();
            pressHr030Element(topButton);
            updateHr030HeroPulse("상단으로 이동");
            updateHr030DockState("hr030PanelInsight");

            if (scrollContainer && typeof scrollContainer.scrollTo === "function") {
                scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }

            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    document.querySelectorAll(".hr030-dock-item").forEach(function (button) {
        button.addEventListener("click", function () {
            var panelId = String(button.dataset.panelTarget || "");
            var label = button.querySelector("strong");
            pressHr030Element(button);
            goToHr030Panel(panelId, label ? label.textContent : "패널", true);
        });
    });
}

function bindHr030ScrollAids() {
    var scrollContainer = getHr030ScrollContainer();
    var topButton = document.getElementById("hr030DockTop");

    if (!scrollContainer || !topButton) {
        return;
    }

    function updateHr030ScrollAidState() {
        var scrollTop = Number(scrollContainer.scrollTop || 0);
        topButton.classList.toggle("is-visible", scrollTop > 260);
    }

    scrollContainer.addEventListener("scroll", updateHr030ScrollAidState, { passive: true });
    updateHr030ScrollAidState();
}

function prepareHr030Reveal() {
    document.querySelectorAll("#hr030-dashboard .hr030-reveal").forEach(function (item, index) {
        item.style.setProperty("--hr030-delay", (index * 36) + "ms");
        item.querySelectorAll(".hr030-text-reveal").forEach(function (textNode, textIndex) {
            textNode.style.setProperty("--hr030-text-delay", (48 + (textIndex * 20)) + "ms");
        });
    });
}

function applyHr030Filters() {
    hr030State.perspective = hr030PendingState.perspective;
    hr030State.period = hr030PendingState.period;
    renderHr030Dashboard();
    replayHr030Motion();
}

function scheduleHr030AutoApply() {
    var autoApply = document.getElementById("hr030AutoApply");

    if (hr030ApplyTimer) {
        clearTimeout(hr030ApplyTimer);
    }

    if (autoApply) {
        autoApply.classList.remove("is-syncing");
        void autoApply.offsetWidth;
        autoApply.classList.add("is-syncing");
    }

    hr030ApplyTimer = window.setTimeout(function () {
        hr030ApplyTimer = 0;
        applyHr030Filters();
    }, 120);
}

function replayHr030Motion() {
    var dashboard = document.getElementById("hr030-dashboard");
    if (!dashboard) {
        return;
    }

    dashboard.classList.remove("is-ready");
    void dashboard.offsetWidth;
    dashboard.classList.add("is-ready");
}

function renderHr030Dashboard() {
    var scenario = buildHr030Scenario();
    var dashboard = document.getElementById("hr030-dashboard");
    hr030State.currentScenario = scenario;

    if (dashboard) {
        dashboard.dataset.textMode = "sync";
    }

    renderHr030Topbar(scenario);
    renderHr030Metrics(scenario.metrics);
    renderHr030Insight(scenario);
    renderHr030Queue(scenario.queue);
    focusHr030QueueByMetric(hr030State.activeMetricKey, false);
    renderHr030Trend(scenario.trends);
    renderHr030Focus(scenario);
    updateHr030ActiveMetricCard();
    updateHr030ChipState("#hr030PerspectiveGroup .hr030-filter-chip", "perspective", hr030PendingState.perspective);
    updateHr030ChipState("#hr030PeriodGroup .hr030-filter-chip", "period", hr030PendingState.period);
    updateHr030DockState("hr030PanelInsight");

    if (dashboard && !dashboard.classList.contains("is-ready")) {
        requestAnimationFrame(function () {
            dashboard.classList.add("is-ready");
        });
    }

    if (dashboard) {
        requestAnimationFrame(function () {
            dashboard.dataset.textMode = "animate";
        });
    }
}

function buildHr030Scenario() {
    var base = hr030ScenarioBase[hr030State.perspective] || hr030ScenarioBase.ops;
    var period = hr030PeriodConfig[hr030State.period] || hr030PeriodConfig.week;

    return {
        kicker: base.kicker,
        title: base.title,
        desc: base.desc,
        periodLabel: period.label,
        metrics: {
            deploy: Math.max(1, Math.round(base.metrics.deploy * period.metricFactor)),
            unassigned: Math.max(0, Math.round(base.metrics.unassigned * period.metricFactor)),
            approval: Math.max(0, Math.round(base.metrics.approval * period.metricFactor)),
            risk: Math.max(0, Math.round(base.metrics.risk * period.metricFactor))
        },
        trends: base.trends.map(function (item) {
            return {
                label: item.label,
                count: Math.max(0, Math.round(item.count * period.trendFactor))
            };
        }),
        queue: base.queue
    };
}

function renderHr030Topbar(scenario) {
    setHr030Text("hr030HeroKicker", scenario.kicker);
    setHr030Text("hr030HeroTitle", scenario.title);
    setHr030Text("hr030HeroDesc", scenario.desc);
    setHr030Text("hr030HeroPeriod", scenario.periodLabel);
    updateHr030HeroPulse("현재 포커스: " + getHr030MetricLabel(hr030State.activeMetricKey));
}

function renderHr030Metrics(metrics) {
    document.querySelectorAll(".hr030-metric-value").forEach(function (node) {
        var metricKey = String(node.dataset.metricField || "");
        var suffix = String(node.dataset.suffix || "");
        animateHr030Number(node, Number(metrics[metricKey] || 0), suffix);
    });
}

function renderHr030Insight(scenario) {
    var metrics = scenario.metrics;
    var score = buildHr030InsightScore(metrics);
    var summary = buildHr030InsightSummary(scenario);

    setHr030Text("hr030InsightScore", score + "%");
    setHr030Text("hr030InsightSummary", summary);
    renderHr030InsightMeters(metrics);
    renderHr030InsightChart(scenario);
}

function renderHr030InsightMeters(metrics) {
    var meterEl = document.getElementById("hr030InsightMeters");
    if (!meterEl) {
        return;
    }

    var entries = Object.keys(hr030MetricConfig);
    var maxValue = entries.reduce(function (acc, key) {
        return Math.max(acc, Number(metrics[key] || 0));
    }, 1);

    meterEl.innerHTML = entries.map(function (key) {
        var config = hr030MetricConfig[key];
        var value = Number(metrics[key] || 0);
        var ratio = Math.max(12, Math.round((value / maxValue) * 100));
        return "" +
            '<div class="hr030-meter">' +
                '<div class="hr030-meter-head">' +
                    '<span class="hr030-text-reveal">' + config.label + '</span>' +
                    '<strong class="hr030-text-reveal">' + value + config.suffix + '</strong>' +
                '</div>' +
                '<div class="hr030-meter-track"><span style="width:' + ratio + '%"></span></div>' +
            '</div>';
    }).join("");
}

function renderHr030InsightChart(scenario) {
    var chartEl = document.getElementById("hr030InsightChart");
    var axisEl = document.getElementById("hr030InsightAxis");
    if (!chartEl) {
        return;
    }

    var series = buildHr030InsightSeries(scenario);
    chartEl.innerHTML = buildHr030InsightSvg(series.primary, series.secondary);

    if (axisEl) {
        axisEl.innerHTML = series.labels.map(function (label) {
            return '<span class="hr030-text-reveal">' + label + '</span>';
        }).join("");
    }
}

function buildHr030InsightSeries(scenario) {
    var metrics = scenario.metrics;
    var trends = scenario.trends;
    var labels = ["월", "화", "수", "목", "금", "토", "일", "+"];
    var primary = [
        metrics.deploy + 3,
        (trends[0] ? trends[0].count : 0) + metrics.unassigned + 2,
        metrics.approval + 4,
        (trends[1] ? trends[1].count : 0) + 3,
        metrics.deploy + metrics.approval,
        (trends[2] ? trends[2].count : 0) + metrics.risk + 2,
        metrics.unassigned + metrics.approval + 4,
        metrics.deploy + metrics.risk + 5
    ];
    var secondary = primary.map(function (value, index) {
        var weight = index % 2 === 0 ? 0.82 : 0.68;
        return Math.max(2, Math.round(value * weight));
    });

    return {
        labels: labels,
        primary: primary,
        secondary: secondary
    };
}

function buildHr030InsightSvg(primary, secondary) {
    var width = 620;
    var height = 250;
    var padding = 24;
    var primaryPoints = mapHr030ChartPoints(primary, width, height, padding);
    var secondaryPoints = mapHr030ChartPoints(secondary, width, height, padding);
    var primaryString = stringifyHr030ChartPoints(primaryPoints);
    var secondaryString = stringifyHr030ChartPoints(secondaryPoints);
    var areaString = stringifyHr030ChartPoints(primaryPoints.concat([
        { x: primaryPoints[primaryPoints.length - 1].x, y: height - padding },
        { x: primaryPoints[0].x, y: height - padding }
    ]));
    var grid = [0.2, 0.4, 0.6, 0.8].map(function (ratio) {
        var y = Math.round((height - (padding * 2)) * ratio) + padding;
        return '<line x1="0" y1="' + y + '" x2="' + width + '" y2="' + y + '" />';
    }).join("");
    var dots = primaryPoints.map(function (point) {
        return '<circle cx="' + point.x + '" cy="' + point.y + '" r="5" />';
    }).join("");

    return "" +
        '<svg viewBox="0 0 ' + width + ' ' + height + '" aria-hidden="true">' +
            '<defs>' +
                '<linearGradient id="hr030InsightArea" x1="0" y1="0" x2="0" y2="1">' +
                    '<stop offset="0%" stop-color="rgba(42, 122, 255, 0.34)" />' +
                    '<stop offset="100%" stop-color="rgba(42, 122, 255, 0)" />' +
                '</linearGradient>' +
                '<linearGradient id="hr030InsightLine" x1="0" y1="0" x2="1" y2="0">' +
                    '<stop offset="0%" stop-color="#1a53c8" />' +
                    '<stop offset="100%" stop-color="#7ed9ff" />' +
                '</linearGradient>' +
            '</defs>' +
            '<g class="hr030-chart-grid">' + grid + '</g>' +
            '<polygon class="hr030-chart-area" points="' + areaString + '" />' +
            '<polyline class="hr030-chart-line hr030-chart-line--ghost" points="' + secondaryString + '" />' +
            '<polyline class="hr030-chart-line hr030-chart-line--main" points="' + primaryString + '" />' +
            '<g class="hr030-chart-dots">' + dots + '</g>' +
        '</svg>';
}

function mapHr030ChartPoints(series, width, height, padding) {
    var maxValue = Math.max.apply(null, series);
    var minValue = Math.min.apply(null, series);
    var range = Math.max(maxValue - minValue, 1);
    var step = (width - (padding * 2)) / Math.max(series.length - 1, 1);

    return series.map(function (value, index) {
        var x = padding + (step * index);
        var y = height - padding - (((value - minValue) / range) * (height - (padding * 2)));
        return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    });
}

function stringifyHr030ChartPoints(points) {
    return points.map(function (point) {
        return point.x + "," + point.y;
    }).join(" ");
}

function renderHr030Queue(queue) {
    var listEl = document.getElementById("hr030QueueList");
    var metaEl = document.getElementById("hr030QueueMeta");
    if (!listEl) {
        return;
    }

    var targetQueueId = hr030State.activeQueueId;
    if (!queue.some(function (item) { return item.id === targetQueueId; })) {
        targetQueueId = (queue[hr030MetricIndexMap()[hr030State.activeMetricKey]] || queue[0] || {}).id || "";
    }

    hr030State.queueItems = queue.slice();
    hr030State.activeQueueId = targetQueueId;

    listEl.innerHTML = queue.map(function (item, index) {
        var isActive = item.id === targetQueueId;
        var barWidth = Math.max(28, 100 - (index * 16));
        return "" +
            '<button type="button" class="hr030-queue-item' + (isActive ? ' is-active' : '') + '" data-queue-id="' + item.id + '">' +
                '<div class="hr030-queue-head">' +
                    '<span class="hr030-queue-badge hr030-queue-badge--' + item.badgeTone + ' hr030-text-reveal">' + item.badge + '</span>' +
                    '<span class="hr030-queue-order hr030-text-reveal">0' + (index + 1) + '</span>' +
                '</div>' +
                '<strong class="hr030-text-reveal">' + item.title + '</strong>' +
                '<p class="hr030-text-reveal">' + item.desc + '</p>' +
                '<span class="hr030-queue-bar"><span style="width:' + barWidth + '%"></span></span>' +
            '</button>';
    }).join("");

    if (metaEl) {
        setHr030Text("hr030QueueMeta", queue.length + "건");
    }

    bindHr030QueueItems();
    renderHr030Detail(findHr030QueueItem(hr030State.activeQueueId) || queue[0] || null);
}

function bindHr030QueueItems() {
    document.querySelectorAll(".hr030-queue-item").forEach(function (button) {
        button.addEventListener("click", function () {
            selectHr030QueueItem(String(button.dataset.queueId || ""));
            updateHr030DockState("hr030PanelDetail");
            pulseHr030Panel("hr030PanelDetail");
            pressHr030Element(button);
        });
    });
}

function selectHr030QueueItem(queueId) {
    var selected = findHr030QueueItem(queueId);
    if (!selected) {
        return;
    }

    hr030State.activeQueueId = queueId;
    document.querySelectorAll(".hr030-queue-item").forEach(function (item) {
        item.classList.toggle("is-active", String(item.dataset.queueId || "") === queueId);
    });
    renderHr030Detail(selected);
}

function findHr030QueueItem(queueId) {
    return hr030State.queueItems.find(function (item) {
        return item.id === queueId;
    }) || null;
}

function focusHr030QueueByMetric(metricKey, shouldPulse) {
    var item = hr030State.queueItems[hr030MetricIndexMap()[metricKey]] || hr030State.queueItems[0];
    if (!item) {
        return;
    }

    selectHr030QueueItem(item.id);
    if (shouldPulse !== false) {
        pulseHr030Panel("hr030PanelPriority");
    }
}

function renderHr030Detail(item) {
    if (!item) {
        return;
    }

    var statusEl = document.getElementById("hr030DetailStatus");
    if (statusEl) {
        statusEl.textContent = item.badge;
        statusEl.dataset.tone = item.badgeTone;
    }

    setHr030Text("hr030DetailTitle", item.title);
    setHr030Text("hr030DetailDesc", item.desc);

    var checksEl = document.getElementById("hr030DetailChecks");
    if (checksEl) {
        checksEl.innerHTML = item.checks.map(function (check) {
            return '<li class="hr030-text-reveal">' + check + '</li>';
        }).join("");
    }
}

function renderHr030Trend(trends) {
    var trendEl = document.getElementById("hr030TrendList");
    if (!trendEl) {
        return;
    }

    var maxCount = trends.reduce(function (acc, item) {
        return Math.max(acc, Number(item.count || 0));
    }, 1);

    trendEl.innerHTML = trends.map(function (item) {
        var ratio = Math.max(18, Math.round((Number(item.count || 0) / maxCount) * 100));
        return "" +
            '<div class="hr030-trend-item">' +
                '<div class="hr030-trend-text">' +
                    '<span class="hr030-text-reveal">' + item.label + '</span>' +
                    '<strong class="hr030-text-reveal">' + item.count + '건</strong>' +
                '</div>' +
                '<div class="hr030-trend-track">' +
                    '<span class="hr030-trend-fill" style="width:' + ratio + '%"></span>' +
                '</div>' +
            '</div>';
    }).join("");
}

function renderHr030Focus(scenario) {
    if (!scenario) {
        return;
    }

    var metricKey = hr030State.activeMetricKey;
    var metricConfig = hr030MetricConfig[metricKey] || hr030MetricConfig.deploy;
    var metrics = scenario.metrics;
    var total = Object.keys(metrics).reduce(function (acc, key) {
        return acc + Number(metrics[key] || 0);
    }, 0);
    var value = Number(metrics[metricKey] || 0);
    var baselineMap = { deploy: 64, unassigned: 58, approval: 61, risk: 53 };
    var rate = clamp(Math.round((baselineMap[metricKey] || 56) + ((value / Math.max(total, 1)) * 18)), 42, 93);
    var focusTitle = metricConfig.label;
    var focusDesc = scenario.periodLabel + " 기준 " + value + metricConfig.suffix + "이 잡혀 있어 " + metricConfig.desc;
    var ringEl = document.getElementById("hr030FocusRing");
    var rateEl = document.getElementById("hr030FocusRate");

    if (rateEl) {
        animateHr030Number(rateEl, rate, "%");
    }
    setHr030Text("hr030FocusTitle", focusTitle);
    setHr030Text("hr030FocusDesc", focusDesc);

    if (ringEl) {
        ringEl.classList.remove("is-refreshing");
        void ringEl.offsetWidth;
        ringEl.classList.add("is-refreshing");
        ringEl.style.setProperty("--rate", String(rate));
    }
}

function buildHr030InsightScore(metrics) {
    var score = 74 + (Number(metrics.deploy || 0) * 1.6) + (Number(metrics.approval || 0) * 0.8) - (Number(metrics.unassigned || 0) * 2.4) - (Number(metrics.risk || 0) * 3.2);
    return clamp(Math.round(score), 44, 96);
}

function buildHr030InsightSummary(scenario) {
    var metrics = scenario.metrics;
    var activeMetric = hr030MetricConfig[hr030State.activeMetricKey] || hr030MetricConfig.deploy;
    var activeValue = Number(metrics[hr030State.activeMetricKey] || 0);
    var firstQueue = scenario.queue[0];
    return scenario.periodLabel + " 기준 " + activeMetric.label + " " + activeValue + activeMetric.suffix + "과 " + (firstQueue ? firstQueue.title : "우선 점검 항목") + "가 동시에 걸려 있어 먼저 정리하는 흐름이 맞습니다.";
}

function updateHr030ActiveMetricCard() {
    document.querySelectorAll(".hr030-metric-card").forEach(function (card) {
        var isActive = String(card.dataset.metricKey || "") === hr030State.activeMetricKey;
        card.classList.toggle("is-active", isActive);
        card.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
}

function clearHr030DockState() {
    document.querySelectorAll(".hr030-dock-item").forEach(function (button) {
        button.classList.remove("is-active");
        button.setAttribute("aria-current", "false");
    });
}

function updateHr030PanelState(panelId) {
    document.querySelectorAll(".hr030-panel").forEach(function (panel) {
        var isCurrent = panel.id === panelId;
        panel.classList.toggle("is-current", isCurrent);
        panel.setAttribute("data-current", isCurrent ? "true" : "false");
    });
}

function updateHr030DockState(panelId) {
    document.querySelectorAll(".hr030-dock-item").forEach(function (button) {
        var isActive = String(button.dataset.panelTarget || "") === panelId;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-current", isActive ? "true" : "false");
    });

    updateHr030PanelState(panelId);
}

function goToHr030Panel(panelId, label, shouldSyncDock) {
    var panel = document.getElementById(panelId || "");
    if (!panel) {
        return;
    }

    if (shouldSyncDock) {
        updateHr030DockState(panelId);
    } else {
        updateHr030PanelState(panelId);
    }

    updateHr030HeroPulse(String(label || "패널") + " 패널 확인");
    panel.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    window.setTimeout(function () {
        pulseHr030Panel(panelId);
    }, 220);
}

function getHr030ScrollContainer() {
    var dashboard = document.getElementById("hr030-dashboard");

    if (!dashboard) {
        return null;
    }

    return dashboard.closest(".content-body") || document.scrollingElement || document.documentElement;
}

function syncHr030DockPosition() {
    var dashboard = document.getElementById("hr030-dashboard");
    var dock = dashboard ? dashboard.querySelector(".hr030-dock") : null;
    var rect = null;
    var left = 0;

    if (!dashboard || !dock) {
        return;
    }

    if (window.innerWidth <= 1320) {
        dock.style.removeProperty("--hr030-dock-left");
        dock.style.removeProperty("--hr030-dock-top");
        return;
    }

    rect = dashboard.getBoundingClientRect();
    left = Math.round(rect.left);
    dock.style.setProperty("--hr030-dock-left", Math.max(12, left) + "px");
    dock.style.setProperty("--hr030-dock-top", Math.max(20, Math.round(rect.top)) + "px");
}

var hr030DockSyncFrame = 0;
var hr030DockSyncTimerA = 0;
var hr030DockSyncTimerB = 0;

function scheduleHr030DockSync() {
    if (hr030DockSyncFrame) {
        cancelAnimationFrame(hr030DockSyncFrame);
    }
    if (hr030DockSyncTimerA) {
        window.clearTimeout(hr030DockSyncTimerA);
    }
    if (hr030DockSyncTimerB) {
        window.clearTimeout(hr030DockSyncTimerB);
    }

    hr030DockSyncFrame = requestAnimationFrame(function () {
        syncHr030DockPosition();
        hr030DockSyncTimerA = window.setTimeout(syncHr030DockPosition, 160);
        hr030DockSyncTimerB = window.setTimeout(syncHr030DockPosition, 320);
    });
}

function pulseHr030Panel(panelId) {
    var panel = document.getElementById(panelId || "");
    if (!panel) {
        return;
    }

    panel.classList.remove("is-emphasis");
    void panel.offsetWidth;
    panel.classList.add("is-emphasis");
}

function pressHr030Element(element) {
    if (!element) {
        return;
    }

    element.classList.remove("is-pressed");
    void element.offsetWidth;
    element.classList.add("is-pressed");
}

function animateHr030Number(node, targetValue, suffix) {
    if (!node) {
        return;
    }

    var previousFrame = Number(node.dataset.frameId || 0);
    if (previousFrame) {
        cancelAnimationFrame(previousFrame);
    }

    var startValue = Number(String(node.textContent || "0").replace(/[^\d.-]/g, "")) || 0;
    var duration = 780;
    var startTime = 0;

    function step(timestamp) {
        if (!startTime) {
            startTime = timestamp;
        }

        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = Math.round(startValue + ((targetValue - startValue) * eased));
        node.textContent = value + suffix;

        if (progress < 1) {
            node.dataset.frameId = String(requestAnimationFrame(step));
            return;
        }

        node.dataset.frameId = "";
        node.textContent = targetValue + suffix;
    }

    node.dataset.frameId = String(requestAnimationFrame(step));
}

function updateHr030HeroPulse(text) {
    setHr030Text("hr030HeroPulse", text);
}

function getHr030MetricLabel(metricKey) {
    return (hr030MetricConfig[metricKey] || hr030MetricConfig.deploy).label;
}

function hr030MetricIndexMap() {
    return {
        deploy: 0,
        unassigned: 1,
        approval: 2,
        risk: 3
    };
}

function setHr030Text(id, text) {
    var element = document.getElementById(id);
    var dashboard = document.getElementById("hr030-dashboard");
    var nextText = String(text == null ? "" : text);
    var shouldAnimate = false;
    var switchTimer = 0;
    var settleTimer = 0;

    if (!element) {
        return;
    }

    if (String(element.textContent || "") === nextText) {
        return;
    }

    switchTimer = Number(element.dataset.textSwitchTimer || 0);
    settleTimer = Number(element.dataset.textSettleTimer || 0);
    if (switchTimer) {
        clearTimeout(switchTimer);
    }
    if (settleTimer) {
        clearTimeout(settleTimer);
    }

    element.classList.remove("is-text-leaving");
    element.classList.remove("is-text-entering");

    shouldAnimate = Boolean(
        dashboard &&
        dashboard.classList.contains("is-ready") &&
        dashboard.dataset.textMode !== "sync" &&
        element.dataset.textReady === "true"
    );

    if (!shouldAnimate) {
        element.textContent = nextText;
        element.dataset.textReady = "true";
        element.dataset.textSwitchTimer = "";
        element.dataset.textSettleTimer = "";
        return;
    }

    void element.offsetWidth;
    element.classList.add("is-text-leaving");
    element.dataset.textSwitchTimer = String(window.setTimeout(function () {
        element.textContent = nextText;
        element.classList.remove("is-text-leaving");
        void element.offsetWidth;
        element.classList.add("is-text-entering");
        element.dataset.textSettleTimer = String(window.setTimeout(function () {
            element.classList.remove("is-text-entering");
            element.dataset.textSwitchTimer = "";
            element.dataset.textSettleTimer = "";
        }, 820));
    }, 180));
    element.dataset.textReady = "true";
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function withHr030BasePath(path) {
    var normalized = String(path || "").startsWith("/") ? String(path || "") : "/" + String(path || "");
    if (!HR030_CONTEXT_PATH) {
        return normalized;
    }
    return normalized.indexOf(HR030_CONTEXT_PATH) === 0 ? normalized : HR030_CONTEXT_PATH + normalized;
}

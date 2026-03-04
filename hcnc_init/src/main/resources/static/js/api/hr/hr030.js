// HR030 dashboard demo state
var hr030State = {
    perspective: "ops",
    period: "week",
    activeMetricKey: "urgent",
    activeQueueId: ""
};

// Base scenarios keep the sample data readable and make period scaling predictable.
var hr030ScenarioBase = {
    ops: {
        kicker: "운영 관점",
        title: "운영 흐름에서 바로 반응해야 할 신호",
        desc: "승인 대기, 리스크, 집중 작업을 한 화면에서 빠르게 보는 운영용 카드 샘플입니다.",
        metrics: { urgent: 7, approval: 4, risk: 2, focus: 82 },
        trends: [
            { label: "승인 처리", value: 66 },
            { label: "문의 응답", value: 84 },
            { label: "리스크 해소", value: 58 },
            { label: "일정 정합", value: 73 }
        ],
        queue: [
            {
                id: "ops-1",
                badge: "긴급",
                badgeTone: "danger",
                title: "평가 반영 전 미확인 승인 요청 점검",
                desc: "오늘 처리 마감이 걸린 승인 요청이 남아 있어 우선 확인이 필요합니다.",
                tags: ["승인", "마감", "평가"],
                checks: ["승인 요청 3건의 결재 상태 확인", "보류 사유 입력 누락 여부 점검", "완료 후 담당자에게 결과 공유"]
            },
            {
                id: "ops-2",
                badge: "주의",
                badgeTone: "warn",
                title: "리스크 탭 데이터 누락 후보 검토",
                desc: "최근 수정 이력 대비 상세 탭 값이 비어 있는 행이 감지되었습니다.",
                tags: ["리스크", "상세탭", "데이터"],
                checks: ["누락 후보 인력 2건 재확인", "상세 팝업 진입 후 저장 이력 비교", "원인 분류 후 수정 담당 지정"]
            },
            {
                id: "ops-3",
                badge: "공유",
                badgeTone: "neutral",
                title: "프로젝트 선택 팝업 UX 변경사항 팀 공유",
                desc: "최근 반영한 팝업 개선 사항을 팀에서 바로 확인할 수 있게 요약이 필요합니다.",
                tags: ["팝업", "공유", "UX"],
                checks: ["핵심 변경 3줄 요약", "스크린샷 첨부", "재현 경로 정리"]
            },
            {
                id: "ops-4",
                badge: "정리",
                badgeTone: "mint",
                title: "중복 CSS 정리 후보 재검토",
                desc: "최근 팝업 스타일 수정으로 유사 규칙이 늘어 정리 대상을 확인합니다.",
                tags: ["CSS", "정리", "유지보수"],
                checks: ["팝업 전용 규칙 스코프 재확인", "공통/전용 스타일 분리", "영향 범위 체크"]
            }
        ]
    },
    people: {
        kicker: "인력 관점",
        title: "인력 운영에서 우선 챙겨야 할 신호",
        desc: "투입 예정, 단가 협의, 기술 매칭 흐름을 중심으로 보는 인력용 카드 샘플입니다.",
        metrics: { urgent: 5, approval: 3, risk: 1, focus: 88 },
        trends: [
            { label: "투입 확정", value: 79 },
            { label: "기술 매칭", value: 71 },
            { label: "단가 협의", value: 54 },
            { label: "가용 인원", value: 68 }
        ],
        queue: [
            {
                id: "people-1",
                badge: "긴급",
                badgeTone: "danger",
                title: "이번 주 투입 예정 인력 확정",
                desc: "예정일이 가까운 인력 중 고객사 확인이 남아 있어 빠른 정리가 필요합니다.",
                tags: ["투입", "고객사", "확정"],
                checks: ["투입 예정일 D-2 대상 점검", "고객사 응답 여부 확인", "미응답 건 담당자 알림"]
            },
            {
                id: "people-2",
                badge: "조율",
                badgeTone: "warn",
                title: "희망 단가 협의 이슈 확인",
                desc: "최근 등록한 희망 단가 중 기준 범위를 벗어나는 항목이 감지되었습니다.",
                tags: ["단가", "협의", "기준"],
                checks: ["고단가 후보 정렬", "역할/경력 기준 비교", "조정 필요 건 메모 정리"]
            },
            {
                id: "people-3",
                badge: "정리",
                badgeTone: "neutral",
                title: "주 개발 언어 태그 품질 점검",
                desc: "태그 검색 정확도를 위해 표기 흔들림이 있는 기술명을 정리합니다.",
                tags: ["태그", "기술", "검색"],
                checks: ["동의어 후보 확인", "공통 표기안 정리", "조회 결과 재검증"]
            },
            {
                id: "people-4",
                badge: "검토",
                badgeTone: "mint",
                title: "수정 팝업 프로젝트 행 선택 흐름 검토",
                desc: "행 선택 시 포커스와 강조가 충분한지 샘플 동선 기준으로 다시 확인합니다.",
                tags: ["포커스", "팝업", "선택"],
                checks: ["행 hover 확인", "선택 행 강조 확인", "적용 버튼 동선 확인"]
            }
        ]
    },
    delivery: {
        kicker: "프로젝트 관점",
        title: "프로젝트 운영에서 지연을 막는 신호",
        desc: "프로젝트 배치, 승인, 일정 리스크를 빠르게 끊어보는 프로젝트용 카드 샘플입니다.",
        metrics: { urgent: 9, approval: 5, risk: 3, focus: 76 },
        trends: [
            { label: "일정 안정도", value: 61 },
            { label: "프로젝트 등록", value: 74 },
            { label: "기술 선택 완료", value: 57 },
            { label: "투입률 반영", value: 69 }
        ],
        queue: [
            {
                id: "delivery-1",
                badge: "긴급",
                badgeTone: "danger",
                title: "당사 프로젝트 선택 제한 재검증",
                desc: "당사 여부가 N인 프로젝트가 선택되지 않도록 수정한 흐름을 다시 확인합니다.",
                tags: ["당사 여부", "선택 제한", "검증"],
                checks: ["Y/N 행 클릭 확인", "적용 버튼 방어 로직 확인", "안내 문구 일관성 점검"]
            },
            {
                id: "delivery-2",
                badge: "승인",
                badgeTone: "warn",
                title: "프로젝트 신규 등록 후 포커스 이동 확인",
                desc: "페이지가 바뀌어도 신규 등록 항목으로 바로 이동하는지 점검합니다.",
                tags: ["포커스", "페이징", "등록"],
                checks: ["신규 등록 후 전체 목록 재조회", "등록 행 페이지 계산 확인", "행 선택/스크롤 확인"]
            },
            {
                id: "delivery-3",
                badge: "공유",
                badgeTone: "neutral",
                title: "프로젝트 선택 팝업 디자인 리뷰",
                desc: "기존 수정 팝업과 톤을 맞춘 상태에서 시선 흐름이 자연스러운지 검토합니다.",
                tags: ["디자인", "BAR", "팝업"],
                checks: ["타이틀 pill 정렬", "우측 등록영역 강조 확인", "검색결과 헤더 시선 체크"]
            },
            {
                id: "delivery-4",
                badge: "정리",
                badgeTone: "mint",
                title: "자동 코드 생성 규칙 문서화",
                desc: "PRJ 접두사 기반 다음 코드 생성 규칙을 팀 기준으로 정리합니다.",
                tags: ["코드 생성", "문서화", "백엔드"],
                checks: ["현재 쿼리 규칙 정리", "예외 케이스 기록", "프론트 기대 동작 정리"]
            }
        ]
    }
};

var hr030PeriodConfig = {
    day: { label: "오늘", metricFactor: 0.45, trendOffset: -8, focusOffset: 4 },
    week: { label: "이번 주", metricFactor: 1, trendOffset: 0, focusOffset: 0 },
    month: { label: "이번 달", metricFactor: 1.65, trendOffset: 7, focusOffset: -6 }
};

document.addEventListener("DOMContentLoaded", function () {
    var dashboard = document.getElementById("hr030-dashboard");
    if (!dashboard) {
        return;
    }

    var applyButton = document.querySelector(".search-btn-area .btn-search");
    if (applyButton) {
        applyButton.textContent = "적용";
        applyButton.addEventListener("click", function (event) {
            event.preventDefault();
            applyHr030Filters();
        });
    }

    bindHr030MetricCards();
    bindHr030ToolbarButtons();
    bindHr030QuickActions();
    prepareHr030Reveal();
    syncHr030StateFromInputs();
    renderHr030Dashboard();
});

function syncHr030StateFromInputs() {
    var perspectiveEl = document.getElementById("hr030Perspective");
    var periodEl = document.getElementById("hr030Period");

    hr030State.perspective = perspectiveEl ? perspectiveEl.value : "ops";
    hr030State.period = periodEl ? periodEl.value : "week";
}

function applyHr030Filters() {
    syncHr030StateFromInputs();
    renderHr030Dashboard();
    replayHr030Motion();
}

function bindHr030MetricCards() {
    var cards = document.querySelectorAll(".hr030-metric-card");
    cards.forEach(function (card) {
        card.addEventListener("click", function () {
            hr030State.activeMetricKey = String(card.dataset.metricKey || "");
            updateHr030ActiveMetricCard();
            pulseHr030Panel(card.dataset.panelTarget);
            updateHr030HeroPulse("현재 포커스: " + getHr030MetricLabel(hr030State.activeMetricKey));
        });
    });
}

function bindHr030ToolbarButtons() {
    var replayButton = document.getElementById("hr030Replay");
    var nextQueueButton = document.getElementById("hr030NextQueue");

    if (replayButton) {
        replayButton.addEventListener("click", function () {
            replayHr030Motion();
        });
    }

    if (nextQueueButton) {
        nextQueueButton.addEventListener("click", function () {
            selectNextHr030QueueItem();
        });
    }
}

function bindHr030QuickActions() {
    var actions = document.querySelectorAll(".hr030-quick-action");
    actions.forEach(function (button) {
        button.addEventListener("click", function () {
            button.classList.remove("is-pressed");
            void button.offsetWidth;
            button.classList.add("is-pressed");
            updateHr030HeroPulse(String(button.dataset.actionLabel || "빠른 실행") + " 준비 완료");
        });
    });
}

function prepareHr030Reveal() {
    var items = document.querySelectorAll("#hr030-dashboard .hr030-reveal");
    items.forEach(function (item, index) {
        item.style.setProperty("--hr030-delay", (index * 70) + "ms");
    });
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
    renderHr030Hero(scenario);
    renderHr030Metrics(scenario.metrics);
    renderHr030Queue(scenario.queue);
    renderHr030Trend(scenario.trends);
    updateHr030ActiveMetricCard();

    var dashboard = document.getElementById("hr030-dashboard");
    if (dashboard && !dashboard.classList.contains("is-ready")) {
        requestAnimationFrame(function () {
            dashboard.classList.add("is-ready");
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
            urgent: Math.max(1, Math.round(base.metrics.urgent * period.metricFactor)),
            approval: Math.max(1, Math.round(base.metrics.approval * period.metricFactor)),
            risk: Math.max(1, Math.round(base.metrics.risk * period.metricFactor)),
            focus: clampHr030Number(base.metrics.focus + period.focusOffset, 52, 97)
        },
        trends: base.trends.map(function (item) {
            return {
                label: item.label,
                value: clampHr030Number(item.value + period.trendOffset, 18, 100)
            };
        }),
        queue: base.queue
    };
}

function renderHr030Hero(scenario) {
    setHr030Text("hr030HeroKicker", scenario.kicker);
    setHr030Text("hr030HeroTitle", scenario.title);
    setHr030Text("hr030HeroDesc", scenario.desc);
    setHr030Text("hr030HeroPeriod", scenario.periodLabel);
    updateHr030HeroPulse("실시간 샘플 모드");
}

function renderHr030Metrics(metrics) {
    var valueNodes = document.querySelectorAll(".hr030-metric-value");
    valueNodes.forEach(function (node) {
        var metricKey = String(node.dataset.metricField || "");
        var suffix = String(node.dataset.suffix || "");
        animateHr030Number(node, Number(metrics[metricKey] || 0), suffix);
    });
}

function renderHr030Queue(queue) {
    var listEl = document.getElementById("hr030QueueList");
    var metaEl = document.getElementById("hr030QueueMeta");
    if (!listEl) {
        return;
    }

    listEl.innerHTML = queue.map(function (item, index) {
        return "" +
            "<button type=\"button\" class=\"hr030-queue-item" + (index === 0 ? " is-active" : "") + "\" data-queue-id=\"" + item.id + "\">" +
                "<span class=\"hr030-queue-badge hr030-queue-badge--" + item.badgeTone + "\">" + item.badge + "</span>" +
                "<strong>" + item.title + "</strong>" +
                "<p>" + item.desc + "</p>" +
            "</button>";
    }).join("");

    if (metaEl) {
        metaEl.textContent = queue.length + "개 항목";
    }

    hr030State.activeQueueId = queue.length ? queue[0].id : "";
    bindHr030QueueItems(queue);
    renderHr030Detail(queue[0]);
}

function bindHr030QueueItems(queue) {
    var buttons = document.querySelectorAll(".hr030-queue-item");
    buttons.forEach(function (button) {
        button.addEventListener("click", function () {
            var queueId = String(button.dataset.queueId || "");
            var selected = queue.find(function (item) {
                return item.id === queueId;
            });

            hr030State.activeQueueId = queueId;
            buttons.forEach(function (item) {
                item.classList.toggle("is-active", item === button);
            });
            renderHr030Detail(selected);
            pulseHr030Panel("hr030PanelDetail");
        });
    });
}

function renderHr030Detail(item) {
    if (!item) {
        return;
    }

    setHr030Text("hr030DetailStatus", item.badge);
    setHr030Text("hr030DetailTitle", item.title);
    setHr030Text("hr030DetailDesc", item.desc);

    var tagsEl = document.getElementById("hr030DetailTags");
    if (tagsEl) {
        tagsEl.innerHTML = item.tags.map(function (tag) {
            return "<span>" + tag + "</span>";
        }).join("");
    }

    var checksEl = document.getElementById("hr030DetailChecks");
    if (checksEl) {
        checksEl.innerHTML = item.checks.map(function (check) {
            return "<li>" + check + "</li>";
        }).join("");
    }
}

function renderHr030Trend(trends) {
    var trendEl = document.getElementById("hr030TrendList");
    if (!trendEl) {
        return;
    }

    trendEl.innerHTML = trends.map(function (item) {
        return "" +
            "<div class=\"hr030-trend-item\">" +
                "<div class=\"hr030-trend-text\">" +
                    "<span>" + item.label + "</span>" +
                    "<strong>" + item.value + "%</strong>" +
                "</div>" +
                "<div class=\"hr030-trend-track\">" +
                    "<span class=\"hr030-trend-fill\" style=\"width:" + item.value + "%\"></span>" +
                "</div>" +
            "</div>";
    }).join("");
}

function updateHr030ActiveMetricCard() {
    var cards = document.querySelectorAll(".hr030-metric-card");
    cards.forEach(function (card) {
        var isActive = String(card.dataset.metricKey || "") === hr030State.activeMetricKey;
        card.classList.toggle("is-active", isActive);
    });
}

function selectNextHr030QueueItem() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll(".hr030-queue-item"));
    if (!buttons.length) {
        return;
    }

    var currentIndex = buttons.findIndex(function (button) {
        return String(button.dataset.queueId || "") === hr030State.activeQueueId;
    });
    var nextIndex = currentIndex >= 0 ? (currentIndex + 1) % buttons.length : 0;
    buttons[nextIndex].click();
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

function animateHr030Number(node, targetValue, suffix) {
    if (!node) {
        return;
    }

    var previousFrame = Number(node.dataset.frameId || 0);
    if (previousFrame) {
        cancelAnimationFrame(previousFrame);
    }

    var startValue = Number(String(node.textContent || "0").replace(/[^\d.-]/g, "")) || 0;
    var duration = 680;
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
    var labelMap = {
        urgent: "즉시 확인",
        approval: "승인 대기",
        risk: "리스크 신호",
        focus: "집중도"
    };
    return labelMap[metricKey] || "집중 항목";
}

function setHr030Text(id, text) {
    var element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

function clampHr030Number(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

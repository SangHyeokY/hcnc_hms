package com.hcncinit.logging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hcncinit.service.QryCallHistService;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Aspect // AOP 동작 대상
@Component  // Spring Bean
public class QryLogAspect {
    private static final Logger logger = LoggerFactory.getLogger(QryLogAspect.class);   // 로그 출력용 로거 생성
    private static final String REQ_ID_ATTR = "REQ_ID"; // 요청 객체에 저장할 req_id 키 이름
    private static final int MAX_ERR_MSG = 500; // 에러msg 최대 길이제한
    private static final int MAX_UA_LEN = 500;  // User-Agent 최대 길이제한
    private static final int MAX_LIST_SIZE = 100;   // 리스트 파라미터 최대 저장 개수
    private static final Set<String> SENSITIVE_KEY_TOKENS = Set.of(  // 민감기 탐지용 키워드 목록
        "password",
        "pwd"
    );

    private final ObjectMapper objectMapper;        // JSON 변환용 객체
    private final QryCallHistService logService;    // 로그 저장 서비스 의존성

    @Autowired
    public QryLogAspect(ObjectMapper objectMapper, QryCallHistService logService) { // 생성자 시작
        this.objectMapper = objectMapper;    // JSON 변환기 주입
        this.logService = logService;   // 로그 서비스 주입
    }

    @Around("@annotation(qryLog)")  // @QryLog 붙은 메소드만 감싼다.
    public Object logCall(ProceedingJoinPoint pjp, QryLog qryLog) throws Throwable {
        // pjp - AOP 전달 객체,실행권한
        // qryLog - 어노테이션이나 파라미터로 전달된 로그 설정 정보(로그에 남길 쿼리이름, 타입등)
    
        long startMs = System.currentTimeMillis();  // 로그 시작시간(ms) 기록

        HttpServletRequest request = resolveRequest();  // 현재 요청 객체 획득(없을 수도 있음)
        HttpSession session = request != null ? request.getSession(false) : null;   // 세션 획득 없으면 null

        String reqId = resolveReqId(request);   // 요청 ID 생성
        String userId = resolveUserId(session); // 로그인 사용자 ID 획득

        Map<String, Object> log = new HashMap<>();
        log.put("req_id", reqId);   // 요청 ID
        log.put("user_id", userId); // 로그인 사용자 ID
        log.put("sess_id", session != null ? session.getId() : null);   // 세션 ID
        log.put("ip_addr", resolveClientIp(request));   // 클라이언트 IP
        log.put("ua_txt", truncate(request != null ? request.getHeader("User-Agent") : null, MAX_UA_LEN));  // User-Agent
        log.put("app_nm", qryLog.appNm());  // 애노테이션 appNm
        log.put("scrn_cd", emptyToNull(qryLog.scrnCd()));   // 화면코드
        log.put("fn_cd", qryLog.fnCd());    // 기능 코드
        log.put("op_typ", qryLog.opTyp());  // 작업 유형
        log.put("st_ts", new Timestamp(startMs));   // 로그 시작시간 DB타입으로
        log.put("crt_ts", new Timestamp(startMs));  // 로그 생성시간
        log.put("crt_by", userId != null ? userId : "SYSTEM");  // 로그 생성자

        if (qryLog.logParams()) {   // 파라미터 로깅이 허용된 경우에만
            log.put("req_params", buildParamsJson(pjp.getArgs()));  // 메서드 인자들을 JSON저장
        }

        try {
            Object result = pjp.proceed();  // 메서드 실행
            log.put("ok_yn", "Y");  // 로그 성공
            Integer rowCnt = extractRowCount(result);   // 결과에서 row count 추출
            if (rowCnt != null) {   // row count 있으면 저장
                log.put("row_cnt", rowCnt);
            }
            return result;
        } catch (Throwable ex) {    // 예외발생시
            log.put("ok_yn", "N"); // 실패표시
            log.put("err_cd", "EX");    // 예외코드 임시값
            log.put("err_msg", truncate(ex.getMessage(), MAX_ERR_MSG)); // 예외 메시지저장
            throw ex;
        } finally {     // 항상 실행
            long endMs = System.currentTimeMillis();    // 로그 종료시간(ms)
            log.put("ed_ts", new Timestamp(endMs)); // 로그 종료시간 저장
            log.put("dur_ms", (int) Math.min(Integer.MAX_VALUE, endMs - startMs));  // 처리시간 저장
            safeInsert(log);    // 로그 DB 저장(실패해도 무시)
        }
    }

    // 현재 요청 객체 얻는 헬퍼
    private HttpServletRequest resolveRequest() {   
        // 요청 컨텍스트가 있으면
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            // RequestContextHolder.getRequestAttributes() - ThreadLocal 에 요청과 관련된 속성들 꺼내오는 역할
            // instanceof ServletRequestAttributes attrs - 꺼내온 속성이 실제 요청정보 맞는지 확인하고, 형변환없이 바로 attrs 라는 변수로 사용할 수 있게 해줌

            return attrs.getRequest();  // 실제 request 반환
        }
        return null;    // 없으면 null
    }

    // 요청 ID 생성/조회
    private String resolveReqId(HttpServletRequest request) {
        if (request == null) {
            //  request == null 새 UUID
            return UUID.randomUUID().toString();
        }

        //  request속성에 이미 있는지 확인
        Object existing = request.getAttribute(REQ_ID_ATTR);
        if (existing != null) { // 있으면 그 값 사용
            return String.valueOf(existing);
        }

        // 없으면 새UUID생성
        String reqId = UUID.randomUUID().toString();
        request.setAttribute(REQ_ID_ATTR, reqId);   // 요청 객체에 저장
        return reqId;
    }

    // 세션에서 로그인 사용자 추출
    private String resolveUserId(HttpSession session) {
        if (session == null) {
            return null;
        }
        // 세션 속성에서 사용자 ID 가져옴 -> 문자열로 반환
        Object loginUserId = session.getAttribute("LOGIN_USER_ID");
        return loginUserId != null ? String.valueOf(loginUserId) : null;
    }

    // 클라이언트 IP 추출
    private String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        // 프록시 헤더(원본 클라이언트의 정보 유지위해 추가하는 HTTP 헤더) 확인
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) { // 값이 있으면
            int commaIdx = xff.indexOf(','); // 여러 IP일 경우 첫번째만
            return commaIdx > -1 ? xff.substring(0, commaIdx).trim() : xff.trim(); // 앞 IP 반환
        }
        // 다른 프록시 헤더 확인
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim(); // 있으면 반환
        }
        return request.getRemoteAddr(); // 마지막으로 기본 IP 반환
    }

    // 파라미터를 JSON 으로 반환
    private String buildParamsJson(Object[] args) {
        if (args == null || args.length == 0) {
            return null;
        }
        Map<String, Object> merged = new LinkedHashMap<>();
        int idx = 0;    // 인자 순서용
        for (Object arg : args) {
            if (arg == null || isIgnoredArg(arg)) {
                idx++;
                continue;   // null, 무시대상은 건너뜀
            }
            if (arg instanceof Map<?, ?> map) { // 맵이면 필터링 해서 합침
                merged.putAll(sanitizeMap(map));
            } else if (arg instanceof List<?> list) {   // 리스트면 list 키로 합침
                merged.put("list", sanitizeList(list));
            } else {    // 그외는 arg0/arg1 형태로 저장
                merged.put("arg" + idx, sanitizeValue(arg));
            }
            idx++;  // 인덱스 증가
        }
        if (merged.isEmpty()) { // 저장할게 없으면 null
            return null;
        }
        try {   // JSON 직렬화
            return objectMapper.writeValueAsString(merged);
        } catch (JsonProcessingException e) {
            logger.warn("Failed to serialize req_params", e);
            return null;
            // 실패 시 로그만 남기고 null
        }
    }

    // 맵 내부 민감정보 제거
    private Map<String, Object> sanitizeMap(Map<?, ?> source) {
        Map<String, Object> sanitized = new LinkedHashMap<>();  // 결과 맵 생성
        for (Map.Entry<?, ?> entry : source.entrySet()) {   // 엔트리 반복
            String key = String.valueOf(entry.getKey());    // 엔트리키를 문자열로 변환
            String keyLower = key.toLowerCase();    // 민감키 비교용 소문자
            if (isSensitiveKey(keyLower)) {
                continue;   // 민감키이면 제외
            }
            // 값도 정리
            Object value = sanitizeValue(entry.getValue());
            sanitized.put(key, value); // 저장
        }
        return sanitized;   //반환
    }

    // 리스트 내부 민감정보 제거
    private List<Object> sanitizeList(List<?> list) {
        List<Object> sanitized = new ArrayList<>(); // 결과 리스트 생성
        int limit = Math.min(list.size(), MAX_LIST_SIZE);   // 최대 크기 제한
        for (int i = 0; i < limit; i++) {
            sanitized.add(sanitizeValue(list.get(i)));
        }   // 각 요소 정리 후 저장
        return sanitized;   //반환
    }

    // 값 하나 정리
    private Object sanitizeValue(Object value) {
        if (value == null) {
            return null;
        }
            if (value instanceof MultipartFile) {
                return "[multipart]";   // 파일은 문자열로 치환
        }
        if (value instanceof ServletRequest || value instanceof ServletResponse) {
            return null;    // 요청/응답 저장x
        }
        if (value instanceof byte[]) {
            return "[binary]";  // 바이너리(이진수 데이터)는 문자열 치환
        }
        if (value instanceof Map<?, ?> map) {
            return sanitizeMap(map);    // 맵이면 재귀 정리
        }
        if (value instanceof List<?> list) {
            return sanitizeList(list);  // 리스트면 재귀 정리
        }
        return value;  // 그외 그대로 반환
    }

    // 무시할 인자 판별 ->  요청/세션/파일은 로깅 제외
    private boolean isIgnoredArg(Object arg) {
        return arg instanceof HttpServletRequest
            || arg instanceof HttpSession
            || arg instanceof ServletRequest
            || arg instanceof ServletResponse
            || arg instanceof MultipartFile;
    }

    // 민감키 검사 -> 키에 민감 단어 포함되면 true 
    private boolean isSensitiveKey(String keyLower) {
        for (String token : SENSITIVE_KEY_TOKENS) {
            if (keyLower.contains(token)) {
                return true;
            }
        }
        return false;
    }

    // 결과에서 row count 추출
    private Integer extractRowCount(Object result) {
        if (result == null) {
            return null;
        }
        if (result instanceof Number number) {
            return number.intValue();   // 숫자면 그대로 사용
        }
        if (result instanceof List<?> list) {
            return list.size(); // 리스트면 size 반환
        }
        return null;
    }

    // 로그 저장 안전하게 시도
    private void safeInsert(Map<String, Object> log) {
        try {
            logService.insert(log);
        } catch (Exception e) {
            logger.warn("Failed to insert tb_qry_call_hist", e);    // 실패해도 경고만
        }
    }

    // 문자열 길이 제한
    private String truncate(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        if (value.length() <= maxLen) {
            return value;
        }
        return value.substring(0, maxLen);  // 길면 자름
    }

    // 빈 문자열 null로 바꿈
    private String emptyToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }
}

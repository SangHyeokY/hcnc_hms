package com.hcncinit.service.hr;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.hcncinit.logging.QryLog;

@Service("Hr013Service")
public class Hr013Service {

    @Autowired
    private SqlSession sqlSession;

    // [인적관리] - [기본 인적사항] - [Tab3][프로젝트]
    // [Tab3][프로젝트] > 조회
    @QryLog(scrnCd = "HR010", fnCd = "TAB3_LIST", opTyp = "SELECT")
    public List<Map<String, Object>> list(Map<String, Object> map) {
        // 단가/프로젝트 이력 조회
        return this.sqlSession.selectList("com.hcncinit.Hr013Mapper.selectList", map);
    }

    // [Tab3][프로젝트] > 등록/저장
    @QryLog(scrnCd = "HR010", fnCd = "TAB3_SAVE", opTyp = "UPSERT")
    public int save(Map<String, Object> map) {
        // 프로젝트 저장 + 단가 이력 저장
        Object devPrjId = map.get("dev_prj_id");
        int res;
        if (devPrjId == null || String.valueOf(devPrjId).trim().isEmpty()) {
            res = this.sqlSession.insert("com.hcncinit.Hr013Mapper.insertProject", map);
        } else {
            res = this.sqlSession.update("com.hcncinit.Hr013Mapper.updateProject", map);
        }

        if (res > 0) {
            insertRateIfChanged(map);
        }
        return res;
    }

    // [Tab3][프로젝트] > 삭제
    @QryLog(scrnCd = "HR010", fnCd = "TAB3_DELETE", opTyp = "DELETE")
    public int delete(Map<String, Object> map) {
        // 프로젝트 삭제(소프트)
        int res = this.sqlSession.update("com.hcncinit.Hr013Mapper.deleteProject", map);
        if (res > 0) {
            this.sqlSession.update("com.hcncinit.Hr013Mapper.deleteRateByProject", map);
        }
        return res;
    }

    // [Tab3][프로젝트] > 계약단가 변경 반영
    private void insertRateIfChanged(Map<String, Object> map) {
        Object rateValue = map.get("rate_amt");
        BigDecimal newRate = toDecimal(rateValue);
        if (newRate == null) {
            return;
        }

        Object latest = this.sqlSession.selectOne("com.hcncinit.Hr013Mapper.selectLatestRate", map);
        BigDecimal latestRate = toDecimal(latest);

        if (latestRate == null || latestRate.compareTo(newRate) != 0) {
            this.sqlSession.insert("com.hcncinit.Hr013Mapper.insertRate", map);
        }
    }

    // [Tab3][프로젝트] > 소수점 반영
    private BigDecimal toDecimal(Object value) {
        if (value == null) {
            return null;
        }
        String raw = String.valueOf(value).trim();
        if (raw.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(raw);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @QryLog(scrnCd = "HR010", fnCd = "TAB3_PRJ_CODE_LIST", opTyp = "SELECT")
    public List<Map<String, Object>> listProjectCode(Map<String, Object> map) {
        // 프로젝트 코드 팝업 목록 조회 시 공통 파라미터를 먼저 표준화한다.
        normalizeProjectCodeParams(map, false); // 조회용 기본값 세팅
        return this.sqlSession.selectList("com.hcncinit.Hr013Mapper.selectProjectCodeList", map);
    }

    @QryLog(scrnCd = "HR010", fnCd = "TAB3_PRJ_CODE_SAVE", opTyp = "UPSERT")
    public int saveProjectCode(Map<String, Object> map) {
        // 저장 요청은 값 정규화/검증 후 진행한다.
        normalizeProjectCodeParams(map, true); // 저장용 기본값 세팅 + 검증

        // 코드명 중복은 UI 정책상 저장 실패(0)로 반환한다.
        Object dup = this.sqlSession.selectOne("com.hcncinit.Hr013Mapper.selectProjectCodeDupByName", map);
        if (dup != null) {
            map.put("dupYn", "Y");
            return 0; // 중복명칭이면 실패 처리
        }

        // 기존 코드 패턴(PRJ001/001 등)을 분석해 다음 코드를 자동 생성한다.
        Object nextCd = this.sqlSession.selectOne("com.hcncinit.Hr013Mapper.selectNextProjectCode", map);
        map.put("cd", nextCd == null ? "01" : String.valueOf(nextCd));

        return this.sqlSession.insert("com.hcncinit.Hr013Mapper.insertProjectCode", map);
    }

    // 프로젝트 코드 조회/저장 공통 파라미터 정리
    private void normalizeProjectCodeParams(Map<String, Object> map, boolean forSave) {
        if (map == null) {
            return;
        }

        map.put("grp_cd", "prj_cd"); // 그룹 고정
        map.put("parent_grp_cd", "prj_cd"); // 기존 패턴 호환

        String inprjYn = String.valueOf(map.getOrDefault("inprj_yn", "N")).trim().toUpperCase();
        if (!"Y".equals(inprjYn)) {
            inprjYn = "N";
        }
        map.put("inprj_yn", inprjYn);

        if (forSave) {
            // 저장 시 코드명 앞뒤 공백을 제거해 중복체크/저장 기준을 통일한다.
            String cdNm = String.valueOf(map.getOrDefault("cd_nm", "")).trim();
            map.put("cd_nm", cdNm);
        }
    }

}

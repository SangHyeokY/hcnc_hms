package com.hcncinit.service.cm040;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service("Cm040Service")
public class Cm040Service {

    @Autowired
    private SqlSession sqlSession;

    public List<Map<String, Object>> mainList(Map<String, Object> map) {
        // 코드그룹 목록 조회
        return this.sqlSession.selectList("com.hcncinit.Cm040Mapper.selectMainList", map);
    }

    public List<Map<String, Object>> detailList(Map<String, Object> map) {
        // 상세코드 목록 조회
        return this.sqlSession.selectList("com.hcncinit.Cm040Mapper.selectDetailList", map);
    }

    public int mainUpsert(Map<String, Object> map) {
        // 코드그룹 신규/수정 저장
        return this.sqlSession.insert("com.hcncinit.Cm040Mapper.upsertMain", map);
    }

    public int detailUpsert(Map<String, Object> map) {
        // 상세코드 신규/수정 저장
        return this.sqlSession.insert("com.hcncinit.Cm040Mapper.upsertDetail", map);
    }

    public void applyDetailDefaults(Map<String, Object> map) {
        if (map == null) {
            return;
        }

        Object parentGrpCd = map.get("parent_grp_cd");
        Object grpCd = map.get("grp_cd");
        if (isBlank(parentGrpCd) && !isBlank(grpCd)) {
            map.put("parent_grp_cd", String.valueOf(grpCd));
        } else if (isBlank(grpCd) && !isBlank(parentGrpCd)) {
            map.put("grp_cd", String.valueOf(parentGrpCd));
        }

        String mode = String.valueOf(map.getOrDefault("mode", "")).toLowerCase();
        boolean isInsert = "insert".equals(mode) || isBlank(map.get("cd"));

        if (isInsert) {
            if (isBlank(map.get("cd"))) {
                Object nextCd = this.sqlSession.selectOne("com.hcncinit.Cm040Mapper.selectNextDetailCd", map);
                if (nextCd != null) {
                    map.put("cd", String.valueOf(nextCd));
                }
            }
            if (isBlank(map.get("sort_no"))) {
                Object nextSortNo = this.sqlSession.selectOne("com.hcncinit.Cm040Mapper.selectNextDetailSortNo", map);
                if (nextSortNo != null) {
                    map.put("sort_no", nextSortNo);
                }
            }
        }
    }

    public int mainDelete(Map<String, Object> map) {
        // 코드그룹 삭제 처리
        return this.sqlSession.update("com.hcncinit.Cm040Mapper.deleteMain", map);
    }

    public int detailDelete(Map<String, Object> map) {
        // 상세코드 삭제 처리
        return this.sqlSession.update("com.hcncinit.Cm040Mapper.deleteDetail", map);
    }

    public int detailSort(Map<String, Object> map) {
        // 상세코드 정렬 저장
        return this.sqlSession.update("com.hcncinit.Cm040Mapper.updateDetailSort", map);
    }

    public int detailCount(Map<String, Object> map) {
        // 상세코드 개수 조회
        Object count = this.sqlSession.selectOne("com.hcncinit.Cm040Mapper.detailCount", map);
        if (count instanceof Number) {
            return ((Number) count).intValue();
        }
        return 0;
    }

    public void ensureUser(Map<String, Object> map) {
        // 세션 사용자 기본값 설정
        Object userId = map.get("userId");
        if (userId == null || String.valueOf(userId).trim().isEmpty()) {
            map.put("userId", "admin");
        }

        Object parentGrpCd = map.get("parent_grp_cd");
        if (parentGrpCd == null || String.valueOf(parentGrpCd).trim().isEmpty()) {
            map.put("parent_grp_cd", map.get("grp_cd"));
        }
    }

    private boolean isBlank(Object value) {
        // 공백 여부 체크
        return value == null || String.valueOf(value).trim().isEmpty();
    }
}

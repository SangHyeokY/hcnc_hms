package com.hcncinit.service.hr;

import com.hcncinit.logging.QryLog;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service("Hr014Service")
public class Hr014Service {

    private static final Set<String> HR014_ALLOWED_ROLE_SET = Set.of("01", "02");

    @Autowired
    private SqlSession sqlSession;

    // [인적관리] - [기본 인적사항] - [Tab4][평가 및 리스크]

    // [Tab4_A][관리자 평가] > 조회
    @QryLog(scrnCd = "HR010", fnCd = "TAB4_EVAL_LIST", opTyp = "SELECT")
    public List<Map<String, Object>> listA(Map<String, Object> map) {
        requireHr014Access(map);
        // 탭1 평가 목록 조회
        return this.sqlSession.selectList("com.hcncinit.Hr014Mapper.selectListA", map);
    }

    // [Tab4_A][관리자 평가] > 저장
    @QryLog(scrnCd = "HR010", fnCd = "TAB4_EVAL_SAVE", opTyp = "UPSERT")
    public int saveA(Map<String, Object> map) {
        requireHr014Access(map);
        // 탭1 평가 저장
        Object rowsObj = map.get("rows");
        if (rowsObj instanceof List<?> rowsList && !rowsList.isEmpty()) {
            // rows가 존재하면 insert 실행
            return this.sqlSession.insert("com.hcncinit.Hr014Mapper.saveA", map);
        } else {
            // rows가 없으면 아무 작업을 안하고 0 반환
            return 0;
        }
    }

    // [Tab4_B][리스크 관리] > 조회
    @QryLog(scrnCd = "HR010", fnCd = "TAB4_RISK_LIST", opTyp = "SELECT")
    public List<Map<String, Object>> listB(Map<String, Object> map) {
        requireHr014Access(map);
        // 탭2 리스크 조회
        return this.sqlSession.selectList("com.hcncinit.Hr014Mapper.selectListB", map);
    }

    // [Tab4_B][리스크 관리] > 저장
    @QryLog(scrnCd = "HR010", fnCd = "TAB4_RISK_SAVE", opTyp = "UPSERT")
    public int saveB(Map<String, Object> map) {
        requireHr014Access(map);
        // 탭2 리스크 저장
        int updated = this.sqlSession.update("com.hcncinit.Hr014Mapper.updateLatestRiskByDev", map);
        if (updated > 0) {
            return updated;
        }
        return this.sqlSession.insert("com.hcncinit.Hr014Mapper.insertRisk", map);
    }

    private void requireHr014Access(Map<String, Object> map) {
        Object roleObj = (map == null) ? null : map.get("login_role_cd");
        String roleCd = (roleObj == null) ? "" : String.valueOf(roleObj).trim();
        if (!HR014_ALLOWED_ROLE_SET.contains(roleCd)) {
            throw new IllegalArgumentException("접근 권한이 없습니다.");
        }
    }

}

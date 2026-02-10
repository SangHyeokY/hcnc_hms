package com.hcncinit.service.cm;

import com.hcncinit.logging.QryLog;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service("Cm010Service")
public class Cm010Service {

    @Autowired
    private SqlSession sqlSession;

    @QryLog(scrnCd = "CM010", fnCd = "USER_LIST", opTyp = "SELECT")
    public List<Map<String, Object>> list(Map<String, Object> map) {
        // 사용자 목록 조회
        return this.sqlSession.selectList("com.hcncinit.Cm010Mapper.selectUserList", map);
    }

    @QryLog(scrnCd = "CM010", fnCd = "USER_COMMON_CODES", opTyp = "SELECT", logParams = false)
    public List<Map<String, Object>> commonCodesForUser() {
        // 사용자 등록용 공통코드 조회
        return this.sqlSession.selectList("com.hcncinit.Cm010Mapper.selectCommonCodesForUser");
    }

    @QryLog(scrnCd = "CM010", fnCd = "USER_SAVE", opTyp = "UPSERT")
    public int upsert(Map<String, Object> map) {
        // 사용자 신규/수정 저장
        return this.sqlSession.insert("com.hcncinit.Cm010Mapper.upsertUser", map);
    }

    @QryLog(scrnCd = "CM010", fnCd = "USER_DELETE", opTyp = "DELETE")
    public int delete(Map<String, Object> map) {
        // 사용자 삭제 처리
        return this.sqlSession.update("com.hcncinit.Cm010Mapper.deleteUser", map);
    }

    @QryLog(scrnCd = "CM010", fnCd = "USER_LOGIN_FIND", opTyp = "SELECT", logParams = false)
    public Map<String, Object> findLoginUser(String userId) {
        // 로그인 사용자 조회
        return this.sqlSession.selectOne("com.hcncinit.Cm010Mapper.selectLoginUser", userId);
    }

    @QryLog(scrnCd = "CM010", fnCd = "USER_LAST_LOGIN", opTyp = "UPDATE", logParams = false)
    public int updateLastLogin(String userId) {
        // 마지막 로그인 일시 갱신
        Map<String, Object> param = new HashMap<>();
        param.put("user_id", userId);
        return this.sqlSession.update("com.hcncinit.Cm010Mapper.updateLastLogin", param);
    }

    public void ensureUser(Map<String, Object> map) {
        // 세션 사용자 기본값 설정
        Object userId = map.get("userId");
        if (userId == null || String.valueOf(userId).trim().isEmpty()) {
            map.put("userId", "system");
        }
    }

    public int pwChg(Map<String,Object> map){
        return this.sqlSession.insert("com.hcncinit.CommonMapper.pwChgUser", map);
    };

}

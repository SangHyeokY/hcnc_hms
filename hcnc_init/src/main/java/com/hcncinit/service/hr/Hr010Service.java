package com.hcncinit.service.hr;

import com.hcncinit.logging.QryLog;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.apache.ibatis.session.SqlSession;

@Service("Hr010Service")
public class Hr010Service {

    private static final Set<String> HR010_EDITOR_ROLE_SET = Set.of("01", "02", "03");

    @Autowired
    private SqlSession sqlSession;

    // [인적관리] - [기본 인적사항] - Main 화면/팝업

    // [기본 인적사항] > 조회
    @QryLog(scrnCd = "HR010", fnCd = "DEV_LIST", opTyp = "SELECT")
    public List<Map<String, Object>> select_hr010(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.Hr010Mapper.select_hr010", map);
    }

    // [기본 인적사항] > 이미지
    @QryLog(scrnCd = "HR010", fnCd = "DEV_IMG", opTyp = "SELECT")
    public byte[] select_hr010_img(Map<String, Object> map) {
        byte[] res = this.sqlSession.selectOne("com.hcncinit.Hr010Mapper.select_hr010_img", map);
        return res;
    }

    // [기본 인적사항] > 신규 등록/수정
    @QryLog(scrnCd = "HR010", fnCd = "DEV_SAVE", opTyp = "UPSERT")
    public int insert_hr010(Map<String, Object> map) {
        requireHr010Editor(map);
        return this.sqlSession.insert("com.hcncinit.Hr010Mapper.insert_hr010", map);
    }

    // [기본 인적사항] > dev_id 생성
    @QryLog(scrnCd = "HR010", fnCd = "DEV_GEN_ID", opTyp = "SELECT", logParams = false)
    public String generateDevId(String devType) {
        return this.sqlSession.selectOne("com.hcncinit.Hr010Mapper.selectDevId", devType);
    }

    // [기본 인적사항] > 삭제
    @QryLog(scrnCd = "HR010", fnCd = "DEV_DELETE", opTyp = "DELETE")
    public int delete_hr010(Map<String, Object> map) {
        requireHr010Editor(map);
        return this.sqlSession.update("com.hcncinit.Hr010Mapper.delete_hr010", map);
    }

    // [기본 인적사항] > 등급 계산
    @QryLog(scrnCd = "HR010", fnCd = "DEV_SCORE", opTyp = "SELECT")
    public Map<String, Object> dev_score(String devId) {
        return this.sqlSession.selectOne("com.hcncinit.Hr010Mapper.dev_score", devId);
    }

    private void requireHr010Editor(Map<String, Object> map) {
        Object roleObj = (map == null) ? null : map.get("login_role_cd");
        String roleCd = (roleObj == null) ? "" : String.valueOf(roleObj).trim();
        if (!HR010_EDITOR_ROLE_SET.contains(roleCd)) {
            throw new IllegalArgumentException("접근 권한이 없습니다.");
        }
    }
}

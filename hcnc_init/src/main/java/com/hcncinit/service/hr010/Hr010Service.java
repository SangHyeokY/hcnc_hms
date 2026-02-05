package com.hcncinit.service.hr010;

import com.hcncinit.logging.QryLog;
import java.io.InputStream;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.apache.ibatis.session.SqlSession;

@Service("Hr010Service")
public class Hr010Service {

    @Autowired
    private SqlSession sqlSession;

    // 인력관리 > 기본 인적사항 (임시/검색x), 따로 분류할건지는 논의
    @QryLog(scrnCd = "HR010", fnCd = "DEV_LIST", opTyp = "SELECT")
    public List<Map<String, Object>> select_hr010(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.Hr010Mapper.select_hr010", map);
    }

    // 인력관리 > 기본 인적사항 이미지
    @QryLog(scrnCd = "HR010", fnCd = "DEV_IMG", opTyp = "SELECT")
    public byte[] select_hr010_img(Map<String, Object> map) {
        byte[] res = this.sqlSession.selectOne("com.hcncinit.Hr010Mapper.select_hr010_img", map);
        return res;
    }

    // 인력관리 신규 등록/수정
    @QryLog(scrnCd = "HR010", fnCd = "DEV_SAVE", opTyp = "UPSERT")
    public int insert_hr010(Map<String, Object> map) {
        return this.sqlSession.insert("com.hcncinit.Hr010Mapper.insert_hr010", map);
    }

    // 인력관리 => dev_id 생성
    @QryLog(scrnCd = "HR010", fnCd = "DEV_GEN_ID", opTyp = "SELECT", logParams = false)
    public String generateDevId(String devType) {
        return this.sqlSession.selectOne("com.hcncinit.Hr010Mapper.selectDevId", devType);
    }

    // 인력관리 삭제
    @QryLog(scrnCd = "HR010", fnCd = "DEV_DELETE", opTyp = "DELETE")
    public int delete_hr010(Map<String, Object> map) {
        return this.sqlSession.update("com.hcncinit.Hr010Mapper.delete_hr010", map);
    }

    @QryLog(scrnCd = "HR010", fnCd = "DEV_SCORE", opTyp = "SELECT")
    public Map<String, Object> dev_score(String devId) {
        return this.sqlSession.selectOne("com.hcncinit.Hr010Mapper.dev_score", devId);
    }
}

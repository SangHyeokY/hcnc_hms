package com.hcncinit.service.hr010;

import com.hcncinit.logging.QryLog;
import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service("Hr011Service")
public class Hr011Service {

    @Autowired
    private SqlSession sqlSession;

    // [인적관리] - [기본 인적사항] - [Tab1][소속 및 계약정보]

    // [Tab1][소속 및 계약정보] > 조회
    @QryLog(scrnCd = "HR010", fnCd = "TAB1_SELECT", opTyp = "SELECT")
    public Map<String, Object> select_tab1(String devId) {
        return this.sqlSession.selectOne("com.hcncinit.Hr011Mapper.select_tab1", devId);
    }

    // [Tab1][소속 및 계약정보] > 등록/수정
    @QryLog(scrnCd = "HR010", fnCd = "TAB1_SAVE", opTyp = "UPSERT")
    public int upsert_tab1(Map<String, Object> map) {
        return this.sqlSession.insert("com.hcncinit.Hr011Mapper.upsert_tab1", map);
    }

    // [Tab1][소속 및 계약정보] > 삭제
    @QryLog(scrnCd = "HR010", fnCd = "TAB1_DELETE", opTyp = "DELETE")
    public int delete_tab1(Map<String, Object> map) {
        return this.sqlSession.update("com.hcncinit.Hr011Mapper.delete_tab1", map);
    }
}

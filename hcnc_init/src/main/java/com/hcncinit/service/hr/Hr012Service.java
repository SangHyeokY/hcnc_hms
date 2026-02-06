package com.hcncinit.service.hr;

import com.hcncinit.logging.QryLog;
import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service("Hr012Service")
public class Hr012Service {

    @Autowired
    private SqlSession sqlSession;

    // [인적관리] - [기본 인적사항] - [Tab2][보유역량 및 숙련도]

    // [Tab2_A][보유역량] > 조회
    @QryLog(scrnCd = "HR010", fnCd = "TAB2_1_SELECT", opTyp = "SELECT")
    public List<Map<String, Object>> select_tab2_1(String devId) {
        return this.sqlSession.selectList("com.hcncinit.Hr012Mapper.select_tab2_1", devId);
    }

    // [Tab2_A][보유역량] > 저장/등록
    @QryLog(scrnCd = "HR010", fnCd = "TAB2_1_SAVE", opTyp = "UPSERT")
    public void upsert_tab2_1(List<Map<String, Object>> saveList) {
        for (Map<String, Object> row : saveList) {
            sqlSession.update("com.hcncinit.Hr012Mapper.upsert_tab2_1", row);
        }
    }

    // [Tab2_B][숙련도] > 조회
    @QryLog(scrnCd = "HR010", fnCd = "TAB2_2_SELECT", opTyp = "SELECT")
    public List<Map<String, Object>> select_tab2_2(String devId) {
        return this.sqlSession.selectList("com.hcncinit.Hr012Mapper.select_tab2_2", devId);
    }

    // [Tab2_B][숙련도] > 저장/등록
    @QryLog(scrnCd = "HR010", fnCd = "TAB2_2_SAVE", opTyp = "UPSERT")
    public void save_tab2_2(List<Map<String, Object>> saveList) {
        for (Map<String, Object> row : saveList) {
            sqlSession.update("com.hcncinit.Hr012Mapper.save_tab2_2", row);
        }
    }

}

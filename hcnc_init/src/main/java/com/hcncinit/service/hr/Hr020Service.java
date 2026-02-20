package com.hcncinit.service.hr;

import com.hcncinit.logging.QryLog;
import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service("Hr020Service")
public class Hr020Service {

    @Autowired
    private SqlSession sqlSession;

    // [인적관리] - [진행 프로젝트 내역] > 조회
    @QryLog(scrnCd = "HR020", fnCd = "PRJ_LIST", opTyp = "SELECT")
    public List<Map<String, Object>> select_hr020(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.Hr020Mapper.select_hr020", map);
    }

}

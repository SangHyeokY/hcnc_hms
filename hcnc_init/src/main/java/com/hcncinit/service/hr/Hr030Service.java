package com.hcncinit.service.hr;

import com.hcncinit.logging.QryLog;
import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service("Hr030Service")
public class Hr030Service {

    @Autowired
    private SqlSession sqlSession;

    // [대시보드] - [진행 프로젝트 내역] > 조회
    @QryLog(scrnCd = "HR030", fnCd = "KPI", opTyp = "SELECT")
    public List<Map<String, Object>> select_kpi(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.Hr030Mapper.select_kpi", map);
    }

}

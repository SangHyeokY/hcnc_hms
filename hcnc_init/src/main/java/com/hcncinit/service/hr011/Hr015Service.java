package com.hcncinit.service.hr011;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service("Hr015Service")
public class Hr015Service {

    @Autowired
    private SqlSession sqlSession;

    public List<Map<String, Object>> listA(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.Hr015Mapper.selectListA", map);
    }

    public List<Map<String, Object>> listB(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.Hr015Mapper.selectListB", map);
    }

    public int saveA(Map<String, Object> map) {
        return this.sqlSession.insert("com.hcncinit.Hr015Mapper.saveA", map);
    }

    public int saveB(Map<String, Object> map) {
        int updated = this.sqlSession.update("com.hcncinit.Hr015Mapper.updateLatestRiskByDev", map);
        if (updated > 0) {
            return updated;
        }
        return this.sqlSession.insert("com.hcncinit.Hr015Mapper.insertRisk", map);
    }

}

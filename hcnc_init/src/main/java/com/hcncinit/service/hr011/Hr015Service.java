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
        // 탭1 평가 목록 조회
        return this.sqlSession.selectList("com.hcncinit.Hr015Mapper.selectListA", map);
    }

    public List<Map<String, Object>> listB(Map<String, Object> map) {
        // 탭2 리스크 조회
        return this.sqlSession.selectList("com.hcncinit.Hr015Mapper.selectListB", map);
    }

    public int saveA(Map<String, Object> map) {
        // 탭1 평가 저장
        Object rowsObj = map.get("rows");
        if (rowsObj instanceof List<?> rowsList && !rowsList.isEmpty()) {
            // rows가 존재하면 insert 실행
            return this.sqlSession.insert("com.hcncinit.Hr015Mapper.saveA", map);
        } else {
            // rows가 없으면 아무 작업을 안하고 0 반환
            return 0;
        }
    }

    public int saveB(Map<String, Object> map) {
        // 탭2 리스크 저장
        int updated = this.sqlSession.update("com.hcncinit.Hr015Mapper.updateLatestRiskByDev", map);
        if (updated > 0) {
            return updated;
        }
        return this.sqlSession.insert("com.hcncinit.Hr015Mapper.insertRisk", map);
    }

}

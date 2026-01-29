package com.hcncinit.service.hr011;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service("Hr014Service")
public class Hr014Service {

    @Autowired
    private SqlSession sqlSession;

    public List<Map<String, Object>> list(Map<String, Object> map) {
        // 단가/프로젝트 이력 조회
        return this.sqlSession.selectList("com.hcncinit.Hr014Mapper.selectList", map);
    }
}

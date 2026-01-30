package com.hcncinit.service.hr010;

import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service("Hr012Service")
public class Hr012Service {

    @Autowired
    private SqlSession sqlSession;

    // tab2
    public List<Map<String, Object>> select_tab2_1(String devId) {
        return this.sqlSession.selectList("com.hcncinit.Hr012Mapper.select_tab2_1", devId);
    }
    public List<Map<String, Object>> select_tab2_2(String devId) {
        return this.sqlSession.selectList("com.hcncinit.Hr012Mapper.select_tab2_2", devId);
    }
}

package com.hcncinit.service;

import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service("CommonService")
public class CommonService {
    @Autowired
    private SqlSession sqlSession;

    public List<Map<String, Object>> get_cm(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.CommonMapper.get_cm", map);
    }
}

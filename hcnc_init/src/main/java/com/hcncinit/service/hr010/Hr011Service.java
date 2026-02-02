package com.hcncinit.service.hr010;

import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service("Hr011Service")
public class Hr011Service {

    @Autowired
    private SqlSession sqlSession;

    // tab1 조회
    public Map<String, Object> select_tab1(String devId) {
        return this.sqlSession.selectOne("com.hcncinit.Hr011Mapper.select_tab1", devId);
    }

    // tab 등록/수정
    public int upsert_tab1(Map<String, Object> map) {
        return this.sqlSession.insert("com.hcncinit.Hr011Mapper.upsert_tab1", map);
    }

    // tab 등록/수정
    public int delete_tab1(Map<String, Object> map) {
        return this.sqlSession.update("com.hcncinit.Hr011Mapper.delete_tab1", map);
    }
}

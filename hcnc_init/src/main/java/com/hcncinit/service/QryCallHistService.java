package com.hcncinit.service;

import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class QryCallHistService {

    @Autowired
    private SqlSession sqlSession;

    
    @Transactional(propagation = Propagation.REQUIRES_NEW)  // 이메서드는 항상 새트랜잭션을 만들어서 실행(로직실패시 롤백해도 로그 남기기 위해)
    public void insert(Map<String, Object> log) {
        this.sqlSession.insert("com.hcncinit.CommonMapper.add_log_data", log);
    }
}
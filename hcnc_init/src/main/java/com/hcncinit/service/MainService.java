package com.hcncinit.service;

import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.apache.ibatis.session.SqlSession;

@Service("MainService")
public class MainService {

    @Autowired
    private SqlSession sqlSession;

    public Map<String, Object> pData(Map<String,Object> map){
        Map<String, Object> result = new HashMap();
        result = (Map<String, Object>)this.sqlSession.selectOne("com.hcncinit.MainMapper.pData", map);
        return result;
    };

    public Map<String, Object> eData(Map<String,Object> map){
        Map<String, Object> result = new HashMap();
        result = (Map<String, Object>)this.sqlSession.selectOne("com.hcncinit.MainMapper.eData", map);
        return result;
    };

    public Map<String, Object> sData(Map<String,Object> map){
        Map<String, Object> result = new HashMap();
        result = (Map<String, Object>)this.sqlSession.selectOne("com.hcncinit.MainMapper.sData", map);
        return result;
    };

    public Map<String, Object> gData(Map<String,Object> map){
        Map<String, Object> result = new HashMap();
        result = (Map<String, Object>)this.sqlSession.selectOne("com.hcncinit.MainMapper.gData", map);
        return result;
    };

    public int pUpdate(Map<String,Object> map){
        int result = this.sqlSession.update("com.hcncinit.MainMapper.pUpdate", map);
        return result;
    }

    public int eUpdate(Map<String,Object> map){
        int result = this.sqlSession.update("com.hcncinit.MainMapper.eUpdate", map);
        return result;
    }

    public int sUpdate(Map<String,Object> map){
        int result = this.sqlSession.update("com.hcncinit.MainMapper.sUpdate", map);
        return result;
    }

    public int gUpdate(Map<String,Object> map){
        int result = this.sqlSession.update("com.hcncinit.MainMapper.gUpdate", map);
        return result;
    }
}

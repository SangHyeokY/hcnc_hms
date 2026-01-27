package com.hcncinit.service.cm010;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service("Cm010Service")
public class Cm010Service {

    @Autowired
    private SqlSession sqlSession;

    public List<Map<String, Object>> list(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.Cm010Mapper.selectUserList", map);
    }

    public int upsert(Map<String, Object> map) {
        return this.sqlSession.insert("com.hcncinit.Cm010Mapper.upsertUser", map);
    }

    public int delete(Map<String, Object> map) {
        return this.sqlSession.update("com.hcncinit.Cm010Mapper.deleteUser", map);
    }

    public Map<String, Object> findLoginUser(String userId) {
        return this.sqlSession.selectOne("com.hcncinit.Cm010Mapper.selectLoginUser", userId);
    }

    public int updateLastLogin(String userId) {
        Map<String, Object> param = new HashMap<>();
        param.put("user_id", userId);
        return this.sqlSession.update("com.hcncinit.Cm010Mapper.updateLastLogin", param);
    }

    public void ensureUser(Map<String, Object> map) {
        Object userId = map.get("userId");
        if (userId == null || String.valueOf(userId).trim().isEmpty()) {
            map.put("userId", "system");
        }
    }
}

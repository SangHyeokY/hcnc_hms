package com.hcncinit.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service("CommonCodeService")
public class CommonCodeService {

    @Autowired
    private SqlSession sqlSession;

    public List<Map<String, Object>> mainList(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.CommonCodeMapper.selectMainList", map);
    }

    public List<Map<String, Object>> detailList(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.CommonCodeMapper.selectDetailList", map);
    }

    public int mainUpsert(Map<String, Object> map) {
        return this.sqlSession.insert("com.hcncinit.CommonCodeMapper.upsertMain", map);
    }

    public int detailUpsert(Map<String, Object> map) {
        return this.sqlSession.insert("com.hcncinit.CommonCodeMapper.upsertDetail", map);
    }

    public int mainDelete(Map<String, Object> map) {
        return this.sqlSession.update("com.hcncinit.CommonCodeMapper.deleteMain", map);
    }

    public int detailDelete(Map<String, Object> map) {
        return this.sqlSession.update("com.hcncinit.CommonCodeMapper.deleteDetail", map);
    }

    public int detailSort(Map<String, Object> map) {
        return this.sqlSession.update("com.hcncinit.CommonCodeMapper.updateDetailSort", map);
    }

    public int detailCount(Map<String, Object> map) {
        Object count = this.sqlSession.selectOne("com.hcncinit.CommonCodeMapper.detailCount", map);
        if (count instanceof Number) {
            return ((Number) count).intValue();
        }
        return 0;
    }

    public void ensureUser(Map<String, Object> map) {
        Object userId = map.get("userId");
        if (userId == null || String.valueOf(userId).trim().isEmpty()) {
            map.put("userId", "admin");
        }

        Object parentGrpCd = map.get("parent_grp_cd");
        if (parentGrpCd == null || String.valueOf(parentGrpCd).trim().isEmpty()) {
            map.put("parent_grp_cd", map.get("grp_cd"));
        }
    }
}

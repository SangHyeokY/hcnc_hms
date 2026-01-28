package com.hcncinit.service.hr010;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.apache.ibatis.session.SqlSession;

@Service("Hr010Service")
public class Hr010Service {

    @Autowired
    private SqlSession sqlSession;

    // 인력관리 > 기본 인적사항 (임시/검색x), 따로 분류할건지는 논의
    public List<Map<String, Object>> select_hr010(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.Hr010Mapper.select_hr010", map);
    }

    // 인력관리 > 기본 인적사항 (상세) (임시/검색x), 따로 분류할건지는 논의
    public Map<String, Object> select_hr011(String devId) {
        return this.sqlSession.selectOne("com.hcncinit.Hr010Mapper.select_hr011", devId);
    }
}

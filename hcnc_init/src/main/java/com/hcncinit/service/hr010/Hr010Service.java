package com.hcncinit.service.hr010;
import java.io.InputStream;
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

    // 인력관리 > 기본 인적사항 이미지
    public byte[] select_hr010_img(Map<String, Object> map) {
        byte[] res = this.sqlSession.selectOne("com.hcncinit.Hr010Mapper.select_hr010_img", map);
        return res;
    }

    // 인력관리 신규 등록/수정
    public int insert_hr010(Map<String, Object> map) {
        return this.sqlSession.insert("com.hcncinit.Hr010Mapper.insert_hr010", map);
    }

    // 인력관리 => dev_id 생성
    public String generateDevId(String devType) {
        return this.sqlSession.selectOne("com.hcncinit.Hr010Mapper.selectDevId", devType);
    }

    // 인력관리 삭제
    public int delete_hr010(Map<String, Object> map) {
        return this.sqlSession.update("com.hcncinit.Hr010Mapper.delete_hr010", map);
    }

    public Map<String, Object> dev_score(String devId) {
        return this.sqlSession.selectOne("com.hcncinit.Hr010Mapper.dev_score", devId);
    }
}

package com.hcncinit.service.hr;

import com.hcncinit.logging.QryLog;
import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service("Hr020Service")
public class Hr020Service {

    @Autowired
    private SqlSession sqlSession;
    
    // 진행 프로젝트 내역으로 교체 예정 !!

    // [인적관리] - [진행 프로젝트 내역] - Main 화면/팝업

    // [진행 프로젝트 내역] > 조회
    @QryLog(scrnCd = "HR020", fnCd = "DEV_LIST", opTyp = "SELECT")
    public List<Map<String, Object>> select_hr020(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.Hr020Mapper.select_hr020", map);
    }

    // [진행 프로젝트 내역] > 이미지
    @QryLog(scrnCd = "HR020", fnCd = "DEV_IMG", opTyp = "SELECT")
    public byte[] select_hr020_img(Map<String, Object> map) {
        byte[] res = this.sqlSession.selectOne("com.hcncinit.Hr020Mapper.select_hr020_img", map);
        return res;
    }

    // [진행 프로젝트 내역] > 신규 등록/수정
    @QryLog(scrnCd = "HR020", fnCd = "DEV_SAVE", opTyp = "UPSERT")
    public int insert_hr020(Map<String, Object> map) {
        return this.sqlSession.insert("com.hcncinit.Hr020Mapper.insert_hr020", map);
    }

    // [진행 프로젝트 내역] > 삭제
    @QryLog(scrnCd = "HR020", fnCd = "DEV_DELETE", opTyp = "DELETE")
    public int delete_hr020(Map<String, Object> map) {
        return this.sqlSession.update("com.hcncinit.Hr020Mapper.delete_hr020", map);
    }

}

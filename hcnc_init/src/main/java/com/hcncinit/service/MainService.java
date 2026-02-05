package com.hcncinit.service;

import com.hcncinit.logging.QryLog;
import java.util.List;
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

    @QryLog(scrnCd = "MAIN", fnCd = "MAIN_P_UPDATE", opTyp = "UPDATE")
    public int pUpdate(Map<String,Object> map){
        int result = this.sqlSession.update("com.hcncinit.MainMapper.pUpdate", map);
        return result;
    }

    @QryLog(scrnCd = "MAIN", fnCd = "MAIN_E_UPDATE", opTyp = "UPDATE")
    public int eUpdate(Map<String,Object> map){
        int result = this.sqlSession.update("com.hcncinit.MainMapper.eUpdate", map);
        return result;
    }

    @QryLog(scrnCd = "MAIN", fnCd = "MAIN_S_UPDATE", opTyp = "UPDATE")
    public int sUpdate(Map<String,Object> map){
        int result = this.sqlSession.update("com.hcncinit.MainMapper.sUpdate", map);
        return result;
    }

    @QryLog(scrnCd = "MAIN", fnCd = "MAIN_G_UPDATE", opTyp = "UPDATE")
    public int gUpdate(Map<String,Object> map){
        int result = this.sqlSession.update("com.hcncinit.MainMapper.gUpdate", map);
        return result;
    }

    // 인력관리 > 기본 인적사항 (임시/검색x), 따로 분류할건지는 논의
    public List<Map<String, Object>> select_hr010(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.MainMapper.select_hr010", map);
    }

    // 인력관리 > 기본 인적사항 (상세) (임시/검색x), 따로 분류할건지는 논의
    public Map<String, Object> select_hr011(Map<String,Object> map){
        Map<String, Object> result = new HashMap();
        result = (Map<String, Object>)this.sqlSession.selectOne("com.hcncinit.MainMapper.select_hr011", map);
        return result;
    };
}

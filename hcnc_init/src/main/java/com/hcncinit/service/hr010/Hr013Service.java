package com.hcncinit.service.hr010;

import com.hcncinit.logging.QryLog;
import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service("Hr013Service")
public class Hr013Service {

    @Autowired
    private SqlSession sqlSession;

    @QryLog(scrnCd = "HR010", fnCd = "TAB3_LIST", opTyp = "SELECT")
    public List<Map<String, Object>> list(Map<String, Object> map) {
        // 단가/프로젝트 이력 조회
        return this.sqlSession.selectList("com.hcncinit.Hr013Mapper.selectList", map);
    }

    @QryLog(scrnCd = "HR010", fnCd = "TAB3_SAVE", opTyp = "UPSERT")
    public int save(Map<String, Object> map) {
        // 프로젝트 저장 + 단가 이력 저장
        Object devPrjId = map.get("dev_prj_id");
        int res;
        if (devPrjId == null || String.valueOf(devPrjId).trim().isEmpty()) {
            res = this.sqlSession.insert("com.hcncinit.Hr013Mapper.insertProject", map);
        } else {
            res = this.sqlSession.update("com.hcncinit.Hr013Mapper.updateProject", map);
        }

        if (res > 0) {
            insertRateIfChanged(map);
        }
        return res;
    }

    @QryLog(scrnCd = "HR010", fnCd = "TAB3_DELETE", opTyp = "DELETE")
    public int delete(Map<String, Object> map) {
        // 프로젝트 삭제(소프트)
        int res = this.sqlSession.update("com.hcncinit.Hr013Mapper.deleteProject", map);
        if (res > 0) {
            this.sqlSession.update("com.hcncinit.Hr013Mapper.deleteRateByProject", map);
        }
        return res;
    }

    private void insertRateIfChanged(Map<String, Object> map) {
        Object rateValue = map.get("rate_amt");
        BigDecimal newRate = toDecimal(rateValue);
        if (newRate == null) {
            return;
        }

        Object latest = this.sqlSession.selectOne("com.hcncinit.Hr013Mapper.selectLatestRate", map);
        BigDecimal latestRate = toDecimal(latest);

        if (latestRate == null || latestRate.compareTo(newRate) != 0) {
            this.sqlSession.insert("com.hcncinit.Hr013Mapper.insertRate", map);
        }
    }

    private BigDecimal toDecimal(Object value) {
        if (value == null) {
            return null;
        }
        String raw = String.valueOf(value).trim();
        if (raw.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(raw);
        } catch (NumberFormatException e) {
            return null;
        }
    }

}

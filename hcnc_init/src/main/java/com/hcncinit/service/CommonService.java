package com.hcncinit.service;

import com.hcncinit.logging.QryLog;
import com.hcncinit.config.PoiRowInsertUtil;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.ibatis.session.SqlSession;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.checkerframework.checker.nullness.qual.MonotonicNonNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

import static com.hcncinit.config.PoiRowInsertUtil.*;

@Service("CommonService")
public class CommonService {
    @Autowired
    private SqlSession sqlSession;

    public List<Map<String, Object>> get_cm(Map<String, Object> map) {
        return this.sqlSession.selectList("com.hcncinit.CommonMapper.get_cm", map);
    }

    private static final String TEMPLATE_PATH = "templates/excel/ExcelDownload.xlsx";

    @QryLog(scrnCd = "COMMON", fnCd = "EXCEL_DOWNLOAD", opTyp = "DOWNLOAD", logParams = false)
    public void download(HttpServletResponse response) throws IOException {

        Map<String, Object> map = Map.of("dev_id", "HCNC_F001");
        Map<String, Object> sheet1Data = this.sqlSession.selectOne("com.hcncinit.CommonMapper.get_dev_info_excel", map);
        List<Map<String, Object>> sheet2Data01 = this.sqlSession.selectList("com.hcncinit.CommonMapper.get_skl_info_excel_01", map);
        List<Map<String, Object>> sheet2Data02 = this.sqlSession.selectList("com.hcncinit.CommonMapper.get_skl_info_excel_02", map);
        List<Map<String, Object>> sheet3Data = this.sqlSession.selectList("com.hcncinit.CommonMapper.get_prj_info_excel", map);
        List<Map<String, Object>> sheet4Data = this.sqlSession.selectList("com.hcncinit.CommonMapper.get_in_prj_info_excel", map);
        List<Map<String, Object>> sheet5Data01 = this.sqlSession.selectList("com.hcncinit.CommonMapper.get_in_evel_info_excel_01", map);
        List<Map<String, Object>> sheet5Data02 = this.sqlSession.selectList("com.hcncinit.CommonMapper.get_in_evel_info_excel_02", map);
        List<Map<String, Object>> sheet6Data01 = this.sqlSession.selectList("com.hcncinit.CommonMapper.get_rate_info_excel", map);
        List<Map<String, Object>> sheet6Data02 = this.sqlSession.selectList("com.hcncinit.CommonMapper.get_avl_info_excel", map);

        try (InputStream is =
                     new ClassPathResource(TEMPLATE_PATH).getInputStream();
             XSSFWorkbook wb = new XSSFWorkbook(is);
             ServletOutputStream os = response.getOutputStream()) {

            fillSheet1(wb.getSheetAt(0), sheet1Data);
            fillSheet2(wb.getSheetAt(1), sheet2Data01, sheet2Data02);
            fillSheet3(wb.getSheetAt(2), sheet3Data);
            fillSheet4(wb.getSheetAt(3), sheet4Data);
            fillSheet5(wb.getSheetAt(4), sheet5Data01, sheet5Data02);
            fillSheet6(wb.getSheetAt(5), sheet6Data01, sheet6Data02);

            wb.write(os);
            os.flush();
        }
    }

    /* =========================================================
       Sheet #1
       ========================================================= */
    private void fillSheet1(XSSFSheet sheet, Map<String, Object> data) {
        int startRow = 4;
        int startCol = 2;
        int templateRowIndex = 2;

        Map<String, Integer> colMap = Map.ofEntries(
            Map.entry("dev_nm", 0),
            Map.entry("brdt", 1),
            Map.entry("tel", 2),
            Map.entry("email", 3),
            Map.entry("region", 4),
            Map.entry("main_lang", 5),
            Map.entry("exp_yr", 6),
            Map.entry("edu_last", 7),
            Map.entry("cert_txt", 8),
            Map.entry("work_md", 9),
            Map.entry("hope_rate_amt", 10),
            Map.entry("ctrt_typ", 11),
            Map.entry("org_nm", 16),
            Map.entry("biz_typ", 17),
            Map.entry("st_dt", 18),
            Map.entry("ed_dt", 19),
            Map.entry("amt", 20),
            Map.entry("remark", 22)
        );

        fillByMap_rvc(sheet, data, startRow, startCol, templateRowIndex, colMap);
    }

    private void fillSheet2(XSSFSheet sheet, List<Map<String, Object>> data01, List<Map<String, Object>> data02) {
        int startRow = 4;
        int templateRowIndex = 2;

        int i = 0;
        for (; i < data01.size(); i++) {
            insertRowsAndFixMerges(sheet, startRow, 1);
            // 스타일 복사
            copyRowStyle(sheet, startRow + 1, startRow);
            // ★ 병합도 복사 (원하는 경우)
            copyRowMerges(sheet, startRow + 1, startRow);
        }
        deleteRowAndFixMerges(sheet, startRow + i, true);

        Map<String, Integer> colMap = Map.of(
                "cd_nm", 1,
                "skl_id_lst", 2
        );

        fillByMap(sheet, data01, startRow, templateRowIndex, colMap);

        startRow = startRow + i + 4; // 4: 타이틀 및 공백 영역

        i = 0;
        for (; i < data02.size(); i++) {
            insertRowsAndFixMerges(sheet, startRow, 1);
            // 스타일 복사
            copyRowStyle(sheet, startRow + 1, startRow);
            // ★ 병합도 복사 (원하는 경우)
            copyRowMerges(sheet, startRow + 1, startRow);
        }
        deleteRowAndFixMerges(sheet, startRow + i, true);

        colMap = Map.of(
                "cd_nm", 1,
                "lv1", 2,
                "lv2", 3,
                "lv3", 4,
                "lv4", 5,
                "lv5", 6
        );

        fillByMap(sheet, data02, startRow, templateRowIndex, colMap);
    }

    private void fillSheet3(XSSFSheet sheet, List<Map<String, Object>> data) {
        int startRow = 4;
        int templateRowIndex = 2;

        int i = 0;
        for (; i < data.size(); i++) {
            insertRowsAndFixMerges(sheet, startRow, 1);
            // 스타일 복사
            copyRowStyle(sheet, startRow + 1, startRow);
            // ★ 병합도 복사 (원하는 경우)
            copyRowMerges(sheet, startRow + 1, startRow);
        }
        deleteRowAndFixMerges(sheet, startRow + i, true);

        Map<String, Integer> colMap = Map.of(
                "st_ed_dt", 1,
                "cust_nm",   2,
                "prj_nm",    3,
                "job_cd", 4,
                "stack_txt", 5,
                "remark", 6
        );

        fillByMap(sheet, data, startRow, templateRowIndex, colMap);
    }

    private void fillSheet4(XSSFSheet sheet, List<Map<String, Object>> data) {
        int startRow = 4;
        int templateRowIndex = 2;

        int i = 0;
        for (; i < data.size(); i++) {
            insertRowsAndFixMerges(sheet, startRow, 1);
            // 스타일 복사
            copyRowStyle(sheet, startRow + 1, startRow);
            // ★ 병합도 복사 (원하는 경우)
            copyRowMerges(sheet, startRow + 1, startRow);
        }
        deleteRowAndFixMerges(sheet, startRow + i, true);

        Map<String, Integer> colMap = Map.of(
                "st_ed_dt", 1,
                "prj_nm",    2,
                "job_cd", 3,
                "alloc_pct", 4,
                "remark", 5
        );

        fillByMap(sheet, data, startRow, templateRowIndex, colMap);
    }

    private void fillSheet5(XSSFSheet sheet, List<Map<String, Object>> data01, List<Map<String, Object>> data02) {
        int startRow = 4;
        int templateRowIndex = 2;

        int i = 0;
        for (; i < data01.size(); i++) {
            insertRowsAndFixMerges(sheet, startRow, 1);
            // 스타일 복사
            copyRowStyle(sheet, startRow + 1, startRow);
            // ★ 병합도 복사 (원하는 경우)
            copyRowMerges(sheet, startRow + 1, startRow);
        }
        deleteRowAndFixMerges(sheet, startRow, false);

        Map<String, Integer> colMap = Map.of(
                "cd_nm",   1,
                "lv1", 2,
                "lv2", 3,
                "lv3", 4,
                "lv4", 5,
                "lv5", 6,
                "cmt", 7
        );

        fillByMap(sheet, data01, startRow, templateRowIndex, colMap);

        startRow = startRow + i + 4; // 4: 타이틀 및 공백 영역

        i = 0;
        for (; i < data02.size(); i++) {
            insertRowsAndFixMerges(sheet, startRow, 1);
            // 스타일 복사
            copyRowStyle(sheet, startRow + 1, startRow);
            // ★ 병합도 복사 (원하는 경우)
            copyRowMerges(sheet, startRow + 1, startRow);
        }
        deleteRowAndFixMerges(sheet, startRow + i, false);

        colMap = Map.of(
                "yn_key", 1,
                "value", 2
        );

        fillByMap(sheet, data02, startRow, templateRowIndex, colMap);
    }

    private void fillSheet6(XSSFSheet sheet, List<Map<String, Object>> data01, List<Map<String, Object>> data02) {
        int startRow = 4;
        int templateRowIndex = 2;

        int i = 0;
        for (; i < data01.size(); i++) {
            insertRowsAndFixMerges(sheet, startRow, 1);
            // 스타일 복사
            copyRowStyle(sheet, startRow + 1, startRow);
            // ★ 병합도 복사 (원하는 경우)
            copyRowMerges(sheet, startRow + 1, startRow);
        }
        deleteRowAndFixMerges(sheet, startRow, false);

        Map<String, Integer> colMap = Map.of(
                "dt",   1,
                "prj_nm", 2,
                "rate_amt", 3,
                "remark", 4
        );

        fillByMap(sheet, data01, startRow, templateRowIndex, colMap);

        startRow = startRow + i + 4; // 4: 타이틀 및 공백 영역

        i = 0;
        for (; i < data02.size(); i++) {
            insertRowsAndFixMerges(sheet, startRow, 1);
            // 스타일 복사
            copyRowStyle(sheet, startRow + 1, startRow);
            // ★ 병합도 복사 (원하는 경우)
            copyRowMerges(sheet, startRow + 1, startRow);
        }
        deleteRowAndFixMerges(sheet, startRow + i, false);

        colMap = Map.of(
                "dev_nm", 1,
                "st_cd", 2,
                "end_plan_dt", 3,
                "re_in_yn", 4
        );

        fillByMap(sheet, data02, startRow, templateRowIndex, colMap);
    }

    /* =========================================================
       공통 처리 (Map → Row)
       ========================================================= */

    private void fillByMap(
            XSSFSheet sheet,
            List<Map<String, Object>> map,
            int startRow,
            int templateRowIndex,
            Map<String, Integer> colMap
    ) {

        for (int i = 0; i < map.size(); i++) {
            int r = startRow + i;
//            copyTemplateRowStyle(sheet, templateRowIndex, r);

            XSSFRow row = getOrCreateRow(sheet, r);
            Map<String, Object> rowData = map.get(i);

            for (Map.Entry<String, Integer> entry : colMap.entrySet()) {
                Object value = rowData.get(entry.getKey());
                setCellValueKeepStyle(
                        sheet, row, templateRowIndex,
                        entry.getValue(), value);
            }
        }
    }

    private void fillByMap_rvc(
            XSSFSheet sheet,
            Map<String, Object> data,
            int startRow,          // 시작 행
            int startCol,          // 고정 컬럼
            int templateRowIndex,  // 서식 기준 행
            Map<String, Integer> rowMap  // key → row offset
    ) {

        for (Map.Entry<String, Integer> entry : rowMap.entrySet()) {

            int targetRowIdx = startRow + entry.getValue(); // ✅ 행이 내려감
            XSSFRow row = getOrCreateRow(sheet, targetRowIdx);

            Object value = data.get(entry.getKey());

            setCellValueKeepStyle(
                    sheet,
                    row,
                    templateRowIndex,
                    startCol,   // ✅ 컬럼 고정
                    value
            );
        }
    }
}

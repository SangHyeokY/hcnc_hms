package com.hcncinit.service;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;import java.text.SimpleDateFormat;
import java.util.*;

import org.springframework.web.multipart.MultipartFile;
import org.apache.poi.hssf.usermodel.HSSFDateUtil;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.commons.io.FilenameUtils;

import org.springframework.stereotype.Service;

@Service
public class ExcelService {

    public Map<String, Object> upload(MultipartFile file) {
        return upload(file, 0, 1);
    }
    public Map<String, Object> upload(MultipartFile file, int colIndex, int rowIndex) {

        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> data = new ArrayList<>();

        if (file == null || file.isEmpty()) {
            result.put("success", false);
            result.put("message", "파일이 비어있습니다.");
            return result;
        }

        String filename = file.getOriginalFilename();
        String ext = FilenameUtils.getExtension(filename);

        try (InputStream is = file.getInputStream();
             Workbook workbook = createWorkbook(is, ext)) {

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                result.put("success", false);
                result.put("message", "첫 번째 시트를 찾을 수 없습니다.");
                return result;
            }

            // 0행을 헤더로 사용
            Row headerRow = sheet.getRow(colIndex);
            if (headerRow == null) {
                result.put("success", false);
                result.put("message", "헤더(0행)가 없습니다.");
                return result;
            }

            List<String> headers = readHeaders(headerRow);

            // 데이터는 1행부터
            for (int r = rowIndex; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                Map<String, Object> rowMap = new LinkedHashMap<>();
                boolean hasAnyValue = false;

                for (int c = 0; c < headers.size(); c++) {
                    Cell cell = row.getCell(c);
                    Object value = readCellValue(cell);
                    if (value != null && !"".equals(value)) hasAnyValue = true;
                    rowMap.put(headers.get(c), value);
                }

                // 완전 빈 줄 제외
                if (hasAnyValue) data.add(rowMap);
            }

            result.put("success", true);
            result.put("count", data.size());
            result.put("data", data);
            return result;

        } catch (Exception e) {
            result.put("success", false);
            result.put("message", e.getMessage());
            return result;
        }
    }

    private Workbook createWorkbook(InputStream is, String ext) throws IOException {
        if ("xls".equalsIgnoreCase(ext)) {
            return new HSSFWorkbook(is);
        }
        if ("xlsx".equalsIgnoreCase(ext)) {
            return new XSSFWorkbook(is);
        }
        throw new IllegalArgumentException("지원하지 않는 확장자입니다: " + ext);
    }

    private List<String> readHeaders(Row headerRow) {
        List<String> headers = new ArrayList<>();
        int lastCell = headerRow.getLastCellNum(); // 헤더의 마지막 셀 기준
        for (int c = 0; c < lastCell; c++) {
            Cell cell = headerRow.getCell(c);
            String name = (cell == null) ? ("COL_" + c) : String.valueOf(readCellValue(cell));
            name = (name == null || name.isBlank()) ? ("COL_" + c) : name.trim();
            headers.add(name);
        }
        return headers;
    }

    private Object readCellValue(Cell cell) {
        if (cell == null) return null;

        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (org.apache.poi.ss.usermodel.DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getDateCellValue(); // Date 그대로 반환 (JSON 직렬화 시 문자열로 바꾸고 싶으면 포맷 적용)
                }
                double n = cell.getNumericCellValue();
                // 정수처럼 보이면 Long으로
                if (n == Math.rint(n)) yield (long) n;
                yield n;
            }
            case BOOLEAN -> cell.getBooleanCellValue();
            case FORMULA -> { // 공식 결과값을 받고 싶으면 evaluator 사용
                yield cell.getCellFormula(); // 일단 공식 문자열
            }
            case BLANK -> null;
            default -> String.valueOf(cell);
        };
    }
}
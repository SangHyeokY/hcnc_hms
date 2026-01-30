package com.hcncinit.config;

import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;

        import java.util.ArrayList;
import java.util.List;

public class PoiRowInsertUtil {

    /**
     * 특정 위치(insertRowIdx)에 rowsToInsert 만큼 "행 삽입" + "병합영역 보정"
     *
     * @param sheet        대상 시트
     * @param insertRowIdx 삽입할 행 index (0-based)
     * @param rowsToInsert 삽입할 행 수 (보통 1)
     */
    public static void insertRowsAndFixMerges(XSSFSheet sheet, int insertRowIdx, int rowsToInsert) {
        if (rowsToInsert <= 0) return;

        // 1) 병합영역 "복제"해서 저장 (원본 객체 재사용/변형 방지)
        List<CellRangeAddress> original = new ArrayList<>();
        for (CellRangeAddress r : sheet.getMergedRegions()) {
            original.add(r.copy()); // ★ 중요
        }

        // 2) 병합영역 먼저 제거 (뒤에서부터)
        for (int i = sheet.getNumMergedRegions() - 1; i >= 0; i--) {
            sheet.removeMergedRegion(i);
        }

        // 3) 행 이동
        int lastRow = sheet.getLastRowNum();
        if (insertRowIdx <= lastRow) {
            sheet.shiftRows(insertRowIdx, lastRow, rowsToInsert, true, true);
        }

        // 4) 병합영역 보정 후 재등록
        for (CellRangeAddress region : original) {
            CellRangeAddress fixed = fixMergedRegionForRowInsert(region, insertRowIdx, rowsToInsert);

            // addMergedRegion()은 겹치면 예외가 날 수 있음 → 로그 확인용으로 try/catch 추천
            try {
                sheet.addMergedRegion(fixed);
            } catch (IllegalStateException e) {
                // 템플릿에 "겹치는 병합"이 원래 있거나, 보정 결과가 겹친 경우
                // 이런 케이스는 addMergedRegionUnsafe를 고려(아래 참고)
                // throw e;
            }
        }

        // 5) 삽입된 행 생성
        for (int i = 0; i < rowsToInsert; i++) {
            int r = insertRowIdx + i;
            if (sheet.getRow(r) == null) sheet.createRow(r);
        }
    }

    /**
     * 병합영역을 "행 삽입"에 맞게 보정
     *
     * 규칙:
     *  A) 병합영역이 삽입 위치 아래에 완전히 있으면 => firstRow/lastRow 모두 +n 이동
     *  B) 병합영역이 삽입 위치를 "가로지르면"(firstRow < insertRow <= lastRow) => lastRow만 +n 확장
     *  C) 그 외 => 변화 없음
     */
    private static CellRangeAddress fixMergedRegionForRowInsert(
            CellRangeAddress region, int insertRowIdx, int rowsToInsert
    ) {
        int firstRow = region.getFirstRow();
        int lastRow  = region.getLastRow();
        int firstCol = region.getFirstColumn();
        int lastCol  = region.getLastColumn();

        if (firstRow >= insertRowIdx) {
            firstRow += rowsToInsert;
            lastRow  += rowsToInsert;
        } else if (firstRow < insertRowIdx && lastRow >= insertRowIdx) {
            lastRow += rowsToInsert;
        }

        return new CellRangeAddress(firstRow, lastRow, firstCol, lastCol);
    }

    // ---- (선택) 템플릿 행 스타일 복사 유틸 ----

    public static void copyRowStyle(XSSFSheet sheet, int templateRowIdx, int targetRowIdx) {
        XSSFRow templateRow = sheet.getRow(templateRowIdx);
        if (templateRow == null) return;

        XSSFRow targetRow = sheet.getRow(targetRowIdx);
        if (targetRow == null) targetRow = sheet.createRow(targetRowIdx);

        targetRow.setHeight(templateRow.getHeight());

        short lastCellNum = templateRow.getLastCellNum();
        for (int c = 0; c < lastCellNum; c++) {
            XSSFCell tCell = templateRow.getCell(c);
            if (tCell == null) continue;

            XSSFCell cell = targetRow.getCell(c);
            if (cell == null) cell = targetRow.createCell(c);

            cell.setCellStyle(tCell.getCellStyle());
            // 타입까지 굳이 복제할 필요는 없지만 템플릿이 명확하면 도움이 됩니다.
            cell.setCellType(tCell.getCellType());
        }
    }

    public static void setCellValueSafe(XSSFRow row, int colIdx, Object value) {
        XSSFCell cell = row.getCell(colIdx);
        if (cell == null) cell = row.createCell(colIdx);

        if (value == null) {
            cell.setBlank();
        } else if (value instanceof Number n) {
            cell.setCellValue(n.doubleValue());
        } else if (value instanceof Boolean b) {
            cell.setCellValue(b);
        } else {
            cell.setCellValue(String.valueOf(value));
        }
    }


    public static XSSFRow getOrCreateRow(XSSFSheet sheet, int rowIdx) {
        XSSFRow row = sheet.getRow(rowIdx);
        return (row != null) ? row : sheet.createRow(rowIdx);
    }

    public static void copyTemplateRowStyle(
            XSSFSheet sheet, int templateRowIdx, int targetRowIdx) {

        if (templateRowIdx == targetRowIdx) return;

        XSSFRow templateRow = sheet.getRow(templateRowIdx);
        if (templateRow == null) return;

        XSSFRow targetRow = getOrCreateRow(sheet, targetRowIdx);
        targetRow.setHeight(templateRow.getHeight());

        for (int c = 0; c < templateRow.getLastCellNum(); c++) {
            XSSFCell tCell = templateRow.getCell(c);
            if (tCell == null) continue;

            XSSFCell cell = targetRow.getCell(c);
            if (cell == null) cell = targetRow.createCell(c);

            cell.setCellStyle(tCell.getCellStyle());
            cell.setCellType(tCell.getCellType());
        }
    }

    public static void setCellValueKeepStyle(
            XSSFSheet sheet,
            XSSFRow targetRow,
            int templateRowIndex,
            int col,
            Object value) {

        XSSFCell cell = targetRow.getCell(col);
        if (cell == null) cell = targetRow.createCell(col);

        XSSFRow templateRow = sheet.getRow(templateRowIndex);
        if (templateRow != null && templateRow.getCell(col) != null) {
            cell.setCellStyle(templateRow.getCell(col).getCellStyle());
        }

        if (value == null) {
            cell.setBlank();
        } else if (value instanceof Number n) {
            cell.setCellValue(n.doubleValue());
        } else if (value instanceof Boolean b) {
            cell.setCellValue(b);
        } else {
            cell.setCellValue(value.toString());
        }
    }

    public static XSSFRow insertRowWithStyle(
            XSSFSheet sheet,
            int insertRowIdx,
            int templateRowIdx
    ) {
        int lastRow = sheet.getLastRowNum();

        sheet.shiftRows(
                insertRowIdx,
                lastRow,
                1,
                true,
                true
        );

        XSSFRow newRow = sheet.createRow(insertRowIdx);
        XSSFRow templateRow = sheet.getRow(templateRowIdx);

        if (templateRow != null) {
            newRow.setHeight(templateRow.getHeight());

            for (int c = 0; c < templateRow.getLastCellNum(); c++) {
                XSSFCell tCell = templateRow.getCell(c);
                if (tCell == null) continue;

                XSSFCell cell = newRow.createCell(c);
                cell.setCellStyle(tCell.getCellStyle());
                cell.setCellType(tCell.getCellType());
            }
        }

        return newRow;
    }

    public static void copyRowMerges(XSSFSheet sheet, int templateRowIdx, int targetRowIdx) {
        List<CellRangeAddress> toAdd = new ArrayList<>();

        for (CellRangeAddress r : sheet.getMergedRegions()) {
            // 템플릿 행을 포함하는 병합만 골라서
            if (r.getFirstRow() <= templateRowIdx && templateRowIdx <= r.getLastRow()) {
                int rowSpanStart = r.getFirstRow() - templateRowIdx;
                int rowSpanEnd   = r.getLastRow()  - templateRowIdx;

                CellRangeAddress copied = new CellRangeAddress(
                        targetRowIdx + rowSpanStart,
                        targetRowIdx + rowSpanEnd,
                        r.getFirstColumn(),
                        r.getLastColumn()
                );
                toAdd.add(copied);
            }
        }

        for (CellRangeAddress r : toAdd) {
            sheet.addMergedRegion(r);
        }
    }

    public static void deleteRowAndFixMerges(XSSFSheet sheet, int deleteRowIdx, boolean isMerge) {

        if (isMerge) {
            // 1) 병합 영역 정리
            for (int i = sheet.getNumMergedRegions() - 1; i >= 0; i--) {
                CellRangeAddress region = sheet.getMergedRegion(i);

                // 삭제 대상 행을 포함하는 병합이면 제거
                if (region.getFirstRow() <= deleteRowIdx &&
                        region.getLastRow() >= deleteRowIdx) {
                    sheet.removeMergedRegion(i);
                }
                // 삭제 행 아래에 있는 병합이면 위로 이동
                else if (region.getFirstRow() > deleteRowIdx) {
                    sheet.removeMergedRegion(i);
                    CellRangeAddress moved = new CellRangeAddress(
                            region.getFirstRow() - 1,
                            region.getLastRow() - 1,
                            region.getFirstColumn(),
                            region.getLastColumn()
                    );
                    sheet.addMergedRegion(moved);
                }
            }
        }

        // 2) 행 삭제
        XSSFRow row = sheet.getRow(deleteRowIdx);
        if (row != null) {
            sheet.removeRow(row);
        }

        // 3) 아래 행들 위로 이동
        int lastRow = sheet.getLastRowNum();
        if (deleteRowIdx < lastRow) {
            sheet.shiftRows(deleteRowIdx + 1, lastRow, -1, true, true);
        }
    }
}


package com.hcncinit.service;

import com.hcncinit.logging.QryLog;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.ibatis.session.SqlSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service("FileService")
public class FileService {
    
    @Autowired
    private SqlSession sqlSession;

    private static final String BASE_UPLOAD_PATH = "C:/hcnc_hrm_uploads/"; // 파일 기본 업로드 위치
    private static final String MAPPER_NAMESPACE = "com.hcncinit.FileMapper";


    public List<Map<String, Object>> getData(Map<String,Object> map, String type){
        List<Map<String, Object>> result = new ArrayList();
        String selectId = MAPPER_NAMESPACE + "." + type.toLowerCase() + "fData";

        result = this.sqlSession.selectList(selectId, map);
        return result;
    };

    /**
     * 통합 파일 Upsert 메서드
     */
    @QryLog(scrnCd = "FILE", fnCd = "FILE_UPSERT", opTyp = "UPLOAD")
    public int fileUpsert(Map<String, Object> map, String fileType) throws IOException {
        String code = (String) map.get("code");
        String check = (String) map.get("check");
        MultipartFile file = (MultipartFile) map.get("file");

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("파일이 비어있습니다.");
        }

        // 1. 기존 파일 정보 조회
        Map<String, Object> queryMap = new HashMap<>();
        queryMap.put("code", code);
        queryMap.put("check", check);
        
        String selectId = MAPPER_NAMESPACE + "." + fileType.toLowerCase() + "fData";
        Map<String, Object> existingFile = sqlSession.selectOne(selectId, queryMap);

        // 2. 파일명 생성
        String originalFileName = file.getOriginalFilename();
        String uniqueFileName = generateUniqueFileName(originalFileName);

        // 3. 파일 저장 경로 생성
        String relativePath = (String) map.get("path");
        String uploadPath = BASE_UPLOAD_PATH + relativePath;
        File directory = new File(uploadPath);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        // 4. 기존 파일 삭제 (Update 케이스)
        if (existingFile != null) {
            deleteOldFile(existingFile);
        }

        // 5. 새 파일 저장
        String fullPath = uploadPath + "/" + uniqueFileName;
        File dest = new File(fullPath);
        file.transferTo(dest);
        System.out.println("파일 저장 완료: " + fullPath);

        // 6. DB 저장용 맵 설정 (기존 XML 구조에 맞춤)
        map.put("name", uniqueFileName);           // FILE_NM (유니크 파일명)
        map.put("oriName", originalFileName);      // ORI_FILE_NM (원본 파일명)
        map.put("path", uploadPath);               // FILE_PATH

        // 7. Insert or Update 실행
        int result;
        if (existingFile != null) {
            String updateId = MAPPER_NAMESPACE + "." + fileType.toLowerCase() + "fUpdate";
            result = sqlSession.update(updateId, map);
        } else {
            String insertId = MAPPER_NAMESPACE + "." + fileType.toLowerCase() + "fInsert";
            result = sqlSession.insert(insertId, map);
        }

        return result;
    }

    /**
     * 유니크 파일명 생성 (UUID + 타임스탬프 + 확장자)
     */
    private String generateUniqueFileName(String originalFileName) {
        String extension = "";
        int lastDotIndex = originalFileName.lastIndexOf(".");
        
        if (lastDotIndex > 0) {
            extension = originalFileName.substring(lastDotIndex);
        }
        
        String uniqueId = UUID.randomUUID().toString().substring(0, 8);
        String timestamp = String.valueOf(System.currentTimeMillis());
        
        return uniqueId + "_" + timestamp + extension;
    }

    /**
     * 기존 파일 삭제
     */
    private void deleteOldFile(Map<String, Object> existingFile) {
        String oldFilePath = (String) existingFile.get("FILE_PATH");
        String oldFileName = (String) existingFile.get("FILE_NM");
        
        if (oldFilePath != null && oldFileName != null) {
            File oldFile = new File(oldFilePath, oldFileName);
            if (oldFile.exists()) {
                boolean deleted = oldFile.delete();
                System.out.println(deleted ? 
                    "기존 파일 삭제 성공: " + oldFile.getAbsolutePath() : 
                    "기존 파일 삭제 실패: " + oldFile.getAbsolutePath());
            }
        }
    }
}

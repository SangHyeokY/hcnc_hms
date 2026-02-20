package com.hcncinit.controller.hr;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.ModelAndView;

import com.hcncinit.service.hr.Hr010Service;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/hr010")
public class Hr010Controller {

    @Autowired
    private Hr010Service hr010Service;

    // [인적관리] - [기본 인적사항] - Main 화면/팝업
    // [기본 인적사항] > 조회
    @RequestMapping("/list")
    public ModelAndView select_hr010(@RequestParam(required = false) Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        // System.out.println("select_hr010 호출됨, param = " + map);
        List<Map<String, Object>> resList = hr010Service.select_hr010(map);
        // 확인용 2
        // System.out.println("조회 결과 = " + resList);
        mv.addObject("res", resList);
        // System.out.println("조회 결과 = " + mv);
        return mv;
    }

    // [기본 인적사항] > 이미지
    @RequestMapping("/list/img")
    public ResponseEntity<byte[]> select_hr010_img(@RequestParam(required = false) Map<String, Object> map) {
        // 확인용 1
        // System.out.println("select_hr010_img 호출됨, param = " + map);
        byte[] bytes = hr010Service.select_hr010_img(map);
        // 확인용 2
        // System.out.println("조회 결과 = " + bytes);
        return ResponseEntity.ok(bytes);
    }

    // [기본 인적사항] > 신규 등록/수정
    @PostMapping(
            value = "/upsert",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ModelAndView saveHr010(@RequestParam Map<String, Object> param,
            @RequestPart(value = "dev_img", required = false) MultipartFile profileImg,
            HttpSession session
    ) throws Exception {
        ModelAndView mv = new ModelAndView("jsonView");

        if (!canEditHr010(session)) {
            return forbiddenJson();
        }
        param.put("login_role_cd", getLoginRoleCd(session));

        // System.out.println("저장 요청 param = " + param);
        String devType = (String) param.get("dev_type");

        // 신규일 때만 채번... > [기본 인적사항] > dev_id 생성
        if (param.get("dev_id") == null || "".equals(param.get("dev_id"))) {
            String devId = hr010Service.generateDevId(devType);
            param.put("dev_id", devId);
        }

        // 이미지가 넘어온 경우에만 BLOB로 param에 주입
        if (profileImg != null && !profileImg.isEmpty()) {

            String contentType = profileImg.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                // jsonView라면 예외 대신 result로 내려도 됩니다.
                throw new IllegalArgumentException("이미지 파일만 업로드 가능합니다.");
            }

            // 용량 제한 예: 2MB
            long maxBytes = 2L * 1024 * 1024;
            if (profileImg.getSize() > maxBytes) {
                throw new IllegalArgumentException("이미지는 2MB 이하만 업로드 가능합니다.");
            }

            byte[] bytes = profileImg.getBytes();

            // Mapper/Service에서 그대로 쓰도록 param에 넣기 (키명은 DB/쿼리에 맞게)
            param.put("dev_img", bytes);
//            param.put("photo_mime", contentType);
//            param.put("photo_name", profileImg.getOriginalFilename());
        }
        // System.out.println("param = " + param);
        hr010Service.insert_hr010(param);
        mv.addObject("dev_id", param.get("dev_id"));
        mv.addObject("result", "success");
        return mv;
    }

    // [기본 인적사항] > 삭제
    @PostMapping("/delete")
    public ModelAndView deleteHr010(@RequestParam Map<String, Object> param, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        if (!canEditHr010(session)) {
            return forbiddenJson();
        }
        param.put("login_role_cd", getLoginRoleCd(session));
        // System.out.println("삭제 요청 param = " + param);
        hr010Service.delete_hr010(param);
        mv.addObject("result", "success");
        return mv;
        
    }

    // [기본 인적사항] > 등급 계산
    @RequestMapping("/getScore")
    public ModelAndView getScore(@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        Map<String, Object> resList = hr010Service.dev_score(devId);
        mv.addObject("res", resList);
        return mv;
    }

    //---------------------------------------------------------------

    private static final Set<String> HR010_EDITOR_ROLE_SET = Set.of("01", "02", "03");   // 편집권한

    // 권한 확인
    private boolean canEditHr010(HttpSession session) {
        return HR010_EDITOR_ROLE_SET.contains(getLoginRoleCd(session));
    }
    

    private String getLoginRoleCd(HttpSession session) {
        if (session == null) {
            return "";
        }
        Object role = session.getAttribute("LOGIN_AUTH");
        if (role == null) {
            return "";
        }
        return String.valueOf(role).trim();
    }

    private ModelAndView forbiddenJson() {
        ModelAndView mv = new ModelAndView("jsonView");
        mv.addObject("success", false);
        mv.addObject("message", "접근 권한이 없습니다.");
        mv.addObject("list", List.of());    // list API 응답 호환
        return mv;
    }

}


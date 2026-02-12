package com.hcncinit.controller.hr;

import com.hcncinit.service.hr.Hr020Service;
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

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/hr020")
public class Hr020Controller {

    @Autowired
    private Hr020Service hr020Service;

    // 진행 프로젝트 내역으로 교체 예정 !!

    // [인적관리] - [진행 프로젝트 내역] - Main 화면/팝업

    // [진행 프로젝트 내역] > 조회
    @RequestMapping("/list")
    public ModelAndView select_hr020 (@RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        // System.out.println("select_hr020 호출됨, param = " + map);
        List<Map<String, Object>> resList = hr020Service.select_hr020(map);
        // 확인용 2
        // System.out.println("조회 결과 = " + resList);
        mv.addObject("res", resList);
        // System.out.println("조회 결과 = " + mv);
        return mv;
    }

    // [진행 프로젝트 내역] > 이미지
    @RequestMapping("/list/img")
    public ResponseEntity<byte[]> select_hr020_img (@RequestParam(required = false) Map<String,Object> map) {
        // 확인용 1
        // System.out.println("select_hr020_img 호출됨, param = " + map);
        byte[] bytes = hr020Service.select_hr020_img(map);
        // 확인용 2
        // System.out.println("조회 결과 = " + bytes);
        return ResponseEntity.ok(bytes);
    }

    // [진행 프로젝트 내역] > 신규 등록/수정
    @PostMapping(
            value = "/upsert",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ModelAndView saveHr020(@RequestParam Map<String, Object> param,
                                  @RequestPart(value = "dev_img", required = false) MultipartFile profileImg
    ) throws Exception {
        ModelAndView mv = new ModelAndView("jsonView");
        // System.out.println("저장 요청 param = " + param);
        String devType = (String) param.get("dev_type");

        // 신규일 때만 채번... > [진행 프로젝트 내역] > dev_id 생성
        if (param.get("dev_id") == null || "".equals(param.get("dev_id"))) {
            String devId = hr020Service.generateDevId(devType);
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
        hr020Service.insert_hr020(param);
        mv.addObject("dev_id", param.get("dev_id"));
        mv.addObject("result", "success");
        return mv;
    }

    // [진행 프로젝트 내역] > 삭제
    @PostMapping("/delete")
    public ModelAndView deleteHr020(@RequestParam Map<String, Object> param) {
        ModelAndView mv = new ModelAndView("jsonView");
        // System.out.println("삭제 요청 param = " + param);
        hr020Service.delete_hr020(param);
        mv.addObject("result", "success");
        return mv;
    }

    // [진행 프로젝트 내역] > 등급 계산
    @RequestMapping("/getScore")
    public ModelAndView getScore (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        Map<String, Object> resList = hr020Service.dev_score(devId);
        mv.addObject("res", resList);
        return mv;
    }

}
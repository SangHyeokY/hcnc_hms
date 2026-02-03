package com.hcncinit.controller.hr010;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.hcncinit.service.hr010.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.ModelAndView;

@Controller
@RequestMapping("/hr010")
public class Hr010Controller {

    @Autowired
    private Hr010Service hr010Service;

    @Autowired
    private Hr011Service hr011Service; // tab1

    @Autowired
    private Hr012Service hr012Service; // tab2

    @Autowired
    private Hr013Service hr013Service; // tab3

    // 인력관리 > 기본 인적사항 (임시/검색x), 따로 분류할건지는 논의
    @RequestMapping("/list")
    public ModelAndView select_hr010 (@RequestParam(required = false) Map<String,Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");

        // 세션 만료되면 로그인 페이지로 되돌아감
//        System.out.println("session 확인 : "+session);
//        Object loginUserId = session.getAttribute("LOGIN_USER_ID");
//        if (loginUserId == null) {
//            return new ModelAndView("redirect:/login");
//        }

        // 확인용 1
        // System.out.println("select_hr010 호출됨, param = " + map);
        List<Map<String, Object>> resList = hr010Service.select_hr010(map);
        // 확인용 2
        // System.out.println("조회 결과 = " + resList);
        mv.addObject("res", resList);
        // System.out.println("조회 결과 = " + mv);
        return mv;
    }

    // 인력관리 > 기본 인적사항 이미지
    @RequestMapping("/list/img")
    public ResponseEntity<byte[]> select_hr010_img (@RequestParam(required = false) Map<String,Object> map) {
        // 확인용 1
        // System.out.println("select_hr010_img 호출됨, param = " + map);
        byte[] bytes = hr010Service.select_hr010_img(map);
        // 확인용 2
        // System.out.println("조회 결과 = " + bytes);
        return ResponseEntity.ok(bytes);
    }

    // 인력관리 신규 등록/수정
    @PostMapping(
            value = "/upsert",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ModelAndView saveHr010(@RequestParam Map<String, Object> param,
                                  @RequestPart(value = "dev_img", required = false) MultipartFile profileImg
    ) throws Exception {
        ModelAndView mv = new ModelAndView("jsonView");
        // System.out.println("저장 요청 param = " + param);
        String devType = (String) param.get("dev_type");

        // 신규일 때만 채번
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

    // 인력관리 삭제
    @PostMapping("/delete")
    public ModelAndView deleteHr010(@RequestParam Map<String, Object> param) {
        ModelAndView mv = new ModelAndView("jsonView");
        // System.out.println("삭제 요청 param = " + param);
        hr010Service.delete_hr010(param);
        mv.addObject("result", "success");
        return mv;
    }

    // 점수 계산
    @RequestMapping("/getScore")
    public ModelAndView getScore (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        Map<String, Object> resList = hr010Service.dev_score(devId);
        mv.addObject("res", resList);
        return mv;
    }

    // =============================================================================== //

    // tab1
    @RequestMapping("/tab1")
    public ModelAndView select_tab1 (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        // System.out.println("select_tab1 호출됨, param = " + devId);
        Map<String, Object> resList = hr011Service.select_tab1(devId);
        // 확인용 2
        // System.out.println("tab1 조회 결과 = " + resList);
        mv.addObject("res", resList);
        return mv;
    }

    // tab1 등록/수정
    @PostMapping("/tab1_upsert")
    public ModelAndView saveTab1(@RequestBody Map<String, Object> param) {
        ModelAndView mv = new ModelAndView("jsonView");
        hr011Service.upsert_tab1(param);
        mv.addObject("result", "success");
        return mv;
    }

    // tab1 삭제
    @PostMapping("/tab1_delete")
    public ModelAndView deleteTab1(@RequestBody Map<String, Object> param) {
        ModelAndView mv = new ModelAndView("jsonView");
        System.out.println("dfsdfsdfsdfsdfdsf   : "+param);
        hr011Service.delete_tab1(param);
        mv.addObject("result", "success");
        return mv;
    }

    // =============================================================================== //

    // tab2 - 보유역량
    @RequestMapping("/tab2")
    public ModelAndView select_tab2 (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        System.out.println("select_tab2 호출됨, 탭2-1 = " + devId);
        List<Map<String, Object>> reslist = hr012Service.select_tab2_1(devId);
        // 확인용 2
        System.out.println("tab2_1 조회 결과 = " + reslist);
        mv.addObject("res", reslist);
        return mv;
    }

    // tab2 - 숙련도
    @RequestMapping("/tab2_2")
    public ModelAndView select_tab2_2 (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        System.out.println("select_tab2 호출됨, 탭2-2 = " + devId);
        List<Map<String, Object>> reslist = hr012Service.select_tab2_2(devId);
        // 확인용 2
        System.out.println("tab2_2 조회 결과 = " + reslist);
        mv.addObject("res", reslist);
        return mv;
    }

    // tab2-1 - 숙련도 저장
    @PostMapping("/tab2_1_save")
    @ResponseBody
    public ResponseEntity<?> upsert_tab2_1(@RequestBody List<Map<String, Object>> saveList) {
        try {
            System.out.println("save_tab2 호출됨, 탭2-1 = " + saveList);
            hr012Service.upsert_tab2_1(saveList);
            return ResponseEntity.ok("ok");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("error");
        }
    }

    // tab2-2 - 숙련도 저장
    @PostMapping("/tab2_2_save")
    @ResponseBody
    public ResponseEntity<?> save_tab2_2(@RequestBody List<Map<String, Object>> saveList) {
        try {
            System.out.println("save_tab2 호출됨, 탭2-2 = " + saveList);
            hr012Service.save_tab2_2(saveList);
            return ResponseEntity.ok("ok");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("error");
        }
    }

    // =============================================================================== //

    // tab3 - 프로젝트
    @RequestMapping("/tab3")
    public ModelAndView list(@RequestParam(required = false) Map<String, Object> map) {
        // System.out.println("tab3 : "+map); // map => dev_id
        applyDefaults(map);
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = hr013Service.list(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        // System.out.println("tab3 담음 : "+list);
        return mv;
    }

    @RequestMapping("/tab3_save")
    public ModelAndView save(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        applyDefaults(map);
        normalizeNumbers(map);
        int res = hr013Service.save(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    @RequestMapping("/tab3_delete")
    public ModelAndView delete(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        applyDefaults(map);
        int res = hr013Service.delete(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    // =============================================================================== //

    private void applyLoginUser(Map<String, Object> map, HttpSession session) {
        Object loginUserId = session.getAttribute("LOGIN_USER_ID");
        if (loginUserId != null) {
            map.put("userId", String.valueOf(loginUserId));
        }
    }

    private void applyDefaults(Map<String, Object> map) {
        if (map == null) {
            return;
        }
        if (!map.containsKey("dev_id") || String.valueOf(map.get("dev_id")).trim().isEmpty()) {
            map.put("dev_id", "");
        }
    }

    private void normalizeNumbers(Map<String, Object> map) {
        if (map == null) {
            return;
        }
        map.put("rate_amt", normalizeNumber(map.get("rate_amt")));
        map.put("alloc_pct", normalizePercent(map.get("alloc_pct")));
    }

    private String normalizeNumber(Object value) {
        if (value == null) {
            return null;
        }
        String raw = String.valueOf(value).trim();
        if (raw.isEmpty()) {
            return null;
        }
        raw = raw.replaceAll("[^0-9.]", "");
        return raw.isEmpty() ? null : raw;
    }

    private String normalizePercent(Object value) {
        if (value == null) {
            return null;
        }
        String raw = String.valueOf(value).trim();
        if (raw.isEmpty()) {
            return null;
        }
        raw = raw.replace("%", "");
        return normalizeNumber(raw);
    }
}

package com.hcncinit.controller.hr010;

import java.util.List;
import java.util.Map;

import com.hcncinit.service.hr010.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    public ModelAndView select_hr010 (@RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        // System.out.println("select_hr010 호출됨, param = " + map);
        List<Map<String, Object>> resList = hr010Service.select_hr010(map);
        // 확인용 2
        // System.out.println("조회 결과 = " + resList);
        mv.addObject("res", resList);
        return mv;
    }

    // 인력관리 신규 등록/수정
    @PostMapping("/upsert")
    public ModelAndView saveHr010(@RequestParam Map<String, Object> param) {
        ModelAndView mv = new ModelAndView("jsonView");
        // System.out.println("저장 요청 param = " + param);
        String devType = (String) param.get("dev_type");
        // 신규일 때만 채번
        if (param.get("dev_id") == null || "".equals(param.get("dev_id"))) {
            String devId = hr010Service.generateDevId(devType);
            param.put("dev_id", devId);
        }
        hr010Service.insert_hr010(param);
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

    // =============================================================================== //

    // tab2 - 보유역량
    @RequestMapping("/tab2")
    public ModelAndView select_tab2 (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        // System.out.println("select_tab2 호출됨, param = " + devId);
        List<Map<String, Object>> reslist = hr012Service.select_tab2_1(devId);
        // 확인용 2
        // System.out.println("tab2_1 조회 결과 = " + reslist);
        mv.addObject("res", reslist);
        return mv;
    }

    // tab2 - 숙련도
    @RequestMapping("/tab2_2")
    public ModelAndView select_tab2_2 (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        // System.out.println("select_tab2 호출됨, param = " + devId);
        List<Map<String, Object>> reslist = hr012Service.select_tab2_2(devId);
        // 확인용 2
        // System.out.println("tab2_2 조회 결과 = " + reslist);
        mv.addObject("res", reslist);
        return mv;
    }

    // =============================================================================== //

    // tab3 - 프로젝트
    @RequestMapping("/tab3")
    public ModelAndView list(@RequestParam(required = false) Map<String, Object> map) {
        System.out.println("tab3 : "+map); // map => dev_id
        applyDefaults(map);
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = hr013Service.list(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        System.out.println("tab3 담음 : "+list);
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
            map.put("dev_id", "TEMP_DEV");
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

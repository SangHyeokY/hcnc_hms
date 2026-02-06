package com.hcncinit.controller.hr;

import com.hcncinit.service.hr.Hr013Service;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/hr013")
public class Hr013Controller {

    @Autowired
    private Hr013Service hr013Service; // tab3

    // [인적관리] - [기본 인적사항] - [Tab3][프로젝트]

    // [Tab3][프로젝트] > 조회
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

    // [Tab3][프로젝트] > 등록/저장
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

    // [Tab3][프로젝트] > 삭제
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

    // =============================================================================== //

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

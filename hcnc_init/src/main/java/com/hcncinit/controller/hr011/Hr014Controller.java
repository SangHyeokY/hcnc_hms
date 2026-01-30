package com.hcncinit.controller.hr011;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpSession;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import com.hcncinit.service.hr011.Hr014Service;

@Controller
@RequestMapping("/hr014")
public class Hr014Controller {

    @Autowired
    private Hr014Service hr014Service;

    @RequestMapping("/list")
    public ModelAndView list(@RequestParam(required = false) Map<String, Object> map) {
        applyDefaults(map);
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = hr014Service.list(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        return mv;
    }

    @RequestMapping("/save")
    public ModelAndView save(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        applyDefaults(map);
        normalizeNumbers(map);
        int res = hr014Service.save(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    @RequestMapping("/delete")
    public ModelAndView delete(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        applyDefaults(map);
        int res = hr014Service.delete(map);
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

package com.hcncinit.controller.hr011;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpSession;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import com.hcncinit.service.hr011.Hr015Service;

@Controller
@RequestMapping("/hr015")
public class Hr015Controller {

    @Autowired
    private Hr015Service hr015Service;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @RequestMapping("/a/list")
    public ModelAndView listA(@RequestParam(required = false) Map<String, Object> map) {
        applyDefaults(map);
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = hr015Service.listA(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        return mv;
    }

    @RequestMapping("/b/list")
    public ModelAndView listB(@RequestParam(required = false) Map<String, Object> map) {
        applyDefaults(map);
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = hr015Service.listB(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        return mv;
    }

    @RequestMapping("/a/save")
    public ModelAndView saveA(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        applyDefaults(map);
        hr015Service.ensureUser(map);
        List<Map<String, Object>> rows = parseRows(map.get("rows"));
        map.put("rows", rows);
        int res = hr015Service.saveA(map);
        mv.addObject("success", rows.isEmpty() || res > 0);
        return mv;
    }

    @RequestMapping("/b/save")
    public ModelAndView saveB(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        applyDefaults(map);
        hr015Service.ensureUser(map);
        int res = hr015Service.saveB(map);
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
        if (!map.containsKey("eval_grp") || String.valueOf(map.get("eval_grp")).trim().isEmpty()) {
            map.put("eval_grp", "eval_id");
        }
        if (!map.containsKey("eval_grp_b") || String.valueOf(map.get("eval_grp_b")).trim().isEmpty()) {
            map.put("eval_grp_b", "eval_id_b");
        }
    }

    private List<Map<String, Object>> parseRows(Object rowsObj) {
        if (rowsObj == null) {
            return List.of();
        }
        if (rowsObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rows = (List<Map<String, Object>>) rowsObj;
            return rows;
        }
        if (rowsObj instanceof String) {
            String rowsJson = ((String) rowsObj).trim();
            if (rowsJson.isEmpty()) {
                return List.of();
            }
            try {
                return objectMapper.readValue(rowsJson, new TypeReference<List<Map<String, Object>>>() {});
            } catch (Exception e) {
                return List.of();
            }
        }
        return List.of();
    }
}

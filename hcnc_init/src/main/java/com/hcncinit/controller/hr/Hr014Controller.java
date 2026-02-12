package com.hcncinit.controller.hr;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hcncinit.service.hr.Hr014Service;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/hr014")
public class Hr014Controller {

    @Autowired
    private Hr014Service hr014Service;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // [인적관리] - [기본 인적사항] - [Tab4][평가 및 리스크]
    // [Tab4_A][관리자 평가] > 조회
    @RequestMapping("/a/list")
    public ModelAndView listA(@RequestParam(required = false) Map<String, Object> map, HttpSession session) {
        if(!canAccessHr014(session)) return forbiddenJson();
        applyDefaults(map);
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = hr014Service.listA(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        return mv;
    }

    // [Tab4_A][관리자 평가] > 저장
    @RequestMapping("/a/save")
    // 탭1 평가 저장
    public ModelAndView saveA(@RequestParam Map<String, Object> map, HttpSession session) {
        if(!canAccessHr014(session)) return forbiddenJson();
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        applyDefaults(map);
        List<Map<String, Object>> rows = parseRows(map.get("rows"));
        map.put("rows", rows);
        int res = hr014Service.saveA(map);
        mv.addObject("success", rows.isEmpty() || res > 0);
        return mv;
    }

    // [Tab4_B][리스크 관리] > 조회
    @RequestMapping("/b/list")
    public ModelAndView listB(@RequestParam(required = false) Map<String, Object> map, HttpSession session) {
        
        if(!canAccessHr014(session)) return forbiddenJson();
        applyDefaults(map);
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = hr014Service.listB(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        return mv;
    }

    // [Tab4_B][리스크 관리] > 저장
    @RequestMapping("/b/save")
    // 탭2 리스크 저장
    public ModelAndView saveB(@RequestParam Map<String, Object> map, HttpSession session) {
        if(!canAccessHr014(session)) return forbiddenJson();
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        applyDefaults(map);
        int res = hr014Service.saveB(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    // =============================================================================== //
    private void applyLoginUser(Map<String, Object> map, HttpSession session) {
        Object loginUserId = session.getAttribute("LOGIN_USER_ID");
        if (loginUserId != null) {
            map.put("userId", String.valueOf(loginUserId));
            return;
        }
        Object devId = map != null ? map.get("dev_id") : null;
        if (devId != null && !String.valueOf(devId).trim().isEmpty()) {
            map.put("userId", String.valueOf(devId));
        } else {
            map.put("userId", "SYSTEM");
        }
    }

    private void applyDefaults(Map<String, Object> map) {
        if (map == null) {
            return;
        }
        if (!map.containsKey("dev_id") || String.valueOf(map.get("dev_id")).trim().isEmpty()) {
            map.put("dev_id", "");
        }
        if (!map.containsKey("eval_grp") || String.valueOf(map.get("eval_grp")).trim().isEmpty()) {
            map.put("eval_grp", "eval_id");
        }
        if (!map.containsKey("eval_grp_b") || String.valueOf(map.get("eval_grp_b")).trim().isEmpty()) {
            map.put("eval_grp_b", "eval_id_b");
        }
    }

    // =============================================================================== //
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
                return objectMapper.readValue(rowsJson, new TypeReference<List<Map<String, Object>>>() {
                });
            } catch (Exception e) {
                return List.of();
            }
        }
        return List.of();
    }

    // =============================================================================== //
    private static final Set<String> HR014_ALLOWED_ROLE_SET = Set.of("01", "02");

    private boolean canAccessHr014(HttpSession session) {
        if (session == null) {
            return false;
        }
        Object role = session.getAttribute("LOGIN_AUTH");
        if (role == null) {
            return false;
        }
        return HR014_ALLOWED_ROLE_SET.contains(String.valueOf(role).trim());
    }

    private ModelAndView forbiddenJson(){
        ModelAndView mv = new ModelAndView("jsonView");
        mv.addObject("success", false);
        mv.addObject("message", "평가 및 리스크 탭 접근 권한이 없습니다.");
        mv.addObject("list", List.of());    // list API 응답 호환
        return mv;
    }





}

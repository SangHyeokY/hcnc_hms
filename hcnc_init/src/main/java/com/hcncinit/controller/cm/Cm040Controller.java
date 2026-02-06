package com.hcncinit.controller.cm;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import com.hcncinit.service.cm.Cm040Service;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/cm040")
public class Cm040Controller {

    @Autowired
    private Cm040Service cm040Service;

    @RequestMapping("/main/list")
    // 코드그룹 목록 조회
    public ModelAndView mainList(@RequestParam(required = false) Map<String, Object> map) {
        applyQueryDefaults(map);
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = cm040Service.mainList(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        System.out.println(list);
        return mv;
    }

    @RequestMapping("/detail/list")
    // 상세코드 목록 조회
    public ModelAndView detailList(@RequestParam(required = false) Map<String, Object> map) {
        applyQueryDefaults(map);
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = cm040Service.detailList(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        return mv;
    }

    @RequestMapping("/main/save")
    // 코드그룹 신규/수정 저장
    public ModelAndView mainSave(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        cm040Service.ensureUser(map);
        if (!map.containsKey("cd_nm") && map.containsKey("grp_nm")) {
            map.put("cd_nm", map.get("grp_nm"));
        }
        int res = cm040Service.mainUpsert(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    @RequestMapping("/detail/save")
    // 상세코드 신규/수정 저장
    public ModelAndView detailSave(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        cm040Service.ensureUser(map);
        cm040Service.applyDetailDefaults(map);
        String mode = String.valueOf(map.getOrDefault("mode", "")).toLowerCase();
        int res;
        boolean isUpdate = "update".equals(mode);
        boolean shouldCheck = !isUpdate;

        if (isUpdate) {
            Object preCd = map.get("pre_cd");
            Object cd = map.get("cd");
            if (preCd != null && cd != null && !String.valueOf(preCd).equals(String.valueOf(cd))) {
                shouldCheck = true;
            }
        }

        if (shouldCheck) {
            String dupStatus = cm040Service.detailDupStatus(map);
            if (dupStatus != null && !dupStatus.trim().isEmpty()) {
                mv.addObject("success", false);
                if ("N".equalsIgnoreCase(dupStatus)) {
                    mv.addObject("message", "이미 존재하는 코드입니다.");
                } else {
                    mv.addObject("message", "사용할 수 없는 코드입니다.");
                }
                return mv;
            }
        }

        if (isUpdate) {
            res = cm040Service.detailUpdate(map);
        } else {
            res = cm040Service.detailUpsert(map);
        }
        mv.addObject("success", res > 0);
        return mv;
    }

    @RequestMapping("/main/delete")
    // 코드그룹 삭제 처리
    public ModelAndView mainDelete(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        cm040Service.ensureUser(map);
        map.put("detail_grp_cd", map.get("cd"));

        int detailCount = cm040Service.detailCount(map);
        if (detailCount > 0) {
            mv.addObject("success", false);
            mv.addObject("message", "상세코드가 존재하는 코드그룹은 삭제할 수 없습니다.");
            return mv;
        }

        int res = cm040Service.mainDelete(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    @RequestMapping("/detail/delete")
    // 상세코드 삭제 처리
    public ModelAndView detailDelete(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        cm040Service.ensureUser(map);
        int res = cm040Service.detailDelete(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    @RequestMapping("/detail/sort")
    // 상세코드 정렬 저장
    public ModelAndView detailSort(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        cm040Service.ensureUser(map);
        int res = cm040Service.detailSort(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    private void applyLoginUser(Map<String, Object> map, HttpSession session) {
        Object loginUserId = session.getAttribute("LOGIN_USER_ID");
        if (loginUserId != null) {
            map.put("userId", String.valueOf(loginUserId));
        }
    }

    private void applyQueryDefaults(Map<String, Object> map) {
        if (map == null) {
            return;
        }

        Object parentGrpCd = map.get("parent_grp_cd");
        Object grpCd = map.get("grp_cd");

        if (parentGrpCd == null || String.valueOf(parentGrpCd).trim().isEmpty()) {
            if (grpCd != null && !String.valueOf(grpCd).trim().isEmpty()) {
                map.put("parent_grp_cd", String.valueOf(grpCd));
            }
        }

        if (grpCd == null || String.valueOf(grpCd).trim().isEmpty()) {
            if (parentGrpCd != null && !String.valueOf(parentGrpCd).trim().isEmpty()) {
                map.put("grp_cd", String.valueOf(parentGrpCd));
            }
        }
    }
}

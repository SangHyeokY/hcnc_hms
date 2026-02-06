package com.hcncinit.controller.cm;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import com.hcncinit.service.cm.Cm010Service;

@Controller
@RequestMapping("/cm010")
public class Cm010Controller {

    @Autowired
    private Cm010Service cm010Service;

    @RequestMapping("/list")
    // 사용자 목록 조회
    public ModelAndView list(@RequestParam(required = false) Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = cm010Service.list(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        return mv;
    }

    @RequestMapping("/cdList")
    // 공통코드(권한/직무/부서) 조회
    public ModelAndView cdList(Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> cdList = cm010Service.commonCodesForUser();
        mv.addObject("success", cdList != null);
        mv.addObject("list", cdList);
        return mv;
    }


    @RequestMapping("/save")
    // 사용자 신규/수정 저장
    public ModelAndView save(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        cm010Service.ensureUser(map);
        int res = cm010Service.upsert(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    @RequestMapping("/delete")
    // 사용자 삭제 처리
    public ModelAndView delete(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        applyLoginUser(map, session);
        cm010Service.ensureUser(map);
        int res = cm010Service.delete(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    private void applyLoginUser(Map<String, Object> map, HttpSession session) {
        Object loginUserId = session.getAttribute("LOGIN_USER_ID");
        if (loginUserId != null) {
            map.put("userId", String.valueOf(loginUserId));
        }
    }
}

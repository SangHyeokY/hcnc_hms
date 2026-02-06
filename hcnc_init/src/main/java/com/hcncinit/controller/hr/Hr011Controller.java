package com.hcncinit.controller.hr;

import com.hcncinit.service.hr.Hr011Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import java.util.Map;

@Controller
@RequestMapping("/hr011")
public class Hr011Controller {

    @Autowired
    private Hr011Service hr011Service;

    // [인적관리] - [기본 인적사항] - [Tab1][소속 및 계약정보]

    // [Tab1][소속 및 계약정보] > 조회
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

    // [Tab1][소속 및 계약정보] > 등록/수정
    @PostMapping("/tab1_upsert")
    public ModelAndView saveTab1(@RequestBody Map<String, Object> param) {
        ModelAndView mv = new ModelAndView("jsonView");
        hr011Service.upsert_tab1(param);
        mv.addObject("result", "success");
        return mv;
    }

    // [Tab1][소속 및 계약정보] > 삭제
    @PostMapping("/tab1_delete")
    public ModelAndView deleteTab1(@RequestBody Map<String, Object> param) {
        ModelAndView mv = new ModelAndView("jsonView");
        hr011Service.delete_tab1(param);
        mv.addObject("result", "success");
        return mv;
    }

}

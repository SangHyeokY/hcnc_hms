package com.hcncinit.controller;

import com.hcncinit.service.CommonService;
import com.hcncinit.service.hr010.Hr010Service;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/common")
public class CommonController {

    @Autowired
    private CommonService commonService;

    @PostMapping("/getCm")
    public ModelAndView get_cm(@RequestParam Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        System.out.println("get_cm 호출됨, param = " + map);
        List<Map<String, Object>> resList = commonService.get_cm(map);
        // 확인용 2
        System.out.println("조회 결과 = " + resList);
        mv.addObject("res", resList);
        return mv;
    }

}

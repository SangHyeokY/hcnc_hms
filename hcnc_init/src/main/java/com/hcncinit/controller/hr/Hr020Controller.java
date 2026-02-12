package com.hcncinit.controller.hr;

import com.hcncinit.service.hr.Hr020Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/hr020")
public class Hr020Controller {

    @Autowired
    private Hr020Service hr020Service;

    // [인적관리] - [진행 프로젝트 내역] > 조회
    @RequestMapping("/list")
    public ModelAndView select_hr020 (@RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        // System.out.println("select_hr020 호출됨, param = " + map);
        List<Map<String, Object>> resList = hr020Service.select_hr020(map);
        // 확인용 2
        // System.out.println("조회 결과 = " + resList);
        mv.addObject("res", resList);
        // System.out.println("조회 결과 = " + mv);
        return mv;
    }

}
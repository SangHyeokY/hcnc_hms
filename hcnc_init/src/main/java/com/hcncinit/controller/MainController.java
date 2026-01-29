package com.hcncinit.controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;
import com.hcncinit.service.MainService;

@Controller
@RequestMapping("")
public class MainController {

    @Autowired
    MainService mainService;

    @RequestMapping("/PGetItem")
    public ModelAndView pData (@RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        Map<String,Object> res = mainService.pData(map);
        mv.addObject("res", res);
        return mv;
    }

    @RequestMapping("/EGetItem")
    public ModelAndView eData (@RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        Map<String,Object> res = mainService.eData(map);
        mv.addObject("res", res);
        return mv;
    }
    
    @RequestMapping("/SGetItem")
    public ModelAndView sData (@RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        Map<String,Object> res = mainService.sData(map);
        mv.addObject("res", res);
        return mv;
    }

    @RequestMapping("/GGetItem")
    public ModelAndView gData (@RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        Map<String,Object> res = mainService.gData(map);
        mv.addObject("res", res);
        return mv;
    }

    @RequestMapping("/PUpdate")
    public ModelAndView pUpdata (@RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        int res = mainService.pUpdate(map);
        mv.addObject("res", res);
        return mv;
    }

    @RequestMapping("/EUpdate")
    public ModelAndView eUpdata (@RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        int res = mainService.eUpdate(map);
        mv.addObject("res", res);
        return mv;
    }

    @RequestMapping("/SUpdate")
    public ModelAndView sUpdata (@RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        int res = mainService.sUpdate(map);
        mv.addObject("res", res);
        return mv;
    }

    @RequestMapping("/GUpdate")
    public ModelAndView gUpdata (@RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        int res = mainService.gUpdate(map);
        mv.addObject("res", res);
        return mv;
    }

    // 인력관리 > 기본 인적사항 (임시/검색x), 따로 분류할건지는 논의
    @RequestMapping("/select_hr010")
    public ModelAndView select_hr010 (@RequestParam(required = false) Map<String,Object> map) {

        // 확인용 1
        System.out.println("select_hr010 호출됨, param = " + map);

        List<Map<String, Object>> resList = mainService.select_hr010(map);
        ModelAndView mv = new ModelAndView("jsonView");

        // 확인용 2
        System.out.println("조회 결과 = " + resList);

        mv.addObject("res", resList);
        return mv;
    }

    // 인력관리 > 기본 인적사항 (상세) (임시/검색x), 따로 분류할건지는 논의
    @RequestMapping("/select_hr011")
    public ModelAndView select_hr011 (@RequestParam(required = false) Map<String,Object> map) {

        // 확인용 1
        System.out.println("select_hr011 호출됨, param = " + map);

        Map<String,Object> res = mainService.select_hr011(map);
        ModelAndView mv = new ModelAndView("jsonView");

        // 확인용 2
        System.out.println("조회 결과 = " + res);

        mv.addObject("res", res);
        return mv;
    }
}

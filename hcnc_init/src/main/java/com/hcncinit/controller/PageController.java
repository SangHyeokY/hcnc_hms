package com.hcncinit.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.ModelAndView;

@Controller
@RequestMapping("")
public class PageController {

    @GetMapping({"","/"})
    public String index() {
        return "redirect:/login";
    }

    @GetMapping("/login")
    public ModelAndView login(){
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/login");
        return mv;
    }

    @GetMapping("/sample")
    public ModelAndView sample(){
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/sample");
        return mv;
    }

    @GetMapping("/sample2")
    public ModelAndView sample2(){
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/sample2");
        return mv;
    }

    // 인력관리 > 기본 인적사항 (임시/검색x), 따로 분류할건지는 논의
    @GetMapping("/hr010")
    public ModelAndView hr010(){
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/hr010");
        return mv;
    }

    // 인력관리 > 기본 인적사항 (상세) (임시/검색x), 따로 분류할건지는 논의
    @GetMapping("/hr010/detail")
    public ModelAndView hr011(){
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/hr011");
        return mv;
    }
}

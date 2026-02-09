package com.hcncinit.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.ModelAndView;

@Controller
@RequestMapping("")
public class PageController {

    @GetMapping({"", "/"})
    public String index() {
        return "redirect:/login";
    }

    @GetMapping("/login")
    public ModelAndView login() {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/login/login");
        return mv;
    }

    @GetMapping("/sample")
    public ModelAndView sample() {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/sample");
        return mv;
    }

    @GetMapping("/sample2")
    public ModelAndView sample2() {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/sample2");
        return mv;
    }

    @GetMapping("/tagList")
    public ModelAndView tagList() {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/tagList");
        return mv;
    }

    @GetMapping("/cm040")
    public ModelAndView commonCode(HttpSession session, Model model) {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/cm020/cm040");

        String auth = (String) session.getAttribute("LOGIN_AUTH");
        model.addAttribute("LOGIN_AUTH", auth);
        return mv;
    }

    @GetMapping("/cm010")
    public ModelAndView userManage(HttpSession session, Model model) {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/cm010/cm010");

        String auth = (String) session.getAttribute("LOGIN_AUTH");
        model.addAttribute("LOGIN_AUTH", auth);
        return mv;
    }

    @GetMapping("/hr010")
    public ModelAndView hr010(HttpSession session, Model model) {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/hr/hr010");

        String auth = (String) session.getAttribute("LOGIN_AUTH");
        model.addAttribute("LOGIN_AUTH", auth);
        return mv;
    }

//    @GetMapping("/hr015")
//    public ModelAndView useDetail() {
//        ModelAndView mv = new ModelAndView();
//        mv.setViewName("views/hr011/hr015");
//        return mv;
//    }

//    @GetMapping("/hr014")
//    public ModelAndView devRateHistory() {
//        ModelAndView mv = new ModelAndView();
//        mv.setViewName("views/hr011/hr014");
//        return mv;
//    }
}

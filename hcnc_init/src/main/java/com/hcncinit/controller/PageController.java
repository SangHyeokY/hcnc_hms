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
        String lock = (String) session.getAttribute("LOGIN_LOCK");
        String pwchg = (String) session.getAttribute("LOGIN_PW_CHG");
        model.addAttribute("LOGIN_AUTH", auth);
        model.addAttribute("LOGIN_LOCK", lock);
        model.addAttribute("LOGIN_PW_CHG", pwchg);
        return mv;
    }

    @GetMapping("/cm010")
    public ModelAndView userManage(HttpSession session, Model model) {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/cm010/cm010");

        String auth = (String) session.getAttribute("LOGIN_AUTH");
        String lock = (String) session.getAttribute("LOGIN_LOCK");
        String pwchg = (String) session.getAttribute("LOGIN_PW_CHG");
        model.addAttribute("LOGIN_AUTH", auth);
        model.addAttribute("LOGIN_LOCK", lock);
        model.addAttribute("LOGIN_PW_CHG", pwchg);
        return mv;
    }

    @GetMapping("/hr010")
    public ModelAndView hr010(HttpSession session, Model model) {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/hr/hr010");

        String auth = (String) session.getAttribute("LOGIN_AUTH");
        String lock = (String) session.getAttribute("LOGIN_LOCK");
        String pwchg = (String) session.getAttribute("LOGIN_PW_CHG");
        model.addAttribute("LOGIN_AUTH", auth);
        model.addAttribute("LOGIN_LOCK", lock);
        model.addAttribute("LOGIN_PW_CHG", pwchg);
        return mv;
    }

    @GetMapping("/hr020")
    public ModelAndView hr020(HttpSession session, Model model) {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/hr/hr020");

        String auth = (String) session.getAttribute("LOGIN_AUTH");
        String lock = (String) session.getAttribute("LOGIN_LOCK");
        String pwchg = (String) session.getAttribute("LOGIN_PW_CHG");
        model.addAttribute("LOGIN_AUTH", auth);
        model.addAttribute("LOGIN_LOCK", lock);
        model.addAttribute("LOGIN_PW_CHG", pwchg);
        return mv;
    }

}

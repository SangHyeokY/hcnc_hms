package com.hcncinit.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    public ModelAndView sample2(HttpSession session, Model model) {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/sample2");

        String auth = (String) session.getAttribute("LOGIN_AUTH");
        String lock = (String) session.getAttribute("LOGIN_LOCK");
        String pwchg = (String) session.getAttribute("LOGIN_PW_CHG");
        model.addAttribute("LOGIN_AUTH", auth);
        model.addAttribute("LOGIN_LOCK", lock);
        model.addAttribute("LOGIN_PW_CHG", pwchg);
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
        mv.setViewName("views/cm040/cm040");

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
        mv.setViewName("views/hr010/hr010");

        String auth = (String) session.getAttribute("LOGIN_AUTH");
        String lock = (String) session.getAttribute("LOGIN_LOCK");
        String pwchg = (String) session.getAttribute("LOGIN_PW_CHG");
        model.addAttribute("LOGIN_AUTH", auth);
        model.addAttribute("LOGIN_LOCK", lock);
        model.addAttribute("LOGIN_PW_CHG", pwchg);
        return mv;
    }

    @GetMapping("/hr010v2")
    public ModelAndView hr010v2(HttpSession session, Model model) {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/hr010/hr010v2");

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
        mv.setViewName("views/hr020/hr020");

        String auth = (String) session.getAttribute("LOGIN_AUTH");
        String lock = (String) session.getAttribute("LOGIN_LOCK");
        String pwchg = (String) session.getAttribute("LOGIN_PW_CHG");
        model.addAttribute("LOGIN_AUTH", auth);
        model.addAttribute("LOGIN_LOCK", lock);
        model.addAttribute("LOGIN_PW_CHG", pwchg);
        return mv;
    }

    @GetMapping("/hr011")
    public ModelAndView hr011(@RequestParam(value = "dev_id", required = false) String devId, HttpSession session, Model model) {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/hr010/hr011");

        String auth = (String) session.getAttribute("LOGIN_AUTH");
        String lock = (String) session.getAttribute("LOGIN_LOCK");
        String pwchg = (String) session.getAttribute("LOGIN_PW_CHG");
        model.addAttribute("LOGIN_AUTH", auth);
        model.addAttribute("LOGIN_LOCK", lock);
        model.addAttribute("LOGIN_PW_CHG", pwchg);
        model.addAttribute("dev_id", devId);
        return mv;
    }

    @GetMapping("/hr011v2")
    public ModelAndView hr011v2(@RequestParam(value = "dev_id", required = false) String devId, HttpSession session, Model model) {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/hr010/hr011v2");

        String auth = (String) session.getAttribute("LOGIN_AUTH");
        String lock = (String) session.getAttribute("LOGIN_LOCK");
        String pwchg = (String) session.getAttribute("LOGIN_PW_CHG");
        model.addAttribute("LOGIN_AUTH", auth);
        model.addAttribute("LOGIN_LOCK", lock);
        model.addAttribute("LOGIN_PW_CHG", pwchg);
        model.addAttribute("dev_id", devId);
        return mv;
    }

    @GetMapping("/hr030")
    public ModelAndView hr030(HttpSession session, Model model) {
        ModelAndView mv = new ModelAndView();
        mv.setViewName("views/hr030/hr030");

        String auth = (String) session.getAttribute("LOGIN_AUTH");
        String lock = (String) session.getAttribute("LOGIN_LOCK");
        String pwchg = (String) session.getAttribute("LOGIN_PW_CHG");
        model.addAttribute("LOGIN_AUTH", auth);
        model.addAttribute("LOGIN_LOCK", lock);
        model.addAttribute("LOGIN_PW_CHG", pwchg);
        return mv;
    }

}

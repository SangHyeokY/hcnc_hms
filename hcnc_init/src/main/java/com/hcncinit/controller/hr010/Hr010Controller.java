package com.hcncinit.controller.hr010;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;
import com.hcncinit.service.hr010.Hr010Service;

@Controller
@RequestMapping("/hr010")
public class Hr010Controller {

    @Autowired
    private Hr010Service hr010Service;

    // 인력관리 > 기본 인적사항 (임시/검색x), 따로 분류할건지는 논의
    @RequestMapping("/list")
    public ModelAndView select_hr010 (@RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        System.out.println("select_hr010 호출됨, param = " + map);
        List<Map<String, Object>> resList = hr010Service.select_hr010(map);
        // 확인용 2
        System.out.println("조회 결과 = " + resList);
        mv.addObject("res", resList);
        return mv;
    }

    // 인력관리 > 기본 인적사항 (상세) (임시/검색x), 따로 분류할건지는 논의
    @RequestMapping("/detail")
    public ModelAndView select_hr011 (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        System.out.println("select_hr010 팝업 호출됨, param = " + devId);
        Map<String, Object> resList = hr010Service.select_hr011(devId);
        // 확인용 2
        System.out.println("조회 결과 = " + resList);
        mv.addObject("res", resList);
        return mv;
    }

    // 폐기
    @RequestMapping("/detailPage")
    public ModelAndView hr011Page(@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("views/hr010/hr011"); // hr011.html 경로를 새로 잡아줘야 인식함
        System.out.println("안쓰이는 코드가 사용되었습니다. 확인부탁드립니다. Hr010Controller.java /detailPage");
        Map<String, Object> resList = hr010Service.select_hr011(devId);
        mv.addObject("res", resList);
        return mv;
    }
}

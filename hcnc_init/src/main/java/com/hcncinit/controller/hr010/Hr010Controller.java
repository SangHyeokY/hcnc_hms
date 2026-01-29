package com.hcncinit.controller.hr010;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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

    // 인력관리 신규 등록/수정
    @PostMapping("/upsert")
    public ModelAndView saveHr010(@RequestParam Map<String, Object> param) {
        ModelAndView mv = new ModelAndView("jsonView");
        System.out.println("저장 요청 param = " + param);
        String devType = (String) param.get("dev_type");
        // 신규일 때만 채번
        if (param.get("dev_id") == null || "".equals(param.get("dev_id"))) {
            String devId = hr010Service.generateDevId(devType);
            param.put("dev_id", devId);
        }
        hr010Service.insert_hr010(param);
        mv.addObject("result", "success");
        return mv;
    }

    // 인력관리 삭제
    @PostMapping("/delete")
    public ModelAndView deleteHr010(@RequestParam Map<String, Object> param) {
        ModelAndView mv = new ModelAndView("jsonView");
        System.out.println("삭제 요청 param = " + param);

        hr010Service.delete_hr010(param);
        mv.addObject("result", "success");
        return mv;
    }

    // tab1
    @RequestMapping("/tab1")
    public ModelAndView select_tab1 (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        System.out.println("select_tab1 호출됨, param = " + devId);
        Map<String, Object> resList = hr010Service.select_tab1(devId);
        // 확인용 2
        System.out.println("tab1 조회 결과 = " + resList);
        mv.addObject("res", resList);
        return mv;
    }

    // tab2
    @RequestMapping("/tab2")
    public ModelAndView select_tab2 (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        System.out.println("select_tab2 호출됨, param = " + devId);
        List<Map<String, Object>> reslist = hr010Service.select_tab2(devId);
        // 확인용 2
        System.out.println("tab2 조회 결과 = " + reslist);
        mv.addObject("res", reslist);
        return mv;
    }



    // 폐기 hr011
    @RequestMapping("/detailPage")
    public ModelAndView hr011Page(@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("views/hr010/hr011_old"); // hr010_old.html 경로를 새로 잡아줘야 인식함
        System.out.println("안쓰이는 코드가 사용되었습니다. 확인부탁드립니다. Hr010Controller.java /detailPage");
        Map<String, Object> resList = hr010Service.select_hr011(devId);
        mv.addObject("res", resList);
        return mv;
    }

    // 폐기 hr011
    // 인력관리 > 기본 인적사항 (상세) (임시/검색x), 따로 분류할건지는 논의
    @RequestMapping("/detail")
    public ModelAndView select_hr011 (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        System.out.println("안쓰이는 코드가 사용되었습니다. Hr010Controller.java /detail");
        Map<String, Object> resList = hr010Service.select_hr011(devId);
        // 확인용 2
        System.out.println("조회 결과 = " + resList);
        mv.addObject("res", resList);
        return mv;
    }
}

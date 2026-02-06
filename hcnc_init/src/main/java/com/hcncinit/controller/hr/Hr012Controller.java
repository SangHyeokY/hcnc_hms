package com.hcncinit.controller.hr;

import com.hcncinit.service.hr.Hr012Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/hr012")
public class Hr012Controller {

    @Autowired
    private Hr012Service hr012Service;

    // [인적관리] - [기본 인적사항] - [Tab2][보유역량 및 숙련도]
    // Tab2 : 데이터 양에 따라 저장 속도가 확실히 느림

    // [Tab2_A][보유역량] > 조회
    @RequestMapping("/tab2")
    public ModelAndView select_tab2 (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        System.out.println("select_tab2 호출됨, 탭2-1 = " + devId);
        List<Map<String, Object>> reslist = hr012Service.select_tab2_1(devId);
        // 확인용 2
        System.out.println("tab2_1 조회 결과 = " + reslist);
        mv.addObject("res", reslist);
        return mv;
    }

    // [Tab2_A][보유역량] > 저장/등록
    @PostMapping("/tab2_1_save")
    @ResponseBody
    public ResponseEntity<?> upsert_tab2_1(@RequestBody List<Map<String, Object>> saveList) {
        try {
            System.out.println("save_tab2 호출됨, 탭2-1 = " + saveList);
            hr012Service.upsert_tab2_1(saveList);
            return ResponseEntity.ok("ok");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("error");
        }
    }

    // [Tab2_B][숙련도] > 조회
    @RequestMapping("/tab2_2")
    public ModelAndView select_tab2_2 (@RequestParam("dev_id") String devId) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        System.out.println("select_tab2 호출됨, 탭2-2 = " + devId);
        List<Map<String, Object>> reslist = hr012Service.select_tab2_2(devId);
        // 확인용 2
        System.out.println("tab2_2 조회 결과 = " + reslist);
        mv.addObject("res", reslist);
        return mv;
    }

    // [Tab2_B][숙련도] > 저장/등록
    @PostMapping("/tab2_2_save")
    @ResponseBody
    public ResponseEntity<?> save_tab2_2(@RequestBody List<Map<String, Object>> saveList) {
        try {
            System.out.println("save_tab2 호출됨, 탭2-2 = " + saveList);
            hr012Service.save_tab2_2(saveList);
            return ResponseEntity.ok("ok");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("error");
        }
    }

}

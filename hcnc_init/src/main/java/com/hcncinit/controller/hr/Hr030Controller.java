package com.hcncinit.controller.hr;

import com.hcncinit.service.hr.Hr030Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/hr030")
public class Hr030Controller {

    @Autowired
    private Hr030Service hr030Service;

    // [대시보드] - [kpi 데이터] > 조회
    @RequestMapping("/kpi")
    public ModelAndView select_kpi(@RequestParam(required = false) Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> resList = hr030Service.select_kpi(map);
//        for (Map<String, Object> row : resList) {
//            // 기존 has_img boolean 변환
//            Object base64Obj = row.get("dev_img_base64");
//            boolean hasImg = base64Obj != null;
//            row.put("has_img", hasImg);
//
//            // 이미지가 있으면 Base64 URL로 넣기
//            if (hasImg) {
//                row.put("img_url", "data:image/jpeg;base64," + base64Obj);
//            } else {
//                row.put("img_url", null);
//            }
//
//            // 필요 시 dev_img_base64 제거 (응답 데이터 가볍게)
//            row.remove("dev_img_base64");
//        }
        mv.addObject("res", resList);
        return mv;
    }

}
package com.hcncinit.controller.hr;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import com.hcncinit.service.hr.Hr020Service;

@Controller
@RequestMapping("/hr020")
public class Hr020Controller {

    @Autowired
    private Hr020Service hr020Service;

    // [인적관리] - [진행 프로젝트 내역] > 조회
    @RequestMapping("/list")
    public ModelAndView select_hr020(@RequestParam(required = false) Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");

        List<Map<String, Object>> resList = hr020Service.select_hr020(map);

        for (Map<String, Object> row : resList) {
            // String devId = (String) row.get("dev_id");

            // 기존 has_img boolean 변환
            Object base64Obj = row.get("dev_img_base64");
            boolean hasImg = base64Obj != null;
            row.put("has_img", hasImg);

            // 이미지가 있으면 Base64 URL로 넣기
            if (hasImg) {
                row.put("img_url", "data:image/jpeg;base64," + base64Obj);
            } else {
                row.put("img_url", null);
            }

            // 필요 시 dev_img_base64 제거 (응답 데이터 가볍게)
            row.remove("dev_img_base64");
        }

        mv.addObject("res", resList);
        return mv;
    }

}

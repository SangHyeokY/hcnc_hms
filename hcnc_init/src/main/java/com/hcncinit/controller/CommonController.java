package com.hcncinit.controller;

import com.hcncinit.service.CommonService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/common")
public class CommonController {

    @Autowired
    private CommonService commonService;

    @PostMapping("/getCm")
    public ModelAndView get_cm(@RequestParam Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        // 확인용 1
        // System.out.println("get_cm 호출됨, param = " + map);
        List<Map<String, Object>> resList = commonService.get_cm(map);
        // 확인용 2
        // System.out.println("조회 결과 = " + resList);
        mv.addObject("res", resList);
        return mv;
    }

    @GetMapping("/getExcel")
    public void download(@RequestParam("dev_id") String devId, @RequestParam("dev_nm") String devNm,
                         HttpServletResponse response) throws IOException {
        response.reset(); // 중요
        // String fileName = "ExcelDownload.xlsx";
        String fileName = "[" + devId + "]_" + devNm + "_Profile.xlsx";
        String encoded = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replaceAll("\\+", "%20");
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + encoded);
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

        commonService.download(response, devId);
    }
}

package com.hcncinit.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;
import com.hcncinit.service.CommonCodeService;

@Controller
@RequestMapping("/ccm")
public class CommonCodeController {

    @Autowired
    private CommonCodeService commonCodeService;

    @RequestMapping("/main/list")
    public ModelAndView mainList(@RequestParam(required = false) Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = commonCodeService.mainList(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        return mv;
    }

    @RequestMapping("/detail/list")
    public ModelAndView detailList(@RequestParam(required = false) Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = commonCodeService.detailList(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        return mv;
    }

    @RequestMapping("/main/save")
    public ModelAndView mainSave(@RequestParam Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        commonCodeService.ensureUser(map);
        int res = commonCodeService.mainUpsert(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    @RequestMapping("/detail/save")
    public ModelAndView detailSave(@RequestParam Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        commonCodeService.ensureUser(map);
        int res = commonCodeService.detailUpsert(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    @RequestMapping("/main/delete")
    public ModelAndView mainDelete(@RequestParam Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        commonCodeService.ensureUser(map);

        int detailCount = commonCodeService.detailCount(map);
        if (detailCount > 0) {
            mv.addObject("success", false);
            mv.addObject("message", "상세코드가 존재하는 코드그룹은 삭제할 수 없습니다.");
            return mv;
        }

        int res = commonCodeService.mainDelete(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    @RequestMapping("/detail/delete")
    public ModelAndView detailDelete(@RequestParam Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        commonCodeService.ensureUser(map);
        int res = commonCodeService.detailDelete(map);
        mv.addObject("success", res > 0);
        return mv;
    }

    @RequestMapping("/detail/sort")
    public ModelAndView detailSort(@RequestParam Map<String, Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        commonCodeService.ensureUser(map);
        int res = commonCodeService.detailSort(map);
        mv.addObject("success", res > 0);
        return mv;
    }
}

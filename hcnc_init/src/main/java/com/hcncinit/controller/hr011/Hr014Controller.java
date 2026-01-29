package com.hcncinit.controller.hr011;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import com.hcncinit.service.hr011.Hr014Service;

@Controller
@RequestMapping("/hr014")
public class Hr014Controller {

    @Autowired
    private Hr014Service hr014Service;

    @RequestMapping("/list")
    public ModelAndView list(@RequestParam(required = false) Map<String, Object> map) {
        applyDefaults(map);
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> list = hr014Service.list(map);
        mv.addObject("success", true);
        mv.addObject("list", list);
        return mv;
    }

    private void applyDefaults(Map<String, Object> map) {
        if (map == null) {
            return;
        }
        if (!map.containsKey("dev_id") || String.valueOf(map.get("dev_id")).trim().isEmpty()) {
            map.put("dev_id", "TEMP_DEV");
        }
    }
}

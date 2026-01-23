package com.hcncinit.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.ModelAndView;
import com.hcncinit.service.FileService;

@Controller
@RequestMapping("")
public class FileController {
    @Autowired
    FileService fileService;
    @RequestMapping("/{type}FGetItem")
    public ModelAndView getData (@PathVariable("type") String type, @RequestParam(required = false) Map<String,Object> map) {
        ModelAndView mv = new ModelAndView("jsonView");
        List<Map<String, Object>> res = fileService.getData(map,type);
        mv.addObject("res", res);
        return mv;
    }
    /**
     * 통합 파일 업로드 엔드포인트
     */
    @PostMapping("/{type}FUpsert")
    public ModelAndView fileUpsert(
            @PathVariable("type") String type,
            @RequestParam("file") MultipartFile file,
            @RequestParam("code") String code,
            @RequestParam("check") String check,
            @RequestParam("name") String name,
            @RequestParam("path") String path
    ) throws Exception {
        
        ModelAndView mv = new ModelAndView("jsonView");
        Map<String, Object> map = new HashMap<>();

        map.put("code", code);
        map.put("check", check);
        map.put("name", name);
        map.put("path", path);
        map.put("file", file);

        int res = fileService.fileUpsert(map, type.toUpperCase());
        
        mv.addObject("res", res);
        mv.addObject("message", res > 0 ? "파일 업로드 성공" : "파일 업로드 실패");
        
        return mv;
    }
}

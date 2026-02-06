package com.hcncinit.controller;

import com.hcncinit.service.ExcelService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
@RequestMapping("/api/excel")
public class ExcelController {

    private @Autowired ExcelService excelService;

    @PostMapping(path = "upload.do")
    public Map<String, Object> upload(@RequestParam("file") MultipartFile file) {
        return excelService.upload(file, 1, 2);
    }

//    @PostMapping(path = "upload_save.do")
//    public int upload_save(@RequestParam Map<String, Object> map, HttpSession session) {
//        return excelService.upload_save(map);
//    }
}

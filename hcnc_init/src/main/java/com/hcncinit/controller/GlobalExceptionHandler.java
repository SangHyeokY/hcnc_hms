package com.hcncinit.controller;

import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.ModelAndView;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ModelAndView handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        ModelAndView mv = new ModelAndView("jsonView");
        mv.addObject("res", 0);
        mv.addObject("message", "파일 용량이 너무 큽니다. 업로드 최대 용량을 확인해주세요.");
        return mv;
    }

    @ExceptionHandler(MultipartException.class)
    public ModelAndView handleMultipartException(MultipartException ex) {
        ModelAndView mv = new ModelAndView("jsonView");
        mv.addObject("res", 0);
        mv.addObject("message", "파일 업로드 처리 중 오류가 발생했습니다.");
        return mv;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ModelAndView handleIllegalArgument(IllegalArgumentException ex) {
        ModelAndView mv = new ModelAndView("jsonView");
        mv.addObject("res", 0);
        mv.addObject("message", ex.getMessage());
        return mv;
    }
}

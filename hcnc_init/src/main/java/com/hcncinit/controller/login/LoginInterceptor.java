package com.hcncinit.controller.login;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

public class LoginInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        HttpSession session = request.getSession(false);

        // 세션 검사
        if (session == null || session.getAttribute("LOGIN_USER_ID") == null) {
            // 로그인 안 되어 있으면 로그인 페이지로 이동
            response.sendRedirect("/login");
            // 컨트롤러 실행 X
            return false;
        }
        // 로그인 되어 있으면 계속 진행
        return true;
    }

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) throws Exception {
        // 요청 완료 후 처리할 작업이 있다면 더 추가해주세요~
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        // 요청 완료 후 처리할 작업이 있다면 더 추가해주세요~
    }
}

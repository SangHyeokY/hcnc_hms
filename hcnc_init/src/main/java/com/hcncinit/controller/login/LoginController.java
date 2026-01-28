package com.hcncinit.controller.login;

import java.util.Map;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import com.hcncinit.service.cm010.Cm010Service;

@Controller
public class LoginController {

    @Autowired
    private Cm010Service cm010Service;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ModelAndView login(@RequestParam Map<String, Object> map, HttpSession session) {
        ModelAndView mv = new ModelAndView("jsonView");
        String userId = map.get("username") == null ? "" : String.valueOf(map.get("username")).trim();
        String password = map.get("password") == null ? "" : String.valueOf(map.get("password"));

        if (userId.isEmpty() || password.isEmpty()) {
            mv.addObject("success", false);
            mv.addObject("message", "아이디 또는 비밀번호가 올바르지 않습니다.");
            return mv;
        }

        Map<String, Object> user = cm010Service.findLoginUser(userId);
        if (user == null) {
            mv.addObject("success", false);
            mv.addObject("message", "아이디 또는 비밀번호가 올바르지 않습니다.");
            return mv;
        }

        String pwdHash = String.valueOf(user.get("pwd_hash"));
        // BCrypt 암호화 방식으로 암화화 된 데이터 혹은 일반 문자열로 저장된 데이터 모두 검증 (※ 추후 일반 문자열에 대한 조건은 제외해야 함.)
        if (!passwordEncoder.matches(password, pwdHash) && !pwdHash.equals(password)){
            mv.addObject("success", false);
            mv.addObject("message", "아이디 또는 비밀번호가 올바르지 않습니다.");
            return mv;
        }

        session.setAttribute("LOGIN_USER_ID", userId);
        cm010Service.updateLastLogin(userId);

        mv.addObject("success", true);
        return mv;
    }

    @PostMapping("/logout")
    public ModelAndView logout(HttpSession session) {
        session.invalidate();
        ModelAndView mv = new ModelAndView("jsonView");
        mv.addObject("success", true);
        return mv;
    }
}

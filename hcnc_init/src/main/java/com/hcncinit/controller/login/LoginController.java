package com.hcncinit.controller.login;

import java.util.Map;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import com.hcncinit.service.cm.Cm010Service;

@Controller
public class LoginController {

    @Autowired
    private Cm010Service cm010Service;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/pwChg")
    public ModelAndView pwChg(@RequestParam Map<String, Object> map) {

        ModelAndView mv = new ModelAndView("jsonView");
        String userId = map.get("username") == null ? "" : String.valueOf(map.get("username")).trim();
        String password = map.get("password") == null ? "" : String.valueOf(map.get("password"));

        map.put("password", passwordEncoder.encode(password));

        System.out.println("cm010Service = " + cm010Service); // ⭐ null 여부 즉시 확인
        cm010Service.pwChg(map);
        mv.addObject("success", true);
        return mv;
    }

    // 로그인
    @PostMapping("/login")
    public ModelAndView login(@RequestParam Map<String, Object> map, HttpSession session, Model model) {
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
        session.setAttribute("LOGIN_AUTH", user.get("role_cd"));
        session.setAttribute("LOGIN_LOCK", user.get("lock_yn"));
        session.setAttribute("LOGIN_PW_CHG", user.get("pwd_chg_yn"));
        cm010Service.updateLastLogin(userId);

        mv.addObject("success", true);
        mv.addObject("LOGIN_USER_ID", userId);
        mv.addObject("LOGIN_AUTH", user.get("role_cd"));
        mv.addObject("LOGIN_LOCK", user.get("lock_yn"));
        mv.addObject("LOGIN_PW_CHG", user.get("pwd_chg_yn"));
        return mv;
    }

    // 로그아웃
    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/login";
    }
}

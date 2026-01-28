package com.hcncinit.config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SecurityBeans {
    @Bean
    public PasswordEncoder passwordEncoder() {
        // 10~12 정도를 많이 사용 (숫자↑ = 더 느림 = 더 안전하지만 서버부하↑)
        return new BCryptPasswordEncoder(10);
    }
}

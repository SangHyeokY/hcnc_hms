package com.hcncinit.config;

import com.hcncinit.controller.login.LoginInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.view.json.MappingJackson2JsonView;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  @Bean
  MappingJackson2JsonView jsonView(){
    return new MappingJackson2JsonView();
  }

  // 세션 검사 로직
  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(new LoginInterceptor())

      // 세션 검사 대상
      .addPathPatterns("/cm010/**", "/cm040/**", "/hr010/**", "/hr020/**","/hr014/**")

      // 예외 URL
      .excludePathPatterns("/login", "/logout", "/css/**", "/js/**");
  }
}

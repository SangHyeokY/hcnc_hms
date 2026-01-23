
package com.hcncinit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;

import javax.sql.DataSource;
import java.sql.Connection;

@SpringBootApplication
public class HcncinitApplication {

    public static void main(String[] args) {
        SpringApplication.run(HcncinitApplication.class, args);
    }

    // DB 연결 테스트
    @Bean
    public CommandLineRunner testConnection(DataSource dataSource) {
        return args -> {
            try (Connection conn = dataSource.getConnection()) {
                System.out.println("===== DB 연결 성공 =====");
                System.out.println("URL = " + conn.getMetaData().getURL());
                System.out.println("USER = " + conn.getMetaData().getUserName());
            } catch (Exception e) {
                System.out.println("===== DB 연결 실패 =====");
                e.printStackTrace();
            }
        };
    }
}

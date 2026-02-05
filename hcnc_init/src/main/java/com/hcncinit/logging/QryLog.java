package com.hcncinit.logging;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;


@Retention(RetentionPolicy.RUNTIME) // 런타임(프로그램 실행중)까지 애노테이션 정보를 유지
@Target(ElementType.METHOD) // 메소드에만 애노테이션 붙일 수 있음
public @interface QryLog {  // 로그 메타데이터용 애노테이션
    String appNm() default "HRD"; // 기본값
    String scrnCd() default "";
    String fnCd();  // 필수값
    String opTyp(); // 필수값
    boolean logParams() default true;   // logParams=false면 요청 파라미터 JSON 저장 X
}


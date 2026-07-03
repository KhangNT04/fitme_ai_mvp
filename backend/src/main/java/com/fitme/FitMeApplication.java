package com.fitme;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;
import com.fitme.common.config.FitMeProperties;

@SpringBootApplication
@EnableConfigurationProperties(FitMeProperties.class)
@EnableScheduling
public class FitMeApplication {

    public static void main(String[] args) {
        SpringApplication.run(FitMeApplication.class, args);
    }
}

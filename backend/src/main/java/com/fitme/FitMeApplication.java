package com.fitme;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import com.fitme.common.config.FitMeProperties;

@SpringBootApplication
@EnableConfigurationProperties(FitMeProperties.class)
public class FitMeApplication {

    public static void main(String[] args) {
        SpringApplication.run(FitMeApplication.class, args);
    }
}

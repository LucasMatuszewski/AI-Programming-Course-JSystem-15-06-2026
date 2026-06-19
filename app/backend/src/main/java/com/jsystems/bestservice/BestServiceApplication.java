package com.jsystems.bestservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BestServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(BestServiceApplication.class, args);
    }
}

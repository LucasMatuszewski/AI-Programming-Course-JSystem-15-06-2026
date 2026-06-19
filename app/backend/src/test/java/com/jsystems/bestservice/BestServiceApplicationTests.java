package com.jsystems.bestservice;

import com.jsystems.bestservice.persistence.ServiceSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class BestServiceApplicationTests {

    @Test
    void contextLoads() throws ClassNotFoundException {
        Class<?> applicationClass = Class.forName("com.jsystems.bestservice.BestServiceApplication");

        try (ConfigurableApplicationContext context = new SpringApplicationBuilder(applicationClass)
                .profiles("test")
                .web(WebApplicationType.SERVLET)
                .properties(
                        "spring.autoconfigure.exclude="
                                + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                                + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
                                + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration"
                )
                .initializers(applicationContext -> applicationContext.getBeanFactory()
                        .registerSingleton("serviceSessionRepository", mock(ServiceSessionRepository.class)))
                .run()) {
            assertThat(context.isRunning()).isTrue();
        }
    }
}

package com.TCC.FlyGuide;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FlyGuideApplication {

	public static void main(String[] args) {
		SpringApplication.run(FlyGuideApplication.class, args);
	}

}

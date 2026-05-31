package com.TCC.FlyGuide.services.configs;

import com.TCC.FlyGuide.repositories.ImagemRepository;
import com.TCC.FlyGuide.services.ImagemCatalogo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private ImagemRepository imagemRepository;

    @Override
    public void run(String... args) {
        if (imagemRepository.count() == 0) {
            imagemRepository.saveAll(ImagemCatalogo.padrao());
            System.out.println("[FlyGuide] Imagens padrão inseridas na tb_imagem.");
        }
    }
}

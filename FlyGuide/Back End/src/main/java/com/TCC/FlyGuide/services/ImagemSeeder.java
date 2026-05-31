package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.entities.Imagem;
import com.TCC.FlyGuide.repositories.ImagemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class ImagemSeeder implements ApplicationRunner {

    @Autowired
    private ImagemRepository imagemRepository;

    @Override
    public void run(ApplicationArguments args) {
        for (Imagem padrao : ImagemCatalogo.padrao()) {
            imagemRepository.findByChave(padrao.getChave()).ifPresentOrElse(
                existing -> {
                    existing.setUrl(padrao.getUrl());
                    existing.setNome(padrao.getNome());
                    existing.setEmoji(padrao.getEmoji());
                    imagemRepository.save(existing);
                },
                () -> imagemRepository.save(padrao)
            );
        }
    }
}

package com.TCC.FlyGuide.services.configs;

import com.TCC.FlyGuide.entities.Imagem;
import com.TCC.FlyGuide.repositories.ImagemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private ImagemRepository imagemRepository;

    @Override
    public void run(String... args) {
        if (imagemRepository.count() == 0) {
            imagemRepository.saveAll(List.of(
                    new Imagem(null, "praia",       "Praia",        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=75", "🏖️"),
                    new Imagem(null, "neve",        "Neve / Frio",  "https://images.unsplash.com/photo-1551582045-6ec9c11d8697?w=800&q=75", "❄️"),
                    new Imagem(null, "floresta",    "Floresta",     "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=75", "🌿"),
                    new Imagem(null, "aventura",    "Aventura",     "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=75", "🧗"),
                    new Imagem(null, "cidade",      "Cidade",       "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=75", "🏙️"),
                    new Imagem(null, "gastronomia", "Gastronomia",  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=75", "🍽️"),
                    new Imagem(null, "chuva",       "Chuva",        "https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800&q=75", "🌧️"),
                    new Imagem(null, "diversao",    "Diversão",     "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=75", "🎡")
            ));
            System.out.println("[FlyGuide] 8 imagens padrão inseridas na tb_imagem.");
        }
    }
}
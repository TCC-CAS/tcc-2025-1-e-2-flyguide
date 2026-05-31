package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.ImagemDTO;
import com.TCC.FlyGuide.entities.Imagem;
import com.TCC.FlyGuide.repositories.ImagemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ImagemService {

    @Autowired
    private ImagemRepository imagemRepository;

    public List<ImagemDTO> findAll() {
        return imagemRepository.findAll()
                .stream()
                .sorted(Comparator
                        .comparingInt((Imagem img) -> ImagemCatalogo.ordem(img.getChave()))
                        .thenComparing(Imagem::getIdImagem, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(ImagemDTO::new)
                .collect(Collectors.toList());
    }
}

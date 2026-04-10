package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.ImagemDTO;
import com.TCC.FlyGuide.entities.Imagem;
import com.TCC.FlyGuide.repositories.ImagemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ImagemService {

    @Autowired
    private ImagemRepository imagemRepository;

    public List<ImagemDTO> findAll() {
        return imagemRepository.findAll()
                .stream()
                .map(ImagemDTO::new)
                .collect(Collectors.toList());
    }
}
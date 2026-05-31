package com.TCC.FlyGuide.resources;

import com.TCC.FlyGuide.DTO.ImagemDTO;
import com.TCC.FlyGuide.services.ImagemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(value = "/imagens")
public class ImagemResource {

    @Autowired
    private ImagemService service;

    @GetMapping
    public ResponseEntity<List<ImagemDTO>> findAll() {
        List<ImagemDTO> list = service.findAll();
        return ResponseEntity.ok().body(list);
    }
}
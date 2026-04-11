package com.TCC.FlyGuide.DTO;

import com.TCC.FlyGuide.entities.Imagem;
import java.io.Serializable;

public class ImagemDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long   idImagem;
    private String chave;
    private String nome;
    private String url;
    private String emoji;

    public ImagemDTO() {}

    public ImagemDTO(Imagem entity) {
        this.idImagem = entity.getIdImagem();
        this.chave    = entity.getChave();
        this.nome     = entity.getNome();
        this.url      = entity.getUrl();
        this.emoji    = entity.getEmoji();
    }

    public Long   getIdImagem()              { return idImagem; }
    public void   setIdImagem(Long idImagem) { this.idImagem = idImagem; }

    public String getChave()                 { return chave; }
    public void   setChave(String chave)     { this.chave = chave; }

    public String getNome()                  { return nome; }
    public void   setNome(String nome)       { this.nome = nome; }

    public String getUrl()                   { return url; }
    public void   setUrl(String url)         { this.url = url; }

    public String getEmoji()                 { return emoji; }
    public void   setEmoji(String emoji)     { this.emoji = emoji; }
}
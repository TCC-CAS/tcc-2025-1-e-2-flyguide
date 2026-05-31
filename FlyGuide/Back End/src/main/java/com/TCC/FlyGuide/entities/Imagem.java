package com.TCC.FlyGuide.entities;

import jakarta.persistence.*;
import java.io.Serializable;

@Entity
@Table(name = "tb_imagem")
public class Imagem implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idImagem;

    @Column(nullable = false, unique = true, length = 50)
    private String chave; // ex: "praia", "neve"

    @Column(nullable = false, length = 100)
    private String nome; // ex: "Praia", "Neve / Frio"

    @Column(nullable = false, length = 500)
    private String url;

    @Column(length = 10)
    private String emoji;

    public Imagem() {}

    public Imagem(Long idImagem, String chave, String nome, String url, String emoji) {
        this.idImagem = idImagem;
        this.chave    = chave;
        this.nome     = nome;
        this.url      = url;
        this.emoji    = emoji;
    }

    public Long getIdImagem()           { return idImagem; }
    public void setIdImagem(Long id)    { this.idImagem = id; }

    public String getChave()            { return chave; }
    public void setChave(String chave)  { this.chave = chave; }

    public String getNome()             { return nome; }
    public void setNome(String nome)    { this.nome = nome; }

    public String getUrl()              { return url; }
    public void setUrl(String url)      { this.url = url; }

    public String getEmoji()            { return emoji; }
    public void setEmoji(String emoji)  { this.emoji = emoji; }

    @Override
    public int hashCode() {
        return (idImagem == null) ? 0 : idImagem.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Imagem other = (Imagem) obj;
        if (idImagem == null) return other.idImagem == null;
        return idImagem.equals(other.idImagem);
    }
}
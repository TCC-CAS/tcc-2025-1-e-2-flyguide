package com.TCC.FlyGuide.DTO;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class GerarRoteiroResponseDTO {

    private String titulo;
    private String descricao;
    private BigDecimal orcamentoEstimado;
    private Long idImagem;
    private String imagemChave;
    private String imagemUrl;
    private List<Map<String, Object>> sugestoes;

    public GerarRoteiroResponseDTO() {}

    public String getTitulo()                        { return titulo; }
    public void setTitulo(String titulo)             { this.titulo = titulo; }

    public String getDescricao()                     { return descricao; }
    public void setDescricao(String descricao)       { this.descricao = descricao; }

    public BigDecimal getOrcamentoEstimado()         { return orcamentoEstimado; }
    public void setOrcamentoEstimado(BigDecimal o)   { this.orcamentoEstimado = o; }

    public Long getIdImagem()                        { return idImagem; }
    public void setIdImagem(Long idImagem)           { this.idImagem = idImagem; }

    public String getImagemChave()                   { return imagemChave; }
    public void setImagemChave(String imagemChave)   { this.imagemChave = imagemChave; }

    public String getImagemUrl()                     { return imagemUrl; }
    public void setImagemUrl(String imagemUrl)       { this.imagemUrl = imagemUrl; }

    public List<Map<String, Object>> getSugestoes()                  { return sugestoes; }
    public void setSugestoes(List<Map<String, Object>> sugestoes)    { this.sugestoes = sugestoes; }
}

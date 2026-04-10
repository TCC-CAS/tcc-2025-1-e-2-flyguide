package com.TCC.FlyGuide.repositories;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.TCC.FlyGuide.entities.Roteiro;

public interface RoteiroRepository extends JpaRepository<Roteiro, Long> {

    List<Roteiro> findByUsuario_IdUsuario(Long idUsuario);

    List<Roteiro> findByVisibilidadeRoteiroOrderByDataCriacaoDesc(String visibilidade);

    @Query("SELECT r FROM Roteiro r WHERE r.visibilidadeRoteiro = 'Público' " +
           "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
           "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
           "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
           "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
           "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax) " +
           "ORDER BY r.dataCriacao DESC")
    List<Roteiro> findPublicosComFiltros(
            @Param("cidade") String cidade,
            @Param("tipoRoteiro") String tipoRoteiro,
            @Param("orcamentoMax") BigDecimal orcamentoMax,
            @Param("busca") String busca,
            @Param("diasMax") Integer diasMax
    );

    @Query("SELECT r FROM Roteiro r LEFT JOIN RoteiroLike l ON l.roteiro = r " +
           "WHERE r.visibilidadeRoteiro = 'Público' " +
           "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
           "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
           "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
           "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
           "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax) " +
           "GROUP BY r " +
           "ORDER BY COUNT(l.idLike) DESC")
    List<Roteiro> findPublicosOrdenadosPorCurtidas(
            @Param("cidade") String cidade,
            @Param("tipoRoteiro") String tipoRoteiro,
            @Param("orcamentoMax") BigDecimal orcamentoMax,
            @Param("busca") String busca,
            @Param("diasMax") Integer diasMax
    );

    @Query("SELECT r FROM Roteiro r WHERE r.visibilidadeRoteiro = 'Público' " +
           "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
           "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
           "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
           "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
           "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax) " +
           "ORDER BY r.orcamento ASC")
    List<Roteiro> findPublicosOrcamentoAsc(
            @Param("cidade") String cidade,
            @Param("tipoRoteiro") String tipoRoteiro,
            @Param("orcamentoMax") BigDecimal orcamentoMax,
            @Param("busca") String busca,
            @Param("diasMax") Integer diasMax
    );

    @Query("SELECT r FROM Roteiro r WHERE r.visibilidadeRoteiro = 'Público' " +
           "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
           "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
           "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
           "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
           "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax) " +
           "ORDER BY r.orcamento DESC")
    List<Roteiro> findPublicosOrcamentoDesc(
            @Param("cidade") String cidade,
            @Param("tipoRoteiro") String tipoRoteiro,
            @Param("orcamentoMax") BigDecimal orcamentoMax,
            @Param("busca") String busca,
            @Param("diasMax") Integer diasMax
    );

    @Query("SELECT r FROM Roteiro r WHERE r.visibilidadeRoteiro = 'Público' " +
           "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
           "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
           "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
           "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
           "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax) " +
           "ORDER BY r.diasTotais ASC")
    List<Roteiro> findPublicosDuracaoAsc(
            @Param("cidade") String cidade,
            @Param("tipoRoteiro") String tipoRoteiro,
            @Param("orcamentoMax") BigDecimal orcamentoMax,
            @Param("busca") String busca,
            @Param("diasMax") Integer diasMax
    );

    @Query("SELECT r FROM Roteiro r WHERE r.visibilidadeRoteiro = 'Público' " +
           "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
           "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
           "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
           "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
           "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax) " +
           "ORDER BY r.diasTotais DESC")
    List<Roteiro> findPublicosDuracaoDesc(
            @Param("cidade") String cidade,
            @Param("tipoRoteiro") String tipoRoteiro,
            @Param("orcamentoMax") BigDecimal orcamentoMax,
            @Param("busca") String busca,
            @Param("diasMax") Integer diasMax
    );
}
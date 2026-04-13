package com.TCC.FlyGuide.repositories;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.TCC.FlyGuide.entities.Roteiro;

public interface RoteiroRepository extends JpaRepository<Roteiro, Long> {

    List<Roteiro> findByUsuario_IdUsuario(Long idUsuario);

    boolean existsByUsuario_IdUsuarioAndIdRoteiroOrigem(Long idUsuario, Long idRoteiroOrigem);

    List<Roteiro> findByVisibilidadeRoteiroOrderByDataCriacaoDesc(String visibilidade);

    @Query("SELECT r FROM Roteiro r WHERE r.visibilidadeRoteiro = 'Público' " +
            "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
            "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
            "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
            "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
            "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax) " +
            "ORDER BY r.dataCriacao DESC")
    Page<Roteiro> findPublicosComFiltros(
            @Param("cidade") String cidade,
            @Param("tipoRoteiro") String tipoRoteiro,
            @Param("orcamentoMax") BigDecimal orcamentoMax,
            @Param("busca") String busca,
            @Param("diasMax") Integer diasMax,
            Pageable pageable
    );

    @Query(value = "SELECT r FROM Roteiro r LEFT JOIN RoteiroAvaliacao a ON a.roteiro = r " +
            "WHERE r.visibilidadeRoteiro = 'Público' " +
            "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
            "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
            "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
            "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
            "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax) " +
            "GROUP BY r " +
            "ORDER BY AVG(COALESCE(a.nota, 0)) DESC",
           countQuery = "SELECT COUNT(DISTINCT r) FROM Roteiro r WHERE r.visibilidadeRoteiro = 'Público' " +
            "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
            "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
            "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
            "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
            "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax)")
    Page<Roteiro> findPublicosOrdenadosPorCurtidas(
            @Param("cidade") String cidade,
            @Param("tipoRoteiro") String tipoRoteiro,
            @Param("orcamentoMax") BigDecimal orcamentoMax,
            @Param("busca") String busca,
            @Param("diasMax") Integer diasMax,
            Pageable pageable
    );

    @Query("SELECT r FROM Roteiro r WHERE r.visibilidadeRoteiro = 'Público' " +
            "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
            "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
            "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
            "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
            "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax) " +
            "ORDER BY r.orcamento ASC")
    Page<Roteiro> findPublicosOrcamentoAsc(
            @Param("cidade") String cidade,
            @Param("tipoRoteiro") String tipoRoteiro,
            @Param("orcamentoMax") BigDecimal orcamentoMax,
            @Param("busca") String busca,
            @Param("diasMax") Integer diasMax,
            Pageable pageable
    );

    @Query("SELECT r FROM Roteiro r WHERE r.visibilidadeRoteiro = 'Público' " +
            "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
            "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
            "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
            "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
            "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax) " +
            "ORDER BY r.orcamento DESC")
    Page<Roteiro> findPublicosOrcamentoDesc(
            @Param("cidade") String cidade,
            @Param("tipoRoteiro") String tipoRoteiro,
            @Param("orcamentoMax") BigDecimal orcamentoMax,
            @Param("busca") String busca,
            @Param("diasMax") Integer diasMax,
            Pageable pageable
    );

    @Query("SELECT r FROM Roteiro r WHERE r.visibilidadeRoteiro = 'Público' " +
            "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
            "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
            "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
            "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
            "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax) " +
            "ORDER BY r.diasTotais ASC")
    Page<Roteiro> findPublicosDuracaoAsc(
            @Param("cidade") String cidade,
            @Param("tipoRoteiro") String tipoRoteiro,
            @Param("orcamentoMax") BigDecimal orcamentoMax,
            @Param("busca") String busca,
            @Param("diasMax") Integer diasMax,
            Pageable pageable
    );

    @Query("SELECT r FROM Roteiro r WHERE r.visibilidadeRoteiro = 'Público' " +
            "AND (:cidade IS NULL OR LOWER(r.cidade) LIKE LOWER(CONCAT('%', :cidade, '%'))) " +
            "AND (:tipoRoteiro IS NULL OR r.tipoRoteiro = :tipoRoteiro) " +
            "AND (:orcamentoMax IS NULL OR r.orcamento <= :orcamentoMax) " +
            "AND (:busca IS NULL OR LOWER(r.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))) " +
            "AND (:diasMax IS NULL OR r.diasTotais <= :diasMax) " +
            "ORDER BY r.diasTotais DESC")
    Page<Roteiro> findPublicosDuracaoDesc(
            @Param("cidade") String cidade,
            @Param("tipoRoteiro") String tipoRoteiro,
            @Param("orcamentoMax") BigDecimal orcamentoMax,
            @Param("busca") String busca,
            @Param("diasMax") Integer diasMax,
            Pageable pageable
    );
}
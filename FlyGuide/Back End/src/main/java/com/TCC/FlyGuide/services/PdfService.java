package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.RoteiroCompletoDTO;
import com.TCC.FlyGuide.DTO.RoteiroDTO;
import com.TCC.FlyGuide.DTO.RoteiroLocalDTO;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.events.Event;
import com.itextpdf.kernel.events.IEventHandler;
import com.itextpdf.kernel.events.PdfDocumentEvent;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Canvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class PdfService {

    // Paleta FlyGuide
    private static final DeviceRgb COR_LARANJA        = new DeviceRgb(249, 115, 22);
    private static final DeviceRgb COR_LARANJA_CLARO  = new DeviceRgb(255, 247, 237);
    private static final DeviceRgb COR_LARANJA_MEDIO  = new DeviceRgb(254, 215, 170);
    private static final DeviceRgb COR_BRANCO         = new DeviceRgb(255, 255, 255);
    private static final DeviceRgb COR_CINZA_ESCURO   = new DeviceRgb(31, 41, 55);
    private static final DeviceRgb COR_CINZA_MEDIO    = new DeviceRgb(107, 114, 128);
    private static final DeviceRgb COR_CINZA_CLARO    = new DeviceRgb(243, 244, 246);

    // Cores de status
    private static final DeviceRgb COR_VERDE          = new DeviceRgb(34, 197, 94);
    private static final DeviceRgb COR_VERDE_CLARO    = new DeviceRgb(220, 252, 231);
    private static final DeviceRgb COR_VERMELHO       = new DeviceRgb(239, 68, 68);
    private static final DeviceRgb COR_VERMELHO_CLARO = new DeviceRgb(254, 226, 226);

    private static final DateTimeFormatter FMT_DATA    = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FMT_HORARIO = DateTimeFormatter.ofPattern("HH:mm");

    @Autowired
    private RoteiroService roteiroService;

    public byte[] gerarPdf(Long idRoteiro) throws IOException {
        RoteiroCompletoDTO completo = roteiroService.findCompletoById(idRoteiro);
        RoteiroDTO roteiro = completo.getRoteiro();
        List<RoteiroLocalDTO> locais = completo.getLocais();
        int totalLocais = locais != null ? locais.size() : 0;

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);

        // ── HANDLER DE NÚMERO DE PÁGINA ─────────────────────────────────────
        pdf.addEventHandler(PdfDocumentEvent.END_PAGE, new NumeroPaginaHandler());

        // Margens consistentes para todas as páginas — header compensa com margem negativa
        Document doc = new Document(pdf, PageSize.A4);
        doc.setMargins(36, 36, 48, 36);

        PdfFont fontBold    = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont fontRegular = PdfFontFactory.createFont(StandardFonts.HELVETICA);

        // ── HEADER ──────────────────────────────────────────────────────────
        Table header = new Table(UnitValue.createPercentArray(new float[]{1}))
                .setWidth(UnitValue.createPercentValue(100))
                .setBorder(Border.NO_BORDER)
                .setMarginTop(-36)
                .setMarginLeft(-36)
                .setMarginRight(-36);

        Cell headerCell = new Cell()
                .setBackgroundColor(COR_LARANJA)
                .setBorder(Border.NO_BORDER)
                .setPaddingTop(32).setPaddingBottom(20).setPaddingLeft(32).setPaddingRight(32);

        headerCell.add(new Paragraph("FlyGuide")
                .setFont(fontBold).setFontSize(13)
                .setFontColor(COR_BRANCO).setOpacity(0.85f).setMarginBottom(6));

        headerCell.add(new Paragraph(roteiro.getTitulo() != null ? roteiro.getTitulo() : "Roteiro")
                .setFont(fontBold).setFontSize(26)
                .setFontColor(COR_BRANCO).setMarginBottom(4));

        if (roteiro.getCidade() != null) {
            headerCell.add(new Paragraph("📍 " + roteiro.getCidade())
                    .setFont(fontRegular).setFontSize(12)
                    .setFontColor(COR_BRANCO).setOpacity(0.9f).setMarginBottom(0));
        }

        header.addCell(headerCell);
        doc.add(header);

        // ── RESUMO RÁPIDO ────────────────────────────────────────────────────

        StringBuilder resumo = new StringBuilder();
        if (roteiro.getDiasTotais() != null) resumo.append(roteiro.getDiasTotais()).append(" dias");
        if (totalLocais > 0) {
            if (resumo.length() > 0) resumo.append("   •   ");
            resumo.append(totalLocais).append(totalLocais == 1 ? " local" : " locais");
        }
        if (roteiro.getOrcamento() != null) {
            if (resumo.length() > 0) resumo.append("   •   ");
            resumo.append("R$ ").append(roteiro.getOrcamento().toPlainString());
        }

        if (resumo.length() > 0) {
            Table resumoBar = new Table(UnitValue.createPercentArray(new float[]{1}))
                    .setWidth(UnitValue.createPercentValue(100))
                    .setMarginBottom(20)
                    .setBorder(Border.NO_BORDER);

            resumoBar.addCell(new Cell()
                    .setBackgroundColor(COR_LARANJA_CLARO)
                    .setBorder(Border.NO_BORDER)
                    .setBorderBottom(new SolidBorder(COR_LARANJA_MEDIO, 1))
                    .setPaddingTop(10).setPaddingBottom(10).setPaddingLeft(16).setPaddingRight(16)
                    .add(new Paragraph(resumo.toString())
                            .setFont(fontBold).setFontSize(11)
                            .setFontColor(COR_LARANJA)
                            .setTextAlignment(TextAlignment.CENTER)));

            doc.add(resumoBar);
        }

        // ── BLOCO DE INFORMAÇÕES ─────────────────────────────────────────────
        Table info = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(24)
                .setBorder(Border.NO_BORDER);

        adicionarInfoCard(info, fontBold, fontRegular, "Tipo", roteiro.getTipoRoteiro());
        adicionarInfoCard(info, fontBold, fontRegular, "Duração",
                roteiro.getDiasTotais() != null ? roteiro.getDiasTotais() + " dias" : "—");
        adicionarInfoCard(info, fontBold, fontRegular, "Orçamento",
                roteiro.getOrcamento() != null ? "R$ " + roteiro.getOrcamento().toPlainString() : "—");

        if (roteiro.getDataInicio() != null || roteiro.getDataFim() != null) {
            String inicio = roteiro.getDataInicio() != null ? roteiro.getDataInicio().format(FMT_DATA) : "—";
            String fim    = roteiro.getDataFim()    != null ? roteiro.getDataFim().format(FMT_DATA)    : "—";
            adicionarInfoCard(info, fontBold, fontRegular, "Início", inicio);
            adicionarInfoCard(info, fontBold, fontRegular, "Término", fim);
            adicionarInfoCard(info, fontBold, fontRegular, "Status",
                    roteiro.getStatusRoteiro() != null ? roteiro.getStatusRoteiro() : "—");
        }

        doc.add(info);

        // ── OBSERVAÇÕES ──────────────────────────────────────────────────────
        if (roteiro.getObservacoes() != null && !roteiro.getObservacoes().isBlank()) {
            Table obsBox = new Table(UnitValue.createPercentArray(new float[]{1}))
                    .setWidth(UnitValue.createPercentValue(100))
                    .setMarginBottom(24)
                    .setBorder(Border.NO_BORDER);

            Cell obsCell = new Cell()
                    .setBackgroundColor(COR_LARANJA_CLARO)
                    .setBorder(new SolidBorder(COR_LARANJA_MEDIO, 1))
                    .setBorderLeft(new SolidBorder(COR_LARANJA, 4))
                    .setPadding(12);

            obsCell.add(new Paragraph("Observações")
                    .setFont(fontBold).setFontSize(10).setFontColor(COR_LARANJA).setMarginBottom(4));
            obsCell.add(new Paragraph(roteiro.getObservacoes())
                    .setFont(fontRegular).setFontSize(10).setFontColor(COR_CINZA_ESCURO));

            obsBox.addCell(obsCell);
            doc.add(obsBox);
        }

        // ── LOCAIS POR DIA ───────────────────────────────────────────────────
        if (locais != null && !locais.isEmpty()) {
            Map<Integer, List<RoteiroLocalDTO>> porDia = locais.stream()
                    .filter(l -> l.getDia() != null)
                    .collect(Collectors.groupingBy(RoteiroLocalDTO::getDia, TreeMap::new, Collectors.toList()));

            List<RoteiroLocalDTO> semDia = locais.stream()
                    .filter(l -> l.getDia() == null)
                    .collect(Collectors.toList());

            for (Map.Entry<Integer, List<RoteiroLocalDTO>> entry : porDia.entrySet()) {
                renderizarDia(doc, fontBold, fontRegular, entry.getKey(), entry.getValue(), roteiro);
            }
            if (!semDia.isEmpty()) {
                renderizarDia(doc, fontBold, fontRegular, null, semDia, roteiro);
            }
        } else {
            doc.add(new Paragraph("Nenhum local adicionado a este roteiro.")
                    .setFont(fontRegular).setFontSize(11)
                    .setFontColor(COR_CINZA_MEDIO)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginTop(16));
        }

        // ── RODAPÉ FIXO ──────────────────────────────────────────────────────
        doc.add(new Paragraph("Gerado pelo FlyGuide • flyguide.app")
                .setFont(fontRegular).setFontSize(9)
                .setFontColor(COR_CINZA_MEDIO)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(32).setMarginBottom(8));

        doc.close();
        return baos.toByteArray();
    }

    // ── RENDERIZAR SEÇÃO DE UM DIA ───────────────────────────────────────────
    private void renderizarDia(Document doc, PdfFont fontBold, PdfFont fontRegular,
                                Integer dia, List<RoteiroLocalDTO> locaisDoDia,
                                RoteiroDTO roteiro) {

        String tituloDia = dia != null ? "Dia " + dia : "Sem dia definido";

        if (dia != null && roteiro.getDataInicio() != null) {
            tituloDia += "   •   " + roteiro.getDataInicio().plusDays(dia - 1).format(FMT_DATA);
        }

        // Total de locais do dia
        tituloDia += "   •   " + locaisDoDia.size() + (locaisDoDia.size() == 1 ? " local" : " locais");

        Table diaHeader = new Table(UnitValue.createPercentArray(new float[]{1}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(8)
                .setBorder(Border.NO_BORDER)
                .setKeepTogether(true);

        diaHeader.addCell(new Cell()
                .setBackgroundColor(COR_CINZA_ESCURO)
                .setBorder(Border.NO_BORDER)
                .setPaddingTop(10).setPaddingBottom(10).setPaddingLeft(16).setPaddingRight(16)
                .add(new Paragraph(tituloDia)
                        .setFont(fontBold).setFontSize(11).setFontColor(COR_BRANCO)));

        doc.add(diaHeader);

        List<RoteiroLocalDTO> ordenados = locaisDoDia.stream()
                .sorted((a, b) -> {
                    if (a.getOrdem() == null && b.getOrdem() == null) return 0;
                    if (a.getOrdem() == null) return 1;
                    if (b.getOrdem() == null) return -1;
                    return a.getOrdem().compareTo(b.getOrdem());
                })
                .collect(Collectors.toList());

        for (int i = 0; i < ordenados.size(); i++) {
            RoteiroLocalDTO local = ordenados.get(i);
            boolean ultimo = (i == ordenados.size() - 1);

            Table card = new Table(UnitValue.createPercentArray(new float[]{0.08f, 0.92f}))
                    .setWidth(UnitValue.createPercentValue(100))
                    .setMarginBottom(ultimo ? 20 : 2)
                    .setBorder(Border.NO_BORDER)
                    .setKeepTogether(true);

            String horarioStr = local.getHorario() != null
                    ? local.getHorario().format(FMT_HORARIO)
                    : (local.getOrdem() != null ? String.format("%02d", local.getOrdem()) : "•");

            Cell colEsq = new Cell()
                    .setBackgroundColor(COR_LARANJA_CLARO)
                    .setBorder(Border.NO_BORDER)
                    .setBorderLeft(new SolidBorder(COR_LARANJA, 3))
                    .setPadding(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .add(new Paragraph(horarioStr)
                            .setFont(fontBold).setFontSize(9).setFontColor(COR_LARANJA));

            Cell colDir = new Cell()
                    .setBackgroundColor(COR_CINZA_CLARO)
                    .setBorder(Border.NO_BORDER)
                    .setPaddingTop(10).setPaddingBottom(10).setPaddingLeft(14).setPaddingRight(14);

            // Nome do local
            colDir.add(new Paragraph(local.getNome() != null ? local.getNome() : "Local sem nome")
                    .setFont(fontBold).setFontSize(11).setFontColor(COR_CINZA_ESCURO).setMarginBottom(2));

            // Endereço
            if (local.getEndereco() != null && !local.getEndereco().isBlank()) {
                colDir.add(new Paragraph(local.getEndereco())
                        .setFont(fontRegular).setFontSize(9).setFontColor(COR_CINZA_MEDIO).setMarginBottom(4));
            }

            // Badge de status
            if (local.getStatus() != null && !local.getStatus().isBlank()) {
                colDir.add(renderizarBadgeStatus(local.getStatus(), fontBold));
            }

            // Observações
            if (local.getObservacoes() != null && !local.getObservacoes().isBlank()) {
                colDir.add(new Paragraph("Obs: " + local.getObservacoes())
                        .setFont(fontRegular).setFontSize(9)
                        .setFontColor(COR_LARANJA).setMarginTop(4));
            }

            card.addCell(colEsq);
            card.addCell(colDir);
            doc.add(card);
        }
    }

    // ── BADGE DE STATUS ──────────────────────────────────────────────────────
    private Paragraph renderizarBadgeStatus(String status, PdfFont fontBold) {
        DeviceRgb corTexto;
        DeviceRgb corFundo;

        switch (status.toUpperCase()) {
            case "VISITADO"  -> { corTexto = COR_VERDE;    corFundo = COR_VERDE_CLARO;    }
            case "CANCELADO" -> { corTexto = COR_VERMELHO; corFundo = COR_VERMELHO_CLARO; }
            default          -> { corTexto = COR_LARANJA;  corFundo = COR_LARANJA_CLARO;  }
        }

        return new Paragraph(status.toUpperCase())
                .setFont(fontBold)
                .setFontSize(8)
                .setFontColor(corTexto)
                .setBackgroundColor(corFundo)
                .setPaddingTop(2).setPaddingBottom(2)
                .setPaddingLeft(6).setPaddingRight(6)
                .setMarginBottom(0);
    }

    // ── CARD DE INFORMAÇÃO ───────────────────────────────────────────────────
    private void adicionarInfoCard(Table table, PdfFont fontBold, PdfFont fontRegular,
                                   String label, String valor) {
        Cell cell = new Cell()
                .setBackgroundColor(COR_CINZA_CLARO)
                .setBorder(Border.NO_BORDER)
                .setBorderTop(new SolidBorder(COR_LARANJA, 3))
                .setPadding(12).setMargin(4);

        cell.add(new Paragraph(label)
                .setFont(fontBold).setFontSize(9).setFontColor(COR_CINZA_MEDIO).setMarginBottom(4));
        cell.add(new Paragraph(valor != null ? valor : "—")
                .setFont(fontBold).setFontSize(13).setFontColor(COR_CINZA_ESCURO));

        table.addCell(cell);
    }

    // ── HANDLER DE NÚMERO DE PÁGINA ──────────────────────────────────────────
    private static class NumeroPaginaHandler implements IEventHandler {

        @Override
        public void handleEvent(Event event) {
            PdfDocumentEvent docEvent = (PdfDocumentEvent) event;
            PdfDocument pdfDoc = docEvent.getDocument();
            PdfPage page = docEvent.getPage();
            int numeroPagina = pdfDoc.getPageNumber(page);

            Rectangle pageSize = page.getPageSize();
            PdfCanvas canvas = new PdfCanvas(page);

            try {
                PdfFont font = PdfFontFactory.createFont(StandardFonts.HELVETICA);
                String texto = "Página " + numeroPagina;
                float largura = font.getWidth(texto, 9);
                float x = (pageSize.getWidth() - largura) / 2;
                float y = 18;

                canvas.beginText()
                        .setFontAndSize(font, 9)
                        .setColor(new DeviceRgb(107, 114, 128), true)
                        .moveText(x, y)
                        .showText(texto)
                        .endText();
            } catch (IOException e) {
                // ignora silenciosamente
            } finally {
                canvas.release();
            }
        }
    }
}

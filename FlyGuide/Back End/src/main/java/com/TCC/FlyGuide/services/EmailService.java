package com.TCC.FlyGuide.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private static final URI BREVO_EMAIL_URI = URI.create("https://api.brevo.com/v3/smtp/email");

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.from:flyguideltda@gmail.com}")
    private String remetente;

    @Value("${spring.mail.username:NAO_CONFIGURADO}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${spring.mail.host:NAO_CONFIGURADO}")
    private String mailHost;

    @Value("${spring.mail.port:0}")
    private int mailPort;

    @Value("${brevo.api.key:}")
    private String brevoApiKey;

    @Value("${brevo.sender.email:${spring.mail.from:flyguideltda@gmail.com}}")
    private String brevoSenderEmail;

    @Value("${brevo.sender.name:FlyGuide}")
    private String brevoSenderName;

    private boolean usarBrevo() {
        return brevoApiKey != null && !brevoApiKey.isBlank();
    }

    private void validarSmtp() {
        if (mailUsername == null || mailUsername.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            throw new IllegalStateException("SMTP nao configurado: defina MAIL_USERNAME e MAIL_PASSWORD no ambiente");
        }
    }

    private void enviarEmail(String destinatario, String assunto, String texto, String html) {
        if (usarBrevo()) {
            enviarViaBrevo(destinatario, assunto, texto, html);
        } else {
            enviarViaSmtp(destinatario, assunto, texto, html);
        }
    }

    private void enviarViaBrevo(String destinatario, String assunto, String texto, String html) {
        logger.info("[EMAIL] Enviando via Brevo API | De: {} | Para: {}", brevoSenderEmail, destinatario);

        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "sender", Map.of(
                            "name", brevoSenderName,
                            "email", brevoSenderEmail
                    ),
                    "to", List.of(Map.of("email", destinatario)),
                    "subject", assunto,
                    "htmlContent", html,
                    "textContent", texto
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(BREVO_EMAIL_URI)
                    .timeout(Duration.ofSeconds(20))
                    .header("accept", "application/json")
                    .header("api-key", brevoApiKey)
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                logger.error("[EMAIL] Brevo API retornou status {} para {} | Body: {}",
                        response.statusCode(), destinatario, response.body());
                throw new IllegalStateException("Falha ao enviar e-mail pela Brevo API");
            }

            logger.info("[EMAIL] E-mail enviado via Brevo API para: {}", destinatario);
        } catch (IOException e) {
            logger.error("[EMAIL] Falha de comunicacao com Brevo API para: {} | Erro: {}",
                    destinatario, e.getMessage());
            throw new RuntimeException(e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    private void enviarViaSmtp(String destinatario, String assunto, String texto, String html) {
        validarSmtp();
        logger.info("[EMAIL] Enviando via SMTP | De: {} | Para: {} | Host: {}:{} | User: {}",
                remetente, destinatario, mailHost, mailPort, mailUsername);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(remetente);
            helper.setTo(destinatario);
            helper.setSubject(assunto);
            helper.setText(texto, html);
            mailSender.send(message);
            logger.info("[EMAIL] E-mail enviado via SMTP para: {}", destinatario);
        } catch (Exception e) {
            logger.error("[EMAIL] Falha ao enviar via SMTP para: {} | Erro: {} | Causa: {}",
                    destinatario, e.getMessage(), e.getCause() != null ? e.getCause().getMessage() : "sem causa");
            throw new RuntimeException(e);
        }
    }

    public void enviarOtpResetSenha(String destinatario, String codigo) {
        String motivo = "Recuperacao de senha";
        String avisoSeguranca = "Se voce nao solicitou a redefinicao de senha, ignore este e-mail.";

        enviarEmail(
                destinatario,
                "FlyGuide - Recuperacao de Senha",
                construirTextoOtp(motivo, codigo, avisoSeguranca),
                construirHtmlOtp(motivo, codigo, avisoSeguranca)
        );
    }

    public void enviarOtpLogin(String destinatario, String codigo) {
        String motivo = "Codigo de acesso ao FlyGuide";
        String avisoSeguranca = "Se voce nao tentou fazer login, ignore este e-mail.";

        enviarEmail(
                destinatario,
                "FlyGuide - Codigo de Acesso",
                construirTextoOtp(motivo, codigo, avisoSeguranca),
                construirHtmlOtp(motivo, codigo, avisoSeguranca)
        );
    }

    private String construirTextoOtp(String motivo, String codigo, String avisoSeguranca) {
        return "Ola!\n\n" +
                "Motivo do envio do token: " + motivo + "\n\n" +
                "Seu token de verificacao e: " + codigo + "\n\n" +
                "Seu token ira expirar em 10 minutos.\n\n" +
                avisoSeguranca + "\n\n" +
                "Equipe FlyGuide";
    }

    private String construirHtmlOtp(String motivo, String codigo, String avisoSeguranca) {
        return """
                <!doctype html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <title>FlyGuide</title>
                </head>
                <body style="margin:0; padding:0; background:#eef2f7; font-family:Arial, Helvetica, sans-serif; color:#111827;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef2f7; margin:0; padding:32px 12px;">
                        <tr>
                            <td align="center">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:560px; border-collapse:separate; border-spacing:0;">
                                    <tr>
                                        <td style="height:72px; background:#050505; border-radius:36px 36px 0 0; border:4px solid #050505; border-bottom:0;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td style="background:#ffffff; border-left:4px solid #050505; border-right:4px solid #050505; padding:30px 28px 26px; text-align:center;">
                                            <p style="margin:0; font-size:15px; line-height:22px; font-weight:700; color:#050505;">
                                                Motivo do envio do token
                                            </p>
                                            <p style="margin:6px 0 0; font-size:18px; line-height:26px; font-weight:800; color:#0f172a;">
                                                {{MOTIVO}}
                                            </p>
                                            <p style="margin:42px 0 0; font-size:58px; line-height:64px; letter-spacing:8px; font-weight:900; color:#050505;">
                                                {{CODIGO}}
                                            </p>
                                            <p style="margin:38px 0 0; font-size:15px; line-height:22px; font-weight:800; color:#050505;">
                                                Seu token ira expirar em 10 minutos
                                            </p>
                                            <p style="margin:10px auto 0; max-width:420px; font-size:13px; line-height:20px; color:#475569;">
                                                {{AVISO_SEGURANCA}}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="height:76px; background-color:#ff7a1a; background-image:linear-gradient(135deg, #ff7a1a 0%, #ff8a2a 54%, #2563eb 100%); border:4px solid #050505; border-top:0; border-radius:0 0 36px 36px; text-align:center;">
                                            <p style="margin:0; padding-top:25px; font-size:14px; line-height:18px; font-weight:800; color:#ffffff;">
                                                FlyGuide
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                """
                .replace("{{MOTIVO}}", escaparHtml(motivo))
                .replace("{{CODIGO}}", escaparHtml(codigo))
                .replace("{{AVISO_SEGURANCA}}", escaparHtml(avisoSeguranca));
    }

    private String escaparHtml(String valor) {
        if (valor == null) {
            return "";
        }

        return valor
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}

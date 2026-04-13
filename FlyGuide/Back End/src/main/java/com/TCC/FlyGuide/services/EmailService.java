package com.TCC.FlyGuide.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void enviarOtpResetSenha(String destinatario, String codigo) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(destinatario);
        message.setSubject("FlyGuide - Recuperação de Senha");
        message.setText(
                "Olá!\n\n" +
                "Recebemos uma solicitação para redefinir a senha da sua conta FlyGuide.\n\n" +
                "Seu código de verificação é: " + codigo + "\n\n" +
                "Este código expira em 10 minutos.\n\n" +
                "Se você não solicitou a redefinição de senha, ignore este e-mail.\n\n" +
                "Equipe FlyGuide"
        );
        mailSender.send(message);
    }

    public void enviarOtpLogin(String destinatario, String codigo) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(destinatario);
        message.setSubject("FlyGuide - Código de Acesso");
        message.setText(
                "Olá!\n\n" +
                "Seu código de acesso ao FlyGuide é: " + codigo + "\n\n" +
                "Este código expira em 10 minutos.\n\n" +
                "Se você não tentou fazer login, ignore este e-mail.\n\n" +
                "Equipe FlyGuide"
        );
        mailSender.send(message);
    }
}
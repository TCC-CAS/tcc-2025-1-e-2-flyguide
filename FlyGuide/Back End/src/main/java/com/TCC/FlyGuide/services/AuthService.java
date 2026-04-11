package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.LoginRequestDTO;
import com.TCC.FlyGuide.DTO.LoginResponseDTO;
import com.TCC.FlyGuide.entities.PessoaFisica;
import com.TCC.FlyGuide.entities.PessoaJuridica;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.PessoaFisicaRepository;
import com.TCC.FlyGuide.repositories.PessoaJuridicaRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PessoaFisicaRepository pessoaFisicaRepository;

    @Autowired
    private PessoaJuridicaRepository pessoaJuridicaRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private OtpService otpService;

    public void login(LoginRequestDTO req) {
        String email = req.getEmail() == null ? null : req.getEmail().trim().toLowerCase();
        String senha = req.getSenha();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("login ou senha invalida"));

        if (user.getSenha() == null || senha == null) {
            throw new UnauthorizedException("login ou senha invalida");
        }

        if (!passwordEncoder.matches(senha, user.getSenha())) {
            throw new UnauthorizedException("login ou senha invalida");
        }

        otpService.gerarOtpLogin(email);
    }

    public LoginResponseDTO verificarLogin(String email, String codigo) {
        String emailNormalizado = email.trim().toLowerCase();

        otpService.validarOtpLogin(emailNormalizado, codigo);

        User user = userRepository.findByEmail(emailNormalizado)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        String nomeExibicao = "";
        String tipoPessoa = user.getTipoPessoa();
        String dataCadastro = user.getDataCadastro() != null ? user.getDataCadastro().toString() : "";

        PessoaFisica pf = pessoaFisicaRepository.findById(user.getIdUsuario()).orElse(null);
        if (pf != null) {
            String primeiro = pf.getPrimeiroNome() != null ? pf.getPrimeiroNome() : "";
            String ultimo = pf.getUltimoNome() != null ? pf.getUltimoNome() : "";
            nomeExibicao = (primeiro + " " + ultimo).trim();
        } else {
            PessoaJuridica pj = pessoaJuridicaRepository.findById(user.getIdUsuario()).orElse(null);
            if (pj != null) {
                nomeExibicao = pj.getNomeFantasia() != null && !pj.getNomeFantasia().isBlank()
                        ? pj.getNomeFantasia()
                        : pj.getRazaoSocial();
            }
        }

        return new LoginResponseDTO(
                user.getIdUsuario(),
                user.getEmail(),
                nomeExibicao,
                user.getTipoConta(),
                tipoPessoa,
                dataCadastro
        );
    }
}
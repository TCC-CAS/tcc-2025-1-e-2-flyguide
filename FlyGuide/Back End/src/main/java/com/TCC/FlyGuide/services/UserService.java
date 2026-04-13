package com.TCC.FlyGuide.services;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

import com.TCC.FlyGuide.DTO.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.TCC.FlyGuide.entities.PessoaFisica;
import com.TCC.FlyGuide.entities.PessoaJuridica;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.PessoaFisicaRepository;
import com.TCC.FlyGuide.repositories.PessoaJuridicaRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.DatabaseException;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import com.TCC.FlyGuide.DTO.AtualizarUsuarioDTO;

import jakarta.persistence.EntityNotFoundException;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PessoaFisicaRepository pessoaFisicaRepository;

    @Autowired
    private PessoaJuridicaRepository pessoaJuridicaRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional
    public User cadastrarPessoaFisica(CadastroPessoaFisicaDTO dto) {

        String email = normalizarEmail(dto.getEmail());
        String cpf = normalizarDocumento(dto.getCpf());
        String rg = normalizarRg(dto.getRg());

        validarEmail(email);

        if (userRepository.existsByEmail(email)) {
            throw new DatabaseException("E-mail já cadastrado.");
        }

        if (cpf != null && pessoaFisicaRepository.existsByCpf(cpf)) {
            throw new DatabaseException("CPF já cadastrado.");
        }

        if (rg != null) {
            validarRg(rg);
            if (pessoaFisicaRepository.existsByRg(rg)) {
                throw new DatabaseException("RG já cadastrado.");
            }
        }

        User user = new User();
        user.setTipoPessoa("PF");
        user.setEmail(email);
        validarSenhaForte(dto.getSenha());
        user.setSenha(passwordEncoder.encode(dto.getSenha()));
        user.setCep(dto.getCep());
        user.setEndereco(dto.getEndereco());
        user.setCidade(dto.getCidade());
        user.setPais(dto.getPais());
        user.setTipoConta(dto.getTipoConta());
        user.setDataCadastro(LocalDate.now());

        user = userRepository.save(user);

        PessoaFisica pf = new PessoaFisica();
        pf.setUsuario(user); // @MapsId usa o id do user
        pf.setPrimeiroNome(dto.getPrimeiroNome());
        pf.setUltimoNome(dto.getUltimoNome());
        pf.setCpf(cpf);
        pf.setRg(rg);

        pessoaFisicaRepository.save(pf);

        return user;
    }

    @Transactional
    public User cadastrarPessoaJuridica(CadastroPessoaJuridicaDTO dto) {

        String email = normalizarEmail(dto.getEmail());
        String cnpj = normalizarDocumento(dto.getCnpj());
        String ie = normalizarIe(dto.getIe());

        validarEmail(email);

        if (userRepository.existsByEmail(email)) {
            throw new DatabaseException("E-mail já cadastrado.");
        }

        if (cnpj != null && pessoaJuridicaRepository.existsByCnpj(cnpj)) {
            throw new DatabaseException("CNPJ já cadastrado.");
        }

        if (ie != null) {
            validarIe(ie);
            if (!"ISENTO".equals(ie) && pessoaJuridicaRepository.existsByIe(ie)) {
                throw new DatabaseException("Inscrição Estadual já cadastrada.");
            }
        }

        User user = new User();
        user.setTipoPessoa("PJ");
        user.setEmail(email);
        validarSenhaForte(dto.getSenha());
        user.setSenha(passwordEncoder.encode(dto.getSenha()));
        user.setCep(dto.getCep());
        user.setEndereco(dto.getEndereco());
        user.setCidade(dto.getCidade());
        user.setPais(dto.getPais());
        user.setTipoConta("TRIAL");
        user.setDataExpiracaoTrial(LocalDate.now().plusDays(30));
        user.setDataCadastro(LocalDate.now());

        user = userRepository.save(user);

        PessoaJuridica pj = new PessoaJuridica();
        pj.setUsuario(user); // @MapsId usa o id do user
        pj.setCnpj(cnpj);
        pj.setRazaoSocial(dto.getRazaoSocial());
        pj.setNomeFantasia(dto.getNomeFantasia());
        pj.setIe(ie);

        pessoaJuridicaRepository.save(pj);

        return user;
    }

    // ===== CRUD do User (Conta) =====
    public java.util.List<User> findAll() {
        return userRepository.findAll();
    }

    public User findById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException(id));
    }

    @Transactional
    public void delete(Long id) {
        try {
            if (pessoaFisicaRepository.existsById(id)) {
                pessoaFisicaRepository.deleteById(id);
            }
            if (pessoaJuridicaRepository.existsById(id)) {
                pessoaJuridicaRepository.deleteById(id);
            }
            userRepository.deleteById(id);

            userRepository.flush();

        } catch (EmptyResultDataAccessException e) {
            throw new ResourceNotFoundException(id);
        } catch (DataIntegrityViolationException e) {
            throw new DatabaseException(e.getMessage());
        }
    }

    public User update(Long id, AtualizarUsuarioDTO dto) {
        try {
            User entity = userRepository.getReferenceById(id);
            updateData(entity, dto);
            return userRepository.save(entity);
        } catch (EntityNotFoundException e) {
            throw new ResourceNotFoundException(id);
        }
    }

    private void updateData(User entity, AtualizarUsuarioDTO dto) {
        entity.setCep(dto.getCep());
        entity.setEndereco(dto.getEndereco());
        entity.setCidade(dto.getCidade());
        entity.setPais(dto.getPais());
        entity.setTipoConta(dto.getTipoConta());
    }

    private String normalizarEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private String normalizarDocumento(String doc) {
        return doc == null ? null : doc.replaceAll("\\D", "");
    }

    // Remove pontuação do RG mas preserva letras (ex: MG-12.345 → MG12345)
    private String normalizarRg(String rg) {
        return rg == null ? null : rg.replaceAll("[.\\-/ ]", "").toUpperCase();
    }

    // RG: 7 a 9 caracteres alfanuméricos
    private void validarRg(String rg) {
        if (!rg.matches("[A-Z0-9]{7,9}")) {
            throw new DatabaseException("RG inválido. Deve conter entre 7 e 9 caracteres alfanuméricos.");
        }
    }

    // IE "ISENTO" passa direto; caso contrário remove pontuação e valida 8-14 dígitos
    private String normalizarIe(String ie) {
        if (ie == null) return null;
        String upper = ie.trim().toUpperCase();
        if ("ISENTO".equals(upper)) return upper;
        return upper.replaceAll("[.\\-/ ]", "");
    }

    // IE: "ISENTO" ou 8 a 14 dígitos numéricos
    private void validarIe(String ie) {
        if ("ISENTO".equals(ie)) return;
        if (!ie.matches("\\d{8,14}")) {
            throw new DatabaseException("Inscrição Estadual inválida. Deve conter entre 8 e 14 dígitos ou ser \"ISENTO\".");
        }
    }

    public UserCompleteDTO findCompletoById(Long id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(id));

        PessoaFisica pf = pessoaFisicaRepository.findById(id).orElse(null);
        PessoaJuridica pj = pessoaJuridicaRepository.findById(id).orElse(null);

        return new UserCompleteDTO(
                pf != null ? new PessoaFisicaDTO(pf) : null,
                pj != null ? new PessoaJuridicaDTO(pj) : null,
                new UserDTO(user)
        );
    }

    @Transactional
    public void updatePF(Long idUsuario, AtualizarPessoaFisicaDTO dto) {

        User user = userRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException(idUsuario));

        if (!"PF".equalsIgnoreCase(user.getTipoPessoa())) {
            throw new DatabaseException("Este usuário não é do tipo PF.");
        }

        // tb_user (endereço)
        if (dto.getCep() != null) user.setCep(dto.getCep());
        if (dto.getEndereco() != null) user.setEndereco(dto.getEndereco());
        if (dto.getCidade() != null) user.setCidade(dto.getCidade());
        if (dto.getPais() != null) user.setPais(dto.getPais());

        userRepository.save(user);

        // tb_pessoa_fisica (nome)
        PessoaFisica pf = pessoaFisicaRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Pessoa Física não encontrada para o usuário " + idUsuario));

        if (dto.getPrimeiroNome() != null) pf.setPrimeiroNome(dto.getPrimeiroNome());
        if (dto.getUltimoNome() != null) pf.setUltimoNome(dto.getUltimoNome());

        pessoaFisicaRepository.save(pf);
    }

    @Transactional
    public void updatePJ(Long idUsuario, AtualizarPessoaJuridicaDTO dto) {

        User user = userRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException(idUsuario));

        if (!"PJ".equalsIgnoreCase(user.getTipoPessoa())) {
            throw new DatabaseException("Este usuário não é do tipo PJ.");
        }

        // tb_user (endereço)
        if (dto.getCep() != null) user.setCep(dto.getCep());
        if (dto.getEndereco() != null) user.setEndereco(dto.getEndereco());
        if (dto.getCidade() != null) user.setCidade(dto.getCidade());
        if (dto.getPais() != null) user.setPais(dto.getPais());

        userRepository.save(user);

        // tb_pessoa_juridica
        PessoaJuridica pj = pessoaJuridicaRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Pessoa Jurídica não encontrada para o usuário " + idUsuario));

        if (dto.getRazaoSocial() != null) pj.setRazaoSocial(dto.getRazaoSocial());
        if (dto.getNomeFantasia() != null) pj.setNomeFantasia(dto.getNomeFantasia());

        pessoaJuridicaRepository.save(pj);
    }

    @Transactional
    public void upgradePremium(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(id));

        if ("premium".equalsIgnoreCase(user.getTipoConta())) {
            throw new DatabaseException("Usuário já possui conta premium.");
        }

        user.setTipoConta("PREMIUM");
        userRepository.save(user);
    }

    /**
     * Retorna o status do trial gratuito de um usuário PJ.
     * Aplica expiração lazy: se os 30 dias passaram e a conta ainda está como TRIAL,
     * atualiza para FREE automaticamente neste momento.
     */
    @Transactional
    public TrialStatusDTO getTrialStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(userId));

        if (!"PJ".equalsIgnoreCase(user.getTipoPessoa())) {
            throw new DatabaseException("Trial gratuito disponível apenas para Pessoa Jurídica.");
        }

        LocalDate hoje = LocalDate.now();
        LocalDate expiracao = user.getDataExpiracaoTrial();

        if (expiracao == null) {
            return new TrialStatusDTO(false, true, 0, null, user.getTipoConta());
        }

        boolean expirado = hoje.isAfter(expiracao);
        int diasRestantes = expirado ? 0 : (int) ChronoUnit.DAYS.between(hoje, expiracao);
        boolean emTrial = "TRIAL".equalsIgnoreCase(user.getTipoConta()) && !expirado;

        // Lazy expiration: trial acabou mas conta ainda estava como TRIAL → vira FREE
        if (expirado && "TRIAL".equalsIgnoreCase(user.getTipoConta())) {
            user.setTipoConta("FREE");
            userRepository.save(user);
        }

        return new TrialStatusDTO(emTrial, expirado, diasRestantes, expiracao, user.getTipoConta());
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void expirarTrialsVencidos() {
        List<User> vencidos = userRepository
                .findByTipoContaIgnoreCaseAndDataExpiracaoTrialBefore("TRIAL", LocalDate.now());
        vencidos.forEach(u -> u.setTipoConta("FREE"));
        userRepository.saveAll(vencidos);
    }

    @Transactional
    public void downgradeFree(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(id));

        if ("free".equalsIgnoreCase(user.getTipoConta())) {
            throw new DatabaseException("Usuário já possui conta free.");
        }

        user.setTipoConta("FREE");
        userRepository.save(user);
    }


    private static final String REGEX_EMAIL = "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9\\-]{2,}(\\.[a-zA-Z0-9\\-]{2,})*\\.[a-zA-Z]{2,63}$";

    private void validarEmail(String email) {
        if (email == null || !email.matches(REGEX_EMAIL)) {
            throw new DatabaseException("E-mail inválido. Informe um endereço no formato usuario@dominio.extensao.");
        }
    }

    private static final String REGEX_SENHA_FORTE = "^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$";

    private void validarSenhaForte(String senha) {
        if (senha == null || !senha.matches(REGEX_SENHA_FORTE)) {
            throw new DatabaseException(
                    "Senha inválida. Deve ter no mínimo 8 caracteres, 1 letra maiúscula e 1 caractere especial."
            );
        }
    }
}
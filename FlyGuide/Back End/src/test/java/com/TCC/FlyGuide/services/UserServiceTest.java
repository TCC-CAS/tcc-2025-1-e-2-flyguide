package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.AtualizarPessoaFisicaDTO;
import com.TCC.FlyGuide.DTO.AtualizarPessoaJuridicaDTO;
import com.TCC.FlyGuide.DTO.CadastroPessoaFisicaDTO;
import com.TCC.FlyGuide.DTO.CadastroPessoaJuridicaDTO;
import com.TCC.FlyGuide.entities.PessoaFisica;
import com.TCC.FlyGuide.entities.PessoaJuridica;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.PessoaFisicaRepository;
import com.TCC.FlyGuide.repositories.PessoaJuridicaRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.DatabaseException;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock PessoaFisicaRepository pessoaFisicaRepository;
    @Mock PessoaJuridicaRepository pessoaJuridicaRepository;
    @Mock PasswordEncoder passwordEncoder;
    @InjectMocks UserService userService;

    private CadastroPessoaFisicaDTO dtoPfValido() {
        CadastroPessoaFisicaDTO dto = new CadastroPessoaFisicaDTO();
        dto.setEmail("joao@email.com");
        dto.setSenha("Senha@123");
        dto.setPrimeiroNome("João");
        dto.setUltimoNome("Silva");
        dto.setCpf("12345678901");
        dto.setRg("1234567");
        dto.setTipoConta("FREE");
        return dto;
    }

    private CadastroPessoaJuridicaDTO dtoPjValido() {
        CadastroPessoaJuridicaDTO dto = new CadastroPessoaJuridicaDTO();
        dto.setEmail("empresa@empresa.com");
        dto.setSenha("Senha@123");
        dto.setCnpj("12345678000190");
        dto.setRazaoSocial("Empresa Ltda");
        dto.setNomeFantasia("Empresa XYZ");
        dto.setIe("ISENTO");
        return dto;
    }

    private User userSalvo(Long id, String email) {
        User u = new User();
        u.setIdUsuario(id);
        u.setEmail(email);
        return u;
    }

    // ─── Pessoa Física ─────────────────────────────────────────────────────

    @Test
    void cadastrarPessoaFisica_dadosValidos_criaUserEPessoaFisica() {
        when(userRepository.existsByEmail("joao@email.com")).thenReturn(false);
        when(pessoaFisicaRepository.existsByCpf(any())).thenReturn(false);
        when(pessoaFisicaRepository.existsByRg(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded");
        when(userRepository.save(any())).thenReturn(userSalvo(1L, "joao@email.com"));

        User result = userService.cadastrarPessoaFisica(dtoPfValido());

        assertThat(result.getIdUsuario()).isEqualTo(1L);
        verify(pessoaFisicaRepository).save(any(PessoaFisica.class));
    }

    @Test
    void cadastrarPessoaFisica_emailDuplicado_throwsDatabaseException() {
        when(userRepository.existsByEmail("joao@email.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.cadastrarPessoaFisica(dtoPfValido()))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("E-mail");
    }

    @Test
    void cadastrarPessoaFisica_cpfDuplicado_throwsDatabaseException() {
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(pessoaFisicaRepository.existsByCpf(any())).thenReturn(true);

        assertThatThrownBy(() -> userService.cadastrarPessoaFisica(dtoPfValido()))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("CPF");
    }

    @Test
    void cadastrarPessoaFisica_rgInvalido_throwsDatabaseException() {
        CadastroPessoaFisicaDTO dto = dtoPfValido();
        dto.setRg("12");  // muito curto
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(pessoaFisicaRepository.existsByCpf(any())).thenReturn(false);

        assertThatThrownBy(() -> userService.cadastrarPessoaFisica(dto))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("RG");
    }

    @Test
    void cadastrarPessoaFisica_senhaFraca_throwsDatabaseException() {
        CadastroPessoaFisicaDTO dto = dtoPfValido();
        dto.setSenha("fraca");
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(pessoaFisicaRepository.existsByCpf(any())).thenReturn(false);
        when(pessoaFisicaRepository.existsByRg(any())).thenReturn(false);

        assertThatThrownBy(() -> userService.cadastrarPessoaFisica(dto))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("Senha");
    }

    @Test
    void cadastrarPessoaFisica_emailInvalido_throwsDatabaseException() {
        CadastroPessoaFisicaDTO dto = dtoPfValido();
        dto.setEmail("nao-e-um-email");

        assertThatThrownBy(() -> userService.cadastrarPessoaFisica(dto))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("E-mail");
    }

    // ─── Pessoa Jurídica ───────────────────────────────────────────────────

    @Test
    void cadastrarPessoaJuridica_dadosValidos_setaTrialDe30Dias() {
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(pessoaJuridicaRepository.existsByCnpj(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded");

        User savedUser = userSalvo(2L, "empresa@empresa.com");
        savedUser.setTipoConta("TRIAL");
        savedUser.setDataExpiracaoTrial(LocalDate.now().plusDays(30));
        when(userRepository.save(any())).thenReturn(savedUser);

        User result = userService.cadastrarPessoaJuridica(dtoPjValido());

        assertThat(result.getTipoConta()).isEqualTo("TRIAL");
        assertThat(result.getDataExpiracaoTrial()).isEqualTo(LocalDate.now().plusDays(30));
    }

    @Test
    void cadastrarPessoaJuridica_cnpjDuplicado_throwsDatabaseException() {
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(pessoaJuridicaRepository.existsByCnpj(any())).thenReturn(true);

        assertThatThrownBy(() -> userService.cadastrarPessoaJuridica(dtoPjValido()))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("CNPJ");
    }

    @Test
    void cadastrarPessoaJuridica_ieIsento_passaSemValidarFormato() {
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(pessoaJuridicaRepository.existsByCnpj(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded");
        when(userRepository.save(any())).thenReturn(userSalvo(2L, "empresa@empresa.com"));

        // IE = "ISENTO" não deve lançar exceção
        assertThatCode(() -> userService.cadastrarPessoaJuridica(dtoPjValido()))
                .doesNotThrowAnyException();
    }

    // ─── Upgrade / Downgrade ───────────────────────────────────────────────

    @Test
    void upgradePremium_contaFree_setaPremium() {
        User user = userSalvo(1L, "user@email.com");
        user.setTipoConta("FREE");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);

        userService.upgradePremium(1L);

        assertThat(user.getTipoConta()).isEqualTo("PREMIUM");
    }

    @Test
    void upgradePremium_contaJaPremium_throwsDatabaseException() {
        User user = userSalvo(1L, "user@email.com");
        user.setTipoConta("PREMIUM");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.upgradePremium(1L))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("premium");
    }

    @Test
    void downgradeFree_contaPremium_setaFree() {
        User user = userSalvo(1L, "user@email.com");
        user.setTipoConta("PREMIUM");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);

        userService.downgradeFree(1L);

        assertThat(user.getTipoConta()).isEqualTo("FREE");
    }

    @Test
    void downgradeFree_contaJaFree_throwsDatabaseException() {
        User user = userSalvo(1L, "user@email.com");
        user.setTipoConta("FREE");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.downgradeFree(1L))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("free");
    }

    // ─── Trial ─────────────────────────────────────────────────────────────

    @Test
    void getTrialStatus_trialExpirado_converteparaFreeERetornaExpirado() {
        User user = userSalvo(1L, "pj@empresa.com");
        user.setTipoPessoa("PJ");
        user.setTipoConta("TRIAL");
        user.setDataExpiracaoTrial(LocalDate.now().minusDays(1));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);

        var status = userService.getTrialStatus(1L);

        assertThat(status.isExpirado()).isTrue();
        assertThat(user.getTipoConta()).isEqualTo("FREE");
    }

    @Test
    void getTrialStatus_trialAtivo_retornaEmTrial() {
        User user = userSalvo(1L, "pj@empresa.com");
        user.setTipoPessoa("PJ");
        user.setTipoConta("TRIAL");
        user.setDataExpiracaoTrial(LocalDate.now().plusDays(15));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        var status = userService.getTrialStatus(1L);

        assertThat(status.isEmTrial()).isTrue();
        assertThat(status.getDiasRestantes()).isEqualTo(15);
    }

    @Test
    void getTrialStatus_usuarioPF_throwsDatabaseException() {
        User user = userSalvo(1L, "pf@email.com");
        user.setTipoPessoa("PF");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.getTrialStatus(1L))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("Pessoa Jurídica");
    }

    // ─── findById ──────────────────────────────────────────────────────────

    @Test
    void findById_usuarioNaoEncontrado_throwsResourceNotFoundException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── updatePF ──────────────────────────────────────────────────────────

    @Test
    void updatePF_usuarioNaoPF_throwsDatabaseException() {
        User user = userSalvo(1L, "pj@email.com");
        user.setTipoPessoa("PJ");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        AtualizarPessoaFisicaDTO dto = new AtualizarPessoaFisicaDTO();
        assertThatThrownBy(() -> userService.updatePF(1L, dto))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("PF");
    }

    @Test
    void updatePF_usuarioPF_atualizaNomeEEndereco() {
        User user = userSalvo(1L, "pf@email.com");
        user.setTipoPessoa("PF");
        PessoaFisica pf = new PessoaFisica();
        pf.setPrimeiroNome("João");
        pf.setUltimoNome("Silva");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(pessoaFisicaRepository.findById(1L)).thenReturn(Optional.of(pf));
        when(userRepository.save(any())).thenReturn(user);
        when(pessoaFisicaRepository.save(any())).thenReturn(pf);

        AtualizarPessoaFisicaDTO dto = new AtualizarPessoaFisicaDTO();
        dto.setPrimeiroNome("Carlos");
        dto.setCidade("São Paulo");

        userService.updatePF(1L, dto);

        assertThat(pf.getPrimeiroNome()).isEqualTo("Carlos");
        assertThat(user.getCidade()).isEqualTo("São Paulo");
    }

    // ─── updatePJ ──────────────────────────────────────────────────────────

    @Test
    void updatePJ_usuarioNaoPJ_throwsDatabaseException() {
        User user = userSalvo(1L, "pf@email.com");
        user.setTipoPessoa("PF");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        AtualizarPessoaJuridicaDTO dto = new AtualizarPessoaJuridicaDTO();
        assertThatThrownBy(() -> userService.updatePJ(1L, dto))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("PJ");
    }

    @Test
    void updatePJ_usuarioPJ_atualizaCampos() {
        User user = userSalvo(2L, "pj@empresa.com");
        user.setTipoPessoa("PJ");
        PessoaJuridica pj = new PessoaJuridica();
        pj.setRazaoSocial("Empresa Velha Ltda");

        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        when(pessoaJuridicaRepository.findById(2L)).thenReturn(Optional.of(pj));
        when(userRepository.save(any())).thenReturn(user);
        when(pessoaJuridicaRepository.save(any())).thenReturn(pj);

        AtualizarPessoaJuridicaDTO dto = new AtualizarPessoaJuridicaDTO();
        dto.setRazaoSocial("Empresa Nova Ltda");
        dto.setNomeFantasia("Nova Empresa");

        userService.updatePJ(2L, dto);

        assertThat(pj.getRazaoSocial()).isEqualTo("Empresa Nova Ltda");
        assertThat(pj.getNomeFantasia()).isEqualTo("Nova Empresa");
    }

    // ─── delete ────────────────────────────────────────────────────────────

    @Test
    void delete_usuarioPF_deletaCascataPFEUser() {
        when(pessoaFisicaRepository.existsById(1L)).thenReturn(true);
        when(pessoaJuridicaRepository.existsById(1L)).thenReturn(false);

        userService.delete(1L);

        verify(pessoaFisicaRepository).deleteById(1L);
        verify(pessoaJuridicaRepository, never()).deleteById(any());
        verify(userRepository).deleteById(1L);
    }

    // ─── expirarTrialsVencidos ─────────────────────────────────────────────

    @Test
    void expirarTrialsVencidos_converteTrialsExpiradosParaFree() {
        User user1 = userSalvo(1L, "pj1@email.com");
        user1.setTipoConta("TRIAL");
        User user2 = userSalvo(2L, "pj2@email.com");
        user2.setTipoConta("TRIAL");

        when(userRepository.findByTipoContaIgnoreCaseAndDataExpiracaoTrialBefore(
                eq("TRIAL"), any(java.time.LocalDate.class)))
                .thenReturn(List.of(user1, user2));

        userService.expirarTrialsVencidos();

        assertThat(user1.getTipoConta()).isEqualTo("FREE");
        assertThat(user2.getTipoConta()).isEqualTo("FREE");
        verify(userRepository).saveAll(anyList());
    }
}

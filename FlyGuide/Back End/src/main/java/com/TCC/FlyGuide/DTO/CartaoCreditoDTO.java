package com.TCC.FlyGuide.DTO;

/**
 * DTO para recebimento dos dados do cartão de crédito.
 *
 * ════════════════════════════════════════════════════════
 *  INTEGRAÇÃO FRONTEND — POST /assinatura/assinar/{userId}
 * ════════════════════════════════════════════════════════
 *
 * Exemplo de body JSON:
 * {
 *   "numeroCartao":  "4111 1111 1111 1111",   // com ou sem espaços/hífens
 *   "nomeTitular":   "JOAO DA SILVA",          // exatamente como está no cartão
 *   "mesExpiracao":  12,                        // número inteiro de 1 a 12
 *   "anoExpiracao":  2029,                      // número inteiro com 4 dígitos
 *   "cvv":           "123"                      // 3 dígitos (4 para Amex)
 * }
 *
 * ─── REGRAS DE VALIDAÇÃO ────────────────────────────────
 *
 *  numeroCartao
 *    • Obrigatório
 *    • Aceita espaços e hífens (são removidos antes da validação)
 *    • Deve conter entre 13 e 19 dígitos
 *    • Deve passar no algoritmo de Luhn (verificação matemática real)
 *    • Bandeiras aceitas: VISA, MASTERCARD, AMEX, ELO, HIPERCARD
 *
 *  nomeTitular
 *    • Obrigatório
 *    • Deve conter nome E sobrenome (mínimo 2 palavras)
 *    • Somente letras e espaços (acentos permitidos)
 *
 *  mesExpiracao
 *    • Obrigatório
 *    • Valor inteiro de 1 a 12
 *
 *  anoExpiracao
 *    • Obrigatório
 *    • Valor inteiro com 4 dígitos (ex: 2029)
 *    • A combinação mês/ano não pode ser anterior ao mês atual
 *
 *  cvv
 *    • Obrigatório
 *    • Somente dígitos
 *    • 3 dígitos para Visa, Mastercard, Elo e Hipercard
 *    • 4 dígitos para American Express (AMEX)
 *
 * ─── CARTÕES DE TESTE ───────────────────────────────────
 *
 *  Número                 Bandeira      Resultado
 *  4111 1111 1111 1111    VISA          ✅ Aprovado
 *  5500 0000 0000 0004    MASTERCARD    ✅ Aprovado
 *  3782 8224 6310 005     AMEX          ✅ Aprovado  (CVV: 4 dígitos)
 *  6062 8283 0000 0001    HIPERCARD     ✅ Aprovado
 *  4000 0000 0000 0002    VISA          ❌ Recusado  (simula recusa da operadora)
 *  4000 0000 0000 0069    VISA          ❌ Recusado  (simula cartão expirado pela operadora)
 *
 *  Para qualquer cartão de teste:
 *    • Validade: qualquer data futura (ex: mes=12, ano=2029)
 *    • CVV: qualquer número válido (ex: "123", ou "1234" para Amex)
 *    • Nome: qualquer nome com sobrenome (ex: "TESTE USUARIO")
 *
 * ─── RESPOSTA DE SUCESSO (HTTP 200) ─────────────────────
 * {
 *   "status":              "ACTIVE",
 *   "cartaoBandeira":      "VISA",
 *   "cartaoUltimos4":      "1111",
 *   "dataInicio":          "2026-04-19",
 *   "proximoVencimento":   "2026-05-19"
 * }
 *
 * ─── RESPOSTAS DE ERRO (HTTP 400 / 422) ─────────────────
 * {
 *   "timestamp": "...",
 *   "status": 422,
 *   "error": "...",
 *   "message": "<motivo do erro>",
 *   "path": "/assinatura/assinar/{userId}"
 * }
 *
 * Mensagens de erro possíveis:
 *   "Número de cartão inválido: deve conter entre 13 e 19 dígitos."
 *   "Número de cartão inválido."
 *   "Bandeira não reconhecida. Aceitamos: Visa, Mastercard, Amex, Elo e Hipercard."
 *   "Nome do titular é obrigatório."
 *   "Informe o nome completo do titular (nome e sobrenome)."
 *   "Nome do titular deve conter apenas letras."
 *   "Mês de expiração inválido (1–12)."
 *   "Cartão expirado."
 *   "CVV inválido: deve conter apenas números."
 *   "CVV inválido: CVV deve ter 3 dígitos."
 *   "CVV inválido: American Express utiliza CVV de 4 dígitos."
 *   "Pagamento recusado pela operadora do cartão."
 *   "Usuário já possui conta premium."
 */
public class CartaoCreditoDTO {

    private String numeroCartao;
    private String nomeTitular;
    private int mesExpiracao;
    private int anoExpiracao;
    private String cvv;

    public CartaoCreditoDTO() {}

    public String getNumeroCartao() { return numeroCartao; }
    public void setNumeroCartao(String numeroCartao) { this.numeroCartao = numeroCartao; }

    public String getNomeTitular() { return nomeTitular; }
    public void setNomeTitular(String nomeTitular) { this.nomeTitular = nomeTitular; }

    public int getMesExpiracao() { return mesExpiracao; }
    public void setMesExpiracao(int mesExpiracao) { this.mesExpiracao = mesExpiracao; }

    public int getAnoExpiracao() { return anoExpiracao; }
    public void setAnoExpiracao(int anoExpiracao) { this.anoExpiracao = anoExpiracao; }

    public String getCvv() { return cvv; }
    public void setCvv(String cvv) { this.cvv = cvv; }
}
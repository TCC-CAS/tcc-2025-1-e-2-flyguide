package com.TCC.FlyGuide.DTO;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Payload recebido pelo webhook do Asaas.
 * Eventos tratados: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class AsaasWebhookDTO {

    private String event;
    private AsaasPaymentDTO payment;

    public String getEvent() {
        return event;
    }

    public void setEvent(String event) {
        this.event = event;
    }

    public AsaasPaymentDTO getPayment() {
        return payment;
    }

    public void setPayment(AsaasPaymentDTO payment) {
        this.payment = payment;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AsaasPaymentDTO {

        private String id;

        /**
         * ID da assinatura no Asaas (ex: sub_xxxxxxxxxxxx).
         * Presente apenas em pagamentos gerados por uma assinatura recorrente.
         */
        private String subscription;

        private String status;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getSubscription() {
            return subscription;
        }

        public void setSubscription(String subscription) {
            this.subscription = subscription;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }
}

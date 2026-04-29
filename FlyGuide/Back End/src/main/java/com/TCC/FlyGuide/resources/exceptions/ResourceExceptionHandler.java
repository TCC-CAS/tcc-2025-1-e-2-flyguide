package com.TCC.FlyGuide.resources.exceptions;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpClientErrorException;

import com.TCC.FlyGuide.services.exceptions.DatabaseException;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class ResourceExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<StandardError> resourceNotFound(ResourceNotFoundException e, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "Recurso não encontrado", e.getMessage(), request);
    }

    @ExceptionHandler(DatabaseException.class)
    public ResponseEntity<StandardError> database(DatabaseException e, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Erro de validação", e.getMessage(), request);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<StandardError> unauthorized(UnauthorizedException e, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, "Não autorizado", e.getMessage(), request);
    }

    /**
     * Captura erros HTTP retornados pela API do Asaas (ex: CPF inválido, cliente já existente).
     * Evita que o stack trace do Asaas vaze para o cliente.
     */
    @ExceptionHandler(HttpClientErrorException.class)
    public ResponseEntity<StandardError> asaasClientError(HttpClientErrorException e, HttpServletRequest request) {
        return build(HttpStatus.BAD_GATEWAY, "Erro ao se comunicar com o serviço de pagamento",
                "Asaas: " + e.getStatusText(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<StandardError> generic(Exception e, HttpServletRequest request) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno do servidor", e.getMessage(), request);
    }

    private ResponseEntity<StandardError> build(HttpStatus status, String error, String message,
                                                 HttpServletRequest request) {
        StandardError err = new StandardError(
                Instant.now(),
                status.value(),
                error,
                message,
                request.getRequestURI()
        );
        return ResponseEntity.status(status).body(err);
    }
}

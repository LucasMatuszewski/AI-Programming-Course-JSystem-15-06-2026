package com.jsystems.bestservice.common.api;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
class GlobalApiExceptionHandler {

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiErrorResponse> handleApiException(ApiException exception, HttpServletRequest request) {
        return errorResponse(
                exception.status(),
                exception.code(),
                exception.messagePl(),
                exception.fieldErrors(),
                request
        );
    }

    @ExceptionHandler({BindException.class, MethodArgumentNotValidException.class})
    ResponseEntity<ApiErrorResponse> handleValidationException(Exception exception, HttpServletRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        if (exception instanceof BindException bindException) {
            for (FieldError fieldError : bindException.getFieldErrors()) {
                fieldErrors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
            }
        } else if (exception instanceof MethodArgumentNotValidException methodArgumentNotValidException) {
            for (FieldError fieldError : methodArgumentNotValidException.getFieldErrors()) {
                fieldErrors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
            }
        }
        return errorResponse(
                HttpStatus.BAD_REQUEST,
                ApiErrorCode.VALIDATION_FAILED,
                "Popraw błędy w formularzu.",
                fieldErrors,
                request
        );
    }

    @ExceptionHandler({
            MissingServletRequestPartException.class,
            MissingServletRequestParameterException.class
    })
    ResponseEntity<ApiErrorResponse> handleMissingRequestPart(Exception exception, HttpServletRequest request) {
        return errorResponse(
                HttpStatus.BAD_REQUEST,
                ApiErrorCode.VALIDATION_FAILED,
                "Popraw błędy w formularzu.",
                Map.of("image", "Dodaj jedno zdjęcie produktu."),
                request
        );
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiErrorResponse> handleMaxUploadSizeExceeded(
            MaxUploadSizeExceededException exception,
            HttpServletRequest request
    ) {
        return errorResponse(
                HttpStatus.PAYLOAD_TOO_LARGE,
                ApiErrorCode.IMAGE_TOO_LARGE,
                "Plik jest za duży. Dodaj mniejsze zdjęcie.",
                Map.of(),
                request
        );
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiErrorResponse> handleMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException exception,
            HttpServletRequest request
    ) {
        return errorResponse(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                ApiErrorCode.UNSUPPORTED_IMAGE_TYPE,
                "Dozwolone są tylko pliki JPG, PNG albo WebP.",
                Map.of(),
                request
        );
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorResponse> handleUnexpected(Exception exception, HttpServletRequest request) {
        return errorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                ApiErrorCode.INTERNAL_ERROR,
                "Wystąpił nieoczekiwany błąd.",
                Map.of(),
                request
        );
    }

    private ResponseEntity<ApiErrorResponse> errorResponse(
            HttpStatus status,
            ApiErrorCode code,
            String messagePl,
            Map<String, String> fieldErrors,
            HttpServletRequest request
    ) {
        String traceId = currentTraceId(request);
        ApiErrorResponse response = new ApiErrorResponse(code.name(), messagePl, fieldErrors, traceId);
        return ResponseEntity.status(status).body(response);
    }

    private String currentTraceId(HttpServletRequest request) {
        Object existingTraceId = request.getAttribute("traceId");
        if (existingTraceId instanceof String traceId && !traceId.isBlank()) {
            return traceId;
        }
        return UUID.randomUUID().toString();
    }
}

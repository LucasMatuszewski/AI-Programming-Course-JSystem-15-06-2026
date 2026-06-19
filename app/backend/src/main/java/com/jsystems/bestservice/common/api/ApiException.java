package com.jsystems.bestservice.common.api;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class ApiException extends RuntimeException {

    private final ApiErrorCode code;
    private final HttpStatus status;
    private final String messagePl;
    private final Map<String, String> fieldErrors;

    public ApiException(ApiErrorCode code, HttpStatus status, String messagePl) {
        this(code, status, messagePl, Map.of());
    }

    public ApiException(
            ApiErrorCode code,
            HttpStatus status,
            String messagePl,
            Map<String, String> fieldErrors
    ) {
        super(messagePl);
        this.code = code;
        this.status = status;
        this.messagePl = messagePl;
        this.fieldErrors = Map.copyOf(fieldErrors);
    }

    public ApiErrorCode code() {
        return code;
    }

    public HttpStatus status() {
        return status;
    }

    public String messagePl() {
        return messagePl;
    }

    public Map<String, String> fieldErrors() {
        return fieldErrors;
    }
}

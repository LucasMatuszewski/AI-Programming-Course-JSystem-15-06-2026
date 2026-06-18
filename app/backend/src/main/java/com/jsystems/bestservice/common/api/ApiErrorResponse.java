package com.jsystems.bestservice.common.api;

import java.util.Map;

public record ApiErrorResponse(
        String code,
        String messagePl,
        Map<String, String> fieldErrors,
        String traceId
) {
}

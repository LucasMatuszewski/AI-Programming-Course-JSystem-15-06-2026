package com.jsystems.bestservice.caseintake.api;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
class SessionController {

    private final SessionService sessionService;

    SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    SessionResponse createSession(@Valid @ModelAttribute CreateSessionRequest request) {
        return sessionService.createSession(request);
    }

    @PostMapping(path = "/{sessionId}/image-attempts", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    SessionResponse createImageAttempt(
            @PathVariable UUID sessionId,
            @RequestPart("image") MultipartFile image
    ) {
        return sessionService.createImageAttempt(sessionId, image);
    }

    @GetMapping("/{sessionId}")
    SessionResponse getSession(@PathVariable UUID sessionId) {
        return sessionService.getSession(sessionId);
    }
}

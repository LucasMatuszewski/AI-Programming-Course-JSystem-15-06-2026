package com.jsystems.bestservice.chat.api;

import com.jsystems.bestservice.caseintake.api.SessionResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/chat/messages")
class ChatController {

    private final ChatService chatService;

    ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    SessionResponse createMessage(
            @PathVariable UUID sessionId,
            @Valid @RequestBody CreateChatMessageRequest request
    ) {
        return chatService.createMessage(sessionId, request);
    }
}

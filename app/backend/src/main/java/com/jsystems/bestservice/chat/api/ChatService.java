package com.jsystems.bestservice.chat.api;

import com.jsystems.bestservice.caseintake.api.SessionResponse;
import com.jsystems.bestservice.common.api.ApiErrorCode;
import com.jsystems.bestservice.common.api.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
class ChatService {

    SessionResponse createMessage(UUID sessionId, CreateChatMessageRequest request) {
        throw new ApiException(
                ApiErrorCode.SESSION_NOT_FOUND,
                HttpStatus.NOT_FOUND,
                "Nie znaleziono zgłoszenia."
        );
    }
}

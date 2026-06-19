package com.jsystems.bestservice.chat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateChatMessageRequest(
        @NotBlank(message = "Wpisz treść wiadomości.")
        @Size(max = 4000, message = "Wiadomość może mieć maksymalnie 4000 znaków.")
        String contentPl
) {
}

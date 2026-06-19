package com.jsystems.bestservice.chat.api;

import com.jsystems.bestservice.caseintake.api.SessionResponse;
import com.jsystems.bestservice.caseintake.api.SessionResponseMapper;
import com.jsystems.bestservice.common.api.ApiErrorCode;
import com.jsystems.bestservice.common.api.ApiException;
import com.jsystems.bestservice.persistence.ChatMessage;
import com.jsystems.bestservice.persistence.ChatRole;
import com.jsystems.bestservice.persistence.DecisionRecord;
import com.jsystems.bestservice.persistence.DecisionStatus;
import com.jsystems.bestservice.persistence.EquipmentCategory;
import com.jsystems.bestservice.persistence.MessageType;
import com.jsystems.bestservice.persistence.RejectionType;
import com.jsystems.bestservice.persistence.RequestType;
import com.jsystems.bestservice.persistence.ServiceSession;
import com.jsystems.bestservice.persistence.ServiceSessionRepository;
import com.jsystems.bestservice.persistence.TerminalState;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChatServiceTests {

    @Test
    void customerAndSystemMessagesPersistWithSequenceNumbers() {
        ServiceSession session = decidedReturnSession();
        ChatService chatService = chatService(session);

        SessionResponse response = chatService.createMessage(
                session.getId(),
                new CreateChatMessageRequest("Czy mogę doprecyzować szczegóły zwrotu?")
        );

        assertThat(response.messages()).extracting("sequenceNumber").containsExactly(1, 2, 3);
        assertThat(response.messages()).extracting("role").containsExactly("SYSTEM", "CUSTOMER", "SYSTEM");
        assertThat(response.messages().get(2).contentPl()).contains("Dziękuję za wiadomość");
    }

    @Test
    void relevantNewFactsCreateDecisionVersionTwoAndRecordPreviousDecision() {
        ServiceSession session = decidedReturnSession();
        DecisionRecord initialDecision = session.getDecisionRecords().getFirst();
        ChatService chatService = chatService(session);

        SessionResponse response = chatService.createMessage(
                session.getId(),
                new CreateChatMessageRequest("Produkt nie był używany, ślady są tylko na folii ochronnej.")
        );

        DecisionRecord updatedDecision = session.getDecisionRecords().getLast();
        assertThat(response.latestDecision().version()).isEqualTo(2);
        assertThat(response.latestDecision().status()).isEqualTo("approved");
        assertThat(response.latestDecision().ruleCategory()).isEqualTo("chat.relevant_return_explanation");
        assertThat(updatedDecision.getPreviousDecisionId()).isEqualTo(initialDecision.getId());
        assertThat(response.messages().getLast().messageType()).isEqualTo("DECISION_UPDATE");
        assertThat(response.messages().getLast().contentPl()).contains("Poprzednia decyzja", "Nowa decyzja");
    }

    @Test
    void unresolvedDisagreementMarksHumanVerificationRequired() {
        ServiceSession session = decidedReturnSession();
        ChatService chatService = chatService(session);

        SessionResponse response = chatService.createMessage(
                session.getId(),
                new CreateChatMessageRequest("Nie zgadzam się z decyzją i chcę odwołania.")
        );

        assertThat(response.terminalState()).isEqualTo("HUMAN_VERIFICATION_REQUIRED");
        assertThat(response.latestDecision().status()).isEqualTo("human_verification_required");
        assertThat(response.latestDecision().ruleCategory()).isEqualTo("chat.unresolved_disagreement");
        assertThat(response.messages().getLast().contentPl()).contains("pracownika");
    }

    @Test
    void offTopicMessageCreatesPolishRefusalAndDoesNotChangeDecision() {
        ServiceSession session = decidedReturnSession();
        ChatService chatService = chatService(session);

        SessionResponse response = chatService.createMessage(
                session.getId(),
                new CreateChatMessageRequest("Jaka będzie jutro pogoda i kurs bitcoina?")
        );

        assertThat(response.latestDecision().version()).isEqualTo(1);
        assertThat(session.getDecisionRecords()).hasSize(1);
        assertThat(response.messages().getLast().contentPl()).contains("Mogę pomóc tylko");
    }

    @Test
    void unknownSessionReturnsSessionNotFound() {
        ChatService chatService = chatService(null);

        assertThatThrownBy(() -> chatService.createMessage(
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                new CreateChatMessageRequest("Dzień dobry.")
        ))
                .isInstanceOf(ApiException.class)
                .extracting(error -> ((ApiException) error).code())
                .isEqualTo(ApiErrorCode.SESSION_NOT_FOUND);
    }

    @Test
    void invalidTerminalStateReturnsSessionStateConflict() {
        ServiceSession session = decidedReturnSession();
        session.markClosed(TerminalState.IN_PERSON_VERIFICATION_REQUIRED);
        ChatService chatService = chatService(session);

        assertThatThrownBy(() -> chatService.createMessage(
                session.getId(),
                new CreateChatMessageRequest("Czy mogę coś dodać?")
        ))
                .isInstanceOf(ApiException.class)
                .extracting(error -> ((ApiException) error).code())
                .isEqualTo(ApiErrorCode.SESSION_STATE_CONFLICT);
    }

    private static ChatService chatService(ServiceSession session) {
        ServiceSessionRepository sessionRepository = mock(ServiceSessionRepository.class);
        when(sessionRepository.findById(any())).thenReturn(Optional.ofNullable(session));
        when(sessionRepository.save(any(ServiceSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        return new ChatService(sessionRepository, new SessionResponseMapper());
    }

    private static ServiceSession decidedReturnSession() {
        ServiceSession session = ServiceSession.create(
                UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                RequestType.RETURN,
                EquipmentCategory.LAPTOP,
                "ThinkPad T14",
                LocalDate.of(2026, 6, 1),
                ""
        );
        DecisionRecord decision = DecisionRecord.create(
                session,
                1,
                DecisionStatus.REJECTED,
                RejectionType.SIGNS_OF_USE,
                "Widoczne są ślady użycia produktu.",
                "Produkt nosi ślady użycia wykraczające poza podstawowe sprawdzenie.",
                "Jeśli ślady wynikają z transportu lub pomyłki, opisz to w czacie.",
                "return.signs_of_use",
                null
        );
        ChatMessage.create(
                session,
                ChatRole.SYSTEM,
                "Dzień dobry. Decyzja: rejected. Uzasadnienie: " + decision.getJustificationPl(),
                1,
                MessageType.INITIAL_DECISION
        );
        session.markDecided(TerminalState.REJECTED);
        return session;
    }
}

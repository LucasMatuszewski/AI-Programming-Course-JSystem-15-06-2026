package com.jsystems.bestservice.chat.api;

import com.jsystems.bestservice.caseintake.api.SessionResponse;
import com.jsystems.bestservice.caseintake.api.SessionResponseMapper;
import com.jsystems.bestservice.common.api.ApiErrorCode;
import com.jsystems.bestservice.common.api.ApiException;
import com.jsystems.bestservice.persistence.ChatMessage;
import com.jsystems.bestservice.persistence.ChatRole;
import com.jsystems.bestservice.persistence.DecisionRecord;
import com.jsystems.bestservice.persistence.DecisionStatus;
import com.jsystems.bestservice.persistence.MessageType;
import com.jsystems.bestservice.persistence.RejectionType;
import com.jsystems.bestservice.persistence.RequestType;
import com.jsystems.bestservice.persistence.ServiceSession;
import com.jsystems.bestservice.persistence.ServiceSessionRepository;
import com.jsystems.bestservice.persistence.SessionStatus;
import com.jsystems.bestservice.persistence.TerminalState;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.Locale;
import java.util.UUID;

@Service
class ChatService {

    private static final String DECISION_MODEL = "backend-chat-rules-v1";
    private static final String DECISION_PROMPT_VERSION = "chat-follow-up-rules-v1";

    private final ServiceSessionRepository sessionRepository;
    private final SessionResponseMapper responseMapper;

    ChatService(ServiceSessionRepository sessionRepository, SessionResponseMapper responseMapper) {
        this.sessionRepository = sessionRepository;
        this.responseMapper = responseMapper;
    }

    @Transactional
    SessionResponse createMessage(UUID sessionId, CreateChatMessageRequest request) {
        ServiceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ApiException(
                        ApiErrorCode.SESSION_NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Nie znaleziono zgłoszenia."
                ));
        ensureChatAllowed(session);

        String content = request.contentPl().trim();
        int customerSequence = nextSequence(session);
        ChatMessage.create(session, ChatRole.CUSTOMER, content, customerSequence, MessageType.FOLLOW_UP);

        DecisionRecord latestDecision = latestDecision(session);
        ChatOutcome outcome = decideOutcome(session, latestDecision, content);
        ChatMessage.create(
                session,
                ChatRole.SYSTEM,
                outcome.systemMessagePl(),
                customerSequence + 1,
                outcome.messageType()
        );

        ServiceSession saved = sessionRepository.save(session);
        return responseMapper.toResponse(saved);
    }

    private void ensureChatAllowed(ServiceSession session) {
        if (session.getStatus() != SessionStatus.DECIDED) {
            throw new ApiException(
                    ApiErrorCode.SESSION_STATE_CONFLICT,
                    HttpStatus.CONFLICT,
                    "Nie można wykonać tej operacji dla aktualnego stanu zgłoszenia."
            );
        }
    }

    private ChatOutcome decideOutcome(ServiceSession session, DecisionRecord latestDecision, String content) {
        String normalized = normalize(content);

        if (isOffTopicOrAbusive(normalized)) {
            return new ChatOutcome(
                    "Mogę pomóc tylko w sprawie tego zgłoszenia. Opisz proszę informacje dotyczące sprzętu, zdjęcia, reklamacji albo zwrotu.",
                    MessageType.FOLLOW_UP
            );
        }

        if (hasRelevantNewFacts(normalized)) {
            DecisionRecord updatedDecision = createRelevantDecisionUpdate(session, latestDecision, normalized);
            session.markDecided(toTerminalState(updatedDecision));
            return new ChatOutcome(decisionUpdateMessage(latestDecision, updatedDecision), MessageType.DECISION_UPDATE);
        }

        if (isExplicitDisagreement(normalized)) {
            DecisionRecord updatedDecision = DecisionRecord.create(
                    session,
                    nextDecisionVersion(latestDecision),
                    DecisionStatus.HUMAN_VERIFICATION_REQUIRED,
                    null,
                    null,
                    "Nie można automatycznie rozstrzygnąć sprzeciwu na podstawie dostępnych informacji.",
                    "Przekazujemy sprawę do weryfikacji przez pracownika.",
                    "chat.unresolved_disagreement",
                    latestDecision == null ? null : latestDecision.getId(),
                    DECISION_MODEL,
                    DECISION_PROMPT_VERSION
            );
            session.markDecided(TerminalState.HUMAN_VERIFICATION_REQUIRED);
            return new ChatOutcome(decisionUpdateMessage(latestDecision, updatedDecision), MessageType.DECISION_UPDATE);
        }

        return new ChatOutcome(
                "Dziękuję za wiadomość. Obecna decyzja pozostaje bez zmian. Jeśli masz nowe fakty dotyczące stanu sprzętu, opisz je konkretnie w czacie.",
                MessageType.FOLLOW_UP
        );
    }

    private DecisionRecord createRelevantDecisionUpdate(
            ServiceSession session,
            DecisionRecord latestDecision,
            String normalized
    ) {
        if (session.getRequestType() == RequestType.RETURN && explainsReturnCondition(normalized)) {
            return DecisionRecord.create(
                    session,
                    nextDecisionVersion(latestDecision),
                    DecisionStatus.APPROVED,
                    null,
                    null,
                    "Decyzja została zmieniona, ponieważ klient wyjaśnił, że widoczne ślady dotyczą folii ochronnej lub transportu, a produkt nie był używany.",
                    "Przygotuj kompletny produkt do dalszej obsługi zwrotu.",
                    "chat.relevant_return_explanation",
                    latestDecision == null ? null : latestDecision.getId(),
                    DECISION_MODEL,
                    DECISION_PROMPT_VERSION
            );
        }

        return DecisionRecord.create(
                session,
                nextDecisionVersion(latestDecision),
                DecisionStatus.APPROVED,
                null,
                null,
                "Decyzja została zmieniona, ponieważ klient podał konkretne objawy usterki istotne dla reklamacji.",
                "Przygotuj sprzęt do dalszej obsługi serwisowej.",
                "chat.relevant_complaint_details",
                latestDecision == null ? null : latestDecision.getId(),
                DECISION_MODEL,
                DECISION_PROMPT_VERSION
        );
    }

    private TerminalState toTerminalState(DecisionRecord decision) {
        return switch (decision.getStatus()) {
            case APPROVED -> TerminalState.APPROVED;
            case REJECTED -> TerminalState.REJECTED;
            case HUMAN_VERIFICATION_REQUIRED -> TerminalState.HUMAN_VERIFICATION_REQUIRED;
        };
    }

    private String decisionUpdateMessage(DecisionRecord previousDecision, DecisionRecord updatedDecision) {
        String previous = previousDecision == null
                ? "brak wcześniejszej decyzji"
                : previousDecision.getStatus().name().toLowerCase(Locale.ROOT);
        String updated = updatedDecision.getStatus().name().toLowerCase(Locale.ROOT);
        return "Poprzednia decyzja: %s. Nowa decyzja: %s. Uzasadnienie: %s Dalsze kroki: %s".formatted(
                previous,
                updated,
                updatedDecision.getJustificationPl(),
                updatedDecision.getNextStepsPl()
        );
    }

    private int nextSequence(ServiceSession session) {
        return session.getChatMessages().stream()
                .mapToInt(ChatMessage::getSequenceNumber)
                .max()
                .orElse(0) + 1;
    }

    private int nextDecisionVersion(DecisionRecord latestDecision) {
        return latestDecision == null ? 1 : latestDecision.getVersion() + 1;
    }

    private DecisionRecord latestDecision(ServiceSession session) {
        return session.getDecisionRecords().stream()
                .max(Comparator.comparingInt(DecisionRecord::getVersion))
                .orElse(null);
    }

    private boolean hasRelevantNewFacts(String normalized) {
        return explainsReturnCondition(normalized)
                || (normalized.contains("usterk") && normalized.contains("objaw"))
                || normalized.contains("nie działa")
                || normalized.contains("ekran miga");
    }

    private boolean explainsReturnCondition(String normalized) {
        return normalized.contains("folii ochronnej")
                || normalized.contains("folia ochronna")
                || normalized.contains("nie był używany")
                || normalized.contains("nie byl uzywany")
                || normalized.contains("transport");
    }

    private boolean isExplicitDisagreement(String normalized) {
        return normalized.contains("nie zgadzam")
                || normalized.contains("odwoł")
                || normalized.contains("odwol")
                || normalized.contains("sprzeciw")
                || normalized.contains("błędna decyzja")
                || normalized.contains("bledna decyzja");
    }

    private boolean isOffTopicOrAbusive(String normalized) {
        return normalized.contains("pogoda")
                || normalized.contains("bitcoin")
                || normalized.contains("kurs")
                || normalized.contains("polityk")
                || normalized.contains("obiad")
                || normalized.contains("pizza")
                || normalized.contains("idiot")
                || normalized.contains("głupi")
                || normalized.contains("glupi");
    }

    private String normalize(String content) {
        return content.toLowerCase(Locale.ROOT);
    }

    private record ChatOutcome(String systemMessagePl, MessageType messageType) {
    }
}

package com.jsystems.bestservice.caseintake.api;

import com.jsystems.bestservice.persistence.ChatMessage;
import com.jsystems.bestservice.persistence.DecisionRecord;
import com.jsystems.bestservice.persistence.ServiceSession;
import com.jsystems.bestservice.persistence.SessionStatus;
import com.jsystems.bestservice.persistence.UploadedImage;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Component
public class SessionResponseMapper {

    private static final int MAX_IMAGE_ATTEMPTS = 3;

    public SessionResponse toResponse(ServiceSession session) {
        DecisionRecord latestDecision = latestDecision(session);

        return new SessionResponse(
                session.getId(),
                session.getRequestType().name().toLowerCase(Locale.ROOT),
                session.getStatus().name(),
                session.getTerminalState() == null ? null : session.getTerminalState().name(),
                session.getImageAttemptCount(),
                Math.max(0, MAX_IMAGE_ATTEMPTS - session.getImageAttemptCount()),
                latestDecision == null ? null : toDecisionResponse(latestDecision),
                retryResponse(session),
                session.getChatMessages().stream()
                        .sorted(Comparator.comparingInt(ChatMessage::getSequenceNumber))
                        .map(this::toChatMessageResponse)
                        .toList()
        );
    }

    private DecisionRecord latestDecision(ServiceSession session) {
        return session.getDecisionRecords().stream()
                .max(Comparator.comparingInt(DecisionRecord::getVersion))
                .orElse(null);
    }

    private DecisionResponse toDecisionResponse(DecisionRecord decision) {
        return new DecisionResponse(
                decision.getStatus().name().toLowerCase(Locale.ROOT),
                decision.getRejectionType() == null
                        ? null
                        : decision.getRejectionType().name().toLowerCase(Locale.ROOT),
                decision.getRejectionReasonPl(),
                decision.getJustificationPl(),
                decision.getNextStepsPl(),
                decision.getRuleCategory(),
                decision.getVersion()
        );
    }

    private ImageRetryResponse retryResponse(ServiceSession session) {
        if (session.getStatus() != SessionStatus.IMAGE_RETRY_REQUIRED) {
            return null;
        }
        String reason = session.getUploadedImages().stream()
                .max(Comparator.comparingInt(UploadedImage::getAttemptNumber))
                .map(UploadedImage::getRetryReasonPl)
                .orElse("Zdjęcie nie pozwala ocenić stanu sprzętu.");
        return new ImageRetryResponse(reason, Math.max(0, MAX_IMAGE_ATTEMPTS - session.getImageAttemptCount()));
    }

    private ChatMessageResponse toChatMessageResponse(ChatMessage message) {
        return new ChatMessageResponse(
                message.getId(),
                message.getRole().name(),
                message.getContentPl(),
                message.getSequenceNumber(),
                message.getMessageType().name(),
                message.getCreatedAt()
        );
    }
}

package com.jsystems.bestservice.caseintake;

import com.jsystems.bestservice.ai.ImageAnalysisAiClient;
import com.jsystems.bestservice.caseintake.api.ChatMessageResponse;
import com.jsystems.bestservice.caseintake.api.DecisionResponse;
import com.jsystems.bestservice.caseintake.api.ImageRetryResponse;
import com.jsystems.bestservice.caseintake.api.SessionResponse;
import com.jsystems.bestservice.common.api.ApiErrorCode;
import com.jsystems.bestservice.common.api.ApiException;
import com.jsystems.bestservice.decision.DecisionInput;
import com.jsystems.bestservice.decision.DecisionResult;
import com.jsystems.bestservice.decision.DecisionRuleService;
import com.jsystems.bestservice.decision.ImageObservations;
import com.jsystems.bestservice.imageanalysis.ImageAnalysisResult;
import com.jsystems.bestservice.persistence.ChatMessage;
import com.jsystems.bestservice.persistence.ChatRole;
import com.jsystems.bestservice.persistence.DecisionRecord;
import com.jsystems.bestservice.persistence.ImageAnalysis;
import com.jsystems.bestservice.persistence.MessageType;
import com.jsystems.bestservice.persistence.ServiceSession;
import com.jsystems.bestservice.persistence.ServiceSessionRepository;
import com.jsystems.bestservice.persistence.SessionStatus;
import com.jsystems.bestservice.persistence.TerminalState;
import com.jsystems.bestservice.persistence.UploadedImage;
import com.jsystems.bestservice.storage.ImageStorageService;
import com.jsystems.bestservice.storage.StoredImageFile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;

@Service
public class CaseSubmissionPipeline {

    private static final int MAX_IMAGE_ATTEMPTS = 3;
    private static final String DECISION_MODEL = "backend-rules-v1";
    private static final String DECISION_PROMPT_VERSION = "decision-rules-v1";

    private final ImageStorageService storageService;
    private final ServiceSessionRepository sessionRepository;
    private final ImageAnalysisAiClient aiClient;
    private final DecisionRuleService decisionRuleService;

    public CaseSubmissionPipeline(
            ImageStorageService storageService,
            ServiceSessionRepository sessionRepository,
            ImageAnalysisAiClient aiClient,
            DecisionRuleService decisionRuleService
    ) {
        this.storageService = storageService;
        this.sessionRepository = sessionRepository;
        this.aiClient = aiClient;
        this.decisionRuleService = decisionRuleService;
    }

    @Transactional
    public SessionResponse submit(CaseSubmissionCommand command) {
        StoredImageFile storedImage = storageService.store(command.sessionId(), command.attemptNumber(), command.image());
        try {
            ServiceSession session = ServiceSession.create(
                    command.sessionId(),
                    command.requestType(),
                    command.equipmentCategory(),
                    command.equipmentNameOrModel(),
                    command.purchaseDate(),
                    command.reason()
            );
            UploadedImage image = UploadedImage.create(
                    session,
                    command.attemptNumber(),
                    storedImage.originalFilename(),
                    storedImage.contentType(),
                    storedImage.sizeBytes(),
                    storedImage.relativePath(),
                    true,
                    null
            );

            ImageAnalysisResult analysisResult = analyze(command);
            image.markAnalysisResult(analysisResult.isEvaluable(), analysisResult.notEvaluableReasonPl());
            ImageAnalysis.create(
                    image,
                    analysisResult.visibleDamage(),
                    analysisResult.visibleDefectIndicators(),
                    analysisResult.visibleUsageSigns(),
                    analysisResult.possibleCauseIndicators(),
                    analysisResult.missingOrAlteredVisibleParts(),
                    analysisResult.resaleCondition().name().toLowerCase(Locale.ROOT),
                    !analysisResult.isEvaluable(),
                    analysisResult.summaryPl(),
                    analysisResult.model(),
                    analysisResult.promptVersion()
            );

            if (!analysisResult.isEvaluable() && command.attemptNumber() < MAX_IMAGE_ATTEMPTS) {
                session.markImageRetryRequired();
                ServiceSession saved = sessionRepository.save(session);
                return retryResponse(saved, analysisResult);
            }

            DecisionResult decision = decisionRuleService.decideInitial(
                    new DecisionInput(command.requestType(), command.purchaseDate(), command.reason()),
                    toObservations(analysisResult, command.attemptNumber())
            );
            DecisionRecord decisionRecord = DecisionRecord.create(
                    session,
                    1,
                    decision.status(),
                    decision.rejectionType(),
                    decision.rejectionReasonPl(),
                    decision.justificationPl(),
                    decision.nextStepsPl(),
                    decision.ruleCategory(),
                    null,
                    DECISION_MODEL,
                    DECISION_PROMPT_VERSION
            );
            ChatMessage systemMessage = ChatMessage.create(
                    session,
                    ChatRole.SYSTEM,
                    firstSystemMessage(decision),
                    1,
                    MessageType.INITIAL_DECISION
            );

            if (decision.terminalState() == TerminalState.IN_PERSON_VERIFICATION_REQUIRED) {
                session.markClosed(decision.terminalState());
            } else {
                session.markDecided(decision.terminalState());
            }

            ServiceSession saved = sessionRepository.save(session);
            return decidedResponse(saved, decisionRecord, systemMessage);
        } catch (ApiException exception) {
            storageService.delete(storedImage.relativePath());
            throw exception;
        } catch (RuntimeException exception) {
            storageService.delete(storedImage.relativePath());
            throw exception;
        }
    }

    private ImageAnalysisResult analyze(CaseSubmissionCommand command) {
        try {
            return aiClient.analyze(command);
        } catch (RuntimeException exception) {
            throw new ApiException(
                    ApiErrorCode.AI_PROVIDER_UNAVAILABLE,
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Nie udało się przeanalizować zdjęcia. Spróbuj ponownie za chwilę."
            );
        }
    }

    private ImageObservations toObservations(ImageAnalysisResult result, int attemptNumber) {
        return ImageObservations.initialEvaluable()
                .withEvaluable(result.isEvaluable())
                .withAttemptNumber(attemptNumber)
                .withVisibleDamage(StringUtils.hasText(result.visibleDamage()))
                .withVisibleDefectIndicators(StringUtils.hasText(result.visibleDefectIndicators()))
                .withVisibleUsageSigns(StringUtils.hasText(result.visibleUsageSigns()))
                .withMechanicalDamage(containsMechanicalDamage(result))
                .withMissingOrAlteredVisibleParts(StringUtils.hasText(result.missingOrAlteredVisibleParts()))
                .withResaleCondition(result.resaleCondition())
                .withContradictionWithForm(result.contradictionWithForm());
    }

    private boolean containsMechanicalDamage(ImageAnalysisResult result) {
        String damage = result.visibleDamage();
        if (!StringUtils.hasText(damage)) {
            return false;
        }
        String normalized = damage.toLowerCase(Locale.ROOT);
        return normalized.contains("mechaniczne")
                || normalized.contains("pęk")
                || normalized.contains("crack")
                || normalized.contains("impact");
    }

    private SessionResponse retryResponse(ServiceSession session, ImageAnalysisResult result) {
        return new SessionResponse(
                session.getId(),
                session.getRequestType().name().toLowerCase(Locale.ROOT),
                session.getStatus().name(),
                null,
                session.getImageAttemptCount(),
                MAX_IMAGE_ATTEMPTS - session.getImageAttemptCount(),
                null,
                new ImageRetryResponse(result.notEvaluableReasonPl(), MAX_IMAGE_ATTEMPTS - session.getImageAttemptCount()),
                List.of()
        );
    }

    private SessionResponse decidedResponse(
            ServiceSession session,
            DecisionRecord decisionRecord,
            ChatMessage systemMessage
    ) {
        return new SessionResponse(
                session.getId(),
                session.getRequestType().name().toLowerCase(Locale.ROOT),
                session.getStatus().name(),
                session.getTerminalState() == null ? null : session.getTerminalState().name(),
                session.getImageAttemptCount(),
                Math.max(0, MAX_IMAGE_ATTEMPTS - session.getImageAttemptCount()),
                new DecisionResponse(
                        decisionRecord.getStatus().name().toLowerCase(Locale.ROOT),
                        decisionRecord.getRejectionType() == null
                                ? null
                                : decisionRecord.getRejectionType().name().toLowerCase(Locale.ROOT),
                        decisionRecord.getRejectionReasonPl(),
                        decisionRecord.getJustificationPl(),
                        decisionRecord.getNextStepsPl(),
                        decisionRecord.getRuleCategory(),
                        decisionRecord.getVersion()
                ),
                null,
                List.of(new ChatMessageResponse(
                        systemMessage.getId(),
                        systemMessage.getRole().name(),
                        systemMessage.getContentPl(),
                        systemMessage.getSequenceNumber(),
                        systemMessage.getMessageType().name(),
                        systemMessage.getCreatedAt()
                ))
        );
    }

    private String firstSystemMessage(DecisionResult decision) {
        return "Dzień dobry. Decyzja: %s. Uzasadnienie: %s Dalsze kroki: %s".formatted(
                decision.status().name().toLowerCase(Locale.ROOT),
                decision.justificationPl(),
                decision.nextStepsPl()
        );
    }
}

package com.jsystems.bestservice.caseintake;

import com.jsystems.bestservice.ai.FakeImageAnalysisAiClient;
import com.jsystems.bestservice.ai.ImageAnalysisAiClient;
import com.jsystems.bestservice.caseintake.api.SessionResponseMapper;
import com.jsystems.bestservice.caseintake.api.SessionResponse;
import com.jsystems.bestservice.common.api.ApiErrorCode;
import com.jsystems.bestservice.common.api.ApiException;
import com.jsystems.bestservice.decision.DecisionRuleService;
import com.jsystems.bestservice.imageanalysis.ImageAnalysisResult;
import com.jsystems.bestservice.persistence.EquipmentCategory;
import com.jsystems.bestservice.persistence.RequestType;
import com.jsystems.bestservice.persistence.ServiceSession;
import com.jsystems.bestservice.persistence.ServiceSessionRepository;
import com.jsystems.bestservice.persistence.UploadedImage;
import com.jsystems.bestservice.storage.ImageStorageService;
import com.jsystems.bestservice.storage.StoredImageFile;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CaseSubmissionPipelineTests {

    @Test
    void fakeAiReturnsEvaluableImageResult() {
        FakeImageAnalysisAiClient aiClient = new FakeImageAnalysisAiClient();

        ImageAnalysisResult result = aiClient.analyze(command("produkt.jpg", RequestType.COMPLAINT));

        assertThat(result.isEvaluable()).isTrue();
        assertThat(result.visibleDefectIndicators()).isNotBlank();
        assertThat(result.model()).isEqualTo("fake-vision-v1");
        assertThat(result.promptVersion()).isEqualTo("image-analysis-v1");
    }

    @Test
    void malformedAiOutputMapsToAiProviderUnavailable() {
        CaseSubmissionPipeline pipeline = pipeline(request -> {
            throw new IllegalStateException("malformed");
        });

        assertThatThrownBy(() -> pipeline.submit(command("produkt.jpg", RequestType.COMPLAINT)))
                .isInstanceOf(ApiException.class)
                .extracting(error -> ((ApiException) error).code())
                .isEqualTo(ApiErrorCode.AI_PROVIDER_UNAVAILABLE);
    }

    @Test
    void unclearImageReturnsRetryStateWithRemainingAttempts() {
        CaseSubmissionPipeline pipeline = pipeline(new FakeImageAnalysisAiClient());

        SessionResponse response = pipeline.submit(command("unclear-equipment.png", RequestType.RETURN));

        assertThat(response.status()).isEqualTo("IMAGE_RETRY_REQUIRED");
        assertThat(response.imageAttemptCount()).isEqualTo(1);
        assertThat(response.remainingImageAttempts()).isEqualTo(2);
        assertThat(response.imageRetry().reasonPl()).contains("nieczytelne");
    }

    @Test
    void thirdUnclearImageMarksInPersonVerificationRequired() {
        CaseSubmissionPipeline pipeline = pipeline(new FakeImageAnalysisAiClient());

        SessionResponse response = pipeline.submit(command("unclear-equipment.png", RequestType.RETURN, 3));

        assertThat(response.status()).isEqualTo("CLOSED");
        assertThat(response.terminalState()).isEqualTo("IN_PERSON_VERIFICATION_REQUIRED");
        assertThat(response.latestDecision().status()).isEqualTo("human_verification_required");
        assertThat(response.latestDecision().ruleCategory())
                .isEqualTo("image.in_person_verification_after_three_attempts");
    }

    @Test
    void successfulFormSubmissionPersistsAnalysisDecisionAndFirstSystemMessage() {
        CaseSubmissionPipeline pipeline = pipeline(new FakeImageAnalysisAiClient());

        SessionResponse response = pipeline.submit(command("complaint-visible-defect.png", RequestType.COMPLAINT));

        assertThat(response.status()).isEqualTo("DECIDED");
        assertThat(response.latestDecision().status()).isEqualTo("approved");
        assertThat(response.messages()).hasSize(1);
        assertThat(response.messages().getFirst().contentPl()).contains("Dzień dobry");
        assertThat(response.imageRetry()).isNull();
    }

    @Test
    void retryImageForUnclearSessionIncrementsAttemptCount() {
        ServiceSession session = unclearRetrySession(1);
        CaseSubmissionPipeline pipeline = pipeline(new FakeImageAnalysisAiClient(), session);

        SessionResponse response = pipeline.submitImageAttempt(
                session.getId(),
                image("unclear-equipment.png")
        );

        assertThat(response.status()).isEqualTo("IMAGE_RETRY_REQUIRED");
        assertThat(response.imageAttemptCount()).isEqualTo(2);
        assertThat(response.remainingImageAttempts()).isEqualTo(1);
        assertThat(session.getUploadedImages()).hasSize(2);
    }

    @Test
    void thirdRetryUnclearImageMarksInPersonVerificationRequired() {
        ServiceSession session = unclearRetrySession(2);
        CaseSubmissionPipeline pipeline = pipeline(new FakeImageAnalysisAiClient(), session);

        SessionResponse response = pipeline.submitImageAttempt(
                session.getId(),
                image("unclear-equipment.png")
        );

        assertThat(response.status()).isEqualTo("CLOSED");
        assertThat(response.terminalState()).isEqualTo("IN_PERSON_VERIFICATION_REQUIRED");
        assertThat(response.latestDecision().ruleCategory())
                .isEqualTo("image.in_person_verification_after_three_attempts");
        assertThat(response.messages()).hasSize(1);
    }

    private static CaseSubmissionPipeline pipeline(ImageAnalysisAiClient aiClient) {
        return pipeline(aiClient, null);
    }

    private static CaseSubmissionPipeline pipeline(ImageAnalysisAiClient aiClient, ServiceSession existingSession) {
        ImageStorageService storageService = mock(ImageStorageService.class);
        ServiceSessionRepository sessionRepository = mock(ServiceSessionRepository.class);
        when(storageService.store(any(), anyInt(), any()))
                .thenAnswer(invocation -> new StoredImageFile(
                        invocation.getArgument(2, MockMultipartFile.class).getOriginalFilename(),
                        invocation.getArgument(2, MockMultipartFile.class).getContentType(),
                        invocation.getArgument(2, MockMultipartFile.class).getSize(),
                        "2026/06/19/session/image.png"
                ));
        when(sessionRepository.save(any(ServiceSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.findById(any())).thenReturn(Optional.ofNullable(existingSession));

        return new CaseSubmissionPipeline(
                storageService,
                sessionRepository,
                aiClient,
                new DecisionRuleService(),
                new SessionResponseMapper()
        );
    }

    private static CaseSubmissionCommand command(String filename, RequestType requestType) {
        return command(filename, requestType, 1);
    }

    private static CaseSubmissionCommand command(String filename, RequestType requestType, int attemptNumber) {
        return new CaseSubmissionCommand(
                UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                requestType,
                EquipmentCategory.LAPTOP,
                "ThinkPad T14",
                LocalDate.of(2026, 6, 1),
                requestType == RequestType.COMPLAINT ? "Ekran miga." : "",
                image(filename),
                attemptNumber
        );
    }

    private static MockMultipartFile image(String filename) {
        return new MockMultipartFile(
                "image",
                filename,
                "image/png",
                "fake-image".getBytes()
        );
    }

    private static ServiceSession unclearRetrySession(int attempts) {
        ServiceSession session = ServiceSession.create(
                UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                RequestType.RETURN,
                EquipmentCategory.LAPTOP,
                "ThinkPad T14",
                LocalDate.of(2026, 6, 1),
                ""
        );
        for (int attempt = 1; attempt <= attempts; attempt++) {
            UploadedImage uploadedImage = UploadedImage.create(
                    session,
                    attempt,
                    "unclear-equipment.png",
                    "image/png",
                    10L,
                    "2026/06/19/session/%s.png".formatted(attempt),
                    false,
                    "Zdjęcie jest nieczytelne."
            );
            uploadedImage.markAnalysisResult(false, "Zdjęcie jest nieczytelne.");
        }
        session.markImageRetryRequired();
        return session;
    }
}

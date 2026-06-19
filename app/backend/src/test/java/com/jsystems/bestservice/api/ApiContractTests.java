package com.jsystems.bestservice.api;

import com.jsystems.bestservice.caseintake.CaseSubmissionPipeline;
import com.jsystems.bestservice.caseintake.api.ChatMessageResponse;
import com.jsystems.bestservice.caseintake.api.DecisionResponse;
import com.jsystems.bestservice.caseintake.api.SessionResponse;
import com.jsystems.bestservice.common.api.ApiErrorCode;
import com.jsystems.bestservice.common.api.ApiException;
import com.jsystems.bestservice.persistence.ServiceSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest(properties = {
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration",
        "best-service.upload.max-image-size=1KB"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiContractTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CaseSubmissionPipeline caseSubmissionPipeline;

    @MockitoBean
    private ServiceSessionRepository serviceSessionRepository;

    @BeforeEach
    void setUpPipelineResponse() {
        when(caseSubmissionPipeline.submit(any())).thenReturn(new SessionResponse(
                UUID.fromString("99999999-9999-9999-9999-999999999999"),
                "return",
                "DECIDED",
                null,
                1,
                2,
                new DecisionResponse(
                        "human_verification_required",
                        null,
                        null,
                        "Zgłoszenie zostało przyjęte do dalszej weryfikacji.",
                        "Poczekaj na dalszą informację w czacie.",
                        "stub_contract",
                        1
                ),
                null,
                List.of(new ChatMessageResponse(
                        UUID.fromString("88888888-8888-8888-8888-888888888888"),
                        "SYSTEM",
                        "Dzień dobry. Zgłoszenie zostało przyjęte do dalszej weryfikacji.",
                        1,
                        "INITIAL_DECISION",
                        Instant.now()
                ))
        ));
        when(caseSubmissionPipeline.submitImageAttempt(any(), any())).thenThrow(new ApiException(
                ApiErrorCode.SESSION_STATE_CONFLICT,
                org.springframework.http.HttpStatus.CONFLICT,
                "Nie można wykonać tej operacji dla aktualnego stanu zgłoszenia."
        ));
    }

    @Test
    void complaintWithoutReasonReturnsValidationFailed() throws Exception {
        mockMvc.perform(validCreateSessionMultipart("complaint")
                        .param("reason", " "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.messagePl").value("Popraw błędy w formularzu."))
                .andExpect(jsonPath("$.fieldErrors.reason").value("Podaj powód reklamacji."))
                .andExpect(jsonPath("$.traceId", notNullValue()));
    }

    @Test
    void returnWithoutReasonPassesValidation() throws Exception {
        mockMvc.perform(validCreateSessionMultipart("return"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId", notNullValue()))
                .andExpect(jsonPath("$.requestType").value("return"))
                .andExpect(jsonPath("$.status").value("DECIDED"));
    }

    @Test
    void unsupportedImageTypeReturnsUnsupportedImageType() throws Exception {
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "warranty.pdf",
                MediaType.APPLICATION_PDF_VALUE,
                "not-an-image".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(baseCreateSessionMultipart("return", image))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_IMAGE_TYPE"))
                .andExpect(jsonPath("$.messagePl").value("Dozwolone są tylko pliki JPG, PNG albo WebP."))
                .andExpect(jsonPath("$.traceId", notNullValue()));
    }

    @Test
    void tooLargeImageReturnsImageTooLarge() throws Exception {
        byte[] content = new byte[2048];
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "equipment.png",
                MediaType.IMAGE_PNG_VALUE,
                content
        );

        mockMvc.perform(baseCreateSessionMultipart("return", image))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.code").value("IMAGE_TOO_LARGE"))
                .andExpect(jsonPath("$.messagePl", containsString("Plik jest za duży.")))
                .andExpect(jsonPath("$.traceId", notNullValue()));
    }

    @Test
    void unknownSessionReturnsSessionNotFound() throws Exception {
        UUID unknownSessionId = UUID.fromString("11111111-1111-1111-1111-111111111111");

        mockMvc.perform(get("/api/sessions/{sessionId}", unknownSessionId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SESSION_NOT_FOUND"))
                .andExpect(jsonPath("$.messagePl").value("Nie znaleziono zgłoszenia."))
                .andExpect(jsonPath("$.traceId", notNullValue()));
    }

    @Test
    void retryImageForInvalidStateReturnsSessionStateConflict() throws Exception {
        UUID decidedSessionId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        MockMultipartFile image = jpgImage();

        mockMvc.perform(multipart("/api/sessions/{sessionId}/image-attempts", decidedSessionId)
                        .file(image))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SESSION_STATE_CONFLICT"))
                .andExpect(jsonPath("$.messagePl").value("Nie można wykonać tej operacji dla aktualnego stanu zgłoszenia."))
                .andExpect(jsonPath("$.traceId", notNullValue()));
    }

    private static MockHttpServletRequestBuilder validCreateSessionMultipart(
            String requestType
    ) {
        return baseCreateSessionMultipart(requestType, jpgImage());
    }

    private static MockHttpServletRequestBuilder baseCreateSessionMultipart(
            String requestType,
            MockMultipartFile image
    ) {
        return multipart("/api/sessions")
                .file(image)
                .param("requestType", requestType)
                .param("equipmentCategory", "laptop")
                .param("equipmentNameOrModel", "ThinkPad T14")
                .param("purchaseDate", LocalDate.now().minusDays(7).toString());
    }

    private static MockMultipartFile jpgImage() {
        return new MockMultipartFile(
                "image",
                "equipment.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake-jpg".getBytes(StandardCharsets.UTF_8)
        );
    }
}

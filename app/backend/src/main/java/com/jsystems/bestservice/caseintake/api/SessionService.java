package com.jsystems.bestservice.caseintake.api;

import com.jsystems.bestservice.caseintake.CaseSubmissionCommand;
import com.jsystems.bestservice.caseintake.CaseSubmissionPipeline;
import com.jsystems.bestservice.common.api.ApiErrorCode;
import com.jsystems.bestservice.common.api.ApiException;
import com.jsystems.bestservice.common.config.UploadProperties;
import com.jsystems.bestservice.persistence.EquipmentCategory;
import com.jsystems.bestservice.persistence.RequestType;
import com.jsystems.bestservice.persistence.ServiceSession;
import com.jsystems.bestservice.persistence.ServiceSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
class SessionService {

    private static final Set<String> REQUEST_TYPES = Set.of("complaint", "return");
    private static final Set<String> EQUIPMENT_CATEGORIES = Set.of(
            "laptop",
            "desktop_pc",
            "smartphone",
            "tablet",
            "monitor",
            "tv",
            "printer",
            "headphones",
            "smartwatch",
            "gaming_console",
            "computer_accessory",
            "other_electronics"
    );
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final UploadProperties uploadProperties;
    private final CaseSubmissionPipeline submissionPipeline;
    private final ServiceSessionRepository sessionRepository;
    private final SessionResponseMapper responseMapper;

    SessionService(
            UploadProperties uploadProperties,
            CaseSubmissionPipeline submissionPipeline,
            ServiceSessionRepository sessionRepository,
            SessionResponseMapper responseMapper
    ) {
        this.uploadProperties = uploadProperties;
        this.submissionPipeline = submissionPipeline;
        this.sessionRepository = sessionRepository;
        this.responseMapper = responseMapper;
    }

    SessionResponse createSession(CreateSessionRequest request) {
        validateSessionRequest(request);
        return submissionPipeline.submit(new CaseSubmissionCommand(
                UUID.randomUUID(),
                toRequestType(request.getRequestType()),
                toEquipmentCategory(request.getEquipmentCategory()),
                request.getEquipmentNameOrModel().trim(),
                request.getPurchaseDate(),
                request.getReason() == null ? "" : request.getReason().trim(),
                request.getImage(),
                1
        ));
    }

    SessionResponse createImageAttempt(UUID sessionId, MultipartFile image) {
        validateImage(image);
        return submissionPipeline.submitImageAttempt(sessionId, image);
    }

    SessionResponse getSession(UUID sessionId) {
        ServiceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ApiException(
                        ApiErrorCode.SESSION_NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Nie znaleziono zgłoszenia."
                ));
        return responseMapper.toResponse(session);
    }

    private void validateSessionRequest(CreateSessionRequest request) {
        Map<String, String> fieldErrors = new java.util.LinkedHashMap<>();
        String requestType = normalize(request.getRequestType());
        String equipmentCategory = normalize(request.getEquipmentCategory());

        if (!REQUEST_TYPES.contains(requestType)) {
            fieldErrors.put("requestType", "Wybierz typ zgłoszenia: reklamacja albo zwrot.");
        }
        if (!EQUIPMENT_CATEGORIES.contains(equipmentCategory)) {
            fieldErrors.put("equipmentCategory", "Wybierz obsługiwaną kategorię sprzętu.");
        }
        if ("complaint".equals(requestType) && isBlank(request.getReason())) {
            fieldErrors.put("reason", "Podaj powód reklamacji.");
        }
        if (!fieldErrors.isEmpty()) {
            throw new ApiException(
                    ApiErrorCode.VALIDATION_FAILED,
                    HttpStatus.BAD_REQUEST,
                    "Popraw błędy w formularzu.",
                    fieldErrors
            );
        }

        validateImage(request.getImage());
    }

    private void validateImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new ApiException(
                    ApiErrorCode.VALIDATION_FAILED,
                    HttpStatus.BAD_REQUEST,
                    "Popraw błędy w formularzu.",
                    Map.of("image", "Dodaj jedno zdjęcie produktu.")
            );
        }
        String contentType = normalize(image.getContentType());
        if (!ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new ApiException(
                    ApiErrorCode.UNSUPPORTED_IMAGE_TYPE,
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Dozwolone są tylko pliki JPG, PNG albo WebP."
            );
        }
        DataSize maxImageSize = uploadProperties.maxImageSize();
        if (image.getSize() > maxImageSize.toBytes()) {
            throw new ApiException(
                    ApiErrorCode.IMAGE_TOO_LARGE,
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Plik jest za duży. Maksymalny rozmiar zdjęcia to " + maxImageSize.toMegabytes() + " MB."
            );
        }
    }

    private RequestType toRequestType(String value) {
        return switch (normalize(value)) {
            case "complaint" -> RequestType.COMPLAINT;
            case "return" -> RequestType.RETURN;
            default -> throw new IllegalArgumentException("Unsupported request type: " + value);
        };
    }

    private EquipmentCategory toEquipmentCategory(String value) {
        return EquipmentCategory.valueOf(normalize(value).toUpperCase(Locale.ROOT));
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}

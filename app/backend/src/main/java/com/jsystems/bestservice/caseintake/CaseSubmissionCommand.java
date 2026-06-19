package com.jsystems.bestservice.caseintake;

import com.jsystems.bestservice.persistence.EquipmentCategory;
import com.jsystems.bestservice.persistence.RequestType;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

public record CaseSubmissionCommand(
        UUID sessionId,
        RequestType requestType,
        EquipmentCategory equipmentCategory,
        String equipmentNameOrModel,
        LocalDate purchaseDate,
        String reason,
        MultipartFile image,
        int attemptNumber
) {
}

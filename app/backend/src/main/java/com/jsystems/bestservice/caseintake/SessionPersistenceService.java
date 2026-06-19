package com.jsystems.bestservice.caseintake;

import com.jsystems.bestservice.persistence.EquipmentCategory;
import com.jsystems.bestservice.persistence.RequestType;
import com.jsystems.bestservice.persistence.ServiceSession;
import com.jsystems.bestservice.persistence.ServiceSessionRepository;
import com.jsystems.bestservice.persistence.UploadedImage;
import com.jsystems.bestservice.storage.ImageStorageService;
import com.jsystems.bestservice.storage.StoredImageFile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

@Service
public class SessionPersistenceService {

    private final ImageStorageService storageService;
    private final ServiceSessionRepository serviceSessionRepository;

    public SessionPersistenceService(
            ImageStorageService storageService,
            ServiceSessionRepository serviceSessionRepository
    ) {
        this.storageService = storageService;
        this.serviceSessionRepository = serviceSessionRepository;
    }

    @Transactional
    public ServiceSession createSessionWithInitialImage(
            UUID sessionId,
            RequestType requestType,
            EquipmentCategory equipmentCategory,
            String equipmentNameOrModel,
            LocalDate purchaseDate,
            String reason,
            MultipartFile image
    ) {
        StoredImageFile storedImage = storageService.store(sessionId, 1, image);
        try {
            ServiceSession session = ServiceSession.create(
                    sessionId,
                    requestType,
                    equipmentCategory,
                    equipmentNameOrModel,
                    purchaseDate,
                    reason
            );
            UploadedImage.create(
                    session,
                    1,
                    storedImage.originalFilename(),
                    storedImage.contentType(),
                    storedImage.sizeBytes(),
                    storedImage.relativePath(),
                    true,
                    null
            );
            return serviceSessionRepository.save(session);
        } catch (RuntimeException exception) {
            storageService.delete(storedImage.relativePath());
            throw exception;
        }
    }
}

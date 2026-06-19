package com.jsystems.bestservice.caseintake;

import com.jsystems.bestservice.persistence.EquipmentCategory;
import com.jsystems.bestservice.persistence.RequestType;
import com.jsystems.bestservice.persistence.ServiceSessionRepository;
import com.jsystems.bestservice.storage.ImageStorageService;
import com.jsystems.bestservice.storage.StoredImageFile;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SessionPersistenceServiceTests {

    @Test
    void fileCleanupIsAttemptedWhenDbPersistenceFailsAfterFileWrite() {
        ImageStorageService storageService = mock(ImageStorageService.class);
        ServiceSessionRepository serviceSessionRepository = mock(ServiceSessionRepository.class);
        SessionPersistenceService service = new SessionPersistenceService(storageService, serviceSessionRepository);
        UUID sessionId = UUID.fromString("44444444-4444-4444-4444-444444444444");
        StoredImageFile storedImage = new StoredImageFile(
                "produkt.jpg",
                "image/jpeg",
                3L,
                "2026/06/18/%s/1-generated.jpg".formatted(sessionId)
        );
        MockMultipartFile image = new MockMultipartFile("image", "produkt.jpg", "image/jpeg", new byte[] {1, 2, 3});

        when(storageService.store(sessionId, 1, image)).thenReturn(storedImage);
        when(serviceSessionRepository.save(any())).thenThrow(new IllegalStateException("database unavailable"));

        assertThatThrownBy(() -> service.createSessionWithInitialImage(
                sessionId,
                RequestType.RETURN,
                EquipmentCategory.LAPTOP,
                "ThinkPad T14",
                LocalDate.now().minusDays(2),
                null,
                image
        )).isInstanceOf(IllegalStateException.class);

        verify(storageService).delete(storedImage.relativePath());
    }
}

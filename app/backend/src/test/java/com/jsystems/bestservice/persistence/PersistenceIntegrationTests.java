package com.jsystems.bestservice.persistence;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "best-service.upload.root=./target/test-uploads",
        "best-service.openai.api-key=test-key-not-used",
        "best-service.openai.text-model=test-text-model",
        "best-service.openai.vision-model=test-vision-model"
})
@Testcontainers(disabledWithoutDocker = true)
class PersistenceIntegrationTests {

    @Container
    static final PostgreSQLContainer<?> POSTGRESQL = new PostgreSQLContainer<>("postgres:17-alpine");

    @DynamicPropertySource
    static void configurePostgresql(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ServiceSessionRepository serviceSessionRepository;

    @Autowired
    private UploadedImageRepository uploadedImageRepository;

    @Autowired
    private ImageAnalysisRepository imageAnalysisRepository;

    @Autowired
    private DecisionRecordRepository decisionRecordRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Test
    void flywayMigratesCleanPostgresql() {
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("2");

        List<String> tableNames = jdbcTemplate.queryForList("""
                select table_name
                from information_schema.tables
                where table_schema = 'public'
                order by table_name
                """, String.class);

        assertThat(tableNames).contains(
                "service_sessions",
                "uploaded_images",
                "image_analyses",
                "decision_records",
                "chat_messages"
        );
    }

    @Test
    @Transactional
    void fullSessionGraphPersistsAndLoadsCorrectly() {
        ServiceSession session = sampleSession();
        UploadedImage image = UploadedImage.create(
                session,
                1,
                "produkt.jpg",
                "image/jpeg",
                1234L,
                "2026/06/18/%s/1-image.jpg".formatted(session.getId()),
                true,
                null
        );
        ImageAnalysis analysis = ImageAnalysis.create(
                image,
                "brak widocznych uszkodzeń",
                "usterka ekranu",
                "normalne ślady użycia",
                "brak",
                "brak",
                "nadaje się do oceny",
                false,
                "Podsumowanie modelu",
                "test-vision-model"
        );
        DecisionRecord decision = DecisionRecord.create(
                session,
                1,
                DecisionStatus.APPROVED,
                null,
                null,
                "Reklamacja została przyjęta.",
                "Oczekuj dalszej informacji.",
                "complaint_rule_1",
                null
        );
        ChatMessage message = ChatMessage.create(
                session,
                ChatRole.SYSTEM,
                "Dzień dobry. Reklamacja została przyjęta.",
                1,
                MessageType.INITIAL_DECISION
        );

        serviceSessionRepository.saveAndFlush(session);

        ServiceSession loaded = serviceSessionRepository.findById(session.getId()).orElseThrow();
        assertThat(loaded.getUploadedImages()).extracting(UploadedImage::getOriginalFilename).containsExactly("produkt.jpg");
        assertThat(loaded.getDecisionRecords()).extracting(DecisionRecord::getJustificationPl).containsExactly("Reklamacja została przyjęta.");
        assertThat(loaded.getChatMessages()).extracting(ChatMessage::getContentPl).containsExactly("Dzień dobry. Reklamacja została przyjęta.");
        assertThat(imageAnalysisRepository.findByImageId(image.getId())).contains(analysis);
        assertThat(message.getCreatedAt()).isBeforeOrEqualTo(Instant.now());
        assertThat(decision.getCreatedAt()).isBeforeOrEqualTo(Instant.now());
    }

    @Test
    void decisionVersionsOrderCorrectlyPerSession() {
        ServiceSession session = serviceSessionRepository.save(sampleSession());
        decisionRecordRepository.save(DecisionRecord.create(
                session,
                2,
                DecisionStatus.HUMAN_VERIFICATION_REQUIRED,
                null,
                null,
                "Wymagana weryfikacja pracownika.",
                "Poczekaj na kontakt.",
                "chat_disagreement",
                null
        ));
        decisionRecordRepository.save(DecisionRecord.create(
                session,
                1,
                DecisionStatus.REJECTED,
                RejectionType.INSUFFICIENT_EVIDENCE,
                "Brak wystarczających dowodów.",
                "Nie możemy potwierdzić usterki.",
                "Dodaj informacje w czacie.",
                "complaint_rule_2",
                null
        ));

        List<DecisionRecord> decisions = decisionRecordRepository.findBySessionIdOrderByVersionAsc(session.getId());

        assertThat(decisions).extracting(DecisionRecord::getVersion).containsExactly(1, 2);
    }

    @Test
    void chatMessagesOrderBySequenceNumber() {
        ServiceSession session = serviceSessionRepository.save(sampleSession());
        chatMessageRepository.save(ChatMessage.create(
                session,
                ChatRole.CUSTOMER,
                "Drugie pytanie klienta.",
                2,
                MessageType.FOLLOW_UP
        ));
        chatMessageRepository.save(ChatMessage.create(
                session,
                ChatRole.SYSTEM,
                "Pierwsza odpowiedź systemu.",
                1,
                MessageType.INITIAL_DECISION
        ));

        List<ChatMessage> messages = chatMessageRepository.findBySessionIdOrderBySequenceNumberAsc(session.getId());

        assertThat(messages).extracting(ChatMessage::getSequenceNumber).containsExactly(1, 2);
    }

    private ServiceSession sampleSession() {
        return ServiceSession.create(
                RequestType.COMPLAINT,
                EquipmentCategory.LAPTOP,
                "ThinkPad T14",
                LocalDate.now().minusDays(10),
                "Ekran miga po uruchomieniu."
        );
    }
}

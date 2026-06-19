package com.jsystems.bestservice.persistence;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "service_sessions")
public class ServiceSession {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 32)
    private RequestType requestType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private SessionStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "terminal_state", length = 64)
    private TerminalState terminalState;

    @Enumerated(EnumType.STRING)
    @Column(name = "equipment_category", nullable = false, length = 64)
    private EquipmentCategory equipmentCategory;

    @Column(name = "equipment_name_or_model", nullable = false, length = 200)
    private String equipmentNameOrModel;

    @Column(name = "purchase_date", nullable = false)
    private LocalDate purchaseDate;

    @Column(columnDefinition = "text")
    private String reason;

    @Column(name = "image_attempt_count", nullable = false)
    private int imageAttemptCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("attemptNumber ASC")
    private List<UploadedImage> uploadedImages = new ArrayList<>();

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("version ASC")
    private List<DecisionRecord> decisionRecords = new ArrayList<>();

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceNumber ASC")
    private List<ChatMessage> chatMessages = new ArrayList<>();

    protected ServiceSession() {
    }

    private ServiceSession(
            UUID id,
            RequestType requestType,
            EquipmentCategory equipmentCategory,
            String equipmentNameOrModel,
            LocalDate purchaseDate,
            String reason
    ) {
        this.id = id;
        this.requestType = requestType;
        this.status = SessionStatus.CREATED;
        this.equipmentCategory = equipmentCategory;
        this.equipmentNameOrModel = equipmentNameOrModel;
        this.purchaseDate = purchaseDate;
        this.reason = reason;
        this.imageAttemptCount = 0;
        this.createdAt = Instant.now();
    }

    public static ServiceSession create(
            RequestType requestType,
            EquipmentCategory equipmentCategory,
            String equipmentNameOrModel,
            LocalDate purchaseDate,
            String reason
    ) {
        return create(UUID.randomUUID(), requestType, equipmentCategory, equipmentNameOrModel, purchaseDate, reason);
    }

    public static ServiceSession create(
            UUID id,
            RequestType requestType,
            EquipmentCategory equipmentCategory,
            String equipmentNameOrModel,
            LocalDate purchaseDate,
            String reason
    ) {
        return new ServiceSession(id, requestType, equipmentCategory, equipmentNameOrModel, purchaseDate, reason);
    }

    void addUploadedImage(UploadedImage image) {
        uploadedImages.add(image);
        imageAttemptCount = Math.max(imageAttemptCount, image.getAttemptNumber());
    }

    void addDecisionRecord(DecisionRecord decisionRecord) {
        decisionRecords.add(decisionRecord);
    }

    void addChatMessage(ChatMessage chatMessage) {
        chatMessages.add(chatMessage);
    }

    public void markImageRetryRequired() {
        this.status = SessionStatus.IMAGE_RETRY_REQUIRED;
        this.terminalState = null;
    }

    public void markDecided(TerminalState terminalState) {
        this.status = SessionStatus.DECIDED;
        this.terminalState = terminalState;
    }

    public void markClosed(TerminalState terminalState) {
        this.status = SessionStatus.CLOSED;
        this.terminalState = terminalState;
    }

    public UUID getId() {
        return id;
    }

    public RequestType getRequestType() {
        return requestType;
    }

    public SessionStatus getStatus() {
        return status;
    }

    public TerminalState getTerminalState() {
        return terminalState;
    }

    public EquipmentCategory getEquipmentCategory() {
        return equipmentCategory;
    }

    public String getEquipmentNameOrModel() {
        return equipmentNameOrModel;
    }

    public LocalDate getPurchaseDate() {
        return purchaseDate;
    }

    public String getReason() {
        return reason;
    }

    public int getImageAttemptCount() {
        return imageAttemptCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public List<UploadedImage> getUploadedImages() {
        return Collections.unmodifiableList(uploadedImages);
    }

    public List<DecisionRecord> getDecisionRecords() {
        return Collections.unmodifiableList(decisionRecords);
    }

    public List<ChatMessage> getChatMessages() {
        return Collections.unmodifiableList(chatMessages);
    }
}

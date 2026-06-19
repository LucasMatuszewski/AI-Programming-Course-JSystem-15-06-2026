package com.jsystems.bestservice.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ServiceSession session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ChatRole role;

    @Column(name = "content_pl", nullable = false, columnDefinition = "text")
    private String contentPl;

    @Column(name = "sequence_number", nullable = false)
    private int sequenceNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 64)
    private MessageType messageType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ChatMessage() {
    }

    private ChatMessage(
            ServiceSession session,
            ChatRole role,
            String contentPl,
            int sequenceNumber,
            MessageType messageType
    ) {
        this.id = UUID.randomUUID();
        this.session = session;
        this.role = role;
        this.contentPl = contentPl;
        this.sequenceNumber = sequenceNumber;
        this.messageType = messageType;
        this.createdAt = Instant.now();
    }

    public static ChatMessage create(
            ServiceSession session,
            ChatRole role,
            String contentPl,
            int sequenceNumber,
            MessageType messageType
    ) {
        ChatMessage chatMessage = new ChatMessage(session, role, contentPl, sequenceNumber, messageType);
        session.addChatMessage(chatMessage);
        return chatMessage;
    }

    public String getContentPl() {
        return contentPl;
    }

    public UUID getId() {
        return id;
    }

    public ChatRole getRole() {
        return role;
    }

    public int getSequenceNumber() {
        return sequenceNumber;
    }

    public MessageType getMessageType() {
        return messageType;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

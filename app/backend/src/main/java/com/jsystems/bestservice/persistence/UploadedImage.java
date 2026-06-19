package com.jsystems.bestservice.persistence;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "uploaded_images")
public class UploadedImage {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ServiceSession session;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "relative_path", nullable = false, length = 500)
    private String relativePath;

    @Column(nullable = false)
    private boolean evaluable;

    @Column(name = "retry_reason_pl", columnDefinition = "text")
    private String retryReasonPl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToOne(mappedBy = "image", cascade = CascadeType.ALL, orphanRemoval = true)
    private ImageAnalysis analysis;

    protected UploadedImage() {
    }

    private UploadedImage(
            ServiceSession session,
            int attemptNumber,
            String originalFilename,
            String contentType,
            long sizeBytes,
            String relativePath,
            boolean evaluable,
            String retryReasonPl
    ) {
        this.id = UUID.randomUUID();
        this.session = session;
        this.attemptNumber = attemptNumber;
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.relativePath = relativePath;
        this.evaluable = evaluable;
        this.retryReasonPl = retryReasonPl;
        this.createdAt = Instant.now();
    }

    public static UploadedImage create(
            ServiceSession session,
            int attemptNumber,
            String originalFilename,
            String contentType,
            long sizeBytes,
            String relativePath,
            boolean evaluable,
            String retryReasonPl
    ) {
        UploadedImage image = new UploadedImage(
                session,
                attemptNumber,
                originalFilename,
                contentType,
                sizeBytes,
                relativePath,
                evaluable,
                retryReasonPl
        );
        session.addUploadedImage(image);
        return image;
    }

    void attachAnalysis(ImageAnalysis analysis) {
        this.analysis = analysis;
    }

    public void markAnalysisResult(boolean evaluable, String retryReasonPl) {
        this.evaluable = evaluable;
        this.retryReasonPl = retryReasonPl;
    }

    public UUID getId() {
        return id;
    }

    public ServiceSession getSession() {
        return session;
    }

    public int getAttemptNumber() {
        return attemptNumber;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public String getRelativePath() {
        return relativePath;
    }

    public boolean isEvaluable() {
        return evaluable;
    }

    public String getRetryReasonPl() {
        return retryReasonPl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public ImageAnalysis getAnalysis() {
        return analysis;
    }
}

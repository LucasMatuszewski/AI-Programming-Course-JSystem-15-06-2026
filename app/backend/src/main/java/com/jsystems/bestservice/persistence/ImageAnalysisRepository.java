package com.jsystems.bestservice.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ImageAnalysisRepository extends JpaRepository<ImageAnalysis, UUID> {

    Optional<ImageAnalysis> findByImageId(UUID imageId);
}

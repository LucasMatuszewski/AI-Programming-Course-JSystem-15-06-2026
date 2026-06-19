package com.jsystems.bestservice.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UploadedImageRepository extends JpaRepository<UploadedImage, UUID> {
}

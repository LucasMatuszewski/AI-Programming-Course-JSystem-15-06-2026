package com.jsystems.bestservice.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DecisionRecordRepository extends JpaRepository<DecisionRecord, UUID> {

    List<DecisionRecord> findBySessionIdOrderByVersionAsc(UUID sessionId);
}

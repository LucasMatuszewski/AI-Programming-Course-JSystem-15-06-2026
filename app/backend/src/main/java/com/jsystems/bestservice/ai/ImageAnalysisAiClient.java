package com.jsystems.bestservice.ai;

import com.jsystems.bestservice.caseintake.CaseSubmissionCommand;
import com.jsystems.bestservice.imageanalysis.ImageAnalysisResult;

@FunctionalInterface
public interface ImageAnalysisAiClient {

    ImageAnalysisResult analyze(CaseSubmissionCommand command);
}

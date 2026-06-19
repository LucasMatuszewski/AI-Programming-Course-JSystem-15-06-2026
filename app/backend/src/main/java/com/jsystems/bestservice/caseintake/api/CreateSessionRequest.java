package com.jsystems.bestservice.caseintake.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

public class CreateSessionRequest {

    @NotBlank(message = "Wybierz typ zgłoszenia.")
    private String requestType;

    @NotBlank(message = "Wybierz kategorię sprzętu.")
    private String equipmentCategory;

    @NotBlank(message = "Podaj nazwę lub model sprzętu.")
    @Size(max = 200, message = "Nazwa lub model może mieć maksymalnie 200 znaków.")
    private String equipmentNameOrModel;

    @NotNull(message = "Podaj datę zakupu.")
    @PastOrPresent(message = "Data zakupu nie może być z przyszłości.")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate purchaseDate;

    @Size(max = 4000, message = "Opis może mieć maksymalnie 4000 znaków.")
    private String reason;

    private MultipartFile image;

    public String getRequestType() {
        return requestType;
    }

    public void setRequestType(String requestType) {
        this.requestType = requestType;
    }

    public String getEquipmentCategory() {
        return equipmentCategory;
    }

    public void setEquipmentCategory(String equipmentCategory) {
        this.equipmentCategory = equipmentCategory;
    }

    public String getEquipmentNameOrModel() {
        return equipmentNameOrModel;
    }

    public void setEquipmentNameOrModel(String equipmentNameOrModel) {
        this.equipmentNameOrModel = equipmentNameOrModel;
    }

    public LocalDate getPurchaseDate() {
        return purchaseDate;
    }

    public void setPurchaseDate(LocalDate purchaseDate) {
        this.purchaseDate = purchaseDate;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public MultipartFile getImage() {
        return image;
    }

    public void setImage(MultipartFile image) {
        this.image = image;
    }
}

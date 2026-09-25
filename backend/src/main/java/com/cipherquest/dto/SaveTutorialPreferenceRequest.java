package com.cipherquest.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SaveTutorialPreferenceRequest(
        @JsonProperty("cipherType")
        @NotBlank(message = "cipherType is required")
        String cipherType,

        @JsonProperty("dismissed")
        @NotNull(message = "dismissed is required")
        Boolean dismissed
) {}

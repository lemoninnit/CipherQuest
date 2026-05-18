package com.cipherquest.dto;

import jakarta.validation.constraints.NotBlank;

public record SubmitAnswerRequest(
    @NotBlank String answer
) {}
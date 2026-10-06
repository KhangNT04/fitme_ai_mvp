package com.fitme.userprofile.dto;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.Gender;
import com.fitme.common.enums.SkinTone;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Data
public class BodyProfileRequest {
    @NotNull @Min(100) @Max(230)
    private Integer heightCm;
    @NotNull @DecimalMin("25") @DecimalMax("250")
    private BigDecimal weightKg;
    @Min(13) @Max(80)
    private Integer age;
    @NotNull
    private Gender gender;
    private FitPreference fitPreference;
    private SkinTone skinTone;
    private Map<String, Object> goals;
    @DecimalMin(value = "20", message = "Vai rộng 20–80 cm") @DecimalMax(value = "80", message = "Vai rộng 20–80 cm")
    private BigDecimal shoulderWidthCm;
    @DecimalMin(value = "50", message = "Vòng ngực 50–200 cm") @DecimalMax(value = "200", message = "Vòng ngực 50–200 cm")
    private BigDecimal chestCm;
    @DecimalMin(value = "40", message = "Vòng eo 40–180 cm") @DecimalMax(value = "180", message = "Vòng eo 40–180 cm")
    private BigDecimal waistCm;
    @DecimalMin(value = "40", message = "Vòng bụng 40–180 cm") @DecimalMax(value = "180", message = "Vòng bụng 40–180 cm")
    private BigDecimal abdomenCm;
    @DecimalMin(value = "50", message = "Vòng mông 50–200 cm") @DecimalMax(value = "200", message = "Vòng mông 50–200 cm")
    private BigDecimal hipCm;
    @DecimalMin(value = "30", message = "Vòng đùi 30–100 cm") @DecimalMax(value = "100", message = "Vòng đùi 30–100 cm")
    private BigDecimal thighCm;
    @DecimalMin(value = "50", message = "Chiều dài chân trong 50–120 cm") @DecimalMax(value = "120", message = "Chiều dài chân trong 50–120 cm")
    private BigDecimal inseamCm;
    @DecimalMin(value = "40", message = "Chiều dài tay 40–90 cm") @DecimalMax(value = "90", message = "Chiều dài tay 40–90 cm")
    private BigDecimal armLengthCm;
}

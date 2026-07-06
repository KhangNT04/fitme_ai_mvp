package com.fitme.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GeminiOutfitSuggestion {

    private String title;
    private List<Item> items;
    private String recommendedSize;
    private String alternativeSize;
    private String recommendedForm;
    private String recommendedColor;
    private String confidence;
    private Explanation explanation;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Item {
        private String productId;
        private String role;
        private String selectedSize;
        private String selectedColor;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Explanation {
        private String bodyFit;
        private String styleFit;
        private String occasionFit;
        private String colorFit;
        private String wardrobeFit;
        private String narrative;
    }
}

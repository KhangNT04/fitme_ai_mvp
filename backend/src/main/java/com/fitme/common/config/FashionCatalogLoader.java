package com.fitme.common.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Component
public class FashionCatalogLoader {

    private final ObjectMapper objectMapper;
    private FashionCatalog catalog;

    public FashionCatalogLoader(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public synchronized FashionCatalog load() {
        if (catalog != null) {
            return catalog;
        }
        try (InputStream in = new ClassPathResource("seed/fashion-catalog.json").getInputStream()) {
            catalog = objectMapper.readValue(in, FashionCatalog.class);
            return catalog;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load seed/fashion-catalog.json", e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FashionCatalog {
        public int version;
        public Map<String, List<String>> images;
        /** Optional VTON-specific garment images (flat-lay) keyed by product imageKey. */
        public Map<String, String> tryOnImages;
        /** Former demo brands: suspended and hidden on startup, rows kept for history. */
        public List<String> retiredBrands;
        public List<BrandEntry> brands;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BrandEntry {
        public String key;
        public String name;
        /** BRAND_OWNER account that manages this brand in the portal; created on startup if missing. */
        public String ownerEmail;
        public String description;
        public String logoUrl;
        public String contactEmail;
        public String websiteUrl;
        public String shopeeUrl;
        public List<ProductEntry> products;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ProductEntry {
        public String name;
        public String description;
        public String category;
        public long price;
        public String material;
        public String fitType;
        public String imageKey;
        /** Product gallery; takes precedence over the shared {@code images[imageKey]} list. */
        public List<String> images;
        /** One of {@link #images}: the garment photo AI try-on renders. Null = not suitable for try-on. */
        public String tryOnImage;
        public List<String> colors;
        public List<String> sizes;
        public String styleTag;
        public String occasionTag;
        public String targetGender;
        public String purchaseUrl;
        public String purchaseChannel;
        public boolean sponsored;
    }
}

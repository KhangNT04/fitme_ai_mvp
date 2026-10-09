package com.fitme.common.config;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Mirrors catalog images into FitMe storage in the background once the app is up, so a slow or
 * blocked source CDN never delays startup. Until an image is copied, the catalog keeps its source URL.
 */
@Component
@Profile("!test")
@RequiredArgsConstructor
public class CatalogMediaMirrorRunner {

    private static final Logger log = LoggerFactory.getLogger(CatalogMediaMirrorRunner.class);

    private final FashionCatalogLoader catalogLoader;
    private final CatalogMediaService catalogMediaService;

    @Value("${fitme.catalog-media.mirror-enabled:true}")
    private boolean mirrorEnabled;

    @Value("${fitme.catalog-media.concurrency:4}")
    private int concurrency;

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        if (!mirrorEnabled) {
            log.info("Catalog media mirroring disabled (fitme.catalog-media.mirror-enabled=false)");
            return;
        }
        Thread worker = new Thread(this::mirror, "catalog-media-mirror");
        worker.setDaemon(true);
        worker.start();
    }

    void mirror() {
        try {
            long started = System.currentTimeMillis();
            CatalogMediaService.MirrorReport report =
                    catalogMediaService.mirrorPending(catalogSourceUrls(), concurrency);
            CatalogMediaService.RewriteReport rewrite = catalogMediaService.rewriteReferences();
            log.info("Catalog media mirror done in {} ms: {} pending, {} mirrored, {} failed, {} images + {} logos repointed",
                    System.currentTimeMillis() - started, report.pending(), report.mirrored(), report.failed(),
                    rewrite.images(), rewrite.logos());
        } catch (Exception e) {
            log.warn("Catalog media mirror run failed: {}", e.getMessage(), e);
        }
    }

    private Set<String> catalogSourceUrls() {
        FashionCatalogLoader.FashionCatalog catalog = catalogLoader.load();
        Set<String> urls = new LinkedHashSet<>();
        if (catalog.images != null) {
            catalog.images.values().forEach(urls::addAll);
        }
        for (FashionCatalogLoader.BrandEntry brand : catalog.brands) {
            if (brand.logoUrl != null) {
                urls.add(brand.logoUrl);
            }
            for (FashionCatalogLoader.ProductEntry product : brand.products) {
                if (product.images != null) {
                    urls.addAll(product.images);
                }
                if (product.tryOnImage != null) {
                    urls.add(product.tryOnImage);
                }
            }
        }
        return urls;
    }
}

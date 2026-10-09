package com.fitme.common.config;

import com.fitme.AbstractIntegrationTest;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductImage;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductRepository;
import com.fitme.storage.CatalogMediaMirror;
import com.fitme.storage.CatalogMediaMirrorRepository;
import com.fitme.storage.StorageService;
import com.fitme.support.TestDataHelper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.net.InetSocketAddress;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class CatalogMediaMirrorIntegrationTest extends AbstractIntegrationTest {

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 1, 2, 3, 4};

    @Autowired CatalogMediaService catalogMedia;
    @Autowired CatalogMediaMirrorRepository mirrors;
    @Autowired StorageService storage;
    @Autowired FashionCatalogSeeder seeder;
    @Autowired FashionCatalogLoader catalogLoader;
    @Autowired TestDataHelper testData;
    @Autowired ProductRepository products;
    @Autowired ProductImageRepository images;
    @Autowired BrandRepository brands;

    private HttpServer cdn;
    private final AtomicInteger downloads = new AtomicInteger();

    @BeforeEach
    void startCdn() throws Exception {
        mirrors.deleteAll();
        cdn = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        cdn.createContext("/file/", exchange -> {
            downloads.incrementAndGet();
            if (exchange.getRequestURI().getPath().contains("missing")) {
                exchange.sendResponseHeaders(404, -1);
            } else {
                exchange.getResponseHeaders().add("Content-Type", "image/jpeg");
                exchange.sendResponseHeaders(200, JPEG.length);
                exchange.getResponseBody().write(JPEG);
            }
            exchange.close();
        });
        cdn.start();
    }

    @AfterEach
    void stopCdn() {
        cdn.stop(0);
        mirrors.deleteAll();
    }

    private String cdnUrl(String fileId) {
        return "http://127.0.0.1:" + cdn.getAddress().getPort() + "/file/" + fileId;
    }

    @Test
    void mirrorsOnceKeepsSourceOnFailureAndRetriesLater() throws Exception {
        String ok = cdnUrl("vn-11134207-81ztc-mirrorok01");
        String missing = cdnUrl("vn-11134207-81ztc-missing0001");

        CatalogMediaService.MirrorReport first = catalogMedia.mirrorPending(List.of(ok, missing, ok), 2);

        assertThat(first.pending()).isEqualTo(2);
        assertThat(first.mirrored()).isEqualTo(1);
        assertThat(first.failed()).isEqualTo(1);
        CatalogMediaMirror row = mirrors.findBySourceUrl(ok).orElseThrow();
        assertThat(row.getStoredPath()).isEqualTo("/uploads/catalog-media/vn-11134207-81ztc-mirrorok01.jpg");
        assertThat(row.getPublicUrl()).isNull();
        assertThat(storage.read(row.getStoredPath()).bytes()).isEqualTo(JPEG);
        assertThat(catalogMedia.resolve(ok)).isEqualTo(row.getStoredPath());
        assertThat(catalogMedia.resolve(missing)).isEqualTo(missing);

        downloads.set(0);
        CatalogMediaService.MirrorReport second = catalogMedia.mirrorPending(List.of(ok, missing), 2);

        assertThat(second.pending()).isEqualTo(1);
        assertThat(downloads.get()).isEqualTo(1);
    }

    @Test
    void rewritePointsProductImagesAndLogosAtTheCopy() {
        String photo = cdnUrl("vn-11134207-81ztc-rewrite001");
        String logo = cdnUrl("vn-11134216-81ztc-rewritelogo");
        Product product = testData.createEligibleProduct("Mirror rewrite top", "Áo thun");
        ProductImage image = images.findByProductIdOrderBySortOrderAsc(product.getId()).getFirst();
        image.setImageUrl(photo);
        images.save(image);
        Brand brand = brands.findById(product.getBrandId()).orElseThrow();
        brand.setLogoUrl(logo);
        brands.save(brand);

        catalogMedia.mirrorPending(List.of(photo, logo), 2);
        CatalogMediaService.RewriteReport report = catalogMedia.rewriteReferences();

        assertThat(report.images()).isGreaterThanOrEqualTo(1);
        assertThat(images.findById(image.getId()).orElseThrow().getImageUrl())
                .isEqualTo("/uploads/catalog-media/vn-11134207-81ztc-rewrite001.jpg");
        assertThat(images.findById(image.getId()).orElseThrow().getImageType()).isEqualTo(ProductImage.TYPE_TRY_ON);
        assertThat(brands.findById(brand.getId()).orElseThrow().getLogoUrl())
                .isEqualTo("/uploads/catalog-media/vn-11134216-81ztc-rewritelogo.jpg");
    }

    @Test
    void seederStoresMirroredUrlsAndKeepsTheBrandPickAcrossSyncs() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        FashionCatalogLoader.ProductEntry first = entry.products.getFirst();
        for (int i = 0; i < first.images.size(); i++) {
            mirrors.save(CatalogMediaMirror.builder()
                    .sourceUrl(first.images.get(i))
                    .storedPath("/uploads/catalog-media/seed-test-" + i + ".jpg")
                    .build());
        }
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);
        Product product = products.findByBrandId(owner.brand().getId()).stream()
                .filter(p -> first.itemId.equals(p.getCatalogItemId()))
                .findFirst()
                .orElseThrow();

        List<ProductImage> gallery = images.findByProductIdOrderBySortOrderAsc(product.getId());
        assertThat(gallery).extracting(ProductImage::getImageUrl)
                .allMatch(url -> url.startsWith("/uploads/catalog-media/seed-test-"));
        int defaultIndex = first.images.indexOf(first.tryOnImage);
        assertThat(tryOnUrl(gallery)).isEqualTo("/uploads/catalog-media/seed-test-" + defaultIndex + ".jpg");

        int pickIndex = defaultIndex == first.images.size() - 1 ? 0 : first.images.size() - 1;
        for (ProductImage img : gallery) {
            img.setImageType(img.getSortOrder() == 0 ? ProductImage.TYPE_MAIN : ProductImage.TYPE_DETAIL);
            images.saveAndFlush(img);
        }
        ProductImage pick = gallery.stream().filter(img -> img.getSortOrder() == pickIndex).findFirst().orElseThrow();
        pick.setImageType(ProductImage.TYPE_TRY_ON);
        images.saveAndFlush(pick);
        product.setCatalogHash("outdated");
        products.save(product);

        seeder.syncBrandCatalog(owner.brand(), entry);

        assertThat(tryOnUrl(images.findByProductIdOrderBySortOrderAsc(product.getId())))
                .isEqualTo("/uploads/catalog-media/seed-test-" + pickIndex + ".jpg");
    }

    @Test
    void objectNamesAreStableAndSafe() {
        assertThat(CatalogMediaService.objectName(
                "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mr8ilxdq00ea95", "image/jpeg"))
                .isEqualTo("vn-11134207-81ztc-mr8ilxdq00ea95.jpg");
        assertThat(CatalogMediaService.objectName("https://cdn.example/a/../b?x=1", "image/png"))
                .matches("[0-9a-f]{32}\\.png");
        assertThat(CatalogMediaService.isRemoteSource("https://pub.example.r2.dev/catalog-media/x.jpg")).isFalse();
        assertThat(CatalogMediaService.isRemoteSource("/uploads/catalog-media/x.jpg")).isFalse();
    }

    private static String tryOnUrl(List<ProductImage> gallery) {
        return gallery.stream()
                .filter(img -> ProductImage.TYPE_TRY_ON.equals(img.getImageType()))
                .map(ProductImage::getImageUrl)
                .reduce((a, b) -> a + "," + b)
                .orElse(null);
    }
}

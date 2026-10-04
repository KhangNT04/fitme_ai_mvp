package com.fitme.cart.service;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.cart.dto.AddCartItemRequest;
import com.fitme.cart.dto.CartDto;
import com.fitme.cart.dto.CartGroupDto;
import com.fitme.cart.dto.CartItemDto;
import com.fitme.cart.entity.Cart;
import com.fitme.cart.entity.CartItem;
import com.fitme.cart.repository.CartItemRepository;
import com.fitme.cart.repository.CartRepository;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductImage;
import com.fitme.product.entity.ProductVariant;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {

    public static final String OUT_OF_STOCK = "OUT_OF_STOCK";

    private static final Comparator<CartLine> DISPLAY_ORDER = Comparator
            .comparing((CartLine line) -> line.brand().getName())
            .thenComparing(line -> line.product().getName());

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductImageRepository imageRepository;
    private final BrandRepository brandRepository;

    public CartDto getCart(UUID userId) {
        List<CartLine> lines = cartRepository.findByUserId(userId)
                .map(cart -> buildLines(cartItemRepository.findByCartId(cart.getId())))
                .orElse(List.of());
        List<CartGroupDto> groups = new ArrayList<>();
        groupByBrand(lines).forEach((brandId, brandLines) -> groups.add(CartGroupDto.builder()
                .brandId(brandId)
                .brandName(brandLines.getFirst().brand().getName())
                .subtotalVnd(subtotal(brandLines))
                .items(brandLines.stream().map(CartItemDto::from).toList())
                .build()));
        return CartDto.builder()
                .itemCount(lines.stream().mapToInt(CartLine::quantity).sum())
                .subtotalVnd(subtotal(lines))
                .groups(groups)
                .build();
    }

    @Transactional
    public CartDto addItem(UUID userId, AddCartItemRequest request) {
        if (request.getQuantity() <= 0) {
            throw new BusinessException("Số lượng phải lớn hơn 0");
        }
        ProductVariant variant = variantRepository.findById(request.getVariantId())
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        if (!product.getId().equals(variant.getProductId()) || product.getStatus() != ProductStatus.ACTIVE
                || product.getPrice() == null) {
            throw new BusinessException("Sản phẩm không thể mua");
        }
        Cart cart = lockCart(userId);
        CartItem item = cartItemRepository.findByCartIdAndVariantId(cart.getId(), variant.getId())
                .orElseGet(() -> CartItem.builder()
                        .cartId(cart.getId())
                        .productId(product.getId())
                        .variantId(variant.getId())
                        .build());
        int wanted = item.getQuantity() + request.getQuantity();
        if (wanted > variant.getStockQuantity()) {
            throw new BusinessException("Số lượng vượt quá tồn kho", OUT_OF_STOCK);
        }
        item.setQuantity(wanted);
        cartItemRepository.save(item);
        return getCart(userId);
    }

    @Transactional
    public CartDto updateItem(UUID userId, UUID itemId, int quantity) {
        Cart cart = lockCart(userId);
        Optional<CartItem> existing = cartItemRepository.findByIdAndCartId(itemId, cart.getId());
        if (quantity <= 0) {
            existing.ifPresent(cartItemRepository::delete);
            return getCart(userId);
        }
        CartItem item = existing.orElseThrow(() -> new NotFoundException("Sản phẩm không có trong giỏ hàng"));
        int stock = variantRepository.findById(item.getVariantId()).map(ProductVariant::getStockQuantity).orElse(0);
        if (quantity > stock) {
            throw new BusinessException("Số lượng vượt quá tồn kho", OUT_OF_STOCK);
        }
        item.setQuantity(quantity);
        cartItemRepository.save(item);
        return getCart(userId);
    }

    @Transactional
    public void removeItem(UUID userId, UUID itemId) {
        cartRepository.findByUserId(userId)
                .flatMap(cart -> cartItemRepository.findByIdAndCartId(itemId, cart.getId()))
                .ifPresent(cartItemRepository::delete);
    }

    @Transactional
    public void clear(UUID userId) {
        cartRepository.findByUserId(userId).ifPresent(cart -> cartItemRepository.deleteByCartId(cart.getId()));
    }

    /**
     * Cart lines selected for checkout (all lines when {@code itemIds} is empty), in display order.
     * {@code lockCart} serializes concurrent order placements from the same cart.
     */
    @Transactional
    public List<CartLine> loadLines(UUID userId, Collection<UUID> itemIds, boolean lockCart) {
        Optional<Cart> cart = lockCart ? cartRepository.findByUserIdForUpdate(userId) : cartRepository.findByUserId(userId);
        return cart
                .map(found -> cartItemRepository.findByCartId(found.getId()).stream()
                        .filter(item -> itemIds == null || itemIds.isEmpty() || itemIds.contains(item.getId()))
                        .toList())
                .map(this::buildLines)
                .orElse(List.of());
    }

    @Transactional
    public void removeLines(List<CartLine> lines) {
        cartItemRepository.deleteAll(lines.stream().map(CartLine::item).toList());
    }

    public static Map<UUID, List<CartLine>> groupByBrand(List<CartLine> lines) {
        Map<UUID, List<CartLine>> groups = new LinkedHashMap<>();
        lines.forEach(line -> groups.computeIfAbsent(line.brand().getId(), key -> new ArrayList<>()).add(line));
        return groups;
    }

    public static long subtotal(List<CartLine> lines) {
        return lines.stream().mapToLong(CartLine::lineTotalVnd).sum();
    }

    private Cart lockCart(UUID userId) {
        cartRepository.insertIfAbsent(userId);
        return cartRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalStateException("Không tạo được giỏ hàng"));
    }

    private List<CartLine> buildLines(List<CartItem> items) {
        if (items.isEmpty()) {
            return List.of();
        }
        Map<UUID, Product> products = byId(productRepository.findAllById(
                items.stream().map(CartItem::getProductId).collect(Collectors.toSet())), Product::getId);
        Map<UUID, ProductVariant> variants = byId(variantRepository.findAllById(
                items.stream().map(CartItem::getVariantId).collect(Collectors.toSet())), ProductVariant::getId);
        Map<UUID, Brand> brands = byId(brandRepository.findAllById(
                products.values().stream().map(Product::getBrandId).collect(Collectors.toSet())), Brand::getId);
        Map<UUID, String> images = new HashMap<>();
        products.keySet().forEach(productId -> images.put(productId,
                imageRepository.findByProductIdOrderBySortOrderAsc(productId).stream()
                        .findFirst()
                        .map(ProductImage::getImageUrl)
                        .orElse("")));
        return items.stream()
                .map(item -> {
                    Product product = products.get(item.getProductId());
                    return new CartLine(item, product, variants.get(item.getVariantId()),
                            brands.get(product.getBrandId()), images.get(product.getId()));
                })
                .sorted(DISPLAY_ORDER)
                .toList();
    }

    private static <T> Map<UUID, T> byId(List<T> entities, Function<T, UUID> id) {
        return entities.stream().collect(Collectors.toMap(id, Function.identity()));
    }
}

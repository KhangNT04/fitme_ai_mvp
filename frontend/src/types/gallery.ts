export interface ProductRef {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
}

export interface GalleryImageDto {
  id: string;
  imageUrl: string;
  tryOnRequestId?: string;
  previewSource?: string;
  products: ProductRef[];
  createdAt: string;
}

import type { AmazonProductEntity } from '../entities/amazon-product-entity'
import type { AmazonProductModel } from '../models/amazon-product-model'

const DEFAULTS = {
    title: 'No title',
    rating: 'No rating',
    review: 'No reviews',
    image: 'No image'
}

const sanitize = (v?: string | null): string | null => (v?.trim() ?? null);

export const amazonProductDto = {
    fromEntity: (entity: AmazonProductEntity): AmazonProductModel => {
        const title = sanitize(entity.title)?.replace(/^Sponsored Ad -\s*/i, '') ?? DEFAULTS.title;
        const rating = sanitize(entity.rating) ?? DEFAULTS.rating;
        const review = sanitize(entity.review) ?? DEFAULTS.review;
        const image = sanitize(entity.image) ?? DEFAULTS.image;

        return { title, rating, review, image};
    }
}
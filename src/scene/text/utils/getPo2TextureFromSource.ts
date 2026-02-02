import { type ImageLike } from '../../../environment/ImageLike';
import { TextureSource } from '../../../rendering/renderers/shared/texture/sources/TextureSource';
import { TexturePoolClass } from '../../../rendering/renderers/shared/texture/TexturePool';
import { Bounds } from '../../container/bounds/Bounds';

import type { ICanvas } from '../../../environment/canvas/ICanvas';
import type { Texture } from '../../../rendering/renderers/shared/texture/Texture';

const tempBounds = new Bounds();

// Separate texture pool for text rendering that respects the global mipmap setting
// This prevents text textures (with mipmaps) from being mixed with filter textures (without mipmaps)
let textTexturePool: TexturePoolClass | null = null;

function getTextTexturePool(): TexturePoolClass
{
    const globalMipmapSetting = TextureSource.defaultOptions.autoGenerateMipmaps;

    if (!textTexturePool || textTexturePool.textureOptions.autoGenerateMipmaps !== globalMipmapSetting)
    {
        // Create or recreate the pool when the global mipmap setting changes
        textTexturePool = new TexturePoolClass({
            autoGenerateMipmaps: globalMipmapSetting,
        });
    }

    return textTexturePool;
}

/**
 * Returns a texture to the text texture pool.
 * @param texture - The texture to return to the pool
 * @param resetStyle - Whether to reset the style
 * @internal
 */
export function returnPo2Texture(texture: Texture, resetStyle = false): void
{
    const pool = getTextTexturePool();

    pool.returnTexture(texture, resetStyle);
}

/**
 * Takes an image and creates a texture from it, using a power of 2 texture from the texture pool.
 * Remember to return the texture when you don't need it any more!
 * @param image - The image to create a texture from
 * @param width - the frame width of the texture
 * @param height - the frame height of the texture
 * @param resolution - The resolution of the texture
 * @returns - The texture
 * @internal
 */
export function getPo2TextureFromSource(
    image: ImageLike | HTMLCanvasElement | ICanvas,
    width: number,
    height: number,
    resolution: number
): Texture
{
    const bounds = tempBounds;

    bounds.minX = 0;
    bounds.minY = 0;

    bounds.maxX = (image.width / resolution) | 0;
    bounds.maxY = (image.height / resolution) | 0;

    // Use a separate texture pool for text that respects the global mipmap setting
    // This prevents text textures (potentially with mipmaps) from being mixed with
    // filter textures (which should never have mipmaps)
    const pool = getTextTexturePool();
    const texture = pool.getOptimalTexture(
        bounds.width,
        bounds.height,
        resolution,
        false
    );

    texture.source.uploadMethodId = 'image';
    texture.source.resource = image;
    texture.source.alphaMode = 'premultiply-alpha-on-upload';

    texture.frame.width = width / resolution;
    texture.frame.height = height / resolution;

    // We want to update the resource on the GPU,
    // but we do not want to resize the texture.
    // calling `texture.source.update` will fit the resource to the texture
    // causing a resize of the texture on the GPU.
    // which is not what we want!
    texture.source.emit('update', texture.source);

    texture.updateUvs();

    return texture;
}

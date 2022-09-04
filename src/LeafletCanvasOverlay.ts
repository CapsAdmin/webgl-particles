import {
    createLayerComponent,

    MediaOverlayProps, updateMediaOverlay
} from '@react-leaflet/core';
import {
    LatLngBounds,

    VideoOverlay as LeafletVideoOverlay
} from 'leaflet';
import { ReactNode } from 'react';
import { DomUtil, ImageOverlay, Util } from 'leaflet';


/*
 * @class CanvasOverlay
 * @aka L.CanvasOverlay
 * @inherits ImageOverlay
 *
 * Used to load and display a HTML canvas over specific bounds of the map. Extends `ImageOverlay`.
 *
 * A canvas overlay uses the [`<canvas>`](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
 * HTML5 element.
 *
 * @example
 *
 * ```js
 * const canvasEl = document.createElement('canvas'),
 * 	canvasBounds = [[ 32, -130], [ 13, -100]];
 * L.videoOverlay(canvasEl, canvasBounds ).addTo(map);
 * ```
 */

export const CanvasOverlay = ImageOverlay.extend({

    // @section
    // @aka CanvasOverlay options
    options: {
        // No options yet
    },

    _initImage: function () {
        const wasElementSupplied = this._url.tagName === 'CANVAS';
        const canvas = this._image = wasElementSupplied ? this._url : DomUtil.create('canvas');

        DomUtil.addClass(canvas, 'leaflet-image-layer');
        if (this._zoomAnimated) { DomUtil.addClass(canvas, 'leaflet-zoom-animated'); }
        if (this.options.className) { DomUtil.addClass(canvas, this.options.className); }

        canvas.onselectstart = Util.falseFn;
        canvas.onmousemove = Util.falseFn;
    }

    // @method getElement(): HTMLCanvasElement
    // Returns the instance of [`HTMLCanvasElement`](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement)
    // used by this overlay.
});


// @factory L.canvasOverlay(canvas: HTMLCanvasElement, bounds: LatLngBoundsExpression, options?: CanvasOverlay options)
// Instantiates an image overlay object given a canvas element and the geographical bounds it is tied to.

export function canvasOverlay(canvas: HTMLCanvasElement, bounds: L.LatLngBoundsExpression, options?: {}) {
    // TODO: type this as extended ImageOverlay
    return new (CanvasOverlay as any)(canvas, bounds, options);
}

export interface CanvasOverlayProps extends MediaOverlayProps {
    children?: ReactNode
    canvas: HTMLCanvasElement
    width?: number;
    height?: number;
    bounds: LatLngBounds;
}

export default createLayerComponent<
    LeafletVideoOverlay,
    CanvasOverlayProps
>(
    function createCanvasOverlay({ bounds, canvas, ...options }, ctx) {
        const instance = new (canvasOverlay as any)(canvas, bounds, options)
        const { width, height } = options;
        canvas.width = width || canvas.width;
        canvas.height = height || canvas.height;
        return { instance, context: { ...ctx, overlayContainer: instance } }
    },
    function updateCanvasOverlay(overlay, props, prevProps) {
        updateMediaOverlay(overlay, props, prevProps);

        if (props.width && prevProps.width !== props.width || prevProps.height !== props.height) {
            const canvas = (overlay.getElement() as unknown) as HTMLCanvasElement;
            if (typeof props.width === 'number') {
                canvas.width = props.width;
            }
            if (typeof props.height === 'number') {
                canvas.height = props.height;
            }
        }
    },
)



/**
 * Test setup and utilities
 */

import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  // Global test setup
  
  // Polyfill ImageData for jsdom environment
  if (typeof ImageData === 'undefined') {
    (globalThis as any).ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;

      constructor(
        dataOrWidth: Uint8ClampedArray | number,
        widthOrHeight: number,
        height?: number
      ) {
        if (dataOrWidth instanceof Uint8ClampedArray) {
          this.data = dataOrWidth;
          this.width = widthOrHeight;
          this.height = height ?? dataOrWidth.length / (4 * widthOrHeight);
        } else {
          this.width = dataOrWidth;
          this.height = widthOrHeight;
          this.data = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4);
        }
      }
    };
  }
});

afterAll(() => {
  // Global test cleanup
});

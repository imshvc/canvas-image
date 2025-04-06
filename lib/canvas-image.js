/*
 * File:
 *   canvas-image.js
 *
 * Authors:
 *   Nurudin Imsirovic <nurudinimsirovic@icloud.com>
 *
 * Summary:
 *   Abstraction Layer For Canvas Pixel Manipulation
 *
 * Created:
 *   2025-03-18 11:40 AM
 *
 * Updated:
 *   2025-04-06 07:57 PM
 *
 * Repository:
 *   https://github.com/imshvc/canvas-image
 *
 * Version:
 *   20250406 (Sunday, April 6, 2025)
 *
 * License:
 *   See LICENSE file
 */

/*
 * CanvasImage factory.
 */
var CanvasImage = {};

/*
 * Library version.
 * See: https://calver.org
 */
CanvasImage.version = '20250406';

/*
 * How many resources were created.
 *
 * Used by create() to assign an id
 * to a resource.
 */
CanvasImage.count = 0;

/*
 * Canvas context attributes.
 * See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
 */
CanvasImage.contextAttributes = {
  /*
   * Canvas contains an alpha channel.
   *
   * On 'false' the browser knows that the backdrop is always opaque,
   * which can speed up drawing of transparent content and images.
   *
   * On 'true' certain hardware or software configurations may
   * yield diminishing results in terms of rendering performance.
   */
  alpha: false,

  /*
   * Color space of the rendering context.
   */
  colorSpace: 'srgb',

  /*
   * A boolean value that hints the user agent to reduce the latency
   * by desynchronizing the canvas paint cycle from the event loop.
   *
   * Disclaimer: Certain browsers have odd behavior where the canvas
   * is absolutely invisible (due to software bugs, or hardware limits)
   * therefore this option is set to 'false'.
   */
  desynchronized: false,

  /*
   * Whether or not a lot of read-back operations are planned.
   * This will force the use of a software (instead of hardware
   * accelerated) 2D canvas and can save memory when calling
   * 'getImageData()' frequently.
   */
  willReadFrequently: true
};

/*
 * Create resource.
 */
CanvasImage.create = function(width = 1, height = 1) {
  width |= 0;
  height |= 0;

  let fb = Object.setPrototypeOf({}, CanvasImage);

  /*
   * Resource identifier.
   */
  fb.id = CanvasImage.count++;

  /*
   * Image width.
   */
  fb.width = width;

  /*
   * Image height.
   */
  fb.height = height;

  /*
   * Canvas context (CanvasRenderingContext2D).
   */
  fb.context = null;

  /*
   * ImageData object.
   */
  fb.image = null;

  /*
   * Unix timestamp at which the resource was created.
   */
  fb.created = +Date.now();

  /*
   * Timestamp on update (sync call).
   *
   * Default is zero to indicate that no
   * updates have occured since creation.
   */
  fb.updated = 0;

  /*
   * Path from which the image was requested.
   */
  fb.path = null;

  /*
   * Resource is ready (initialized).
   *
   * This is used by the static method 'load'
   * and its callback to signal that the image
   * loaded or not.
   */
  fb.ready = true;

  /*
   * Resource locking that prevents accidental
   * writes to a static resource.
   *
   * Custom class methods may choose to ignore
   * this state.
   */
  fb.locked = false;

  /*
   * Dirty bit is set when pixel values change,
   * and reset when sync() method is called.
   */
  fb.dirty = false;

  /*
   * Error string.
   */
  fb.error = null;

  /*
   * HTML element containing the spawned canvas.
   */
  fb.container = null;

  /*
   * Is the canvas element spawned in a container?
   * True when 'container' is not null.
   */
  fb.spawned = false;

  if (0 >= width || width > 8192) {
    fb.error = 'bad width';
    return fb;
  }

  if (0 >= height || height > 8192) {
    fb.error = 'bad height';
    return fb;
  }

  fb.canvas = document.createElement('canvas');
  fb.canvas.width = width;
  fb.canvas.height = height;
  fb.canvas.CanvasImage = fb; /* reference to the resource */

  fb.context = fb.canvas.getContext(
    '2d',
    CanvasImage.contextAttributes
  );

  if (fb.context === null) {
    fb.error = 'failed to create context';
    return fb;
  }

  fb.image = new ImageData(width, height);
  fb.image.data.fill(255);
  fb.sync();

  return fb;
};

/*
 * Create a resource from an asynchronously loaded image.
 */
CanvasImage.load = function(path = null, callback = null) {
  if (path === null) {
    return null;
  }

  /* Default callback no-op */
  if (typeof callback !== 'function') {
    callback = function() {};
  }

  /* Create dummy resource */
  let fb = CanvasImage.create().lock();
  fb.ready = false;
  fb.path = path;

  let img = new Image();

  /*
   * Allow cross-origin use of images and canvas.
   * See: https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
   */
  img.crossOrigin = 'anonymous';

  /* Load event (success) */
  img.addEventListener('load', function() {
    let width = img.width;
    let height = img.height;

    fb.ready = true;

    fb.canvas.width = width;
    fb.canvas.height = height;
    fb.width = width;
    fb.height = height;

    fb.context.drawImage(img, 0, 0, width, height);

    try {
      fb.image = fb.context.getImageData(0, 0, width, height);
    }
    catch (ex) {
      fb.ready = false;
      fb.error = ex.message;
      callback(fb);
      return fb;
    }

    fb.unlock();
    callback(fb);
  }, false);

  /* Error event (failure) */
  img.addEventListener('error', function() {
    fb.error = 'failed to load image';
    callback(fb);
  }, false);

  img.src = path;

  return fb;
};

/*
 * Synchronize ImageData to the Canvas.
 */
CanvasImage.sync = function() {
  this.context.putImageData(this.image, 0, 0);
  this.dirty = false;
  this.updated = +Date.now();
  return this;
};

/*
 * Set RGB pixel color at X and Y coordinates.
 */
CanvasImage.setColor = function(x, y, r, g, b) {
  if (this.locked) {
    return this;
  }

  x |= 0;
  y |= 0;

  let pos = this.width * y * 4 + x * 4;

  this.image.data[pos + 0] = r;
  this.image.data[pos + 1] = g;
  this.image.data[pos + 2] = b;

  this.dirty = true;

  return this;
};

/*
 * Get RGB pixel color at X and Y coordinates.
 */
CanvasImage.getColor = function(x, y) {
  x |= 0;
  y |= 0;

  let pos = this.width * y * 4 + x * 4;

  return [
    this.image.data[pos + 0],
    this.image.data[pos + 1],
    this.image.data[pos + 2]
  ];
};

/*
 * Set alpha value at X and Y coordinates.
 */
CanvasImage.setAlpha = function(x, y, a) {
  if (this.locked) {
    return this;
  }

  x |= 0;
  y |= 0;

  let pos = this.width * y * 4 + x * 4;

  this.image.data[pos + 3] = a;

  this.dirty = true;

  return this;
};

/*
 * Get alpha value at X and Y coordinates.
 */
CanvasImage.getAlpha = function(x, y) {
  x |= 0;
  y |= 0;

  let pos = this.width * y * 4 + x * 4;

  return this.image.data[pos + 3];
};

/*
 * Spawn resource to a container element.
 */
CanvasImage.spawn = function(container = null) {
  if (this.error) {
    return this;
  }

  if (container === null || container instanceof Element === false) {
    this.error = 'container is not an element';
    return this;
  }

  if (this.container !== null) {
    this.error = 'resource already spawned';
    return this;
  }

  container.append(this.canvas);
  this.container = container;
  this.spawned = true;

  return this;
};

/*
 * Despawn a resource from its container.
 */
CanvasImage.despawn = function() {
  /* Check instance state */
  if (this.container === null) {
    return this;
  }

  /* Check html element */
  let container = this.canvas.parentElement;

  if (container === null) {
    return this;
  }

  container.removeChild(this.canvas);
  this.container = null;
  this.spawned = false;

  return this;
};

/*
 * Clear the canvas using a color (default black).
 */
CanvasImage.clear = function(r = 0, g = 0, b = 0) {
  if (this.locked) {
    return this;
  }

  for (let i = 0; i < this.image.data.length; i += 4) {
    this.image.data[i + 0] = r;
    this.image.data[i + 1] = g;
    this.image.data[i + 2] = b;
  }

  return this;
};

/*
 * Download resource image as a file.
 */
CanvasImage.save = function(filename = '0.png') {
  let a = document.createElement('a');
  a.href = this.canvas.toDataURL();
  a.download = filename;
  a.click();

  return this;
};

/*
 * Lock resource (read-only).
 */
CanvasImage.lock = function() {
  this.locked = true;
  return this;
}

/*
 * Unlock resource.
 */
CanvasImage.unlock = function() {
  this.locked = false;
  return this;
};

/*
 * Clone the CanvasImage into a new resource.
 */
CanvasImage.clone = function() {
  let fb = CanvasImage.create(this.width, this.height);

  for (let i = 0; i < this.image.data.length; i += 4) {
    fb.image.data[i + 0] = this.image.data[i + 0];
    fb.image.data[i + 1] = this.image.data[i + 1];
    fb.image.data[i + 2] = this.image.data[i + 2];
    fb.image.data[i + 3] = this.image.data[i + 3];
  }

  fb.sync();

  return fb;
};

/*
 * Get a color channel:
 *
 * 0 = Red (default)
 * 1 = Green
 * 2 = Blue
 * 3 = Alpha
 */
CanvasImage.getChannel = function(channel = 0) {
  channel |= 0;

  if (0 > channel) {
    channel = 0;
  }

  if (channel > 3) {
    channel = 3;
  }

  let fb = CanvasImage.create(this.width, this.height);

  for (let i = 0; i < fb.image.data.length; i += 4) {
    fb.image.data[i + 0] = this.image.data[i + channel];
    fb.image.data[i + 1] = this.image.data[i + channel];
    fb.image.data[i + 2] = this.image.data[i + channel];
  }

  fb.sync();

  return fb;
};

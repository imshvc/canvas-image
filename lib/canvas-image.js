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
 *   2025-04-07 12:37 PM
 *
 * Repository:
 *   https://github.com/imshvc/canvas-image
 *
 * Version:
 *   20250407 (Sunday, April 7, 2025)
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
CanvasImage.version = '20250407';

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

  let ci = Object.setPrototypeOf({}, CanvasImage);

  /*
   * Resource identifier.
   */
  ci.id = CanvasImage.count++;

  /*
   * Image width.
   */
  ci.width = width;

  /*
   * Image height.
   */
  ci.height = height;

  /*
   * Canvas context (CanvasRenderingContext2D).
   */
  ci.context = null;

  /*
   * ImageData object.
   */
  ci.image = null;

  /*
   * Unix timestamp at which the resource was created.
   */
  ci.created = +Date.now();

  /*
   * Timestamp on update (sync call).
   *
   * Default is zero to indicate that no
   * updates have occured since creation.
   */
  ci.updated = 0;

  /*
   * Path from which the image was requested.
   */
  ci.path = null;

  /*
   * Resource is ready (initialized).
   *
   * This is used by the static method 'load'
   * and its callback to signal that the image
   * loaded or not.
   */
  ci.ready = true;

  /*
   * Resource locking that prevents accidental
   * writes to a static resource.
   *
   * Custom class methods may choose to ignore
   * this state.
   */
  ci.locked = false;

  /*
   * Dirty bit is set when pixel values change,
   * and reset when sync() method is called.
   */
  ci.dirty = false;

  /*
   * Error string.
   */
  ci.error = null;

  /*
   * HTML element containing the spawned canvas.
   */
  ci.container = null;

  /*
   * Is the canvas element spawned in a container?
   * True when 'container' is not null.
   */
  ci.spawned = false;

  if (0 >= width || width > 8192) {
    ci.error = 'bad width';
    return ci;
  }

  if (0 >= height || height > 8192) {
    ci.error = 'bad height';
    return ci;
  }

  ci.canvas = document.createElement('canvas');
  ci.canvas.width = width;
  ci.canvas.height = height;
  ci.canvas.resource = ci; /* reference to the resource */

  ci.context = ci.canvas.getContext(
    '2d',
    CanvasImage.contextAttributes
  );

  if (ci.context === null) {
    ci.error = 'failed to create context';
    return ci;
  }

  ci.image = new ImageData(width, height);
  ci.image.data.fill(255);
  ci.sync();

  return ci;
};

/*
 * Create resource from image.
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
  let ci = CanvasImage.create().lock();
  ci.ready = false;
  ci.path = path;

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

    ci.ready = true;

    ci.canvas.width = width;
    ci.canvas.height = height;
    ci.width = width;
    ci.height = height;

    ci.context.drawImage(img, 0, 0, width, height);

    try {
      ci.image = ci.context.getImageData(0, 0, width, height);
    }
    catch (ex) {
      ci.ready = false;
      ci.error = ex.message;
      callback(ci);
      return ci;
    }

    ci.unlock();
    callback(ci);
  }, false);

  /* Error event (failure) */
  img.addEventListener('error', function() {
    ci.error = 'failed to load image';
    callback(ci);
  }, false);

  img.src = path;

  return ci;
};

/*
 * Put ImageData to Canvas.
 */
CanvasImage.sync = function() {
  this.context.putImageData(this.image, 0, 0);
  this.dirty = false;
  this.updated = +Date.now();
  return this;
};

/*
 * Set RGB value.
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
 * Get RGB value.
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
 * Set alpha value.
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
 * Get alpha value.
 */
CanvasImage.getAlpha = function(x, y) {
  x |= 0;
  y |= 0;

  let pos = this.width * y * 4 + x * 4;

  return this.image.data[pos + 3];
};

/*
 * Append canvas to container.
 */
CanvasImage.spawn = function(container = null) {
  if (this.error) {
    return this;
  }

  if (container === null || container instanceof Element === false) {
    this.error = 'container not element';
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
 * Remove canvas from container.
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
 * Clear canvas (default color black)
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
 * Download resource image.
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
 * Clone resource.
 */
CanvasImage.clone = function() {
  let ci = CanvasImage.create(this.width, this.height);

  for (let i = 0; i < this.image.data.length; i += 4) {
    ci.image.data[i + 0] = this.image.data[i + 0];
    ci.image.data[i + 1] = this.image.data[i + 1];
    ci.image.data[i + 2] = this.image.data[i + 2];
    ci.image.data[i + 3] = this.image.data[i + 3];
  }

  ci.sync();

  return ci;
};

/*
 * Get color channel:
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

  let ci = CanvasImage.create(this.width, this.height);

  for (let i = 0; i < ci.image.data.length; i += 4) {
    ci.image.data[i + 0] = this.image.data[i + channel];
    ci.image.data[i + 1] = this.image.data[i + channel];
    ci.image.data[i + 2] = this.image.data[i + channel];
  }

  ci.sync();

  return ci;
};

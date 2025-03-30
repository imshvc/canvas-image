// File:
//   framebuffer.js
//
// Authors:
//   Nurudin Imsirovic <nurudinimsirovic@icloud.com>
//
// Summary:
//   Tiny JavaScript library that abstracts the
//   2D Canvas making it easier to access and
//   modify raw pixel information of images, or
//   to act as a frame buffer where you as the
//   programmer decide what is drawn.
//
// Created:
//   2025-03-18 11:40 AM
//
// Updated:
//   2025-03-30 09:27 PM
//
// Repository:
//   https://github.com/framebuffer-js/framebuffer-js
//
// Version:
//   20250330 (Sunday, March 30, 2025)
//
// License:
//   See LICENSE file

/**
 * Framebuffer factory.
 */
class Framebuffer {
  /**
   * Version string - https://calver.org/
   * @type {string}
   */
  static version = '20250330';

  /**
   * Framebuffer resource object.
   * @type {object}
   */
  static resource = {...new Framebuffer.prototype.constructor};

  /**
   * How many resources were created.
   *
   * Used by create() to assign an id
   * to a resource.
   * @type {number}
   */
  static count = 0;

  /**
   * Resource identifier.
   * @type {number}
   */
  id = 0;

  /**
   * Canvas element.
   * @type {?HTMLCanvasElement}
   */
  canvas = null;

  /**
   * Resource width.
   * @type {number}
   */
  width = 0;

  /**
   * Resource height.
   * @type {number}
   */
  height = 0;

  /**
   * Canvas context.
   * @type {?CanvasRenderingContext2D}
   */
  context = null;

  /**
   * Canvas context attributes.
   * See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
   * @type {object}
   */
  static contextAttributes = {
    // Canvas contains an alpha channel.
    //
    // On 'false' the browser knows that the backdrop is always opaque,
    // which can speed up drawing of transparent content and images.
    //
    // On 'true' certain hardware or software configurations may
    // yield diminishing results in terms of rendering performance.
    alpha: false,

    // Color space of the rendering context.
    colorSpace: 'srgb',

    // A boolean value that hints the user agent to reduce the latency
    // by desynchronizing the canvas paint cycle from the event loop.
    //
    // Disclaimer: Certain browsers have odd behavior where the canvas
    // is absolutely invisible (due to software bugs, or hardware limits)
    // therefore this option is set to 'false'.
    desynchronized: false,

    // Whether or not a lot of read-back operations are planned.
    // This will force the use of a software (instead of hardware
    // accelerated) 2D canvas and can save memory when calling
    // 'getImageData()' frequently.
    willReadFrequently: true
  };

  /**
   * ImageData object.
   * @type {?ImageData}
   */
  image = null;

  /**
   * Unix timestamp at which the resource was created.
   * @type {number}
   */
  created = 0;

  /**
   * Timestamp on update (sync call).
   *
   * Defaults to zero to indicate that no
   * updates have occured since creation.
   *
   * @type {number}
   */
  updated = 0;

  /**
   * Path from which the image was requested.
   * @type {?string}
   */
  path = null;

  /**
   * Resource is ready (initialized).
   *
   * This is used by the static method 'load'
   * and its callback to signal that the image
   * loaded or not.
   *
   * @type {boolean}
   */
  ready = true;

  /**
   * Resource locking that prevents accidental
   * writes to a static resource.
   *
   * Custom class methods may choose to ignore
   * this state.
   *
   * @type {boolean}
   */
  locked = false;

  /**
   * Dirty bit is set when pixel values change,
   * and reset when sync() method is called.
   * @type {boolean}
   */
  dirty = false;

  /**
   * Error string.
   * @type {?string}
   */
  error = null;

  /**
   * HTML element containing the spawned canvas.
   * @type {?HTMLElement}
   */
  container = null;

  /**
   * Is the canvas element spawned in a container?
   * True when 'container' is not null.
   * @type {boolean}
   */
  spawned = false;

  /**
   * Create a Framebuffer resource.
   * @param {number} width Resource width.
   * @param {number} height Resource height.
   * @returns {Framebuffer}
   */
  static create(width = 1, height = 1) {
    let fb = Object.setPrototypeOf(
      Object.assign({}, Framebuffer.resource),
      Framebuffer.prototype
    );
    fb.id = Framebuffer.count++;

    // Truncate i.e. 2.345 -> 2
    width |= 0;
    height |= 0;

    // Check bounds
    if (0 >= width || width > 8192) {
      fb.error = 'bad width';
      return fb;
    }

    if (0 >= height || height > 8192) {
      fb.error = 'bad height';
      return fb;
    }

    fb.created = +Date.now();

    fb.width = width;
    fb.height = height;
    fb.canvas = document.createElement('canvas');
    fb.canvas.width = width;
    fb.canvas.height = height;
    fb.context = fb.canvas.getContext(
      '2d',
      Framebuffer.contextAttributes
    );

    // Reference to the Framebuffer instance
    fb.canvas.framebuffer = fb;

    // Failed to create context - canvas not supported
    if (fb.context === null) {
      fb.error = 'canvas not supported';
      return fb;
    }

    fb.image = new ImageData(width, height);
    fb.image.data.fill(255);
    fb.sync();

    return fb;
  }

  /**
   * Create a Framebuffer resource from an asynchronously loaded image.
   * @param {?string} path Path (relative or absolute) or a URL to an image.
   * @param {?function} callback Event handler for 'load' and 'error'
   *   - null fallbacks to a built-in handler (default).
   * @param {number} height Resource height.
   * @returns {Framebuffer}
   */
  static load(path = null, callback = null) {
    if (path === null) {
      return null;
    }

    // default callback no-op
    if (typeof callback !== 'function') {
      callback = function() {};
    }

    // create dummy resource
    let fb = Framebuffer.create().lock();
    fb.ready = false;
    fb.path = path;

    let img = new Image();

    // event handler for onload
    img.onload = function() {
      let width = img.width;
      let height = img.height;

      fb.ready = true;

      fb.canvas.width = width;
      fb.canvas.height = height;
      fb.width = width;
      fb.height = height;

      fb.context.drawImage(img, 0, 0, width, height);
      fb.image = fb.context.getImageData(0, 0, width, height);

      fb.unlock();
      callback(fb);
    };

    // event handler for onerror
    img.onerror = function() {
      fb.error = 'failed to load image';
      callback(fb);
    };

    img.src = path;

    return fb;
  }

  /**
   * Synchronize ImageData to the Canvas.
   * @returns {Framebuffer}
   */
  sync() {
    this.context.putImageData(this.image, 0, 0);
    this.dirty = false;
    this.updated = +Date.now();
    return this;
  }

  /**
   * Set RGB pixel color at X and Y coordinates.
   * @returns {Framebuffer}
   */
  setColor(x, y, r, g, b) {
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
  }

  /**
   * Get RGB pixel color at X and Y coordinates.
   * @returns {array<number>} An array containing red, green, and blue color values.
   */
  getColor(x, y) {
    x |= 0;
    y |= 0;

    let pos = this.width * y * 4 + x * 4;

    return [
      this.image.data[pos + 0],
      this.image.data[pos + 1],
      this.image.data[pos + 2]
    ];
  }

  /**
   * Set alpha value at X and Y coordinates.
   * @returns {Framebuffer}
   */
  setAlpha(x, y, a) {
    if (this.locked) {
      return this;
    }

    x |= 0;
    y |= 0;

    let pos = this.width * y * 4 + x * 4;

    this.image.data[pos + 3] = a;

    this.dirty = true;

    return this;
  }

  /**
   * Get alpha value at X and Y coordinates.
   * @returns {number}
   */
  getAlpha(x, y) {
    x |= 0;
    y |= 0;

    let pos = this.width * y * 4 + x * 4;

    return this.image.data[pos + 3];
  }

  /**
   * Spawn resource to a container element
   * @param {Element} container Element to which we spawn
   * @returns {Framebuffer}
   */
  spawn(container = null) {
    if (container === null || container instanceof Element === false) {
      this.error = 'expects container to be an element';
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
  }

  /**
   * Despawn a resource from its container.
   * @returns {Framebuffer}
   */
  despawn() {
    // check instance state
    if (this.container === null) {
      return this;
    }

    // check html element
    let container = this.canvas.parentElement;

    if (container === null) {
      return this;
    }

    container.removeChild(this.canvas);
    this.container = null;
    this.spawned = false;

    return this;
  }

  /**
   * Clear the canvas using a color (default black)
   * @returns {Framebuffer}
   */
  clear(r = 0, g = 0, b = 0) {
    if (this.locked) {
      return this;
    }

    for (let i = 0; i < this.image.data.length; i += 4) {
      this.image.data[i + 0] = r;
      this.image.data[i + 1] = g;
      this.image.data[i + 2] = b;
    }

    return this;
  }

  /**
   * Download resource image as a file.
   * @param {string} filename Name of the file
   * @returns {Framebuffer}
   */
  save(filename = '0.png') {
    let a = document.createElement('a');
    a.href = this.canvas.toDataURL();
    a.download = filename;
    a.click();

    return this;
  }

  /**
   * Lock resource (read-only).
   * @returns {Framebuffer}
   */
  lock() {
    this.locked = true;
    return this;
  }

  /**
   * Unlock resource.
   * @returns {Framebuffer}
   */
  unlock() {
    this.locked = false;
    return this;
  }

  /**
   * Clone the Framebuffer into a new resource.
   * @returns {Framebuffer}
   */
  clone() {
    let fb = Framebuffer.create(this.width, this.height);

    for (let i = 0; i < this.image.data.length; i += 4) {
      fb.image.data[i + 0] = this.image.data[i + 0];
      fb.image.data[i + 1] = this.image.data[i + 1];
      fb.image.data[i + 2] = this.image.data[i + 2];
      fb.image.data[i + 3] = this.image.data[i + 3];
    }

    fb.sync();

    return fb;
  }

  /**
   * Get a color channel.
   * @param {number} channel Channel index (0=Red, 1=Green, 2=Blue, 3=Alpha) (default 0)
   * @returns {Framebuffer}
   */
  getChannel(channel = 0) {
    channel |= 0;

    // Min 0
    if (0 > channel) {
      channel = 0;
    }

    // Max 3
    if (channel > 3) {
      channel = 3;
    }

    let fb = Framebuffer.create(this.width, this.height);

    for (let i = 0; i < fb.image.data.length; i += 4) {
      fb.image.data[i + 0] = this.image.data[i + channel];
      fb.image.data[i + 1] = this.image.data[i + channel];
      fb.image.data[i + 2] = this.image.data[i + channel];
    }

    fb.sync();

    return fb;
  }

  /**
   * List of names for custom methods.
   * @type {Set<string>}
   */
  static methods = new Set();

  /**
   * Define a method on the Framebuffer prototype
   * after validation to extend functionality.
   * Reserved names are not allowed, e.g. 'clone'.
   * @param {string} name Method name.
   * @param {?function} body Method implementation.
   * @throws {string} When a required condition was not met.
   * @returns {Framebuffer}
   */
  static defineMethod(name, body = null) {
    // Specify name
    if (typeof name !== 'string') {
      throw 'specify name (string)';
    }

    // Duplicate method
    if (Framebuffer.hasMethod(name)) {
      throw 'duplicate method: ' + name;
    }

    // Reserved name
    if (name in Framebuffer || name in Framebuffer.prototype || name in Framebuffer.resource) {
      throw 'reserved name: ' + name
    }

    // Specify body
    if (typeof body !== 'function') {
      throw 'specify body (function)';
    }

    Framebuffer.methods.add(name);
    Framebuffer.prototype[name] = body;

    return this;
  }

  /**
   * Delete a defined method.
   * @param {string} name Method name.
   * @returns {Framebuffer}
   */
  static deleteMethod(name) {
    if (Framebuffer.hasMethod(name)) {
      Framebuffer.methods.delete(name);
      delete Framebuffer.prototype[name];
    }

    return this;
  }

  /**
   * Returns true if a defined method exists.
   * @param {string} name Method name.
   * @returns {boolean}
   */
  static hasMethod(name) {
    return Framebuffer.methods.has(name) && name in Framebuffer.prototype;
  }
}

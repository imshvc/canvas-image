/*
 * Create an image 100x100
 */
var image = CanvasImage.create(100, 100);

/*
 * Clear the image using Navy Blue color
 */
image.clear(0, 0, 128);

/*
 * Synchronize changes
 */
image.sync();

/*
 * Append canvas to container
 */
image.spawn(container);

/*
 * Asynchronously load an image
 */
var image = CanvasImage.load(
  /*
   * Path to image
   */
  'assets/images/landscape-1.jpg',

  /*
   * Callback function
   */
  function(self) {
    /*
     * Image loaded
     */
    if (self.ready) {
      self.spawn(container);
    }

    /*
     * Image could not load
     */
    if (self.error) {
      let p = document.createElement('p');
      p.textContent = 'CanvasImage.load error: ' + self.error + ': ' + self.path;
      container.append(p);
    }
  }
);

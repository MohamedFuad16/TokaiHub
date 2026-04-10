const Jimp = require('jimp');

Jimp.read('src/assets/mascots/mascot_1_1.png')
  .then(image => {
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      if(this.bitmap.data[idx + 0] > 240 && this.bitmap.data[idx + 1] > 240 && this.bitmap.data[idx + 2] > 240) {
        this.bitmap.data[idx + 3] = 0;
      }
    });
    return image.writeAsync('src/assets/mascots/mascot_1_1.png');
  })
  .then(() => console.log("Removed white background!"))
  .catch(console.error);

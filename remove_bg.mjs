import { Jimp } from "jimp";

async function main() {
  const image = await Jimp.read('src/assets/mascots/mascot_1_1.png');
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    if(this.bitmap.data[idx + 0] > 240 && this.bitmap.data[idx + 1] > 240 && this.bitmap.data[idx + 2] > 240) {
      this.bitmap.data[idx + 3] = 0;
    }
  });
  await image.write('src/assets/mascots/mascot_1_1.png');
  console.log("Done");
}
main();

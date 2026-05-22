function randomFillSync(buffer) {
  for (let index = 0; index < buffer.length; index += 1) {
    buffer[index] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

module.exports = { randomFillSync };

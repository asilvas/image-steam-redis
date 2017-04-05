export default class File {
  constructor(info, data) {
    this.info = info || {};
    this.data = data || (Buffer.alloc ? Buffer.alloc(0) : new Buffer()); // Buffer.alloc requires Node v5.10 or later
  }

  static fromBuffer(buf) {
    if (!Buffer.isBuffer(buf)) throw new Error('Expected buffer');
    if (buf.length < 6) throw new Error('Invalid file buffer, does not meet minimum size');

    const jsonBufSize = buf.readInt16LE(0);
    const dataBufSize = buf.readInt32LE(2);
    if ((6 + jsonBufSize + dataBufSize) !== buf.length) throw new Error('Invalid file buffer, size mismatch');

    const jsonInfo = buf.toString('utf8', 6, 6 + jsonBufSize);
    const info = JSON.parse(jsonInfo);

    const data = Buffer.allocUnsafe ? Buffer.allocUnsafe(dataBufSize) : new Buffer(dataBufSize); // Buffer.allocUnsafe requires Node v5.10 or later
    const dataIdx =
      2 /* jsonSize:Int16LE */
      + 4 /* dataSize:Int32LE */
      + jsonBufSize // size of info JSON Buffer
    ;
    buf.copy(data, 0, dataIdx);

    return new File(info, data);
  }

  toBuffer() {
    const json = JSON.stringify(this.info);
    const jsonBuf = Buffer.from ? Buffer.from(json, 'utf8') : new Buffer(json, 'utf8'); // Buffer.from requires Node v5.10 or later

    const size =
      2 /* jsonSize:Int16LE */
      + 4 /* dataSize:Int32LE */
      + jsonBuf.length // size of info JSON Buffer
      + this.data.length // size of data buffer
    ;
    // use unsafe(fast) buffer allocation since we always overwrite 100% of contents
    const result = Buffer.allocUnsafe ? Buffer.allocUnsafe(size) : new Buffer(size); // Buffer.allocUnsafe requires Node v5.10 or later

    result.writeInt16LE(jsonBuf.length, 0);
    result.writeInt32LE(this.data.length, 2); // max (2^31)-1

    jsonBuf.copy(result, 6); // copy all the things

    this.data.copy(result, 6 + jsonBuf.length); // copy all the things

    return result;
  }
}

const crypto = require('crypto');

function rightRotate(x, n) {
  return (x >>> n) | (x << (32 - n));
}

function sha256Bytes(bytes) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x194721d0, 0x384bd69b, 0x402b6bef, 0x4e048296, 0x759e66c0, 0x80b683a4, 0x9082874c, 0xc32a02b0,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2, 0x3b5f25a9, 0xc87c7aa3, 0xbeb5ffff, 0xc8f5a6b7
  ];

  const l = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length + 8) % 64 !== 0) {
    bytes.push(0x00);
  }
  
  const lHex = l.toString(16).padStart(16, '0');
  for (let i = 0; i < 8; i++) {
    bytes.push(parseInt(lHex.slice(i * 2, i * 2 + 2), 16));
  }
  
  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a,
      H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

  for (let i = 0; i < bytes.length; i += 64) {
    const w = new Int32Array(64);
    for (let t = 0; t < 16; t++) {
      w[t] = (bytes[i + t * 4] << 24) | (bytes[i + t * 4 + 1] << 16) | (bytes[i + t * 4 + 2] << 8) | bytes[i + t * 4 + 3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    
    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;
    
    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    H0 = (H0 + a) | 0;
    H1 = (H1 + b) | 0;
    H2 = (H2 + c) | 0;
    H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0;
    H5 = (H5 + f) | 0;
    H6 = (H6 + g) | 0;
    H7 = (H7 + h) | 0;
  }
  
  return [H0, H1, H2, H3, H4, H5, H6, H7];
}

function hmacSha256(message, key) {
  const strToBytes = (str) => {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i) & 0xFF);
    }
    return bytes;
  };
  
  let keyBytes = strToBytes(key);
  if (keyBytes.length > 64) {
    const hashed = sha256Bytes(keyBytes);
    keyBytes = [];
    hashed.forEach(val => {
      keyBytes.push((val >>> 24) & 255);
      keyBytes.push((val >>> 16) & 255);
      keyBytes.push((val >>> 8) & 255);
      keyBytes.push(val & 255);
    });
  }
  
  while (keyBytes.length < 64) {
    keyBytes.push(0);
  }
  
  const oKey = new Uint8Array(64);
  const iKey = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oKey[i] = keyBytes[i] ^ 0x5c;
    iKey[i] = keyBytes[i] ^ 0x36;
  }
  
  const messageBytes = strToBytes(message);
  const innerInput = new Uint8Array(64 + messageBytes.length);
  innerInput.set(iKey, 0);
  innerInput.set(messageBytes, 64);
  const innerHash = sha256Bytes(Array.from(innerInput));
  
  const innerHashBytes = [];
  innerHash.forEach(val => {
    innerHashBytes.push((val >>> 24) & 255);
    innerHashBytes.push((val >>> 16) & 255);
    innerHashBytes.push((val >>> 8) & 255);
    innerHashBytes.push(val & 255);
  });
  
  const outerInput = new Uint8Array(64 + 32);
  outerInput.set(oKey, 0);
  outerInput.set(innerHashBytes, 64);
  
  const outerHash = sha256Bytes(Array.from(outerInput));
  let result = '';
  outerHash.forEach(val => {
    let part = val;
    if (part < 0) part += 0x100000000;
    result += part.toString(16).padStart(8, '0');
  });
  return result;
}

const message = "order_T8v7yGJBgrVQUe|pay_xyz";
const secret = "8KZkBmESji16SSmiISUdFyWa";

const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
const actual = hmacSha256(message, secret);

console.log("Expected Signature:", expected);
console.log("Actual Signature:  ", actual);
console.log("Match:             ", expected === actual);

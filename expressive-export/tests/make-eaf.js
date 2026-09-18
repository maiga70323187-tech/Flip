/* Fabrique un .eaf synthétique suivant exactement le conteneur écrit par
   NativeAnimationExporter.ts, pour éprouver le lecteur. */
const zlib = require('zlib');
const fs = require('fs');

const docId = 'doc-test-1';
const rectId = 'rect-1';
const circleId = 'ellipse-1';

const manifest = { type: 'expressive/animation', version: 100, documents: [docId], masterDocument: docId };

const elementBase = (pos) => ({
  anchor: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, position: pos,
  rotate: 0, skewAngle: 0, skewAxis: 0, orientation: 0,
  opacity: 1, blend: 0, isolate: false
});
const pen = (colorCode, width) => ({
  brush: { type: 0, color: colorCode }, width: width,
  lineCap: 0, lineJoin: 0, miterLimit: 4, dashes: null, offset: 0
});

const document = {
  id: docId,
  title: 'Document test',
  guides: { guides: [] },
  grid: null,
  properties: { size: { width: 800, height: 600 } },
  animation: {
    startTime: 0,
    endTime: 4000,
    mode: 0,
    animations: {
      [rectId]: {
        position: {
          type: 'point', disabled: false,
          keyframes: [
            { easing: null, offset: 0, value: { x: 40, y: 40 } },
            { easing: null, offset: 4000, value: { x: 500, y: 300 } }
          ]
        },
        rotate: {
          type: 'generic', disabled: false,
          keyframes: [
            { easing: null, offset: 0, value: 0 },
            { easing: null, offset: 4000, value: 180 }
          ]
        }
      },
      [circleId]: {
        fill: {
          type: 'brush', disabled: false,
          keyframes: [
            { easing: null, offset: 0, value: { type: 0, color: 0xFF6E25F2 } },
            { easing: null, offset: 4000, value: { type: 0, color: 0xFFFF60CE } }
          ]
        }
      }
    }
  },
  children: [
    {
      id: rectId, title: 'Carré animé', type: 'rect', locked: false, hidden: false,
      properties: {
        element: elementBase({ x: 40, y: 40 }),
        vector: { stroke: pen(0xFF1414B5, 6), fill: { type: 0, color: 0xFF3DD7FC }, fillOpacity: 1, strokeOpacity: 1, paintOrder: 0, fillRule: 0 },
        rect: { width: 200, height: 150, radius: { rx: 24, ry: 24, multiple: true } }
      }
    },
    {
      id: circleId, title: 'Cercle animé', type: 'ellipse', locked: false, hidden: false,
      properties: {
        element: elementBase({ x: 520, y: 120 }),
        vector: { stroke: pen(0xFFFFFFFF, 0), fill: { type: 0, color: 0xFF6E25F2 }, fillOpacity: 1, strokeOpacity: 1, paintOrder: 0, fillRule: 0 },
        ellipse: { width: 160, height: 160 }
      }
    }
  ]
};

function chunk(type, obj) {
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(obj), 'utf8'));
  const head = Buffer.alloc(5);
  head.writeUInt8(type, 0);
  head.writeUInt32BE(gz.length, 1);
  return Buffer.concat([head, gz]);
}

const manifestGz = zlib.gzipSync(Buffer.from(JSON.stringify(manifest), 'utf8'));
const header = Buffer.alloc(9);
header.writeUInt32BE(0x65377865, 0);   // "ex7e"
header.writeUInt8(0x01, 4);            // manifeste
header.writeUInt32BE(manifestGz.length, 5);

const out = Buffer.concat([
  header, manifestGz,
  chunk(0x03, document),
  Buffer.from([0xef])
]);

const target = require('path').join(__dirname, 'test-projet.eaf');
fs.writeFileSync(target, out);
console.log('écrit:', target, out.length, 'octets');

// Unsplash photo ids grouped by theme (Unsplash licence: free to use, attribution appreciated).
// Swap any id here and re-run `npm run seed -- --reset`. Run `npm run check-images` to find dead links.
const pools = {
  giftbox: ['1549465220-1a8b9238cd48', '1513885535751-8b9238bd345a', '1607344645866-009c320b63e0', '1512909006721-3d6018887383'],
  birthday: ['1530103862676-de8c9debad1d', '1464349153735-7db50ed83c84', '1558636508-e0db3814bd1d', '1513151233558-d860c5398176'],
  flowers: ['1490750967868-88aa4486c946', '1487530811176-3780de880c2d', '1455659817273-f96807779a8a', '1508610048659-a06b669e3321', '1518895949257-7621c3c786d7'],
  teddy: ['1559454403-b8fb88521f11', '1535632066927-ab7c9ab60908', '1558618666-fcd25c85cd64'],
  perfume: ['1541643600914-78b084683601', '1594035910387-fea47794261f', '1592945403244-b3fbafd7f539'],
  watch: ['1523275335684-37898b6baf30', '1524592094714-0f0654e20314', '1542496658-e33a6d0d50f6', '1522312346375-d1a52e2b99b3'],
  jewelry: ['1605100804763-247f67b3557e', '1515562141207-7a88fb7ce338', '1599643478518-a784e5dc4c8f'],
  graduation: ['1523050854058-8df90110c9f1', '1627556704302-624286467c65', '1541339907198-e08756dedf3f'],
  mug: ['1514228742587-6b1558fcca3d', '1517256064527-09c73fc73e38', '1572119865084-43c285814d63'],
  chocolate: ['1481391319762-47dff72954d9', '1511381939415-e44015466834', '1549007994-cb92caebd54b'],
  wedding: ['1519225421980-715cb0215aed', '1522673607200-164d1b6ce486', '1465495976277-4387d4b0b4c6'],
  anniversary: ['1518895949257-7621c3c786d7', '1515562141207-7a88fb7ce338', '1549465220-1a8b9238cd48'],
};

const url = (id, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// n images for a theme, rotated by `offset` so products in the same theme don't all look identical.
function pick(theme, offset = 0, n = 3) {
  const list = pools[theme];
  return Array.from({ length: Math.min(n, list.length) }, (_, i) => url(list[(offset + i) % list.length]));
}

module.exports = { pools, url, pick };

function clone(o) {
  // return { ...o }; // causes bugs
  return JSON.parse(JSON.stringify(o));
}

function euclideanSort(rect, getter) {
  // return a comparator fn to see which is closer to our reference
  return (a, b) => {
    const aX = getter ? getter(a) : a;
    const bX = getter ? getter(b) : b;

    /* eslint-disable no-restricted-properties */
    const aDist = Math.sqrt((
      Math.pow((aX.left + (aX.width / 2)) - (rect.left + (rect.width / 2)), 2) +
      Math.pow((aX.top + (aX.height / 2)) - (rect.top + (rect.height / 2)), 2)
    ));

    const bDist = Math.sqrt((
      Math.pow((bX.left + (bX.width / 2)) - (rect.left + (rect.width / 2)), 2) +
      Math.pow((bX.top + (bX.height / 2)) - (rect.top + (rect.height / 2)), 2)
    ));
    /* eslint-disable no-restricted-properties */

    return aDist - bDist;
  };
}

function testIntersection(r1, r2) {
  if (r1.rect.left > r2.rect.right || r2.rect.left > r1.rect.right) return false;
  if (r1.rect.top > r2.rect.bottom || r1.rect.bottom < r2.rect.top) return false;
  return true;
}

function testIntersections(r0, rs) {
  let inter = false;
  rs.forEach((r) => {
    if (r0 === r || r.id === r0.id) return;
    if (testIntersection(r0, r)) inter = true;
  });
  return inter;
}

export {
  clone,
  euclideanSort,
  testIntersection,
  testIntersections,
};

function clone(o) {
  // return { ...o }; // causes bugs
  return JSON.parse(JSON.stringify(o));
}

export {
  clone,
};

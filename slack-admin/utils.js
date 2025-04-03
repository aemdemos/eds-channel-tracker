// utils.js
export const sortTable = (data, key, direction) => {
  const dataType = typeof data[0][key];
  return [...data].sort((a, b) => {
    if (dataType === 'string') {
      return direction === 'asc' ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
    }
    if (dataType === 'number') {
      return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
    }
    return 0;
  });
};

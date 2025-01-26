const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
const charsetSize = charset.length;

export function generateId(length = 21): string {
  let id = '';

  for (let i = 0; i < length; i += 1) {
    id += charset.charAt(Math.floor(Math.random() * charsetSize));
  }

  return id;
}
